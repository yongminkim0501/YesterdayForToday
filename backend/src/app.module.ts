import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { Subscriber } from './entities/subscriber.entity';
import { Post } from './entities/post.entity';
import { Newsletter } from './entities/newsletter.entity';
import { Admin } from './entities/admin.entity';
import { SubscribersModule } from './subscribers/subscribers.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { SeedModule } from './seed/seed.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsMiddleware } from './metrics/metrics.middleware';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 1000, limit: 3 },   // 1초에 3회
        { name: 'medium', ttl: 60000, limit: 20 }, // 1분에 20회
      ],
    }),
    MetricsModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'yesterday_for_today',
      entities: [Subscriber, Post, Newsletter, Admin],
      synchronize: true,
    }),
    SubscribersModule,
    AdminModule,
    AuthModule,
    EmailModule,
    SeedModule,
    SchedulerModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
