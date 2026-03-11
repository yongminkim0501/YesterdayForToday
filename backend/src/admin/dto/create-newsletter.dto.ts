import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NewsletterStatus } from '../../entities/newsletter.entity';

export class CreateNewsletterDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

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
