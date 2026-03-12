import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { Subscriber } from '../entities/subscriber.entity';
import { EmailService } from '../email/email.service';
import { MetricsService } from '../metrics/metrics.service';

describe('SubscribersService', () => {
  let service: SubscribersService;
  let subscriberRepo: Record<string, jest.Mock>;
  let emailService: Record<string, jest.Mock>;
  let metricsService: Record<string, any>;

  beforeEach(async () => {
    subscriberRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    emailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    metricsService = {
      subscriptions: { inc: jest.fn() },
      verifications: { inc: jest.fn() },
      unsubscriptions: { inc: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscribersService,
        { provide: getRepositoryToken(Subscriber), useValue: subscriberRepo },
        { provide: EmailService, useValue: emailService },
        { provide: MetricsService, useValue: metricsService },
      ],
    }).compile();

    service = module.get<SubscribersService>(SubscribersService);
  });

  describe('subscribe', () => {
    it('should create a new subscriber and send verification email', async () => {
      subscriberRepo.findOne.mockResolvedValue(null);
      const mockSubscriber = {
        id: 1,
        email: 'test@example.com',
        isVerified: false,
        verificationToken: 'some-token',
        unsubscribeToken: 'unsub-token',
      };
      subscriberRepo.create.mockReturnValue(mockSubscriber);
      subscriberRepo.save.mockResolvedValue(mockSubscriber);

      const result = await service.subscribe('test@example.com');

      expect(subscriberRepo.create).toHaveBeenCalled();
      expect(subscriberRepo.save).toHaveBeenCalled();
      expect(metricsService.subscriptions.inc).toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalled();
      expect(result.email).toBe('test@example.com');
    });

    it('should throw ConflictException if already subscribed and verified', async () => {
      subscriberRepo.findOne.mockResolvedValue({
        email: 'test@example.com',
        isActive: true,
        isVerified: true,
      });

      await expect(service.subscribe('test@example.com')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reactivate an inactive subscriber', async () => {
      const existing = {
        email: 'test@example.com',
        isActive: false,
        isVerified: false,
        verificationToken: null,
      };
      subscriberRepo.findOne.mockResolvedValue(existing);
      subscriberRepo.save.mockResolvedValue({ ...existing, isActive: true });

      const result = await service.subscribe('test@example.com');

      expect(existing.isActive).toBe(true);
      expect(subscriberRepo.save).toHaveBeenCalled();
    });

    it('should not fail if verification email fails to send', async () => {
      subscriberRepo.findOne.mockResolvedValue(null);
      const mockSubscriber = {
        id: 1,
        email: 'test@example.com',
        isVerified: false,
        verificationToken: 'token',
        unsubscribeToken: 'unsub',
      };
      subscriberRepo.create.mockReturnValue(mockSubscriber);
      subscriberRepo.save.mockResolvedValue(mockSubscriber);
      emailService.sendEmail.mockRejectedValue(new Error('SMTP error'));

      const result = await service.subscribe('test@example.com');
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('verifyEmail', () => {
    it('should verify a subscriber with valid token', async () => {
      const subscriber = {
        id: 1,
        email: 'test@example.com',
        isVerified: false,
        verificationToken: 'valid-token',
      };
      subscriberRepo.findOne.mockResolvedValue(subscriber);
      subscriberRepo.save.mockResolvedValue({ ...subscriber, isVerified: true });

      const result = await service.verifyEmail('valid-token');

      expect(subscriber.isVerified).toBe(true);
      expect(metricsService.verifications.inc).toHaveBeenCalled();
      expect(result.email).toBe('test@example.com');
    });

    it('should throw BadRequestException for invalid token', async () => {
      subscriberRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return message if already verified', async () => {
      subscriberRepo.findOne.mockResolvedValue({
        email: 'test@example.com',
        isVerified: true,
      });

      const result = await service.verifyEmail('token');
      expect(result.message).toContain('이미 인증이 완료된');
    });
  });

  describe('unsubscribe', () => {
    it('should deactivate subscriber with valid token', async () => {
      const subscriber = { id: 1, isActive: true, unsubscribeToken: 'token' };
      subscriberRepo.findOne.mockResolvedValue(subscriber);
      subscriberRepo.save.mockResolvedValue({ ...subscriber, isActive: false });

      await service.unsubscribe('token');

      expect(subscriber.isActive).toBe(false);
      expect(metricsService.unsubscriptions.inc).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid token', async () => {
      subscriberRepo.findOne.mockResolvedValue(null);

      await expect(service.unsubscribe('bad-token')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('verifyToken', () => {
    it('should return valid: true for existing subscriber', async () => {
      subscriberRepo.findOne.mockResolvedValue({
        email: 'test@example.com',
        unsubscribeToken: 'token',
      });

      const result = await service.verifyToken('token');
      expect(result).toEqual({ valid: true, email: 'test@example.com' });
    });

    it('should return valid: false for non-existing token', async () => {
      subscriberRepo.findOne.mockResolvedValue(null);

      const result = await service.verifyToken('bad');
      expect(result).toEqual({ valid: false });
    });
  });

  describe('findActive', () => {
    it('should return only active and verified subscribers', async () => {
      const mockList = [
        { id: 1, email: 'a@a.com', isActive: true, isVerified: true },
      ];
      subscriberRepo.find.mockResolvedValue(mockList);

      const result = await service.findActive();

      expect(subscriberRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, isVerified: true },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockList);
    });
  });

  describe('findOne', () => {
    it('should return subscriber by id', async () => {
      const sub = { id: 1, email: 'a@a.com' };
      subscriberRepo.findOne.mockResolvedValue(sub);

      expect(await service.findOne(1)).toEqual(sub);
    });

    it('should throw NotFoundException if not found', async () => {
      subscriberRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove subscriber', async () => {
      const sub = { id: 1, email: 'a@a.com' };
      subscriberRepo.findOne.mockResolvedValue(sub);
      subscriberRepo.remove.mockResolvedValue(undefined);

      await service.remove(1);
      expect(subscriberRepo.remove).toHaveBeenCalledWith(sub);
    });
  });

  describe('exportCsv', () => {
    it('should return CSV string with header and data', async () => {
      subscriberRepo.find.mockResolvedValue([
        {
          id: 1,
          email: 'a@a.com',
          isActive: true,
          isVerified: true,
          createdAt: new Date('2025-01-01T00:00:00Z'),
        },
      ]);

      const csv = await service.exportCsv();
      expect(csv).toContain('id,email,isActive,isVerified,createdAt');
      expect(csv).toContain('1,a@a.com,true,true,');
    });
  });

  describe('getStats', () => {
    it('should return subscriber statistics', async () => {
      subscriberRepo.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7)  // active
        .mockResolvedValueOnce(2); // unverified

      const stats = await service.getStats();
      expect(stats).toEqual({
        total: 10,
        active: 7,
        inactive: 3,
        unverified: 2,
      });
    });
  });
});
