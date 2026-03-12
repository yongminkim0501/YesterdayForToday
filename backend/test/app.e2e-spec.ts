import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { Subscriber } from '../src/entities/subscriber.entity';
import { Post } from '../src/entities/post.entity';
import { Newsletter } from '../src/entities/newsletter.entity';
import { Admin } from '../src/entities/admin.entity';
import { SubscribersModule } from '../src/subscribers/subscribers.module';
import { AdminModule } from '../src/admin/admin.module';
import { EmailModule } from '../src/email/email.module';
import { MetricsModule } from '../src/metrics/metrics.module';
import { EmailService } from '../src/email/email.service';
import { Repository, DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

describe('App (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let subscriberRepo: Repository<Subscriber>;
  let adminRepo: Repository<Admin>;
  let dataSource: DataSource;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ScheduleModule.forRoot(),
        ThrottlerModule.forRoot({
          throttlers: [
            { name: 'short', ttl: 60000, limit: 100 },
            { name: 'medium', ttl: 60000, limit: 100 },
          ],
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || process.env.USER,
          password: process.env.DB_PASSWORD || '',
          database: 'yesterday_for_today_test',
          entities: [Subscriber, Post, Newsletter, Admin],
          synchronize: true,
          dropSchema: true,
        }),
        MetricsModule,
        SubscribersModule,
        AdminModule,
        EmailModule,
      ],
    })
      .overrideProvider(EmailService)
      .useValue({
        sendEmail: jest.fn().mockResolvedValue(undefined),
        sendNewsletter: jest.fn().mockResolvedValue(undefined),
        buildStyledContent: jest.fn().mockReturnValue('<styled>'),
        buildEmailHtml: jest.fn().mockReturnValue('<html>preview</html>'),
        convertMarkdownToHtml: jest.fn().mockResolvedValue('<p>html</p>'),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    subscriberRepo = moduleFixture.get(getRepositoryToken(Subscriber));
    adminRepo = moduleFixture.get(getRepositoryToken(Admin));
    dataSource = moduleFixture.get(DataSource);

    // Seed admin user
    const hashedPassword = await bcrypt.hash('testpass', 10);
    await adminRepo.save({ username: 'admin', password: hashedPassword });

    // Generate admin JWT
    adminToken = jwtService.sign({ sub: 1, username: 'admin' });
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
  });

  // ─── Subscribers API ───────────────────────────────────

  describe('POST /api/subscribers', () => {
    it('should subscribe with valid email', () => {
      return request(app.getHttpServer())
        .post('/api/subscribers')
        .send({ email: 'test@example.com' })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toContain('인증 이메일');
          expect(res.body.email).toBe('test@example.com');
        });
    });

    it('should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/subscribers')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('should reject empty body', () => {
      return request(app.getHttpServer())
        .post('/api/subscribers')
        .send({})
        .expect(400);
    });

    it('should reject duplicate active+verified subscriber', async () => {
      const sub = await subscriberRepo.findOne({ where: { email: 'test@example.com' } });
      sub.isVerified = true;
      await subscriberRepo.save(sub);

      return request(app.getHttpServer())
        .post('/api/subscribers')
        .send({ email: 'test@example.com' })
        .expect(409);
    });
  });

  describe('GET /api/subscribers/verify-email', () => {
    it('should verify with valid token', async () => {
      const sub = subscriberRepo.create({
        email: 'verify@example.com',
        verificationToken: 'verify-token-123',
        unsubscribeToken: 'unsub-verify-123',
        isVerified: false,
      });
      await subscriberRepo.save(sub);

      return request(app.getHttpServer())
        .get('/api/subscribers/verify-email?token=verify-token-123')
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe('verify@example.com');
          expect(res.body.message).toContain('인증이 완료');
        });
    });

    it('should reject invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/subscribers/verify-email?token=bad-token')
        .expect(400);
    });
  });

  describe('POST /api/subscribers/unsubscribe', () => {
    it('should unsubscribe with valid token', async () => {
      const sub = subscriberRepo.create({
        email: 'unsub@example.com',
        verificationToken: null,
        unsubscribeToken: 'unsub-token-456',
        isVerified: true,
        isActive: true,
      });
      await subscriberRepo.save(sub);

      return request(app.getHttpServer())
        .post('/api/subscribers/unsubscribe')
        .send({ token: 'unsub-token-456' })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toContain('해지');
        });
    });

    it('should reject invalid unsubscribe token', () => {
      return request(app.getHttpServer())
        .post('/api/subscribers/unsubscribe')
        .send({ token: 'invalid-token' })
        .expect(404);
    });
  });

  describe('GET /api/subscribers/verify-token', () => {
    it('should return valid for existing token', () => {
      return request(app.getHttpServer())
        .get('/api/subscribers/verify-token?token=unsub-token-456')
        .expect(200)
        .expect((res) => {
          expect(res.body.valid).toBe(true);
          expect(res.body.email).toBe('unsub@example.com');
        });
    });

    it('should return invalid for non-existing token', () => {
      return request(app.getHttpServer())
        .get('/api/subscribers/verify-token?token=nope')
        .expect(200)
        .expect((res) => {
          expect(res.body.valid).toBe(false);
        });
    });
  });

  // ─── Admin Auth API ────────────────────────────────────

  describe('POST /api/admin/login', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'testpass' })
        .expect(201)
        .expect((res) => {
          expect(res.body.access_token).toBeDefined();
          expect(res.body.username).toBe('admin');
        });
    });

    it('should reject wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'wrong' })
        .expect(401);
    });

    it('should reject non-existing user', () => {
      return request(app.getHttpServer())
        .post('/api/admin/login')
        .send({ username: 'nobody', password: 'pass' })
        .expect(401);
    });
  });

  // ─── Admin Protected Routes ────────────────────────────

  describe('GET /api/admin/stats', () => {
    it('should return stats with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.subscribers).toBeDefined();
          expect(res.body.posts).toBeDefined();
          expect(res.body.newsletters).toBeDefined();
        });
    });

    it('should reject without auth token', () => {
      return request(app.getHttpServer())
        .get('/api/admin/stats')
        .expect(401);
    });
  });

  // ─── Admin Posts CRUD ──────────────────────────────────

  describe('Admin Posts CRUD', () => {
    let postId: number;

    it('POST /api/admin/posts - should create a post', () => {
      return request(app.getHttpServer())
        .post('/api/admin/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Post',
          company: 'META',
          sourceUrl: 'https://example.com/post',
          problem: 'Problem description',
          summary: 'Summary content',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.title).toBe('Test Post');
          postId = res.body.id;
        });
    });

    it('GET /api/admin/posts - should list posts', () => {
      return request(app.getHttpServer())
        .get('/api/admin/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('GET /api/admin/posts/:id - should get single post', async () => {
      return request(app.getHttpServer())
        .get(`/api/admin/posts/${postId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Test Post');
        });
    });

    it('PUT /api/admin/posts/:id - should update post', () => {
      return request(app.getHttpServer())
        .put(`/api/admin/posts/${postId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Post' })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Updated Post');
        });
    });

    it('DELETE /api/admin/posts/:id - should delete post', () => {
      return request(app.getHttpServer())
        .delete(`/api/admin/posts/${postId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('삭제');
        });
    });

    it('GET /api/admin/posts/:id - should 404 after delete', () => {
      return request(app.getHttpServer())
        .get(`/api/admin/posts/${postId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ─── Admin Newsletters CRUD ────────────────────────────

  describe('Admin Newsletters CRUD', () => {
    let newsletterId: number;

    it('POST /api/admin/newsletters - should create newsletter', () => {
      return request(app.getHttpServer())
        .post('/api/admin/newsletters')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Weekly Digest',
          content: '## Meta\n### Title\n**핵심 요약**\nContent',
          status: 'DRAFT',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.title).toBe('Weekly Digest');
          newsletterId = res.body.id;
        });
    });

    it('GET /api/admin/newsletters - should list newsletters', () => {
      return request(app.getHttpServer())
        .get('/api/admin/newsletters')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('GET /api/admin/newsletters/:id - should get newsletter', () => {
      return request(app.getHttpServer())
        .get(`/api/admin/newsletters/${newsletterId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Weekly Digest');
        });
    });

    it('PUT /api/admin/newsletters/:id - should update newsletter', () => {
      return request(app.getHttpServer())
        .put(`/api/admin/newsletters/${newsletterId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Digest' })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Updated Digest');
        });
    });

    it('POST /api/admin/newsletters/:id/send - should send newsletter', () => {
      return request(app.getHttpServer())
        .post(`/api/admin/newsletters/${newsletterId}/send`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.sentCount).toBeDefined();
        });
    });

    it('DELETE /api/admin/newsletters/:id - should delete newsletter', () => {
      return request(app.getHttpServer())
        .delete(`/api/admin/newsletters/${newsletterId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // ─── Admin Subscribers Management ──────────────────────

  describe('Admin Subscribers Management', () => {
    it('GET /api/admin/subscribers - should list subscribers', () => {
      return request(app.getHttpServer())
        .get('/api/admin/subscribers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('POST /api/admin/subscribers - should add subscriber', () => {
      return request(app.getHttpServer())
        .post('/api/admin/subscribers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'admin-added@example.com' })
        .expect(201);
    });

    it('should reject without auth', () => {
      return request(app.getHttpServer())
        .get('/api/admin/subscribers')
        .expect(401);
    });
  });

  // ─── Metrics Endpoint ──────────────────────────────────

  describe('GET /metrics', () => {
    it('should return prometheus metrics', () => {
      return request(app.getHttpServer())
        .get('/metrics')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('http_request_duration');
        });
    });
  });
});
