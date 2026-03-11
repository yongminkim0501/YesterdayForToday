import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { Company, PostStatus } from '../../entities/post.entity';

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(Company)
  @IsOptional()
  company?: Company;

  @IsUrl()
  @IsOptional()
  sourceUrl?: string;

  @IsString()
  @IsOptional()
  problem?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus;
}
