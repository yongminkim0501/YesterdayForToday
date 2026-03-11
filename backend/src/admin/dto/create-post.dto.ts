import { IsEnum, IsNotEmpty, IsString, IsUrl, IsOptional } from 'class-validator';
import { Company, PostStatus } from '../../entities/post.entity';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(Company)
  company: Company;

  @IsUrl()
  sourceUrl: string;

  @IsString()
  @IsNotEmpty()
  problem: string;

  @IsString()
  @IsNotEmpty()
  summary: string;

  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus;
}
