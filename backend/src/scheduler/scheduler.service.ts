import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Newsletter, NewsletterStatus } from '../entities/newsletter.entity';
import { SubscribersService } from '../subscribers/subscribers.service';
import { EmailService } from '../email/email.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Newsletter)
    private readonly newsletterRepo: Repository<Newsletter>,
    private readonly subscribersService: SubscribersService,
    private readonly emailService: EmailService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * 매일 오전 6시에 실행
   * SCHEDULED 상태이고 scheduledAt이 현재 시간 이전인 뉴스레터를 발송
   */
  /**
   * 매분 Gauge 메트릭 갱신
   */
  @Cron('* * * * *')
  async updateGaugeMetrics() {
    const activeCount = await this.subscribersService.countActive();
    this.metricsService.activeSubscribers.set(activeCount);

    const newsletterCount = await this.newsletterRepo.count();
    this.metricsService.totalNewsletters.set(newsletterCount);
  }

  @Cron('0 6 * * *', { timeZone: 'Asia/Seoul' })
  async handleScheduledNewsletters() {
    this.logger.log('⏰ 예약 발송 배치 시작');

    const now = new Date();
    const newsletters = await this.newsletterRepo.find({
      where: {
        status: NewsletterStatus.SCHEDULED,
        scheduledAt: LessThanOrEqual(now),
      },
    });

    if (newsletters.length === 0) {
      this.logger.log('발송할 예약 뉴스레터가 없습니다.');
      return;
    }

    this.logger.log(`${newsletters.length}개의 뉴스레터 발송 시작`);

    for (const newsletter of newsletters) {
      await this.sendOneNewsletter(newsletter);
    }

    this.logger.log('⏰ 예약 발송 배치 완료');
  }

  private async sendOneNewsletter(newsletter: Newsletter) {
    const subscribers = await this.subscribersService.findActive();

    if (subscribers.length === 0) {
      this.logger.warn(`뉴스레터 #${newsletter.id}: 활성 구독자가 없습니다.`);
      return;
    }

    let sentCount = 0;
    let failCount = 0;
    const batchSize = 10;

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((subscriber) =>
          this.emailService.sendNewsletter(
            subscriber.email,
            newsletter.title,
            newsletter.content,
            subscriber.unsubscribeToken,
            newsletter.id,
          ),
        ),
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === 'fulfilled' && result.value.success) {
          sentCount++;
        } else {
          failCount++;
          const error = result.status === 'rejected'
            ? result.reason
            : result.value.error;
          this.logger.error(
            `뉴스레터 #${newsletter.id} → ${batch[j].email} 발송 실패: ${error}`,
          );
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < subscribers.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    newsletter.status = NewsletterStatus.SENT;
    newsletter.sentAt = new Date();
    await this.newsletterRepo.save(newsletter);

    this.logger.log(
      `뉴스레터 #${newsletter.id} "${newsletter.title}" 발송 완료: 성공 ${sentCount}, 실패 ${failCount}`,
    );
  }
}
