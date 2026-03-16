import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { marked } from 'marked';
import { Admin } from '../entities/admin.entity';
import { Post } from '../entities/post.entity';
import { Newsletter, NewsletterStatus } from '../entities/newsletter.entity';
import { SubscribersService } from '../subscribers/subscribers.service';
import { EmailService } from '../email/email.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { UpdateNewsletterDto } from './dto/update-newsletter.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(Newsletter)
    private readonly newsletterRepo: Repository<Newsletter>,
    private readonly jwtService: JwtService,
    private readonly subscribersService: SubscribersService,
    private readonly emailService: EmailService,
  ) {}

  // Auth
  async login(username: string, password: string) {
    const admin = await this.adminRepo.findOne({ where: { username } });
    if (!admin) {
      throw new UnauthorizedException('잘못된 인증 정보입니다.');
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      throw new UnauthorizedException('잘못된 인증 정보입니다.');
    }
    const payload = { sub: admin.id, username: admin.username };
    return {
      access_token: this.jwtService.sign(payload),
      username: admin.username,
    };
  }

  // Stats
  async getStats() {
    const subscriberStats = await this.subscribersService.getStats();
    const totalPosts = await this.postRepo.count();
    const totalNewsletters = await this.newsletterRepo.count();
    const sentNewsletters = await this.newsletterRepo.count({
      where: { status: NewsletterStatus.SENT },
    });
    return {
      subscribers: subscriberStats,
      posts: { total: totalPosts },
      newsletters: { total: totalNewsletters, sent: sentNewsletters },
    };
  }

  // Posts CRUD
  async createPost(dto: CreatePostDto): Promise<Post> {
    const post = this.postRepo.create(dto);
    return this.postRepo.save(post);
  }

  async findAllPosts(): Promise<Post[]> {
    return this.postRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOnePost(id: number): Promise<Post> {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post) throw new NotFoundException('포스트를 찾을 수 없습니다.');
    return post;
  }

  async updatePost(id: number, dto: UpdatePostDto): Promise<Post> {
    const post = await this.findOnePost(id);
    Object.assign(post, dto);
    return this.postRepo.save(post);
  }

  async removePost(id: number): Promise<void> {
    const post = await this.findOnePost(id);
    await this.postRepo.remove(post);
  }

  // Newsletters CRUD
  async createNewsletter(dto: CreateNewsletterDto): Promise<Newsletter> {
    const newsletter = this.newsletterRepo.create({
      title: dto.title,
      content: dto.content,
      status: dto.status,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
    });

    if (dto.postIds && dto.postIds.length > 1) {
      throw new BadRequestException('뉴스레터에는 포스트를 1개만 연결할 수 있습니다.');
    }

    if (dto.postIds && dto.postIds.length === 1) {
      newsletter.posts = await this.postRepo.find({
        where: { id: In(dto.postIds) },
      });
    }

    return this.newsletterRepo.save(newsletter);
  }

  async findAllNewsletters(): Promise<Newsletter[]> {
    return this.newsletterRepo.find({
      relations: ['posts'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneNewsletter(id: number): Promise<Newsletter> {
    const newsletter = await this.newsletterRepo.findOne({
      where: { id },
      relations: ['posts'],
    });
    if (!newsletter) throw new NotFoundException('뉴스레터를 찾을 수 없습니다.');
    return newsletter;
  }

  async updateNewsletter(id: number, dto: UpdateNewsletterDto): Promise<Newsletter> {
    const newsletter = await this.findOneNewsletter(id);
    if (dto.title !== undefined) newsletter.title = dto.title;
    if (dto.content !== undefined) newsletter.content = dto.content;
    if (dto.status !== undefined) newsletter.status = dto.status;
    if (dto.scheduledAt !== undefined) {
      newsletter.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    }
    if (dto.postIds && dto.postIds.length > 1) {
      throw new BadRequestException('뉴스레터에는 포스트를 1개만 연결할 수 있습니다.');
    }
    if (dto.postIds) {
      newsletter.posts = await this.postRepo.find({
        where: { id: In(dto.postIds) },
      });
    }
    return this.newsletterRepo.save(newsletter);
  }

  async removeNewsletter(id: number): Promise<void> {
    const newsletter = await this.findOneNewsletter(id);
    await this.newsletterRepo.remove(newsletter);
  }

  // Send newsletter
  async sendNewsletter(id: number): Promise<{ sentCount: number; failCount: number }> {
    const newsletter = await this.findOneNewsletter(id);
    const subscribers = await this.subscribersService.findActive();

    const { sentCount, failCount } = await this.emailService.sendInBatches(
      subscribers,
      newsletter,
      (email, success, error) => {
        if (!success) {
          this.logger.error(`Failed to send to ${email}: ${error}`);
        }
      },
    );

    newsletter.status = NewsletterStatus.SENT;
    newsletter.sentAt = new Date();
    await this.newsletterRepo.save(newsletter);

    return { sentCount, failCount };
  }

  async testSendNewsletter(id: number, testEmail?: string): Promise<void> {
    const newsletter = await this.findOneNewsletter(id);
    const to = testEmail || process.env.SMTP_USER || 'test@example.com';
    await this.emailService.sendNewsletter(
      to,
      `[테스트] ${newsletter.title}`,
      newsletter.content,
      'test-token',
      newsletter.id,
    );
  }

  async previewNewsletter(id: number): Promise<string> {
    const newsletter = await this.findOneNewsletter(id);
    const styledContent = this.emailService.buildStyledContent(newsletter.content);
    return this.emailService.buildEmailHtml(styledContent, 'preview-token', newsletter.id);
  }

  // Subscriber management (admin)
  async getSubscribers() {
    return this.subscribersService.findAll();
  }

  async addSubscriber(email: string) {
    return this.subscribersService.addManually(email);
  }

  async deleteSubscriber(id: number) {
    return this.subscribersService.remove(id);
  }

  async exportSubscribersCsv(): Promise<string> {
    return this.subscribersService.exportCsv();
  }
}
