import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminService } from './admin.service';
import { Admin } from '../entities/admin.entity';
import { Post } from '../entities/post.entity';
import { Newsletter, NewsletterStatus } from '../entities/newsletter.entity';
import { SubscribersService } from '../subscribers/subscribers.service';
import { EmailService } from '../email/email.service';

jest.mock('bcrypt');

describe('AdminService', () => {
  let service: AdminService;
  let adminRepo: Record<string, jest.Mock>;
  let postRepo: Record<string, jest.Mock>;
  let newsletterRepo: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let subscribersService: Record<string, jest.Mock>;
  let emailService: Record<string, jest.Mock>;

  beforeEach(async () => {
    adminRepo = {
      findOne: jest.fn(),
    };

    postRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    newsletterRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('jwt-token'),
    };

    subscribersService = {
      getStats: jest.fn(),
      findActive: jest.fn(),
      findAll: jest.fn(),
      addManually: jest.fn(),
      remove: jest.fn(),
      exportCsv: jest.fn(),
    };

    emailService = {
      sendNewsletter: jest.fn().mockResolvedValue(undefined),
      buildStyledContent: jest.fn().mockReturnValue('<styled>'),
      buildEmailHtml: jest.fn().mockReturnValue('<html>'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
        { provide: getRepositoryToken(Post), useValue: postRepo },
        { provide: getRepositoryToken(Newsletter), useValue: newsletterRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: SubscribersService, useValue: subscribersService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('login', () => {
    it('should return access_token on valid credentials', async () => {
      adminRepo.findOne.mockResolvedValue({
        id: 1,
        username: 'admin',
        password: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('admin', 'password');

      expect(result).toEqual({
        access_token: 'jwt-token',
        username: 'admin',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 1, username: 'admin' });
    });

    it('should throw UnauthorizedException for wrong username', async () => {
      adminRepo.findOne.mockResolvedValue(null);

      await expect(service.login('wrong', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      adminRepo.findOne.mockResolvedValue({
        id: 1,
        username: 'admin',
        password: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('admin', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getStats', () => {
    it('should return aggregated stats', async () => {
      subscribersService.getStats.mockResolvedValue({
        total: 10,
        active: 8,
        inactive: 2,
        unverified: 1,
      });
      postRepo.count.mockResolvedValue(5);
      newsletterRepo.count
        .mockResolvedValueOnce(3)  // total
        .mockResolvedValueOnce(2); // sent

      const result = await service.getStats();

      expect(result).toEqual({
        subscribers: { total: 10, active: 8, inactive: 2, unverified: 1 },
        posts: { total: 5 },
        newsletters: { total: 3, sent: 2 },
      });
    });
  });

  describe('Posts CRUD', () => {
    it('should create a post', async () => {
      const dto = { title: 'Test', content: 'Content', company: 'Meta', sourceUrl: 'http://example.com' };
      const post = { id: 1, ...dto };
      postRepo.create.mockReturnValue(post);
      postRepo.save.mockResolvedValue(post);

      const result = await service.createPost(dto as any);
      expect(result).toEqual(post);
    });

    it('should find all posts', async () => {
      postRepo.find.mockResolvedValue([{ id: 1 }]);
      const result = await service.findAllPosts();
      expect(postRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException for non-existing post', async () => {
      postRepo.findOne.mockResolvedValue(null);
      await expect(service.findOnePost(999)).rejects.toThrow(NotFoundException);
    });

    it('should update a post', async () => {
      const post = { id: 1, title: 'Old' };
      postRepo.findOne.mockResolvedValue(post);
      postRepo.save.mockResolvedValue({ ...post, title: 'New' });

      const result = await service.updatePost(1, { title: 'New' } as any);
      expect(result.title).toBe('New');
    });

    it('should remove a post', async () => {
      const post = { id: 1 };
      postRepo.findOne.mockResolvedValue(post);
      postRepo.remove.mockResolvedValue(undefined);

      await service.removePost(1);
      expect(postRepo.remove).toHaveBeenCalledWith(post);
    });
  });

  describe('Newsletters CRUD', () => {
    it('should create a newsletter', async () => {
      const dto = { title: 'NL', content: 'Content', status: NewsletterStatus.DRAFT };
      const newsletter = { id: 1, ...dto, posts: [] };
      newsletterRepo.create.mockReturnValue(newsletter);
      newsletterRepo.save.mockResolvedValue(newsletter);

      const result = await service.createNewsletter(dto as any);
      expect(result.title).toBe('NL');
    });

    it('should create newsletter with post IDs', async () => {
      const dto = { title: 'NL', content: 'C', status: NewsletterStatus.DRAFT, postIds: [1, 2] };
      const newsletter = { id: 1, title: 'NL', content: 'C', posts: [] };
      newsletterRepo.create.mockReturnValue(newsletter);
      postRepo.find.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      newsletterRepo.save.mockResolvedValue({ ...newsletter, posts: [{ id: 1 }, { id: 2 }] });

      const result = await service.createNewsletter(dto as any);
      expect(postRepo.find).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existing newsletter', async () => {
      newsletterRepo.findOne.mockResolvedValue(null);
      await expect(service.findOneNewsletter(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendNewsletter', () => {
    it('should send newsletter to all active subscribers', async () => {
      const newsletter = {
        id: 1,
        title: 'Test NL',
        content: 'Content',
        status: NewsletterStatus.SCHEDULED,
        posts: [],
      };
      newsletterRepo.findOne.mockResolvedValue(newsletter);
      subscribersService.findActive.mockResolvedValue([
        { email: 'a@a.com', unsubscribeToken: 'tok1' },
        { email: 'b@b.com', unsubscribeToken: 'tok2' },
      ]);
      newsletterRepo.save.mockResolvedValue(newsletter);

      const result = await service.sendNewsletter(1);

      expect(emailService.sendNewsletter).toHaveBeenCalledTimes(2);
      expect(result.sentCount).toBe(2);
      expect(newsletter.status).toBe(NewsletterStatus.SENT);
      expect(newsletter.sentAt).toBeInstanceOf(Date);
    });

    it('should continue sending even if one fails', async () => {
      const newsletter = {
        id: 1,
        title: 'NL',
        content: 'C',
        status: NewsletterStatus.SCHEDULED,
        posts: [],
      };
      newsletterRepo.findOne.mockResolvedValue(newsletter);
      subscribersService.findActive.mockResolvedValue([
        { email: 'a@a.com', unsubscribeToken: 'tok1' },
        { email: 'b@b.com', unsubscribeToken: 'tok2' },
      ]);
      emailService.sendNewsletter
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(undefined);
      newsletterRepo.save.mockResolvedValue(newsletter);

      const result = await service.sendNewsletter(1);
      expect(result.sentCount).toBe(1);
    });
  });

  describe('previewNewsletter', () => {
    it('should return preview HTML', async () => {
      newsletterRepo.findOne.mockResolvedValue({
        id: 1,
        content: 'markdown',
        posts: [],
      });

      const result = await service.previewNewsletter(1);
      expect(emailService.buildStyledContent).toHaveBeenCalledWith('markdown');
      expect(emailService.buildEmailHtml).toHaveBeenCalledWith('<styled>', 'preview-token', 1);
      expect(result).toBe('<html>');
    });
  });
});
