import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { NewsletterStatus } from '../../entities/newsletter.entity';

export class UpdateNewsletterDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(NewsletterStatus)
  @IsOptional()
  status?: NewsletterStatus;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsArray()
  @IsOptional()
  postIds?: number[];
}
