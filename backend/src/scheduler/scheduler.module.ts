import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Newsletter } from '../entities/newsletter.entity';
import { SubscribersModule } from '../subscribers/subscribers.module';
import { EmailModule } from '../email/email.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Newsletter]),
    SubscribersModule,
    EmailModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
