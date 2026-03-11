import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { Subscriber } from './entities/subscriber.entity';
import { Post } from './entities/post.entity';
import { Newsletter } from './entities/newsletter.entity';
import { Admin } from './entities/admin.entity';
import { SubscribersModule } from './subscribers/subscribers.module';
import { NewslettersModule } from './newsletters/newsletters.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { SeedModule } from './seed/seed.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DB_PATH || './data/database.sqlite',
      entities: [Subscriber, Post, Newsletter, Admin],
      synchronize: true,
    }),
    SubscribersModule,
    NewslettersModule,
    AdminModule,
    AuthModule,
    EmailModule,
    SeedModule,
    SchedulerModule,
  ],
})
export class AppModule {}
