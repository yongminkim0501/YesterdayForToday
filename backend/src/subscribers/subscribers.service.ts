import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscriber } from '../entities/subscriber.entity';
import { EmailService } from '../email/email.service';
import { MetricsService } from '../metrics/metrics.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SubscribersService {
  private readonly logger = new Logger(SubscribersService.name);

  constructor(
    @InjectRepository(Subscriber)
    private readonly subscriberRepo: Repository<Subscriber>,
    private readonly emailService: EmailService,
    private readonly metricsService: MetricsService,
  ) {}

  async subscribe(email: string): Promise<Subscriber> {
    const existing = await this.subscriberRepo.findOne({ where: { email } });
    if (existing) {
      if (existing.isActive && existing.isVerified) {
        throw new ConflictException('이미 구독 중인 이메일입니다.');
      }
      // Re-subscribe: reset and send verification again
      existing.isActive = true;
      existing.isVerified = false;
      existing.verificationToken = uuidv4();
      const saved = await this.subscriberRepo.save(existing);
      await this.trySendVerificationEmail(saved);
      return saved;
    }

    const subscriber = this.subscriberRepo.create({
      email,
      unsubscribeToken: uuidv4(),
      verificationToken: uuidv4(),
      isVerified: false,
    });
    const saved = await this.subscriberRepo.save(subscriber);
    this.metricsService.subscriptions.inc();
    await this.trySendVerificationEmail(saved);
    return saved;
  }

  private async trySendVerificationEmail(subscriber: Subscriber): Promise<void> {
    try {
      await this.sendVerificationEmail(subscriber);
    } catch (error) {
      this.logger.warn(`인증 이메일 발송 실패 (${subscriber.email}) - SMTP 설정을 확인해주세요. 구독자는 저장되었습니다.`);
    }
  }

  private async sendVerificationEmail(subscriber: Subscriber): Promise<void> {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
    const verifyUrl = `${frontendUrl}/verify?token=${subscriber.verificationToken}`;

    const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background-color:#1a1a2e;padding:30px 40px;text-align:center;">
              <h1 style="color:#e94560;margin:0;font-size:22px;">오늘을 만들었던 어제의 기술</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;text-align:center;color:#333;">
              <h2 style="margin:0 0 16px;font-size:20px;">이메일 인증을 완료해 주세요</h2>
              <p style="font-size:16px;line-height:1.6;color:#555;">
                아래 버튼을 클릭하시면 구독이 완료됩니다.<br>
                매일 아침 6시, 빅테크 기술 블로그 요약을 보내드릴게요!
              </p>
              <a href="${verifyUrl}"
                 style="display:inline-block;margin:24px 0;padding:14px 40px;background-color:#e94560;color:#ffffff;text-decoration:none;border-radius:6px;font-size:16px;font-weight:600;">
                구독 인증하기
              </a>
              <p style="font-size:13px;color:#999;margin-top:24px;">
                본인이 요청하지 않으셨다면 이 메일을 무시하셔도 됩니다.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f8f8;padding:16px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#aaa;">&copy; 오늘을 만들었던 어제의 기술</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await this.emailService.sendEmail(
      subscriber.email,
      '[오늘을 만들었던 어제의 기술] 이메일 인증을 완료해 주세요',
      html,
    );
  }

  async verifyEmail(token: string): Promise<{ message: string; email: string }> {
    const subscriber = await this.subscriberRepo.findOne({
      where: { verificationToken: token },
    });
    if (!subscriber) {
      throw new BadRequestException('유효하지 않은 인증 링크입니다.');
    }
    if (subscriber.isVerified) {
      return { message: '이미 인증이 완료된 이메일입니다.', email: subscriber.email };
    }
    subscriber.isVerified = true;
    (subscriber as any).verificationToken = null;
    await this.subscriberRepo.save(subscriber);
    this.metricsService.verifications.inc();
    return { message: '이메일 인증이 완료되었습니다! 내일부터 뉴스레터를 받아보실 수 있습니다.', email: subscriber.email };
  }

  async unsubscribe(token: string): Promise<void> {
    const subscriber = await this.subscriberRepo.findOne({
      where: { unsubscribeToken: token },
    });
    if (!subscriber) {
      throw new NotFoundException('유효하지 않은 구독 해지 토큰입니다.');
    }
    subscriber.isActive = false;
    await this.subscriberRepo.save(subscriber);
    this.metricsService.unsubscriptions.inc();
  }

  async verifyToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const subscriber = await this.subscriberRepo.findOne({
      where: { unsubscribeToken: token },
    });
    if (!subscriber) {
      return { valid: false };
    }
    return { valid: true, email: subscriber.email };
  }

  async findAll(): Promise<Subscriber[]> {
    return this.subscriberRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findActive(): Promise<Subscriber[]> {
    return this.subscriberRepo.find({
      where: { isActive: true, isVerified: true },
      order: { createdAt: 'DESC' },
    });
  }

  async countActive(): Promise<number> {
    return this.subscriberRepo.count({
      where: { isActive: true, isVerified: true },
    });
  }

  async findOne(id: number): Promise<Subscriber> {
    const subscriber = await this.subscriberRepo.findOne({ where: { id } });
    if (!subscriber) {
      throw new NotFoundException('구독자를 찾을 수 없습니다.');
    }
    return subscriber;
  }

  async addManually(email: string): Promise<Subscriber> {
    return this.subscribe(email);
  }

  async remove(id: number): Promise<void> {
    const subscriber = await this.findOne(id);
    await this.subscriberRepo.remove(subscriber);
  }

  private escapeCsvField(field: string): string {
    // Prevent CSV formula injection by prefixing dangerous characters with a single quote
    if (/^[=+\-@]/.test(field)) {
      field = "'" + field;
    }
    // Wrap in quotes if field contains comma, quote, or newline
    if (/[",\n\r]/.test(field)) {
      field = '"' + field.replace(/"/g, '""') + '"';
    }
    return field;
  }

  async exportCsv(): Promise<string> {
    const subscribers = await this.findAll();
    const header = 'id,email,isActive,isVerified,createdAt\n';
    const rows = subscribers
      .map((s) => `${s.id},${this.escapeCsvField(s.email)},${s.isActive},${s.isVerified},${s.createdAt.toISOString()}`)
      .join('\n');
    return header + rows;
  }

  async getStats(): Promise<{ total: number; active: number; inactive: number; unverified: number }> {
    const total = await this.subscriberRepo.count();
    const active = await this.subscriberRepo.count({ where: { isActive: true, isVerified: true } });
    const unverified = await this.subscriberRepo.count({ where: { isActive: true, isVerified: false } });
    return { total, active, inactive: total - active, unverified };
  }
}
