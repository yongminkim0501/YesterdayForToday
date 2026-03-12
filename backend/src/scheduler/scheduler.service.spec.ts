import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { Newsletter, NewsletterStatus } from '../entities/newsletter.entity';
import { SubscribersService } from '../subscribers/subscribers.service';
import { EmailService } from '../email/email.service';
import { MetricsService } from '../metrics/metrics.service';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let newsletterRepo: Record<string, jest.Mock>;
  let subscribersService: Record<string, jest.Mock>;
  let emailService: Record<string, jest.Mock>;
  let metricsService: Record<string, any>;

  beforeEach(async () => {
    newsletterRepo = {
      find: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };

    subscribersService = {
      findActive: jest.fn(),
    };

    emailService = {
      sendNewsletter: jest.fn().mockResolvedValue(undefined),
    };

    metricsService = {
      activeSubscribers: { set: jest.fn() },
      totalNewsletters: { set: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: getRepositoryToken(Newsletter), useValue: newsletterRepo },
        { provide: SubscribersService, useValue: subscribersService },
        { provide: EmailService, useValue: emailService },
        { provide: MetricsService, useValue: metricsService },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
  });

  describe('updateGaugeMetrics', () => {
    it('should update active subscribers and newsletter count metrics', async () => {
      subscribersService.findActive.mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);
      newsletterRepo.count.mockResolvedValue(10);

      await service.updateGaugeMetrics();

      expect(metricsService.activeSubscribers.set).toHaveBeenCalledWith(3);
      expect(metricsService.totalNewsletters.set).toHaveBeenCalledWith(10);
    });
  });

  describe('handleScheduledNewsletters', () => {
    it('should do nothing if no scheduled newsletters', async () => {
      newsletterRepo.find.mockResolvedValue([]);

      await service.handleScheduledNewsletters();

      expect(emailService.sendNewsletter).not.toHaveBeenCalled();
    });

    it('should send scheduled newsletters to all active subscribers', async () => {
      const newsletter = {
        id: 1,
        title: 'Daily Digest',
        content: '## Meta\n### Title\n**핵심 요약**\nContent',
        status: NewsletterStatus.SCHEDULED,
        scheduledAt: new Date('2025-01-01'),
      };
      newsletterRepo.find.mockResolvedValue([newsletter]);
      subscribersService.findActive.mockResolvedValue([
        { email: 'a@a.com', unsubscribeToken: 'tok1' },
        { email: 'b@b.com', unsubscribeToken: 'tok2' },
      ]);
      newsletterRepo.save.mockResolvedValue(newsletter);

      await service.handleScheduledNewsletters();

      expect(emailService.sendNewsletter).toHaveBeenCalledTimes(2);
      expect(newsletter.status).toBe(NewsletterStatus.SENT);
      expect(newsletter.sentAt).toBeInstanceOf(Date);
      expect(newsletterRepo.save).toHaveBeenCalled();
    });

    it('should handle multiple scheduled newsletters', async () => {
      const nl1 = {
        id: 1,
        title: 'NL1',
        content: 'Content1',
        status: NewsletterStatus.SCHEDULED,
        scheduledAt: new Date('2025-01-01'),
      };
      const nl2 = {
        id: 2,
        title: 'NL2',
        content: 'Content2',
        status: NewsletterStatus.SCHEDULED,
        scheduledAt: new Date('2025-01-01'),
      };
      newsletterRepo.find.mockResolvedValue([nl1, nl2]);
      subscribersService.findActive.mockResolvedValue([
        { email: 'a@a.com', unsubscribeToken: 'tok1' },
      ]);
      newsletterRepo.save.mockResolvedValue({});

      await service.handleScheduledNewsletters();

      expect(emailService.sendNewsletter).toHaveBeenCalledTimes(2);
      expect(nl1.status).toBe(NewsletterStatus.SENT);
      expect(nl2.status).toBe(NewsletterStatus.SENT);
    });

    it('should skip sending if no active subscribers', async () => {
      const newsletter = {
        id: 1,
        title: 'NL',
        content: 'C',
        status: NewsletterStatus.SCHEDULED,
        scheduledAt: new Date('2025-01-01'),
      };
      newsletterRepo.find.mockResolvedValue([newsletter]);
      subscribersService.findActive.mockResolvedValue([]);

      await service.handleScheduledNewsletters();

      expect(emailService.sendNewsletter).not.toHaveBeenCalled();
      // Newsletter should NOT be marked as sent since no subscribers
      expect(newsletterRepo.save).not.toHaveBeenCalled();
    });

    it('should continue with other newsletters if one subscriber fails', async () => {
      const newsletter = {
        id: 1,
        title: 'NL',
        content: 'C',
        status: NewsletterStatus.SCHEDULED,
        scheduledAt: new Date('2025-01-01'),
      };
      newsletterRepo.find.mockResolvedValue([newsletter]);
      subscribersService.findActive.mockResolvedValue([
        { email: 'a@a.com', unsubscribeToken: 'tok1' },
        { email: 'b@b.com', unsubscribeToken: 'tok2' },
      ]);
      emailService.sendNewsletter
        .mockRejectedValueOnce(new Error('SMTP fail'))
        .mockResolvedValueOnce(undefined);
      newsletterRepo.save.mockResolvedValue(newsletter);

      await service.handleScheduledNewsletters();

      expect(emailService.sendNewsletter).toHaveBeenCalledTimes(2);
      expect(newsletter.status).toBe(NewsletterStatus.SENT);
    });
  });
});
