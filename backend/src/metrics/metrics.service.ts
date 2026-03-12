import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly register: client.Registry;

  // Counters
  readonly emailsSent: client.Counter<string>;
  readonly emailsFailed: client.Counter<string>;
  readonly subscriptions: client.Counter<string>;
  readonly unsubscriptions: client.Counter<string>;
  readonly verifications: client.Counter<string>;

  // Gauges
  readonly activeSubscribers: client.Gauge<string>;
  readonly totalNewsletters: client.Gauge<string>;

  // Histograms
  readonly httpRequestDuration: client.Histogram<string>;
  readonly emailSendDuration: client.Histogram<string>;

  constructor() {
    this.register = new client.Registry();
    client.collectDefaultMetrics({ register: this.register });

    this.emailsSent = new client.Counter({
      name: 'newsletter_emails_sent_total',
      help: 'Total number of emails sent successfully',
      labelNames: ['type'],
      registers: [this.register],
    });

    this.emailsFailed = new client.Counter({
      name: 'newsletter_emails_failed_total',
      help: 'Total number of failed email sends',
      registers: [this.register],
    });

    this.subscriptions = new client.Counter({
      name: 'newsletter_subscriptions_total',
      help: 'Total subscription requests',
      registers: [this.register],
    });

    this.unsubscriptions = new client.Counter({
      name: 'newsletter_unsubscriptions_total',
      help: 'Total unsubscriptions',
      registers: [this.register],
    });

    this.verifications = new client.Counter({
      name: 'newsletter_verifications_total',
      help: 'Total email verifications completed',
      registers: [this.register],
    });

    this.activeSubscribers = new client.Gauge({
      name: 'newsletter_active_subscribers',
      help: 'Current number of active verified subscribers',
      registers: [this.register],
    });

    this.totalNewsletters = new client.Gauge({
      name: 'newsletter_total_count',
      help: 'Total number of newsletters in DB',
      registers: [this.register],
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.register],
    });

    this.emailSendDuration = new client.Histogram({
      name: 'newsletter_email_send_duration_seconds',
      help: 'Time taken to send a single email',
      buckets: [0.5, 1, 2, 5, 10, 30],
      registers: [this.register],
    });
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getContentType(): string {
    return this.register.contentType;
  }
}
