import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Newsletter, NewsletterStatus } from '../entities/newsletter.entity';
import { Subscriber } from '../entities/subscriber.entity';
import { SubscribersService } from '../subscribers/subscribers.service';
import { EmailService } from '../email/email.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Newsletter)
    private readonly newsletterRepo: Repository<Newsletter>,
    @InjectRepository(Subscriber)
    private readonly subscriberRepo: Repository<Subscriber>,
    private readonly subscribersService: SubscribersService,
    private readonly emailService: EmailService,
    private readonly metricsService: MetricsService,
  ) {}

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

  /**
   * 매일 오전 6시 (KST) - 드립 발송
   * 각 구독자에게 순서대로 다음 뉴스레터를 발송
   * 모든 뉴스레터를 다 받으면 처음부터 다시 순환
   */
  @Cron('0 6 * * *', { timeZone: 'Asia/Seoul' })
  async handleDripNewsletter() {
    this.logger.log('📬 드립 뉴스레터 발송 시작');

    // SENT 상태인 뉴스레터를 생성일 순으로 가져오기
    const sentNewsletters = await this.newsletterRepo.find({
      where: { status: NewsletterStatus.SENT },
      order: { createdAt: 'ASC' },
    });

    if (sentNewsletters.length === 0) {
      this.logger.log('발송할 뉴스레터가 없습니다.');
      return;
    }

    const totalNewsletters = sentNewsletters.length;
    const subscribers = await this.subscribersService.findActive();

    if (subscribers.length === 0) {
      this.logger.log('활성 구독자가 없습니다.');
      return;
    }

    this.logger.log(
      `구독자 ${subscribers.length}명에게 뉴스레터 발송 (전체 ${totalNewsletters}개 순환)`,
    );

    let sentCount = 0;
    let failCount = 0;
    const batchSize = 10;

    // 구독자별로 발송할 뉴스레터 매핑
    const sendTasks = subscribers.map((subscriber) => {
      const index = subscriber.lastSentNewsletterIndex % totalNewsletters;
      const newsletter = sentNewsletters[index];
      return { subscriber, newsletter, nextIndex: index + 1 };
    });

    // 배치 발송
    for (let i = 0; i < sendTasks.length; i += batchSize) {
      const batch = sendTasks.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(({ subscriber, newsletter }) =>
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
        const { subscriber, nextIndex } = batch[j];

        if (result.status === 'fulfilled' && result.value.success) {
          sentCount++;
          // 다음 인덱스로 업데이트 (총 개수 이상이면 0으로 리셋)
          subscriber.lastSentNewsletterIndex =
            nextIndex >= totalNewsletters ? 0 : nextIndex;
          await this.subscriberRepo.save(subscriber);
        } else {
          failCount++;
          const error =
            result.status === 'rejected'
              ? result.reason
              : result.value.error;
          this.logger.error(
            `드립 발송 실패 → ${subscriber.email}: ${error}`,
          );
        }
      }

      // 배치 간 딜레이
      if (i + batchSize < sendTasks.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    this.logger.log(
      `📬 드립 발송 완료: 성공 ${sentCount}, 실패 ${failCount}`,
    );
  }

  /**
   * 매일 오전 6시 5분 (KST) - 예약 발송
   * SCHEDULED 상태이고 scheduledAt이 현재 시간 이전인 뉴스레터를 전체 구독자에게 발송
   */
  @Cron('5 6 * * *', { timeZone: 'Asia/Seoul' })
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
          const error =
            result.status === 'rejected'
              ? result.reason
              : result.value.error;
          this.logger.error(
            `뉴스레터 #${newsletter.id} → ${batch[j].email} 발송 실패: ${error}`,
          );
        }
      }

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
