import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Newsletter, NewsletterStatus } from '../entities/newsletter.entity';

@Injectable()
export class NewslettersService {
  constructor(
    @InjectRepository(Newsletter)
    private readonly newsletterRepo: Repository<Newsletter>,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: NewsletterStatus;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await this.newsletterRepo.findAndCount({
      where,
      relations: ['posts'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Newsletter> {
    const newsletter = await this.newsletterRepo.findOne({
      where: { id },
      relations: ['posts'],
    });
    if (!newsletter) {
      throw new NotFoundException('뉴스레터를 찾을 수 없습니다.');
    }
    return newsletter;
  }
}
