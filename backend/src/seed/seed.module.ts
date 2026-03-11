import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../entities/admin.entity';
import { Post } from '../entities/post.entity';
import { Newsletter } from '../entities/newsletter.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, Post, Newsletter])],
  providers: [SeedService],
})
export class SeedModule {}
