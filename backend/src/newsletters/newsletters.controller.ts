import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { NewslettersService } from './newsletters.service';
import { NewsletterStatus } from '../entities/newsletter.entity';

@Controller('api/newsletters')
export class NewslettersController {
  constructor(private readonly newslettersService: NewslettersService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: NewsletterStatus,
  ) {
    return this.newslettersService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.newslettersService.findOne(id);
  }
}
