import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from '../entities/admin.entity';
import { Post, Company, PostStatus } from '../entities/post.entity';
import { Newsletter, NewsletterStatus } from '../entities/newsletter.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(Newsletter)
    private readonly newsletterRepo: Repository<Newsletter>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    await this.seedAdmin();
    await this.seedPosts();
    await this.seedNewsletter();
  }

  private async seedAdmin() {
    const existing = await this.adminRepo.findOne({ where: { username: 'admin' } });
    if (existing) {
      this.logger.log('Admin already exists, skipping seed.');
      return;
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = this.adminRepo.create({
      username: 'admin',
      password: hashedPassword,
    });
    await this.adminRepo.save(admin);
    this.logger.log('Default admin created (admin / admin123)');
  }

  private async seedPosts() {
    const count = await this.postRepo.count();
    if (count > 0) {
      this.logger.log('Posts already exist, skipping seed.');
      return;
    }

    const posts = [
      {
        title: 'Scaling Distributed Caching at Meta',
        company: Company.META,
        sourceUrl: 'https://engineering.fb.com/2024/distributed-caching/',
        problem:
          '글로벌 규모의 서비스에서 캐시 일관성을 유지하면서도 높은 처리량을 달성하는 것이 어려웠습니다. 기존 캐시 시스템은 데이터센터 간 동기화 지연으로 인해 사용자에게 오래된 데이터가 보여지는 문제가 빈번했습니다.',
        summary:
          'Meta는 분산 캐시 계층을 재설계하여 **Regional Cache**와 **Global Cache**를 분리하고, 비동기 무효화(invalidation) 파이프라인을 도입했습니다. 이를 통해 캐시 히트율을 99.5%로 유지하면서도 평균 무효화 지연을 500ms 이하로 줄였습니다. 핵심은 **lease 기반 프로토콜**로, thundering herd 문제를 방지하면서 캐시 갱신의 원자성을 보장한 것입니다.',
        status: PostStatus.PUBLISHED,
      },
      {
        title: 'How Netflix Optimizes Video Encoding Pipeline',
        company: Company.NETFLIX,
        sourceUrl: 'https://netflixtechblog.com/video-encoding-optimization/',
        problem:
          '수만 개의 영상 타이틀에 대해 다양한 해상도와 비트레이트 조합으로 인코딩해야 하는데, 기존 파이프라인은 비효율적인 리소스 사용으로 인코딩 시간이 길고 비용이 높았습니다.',
        summary:
          'Netflix는 **per-title encoding** 전략을 확장하여 **per-shot encoding**을 도입했습니다. 영상을 장면 단위로 분할한 뒤, 각 장면의 복잡도에 따라 최적의 비트레이트를 동적으로 결정합니다. 이를 통해 동일 품질 대비 **평균 20%의 대역폭 절감**을 달성했으며, 분산 인코딩 클러스터의 autoscaling으로 피크 시간 처리량을 3배 향상시켰습니다.',
        status: PostStatus.PUBLISHED,
      },
      {
        title: 'Amazon DynamoDB: Efficient Data Partitioning',
        company: Company.AMAZON,
        sourceUrl: 'https://aws.amazon.com/blogs/database/dynamodb-partitioning/',
        problem:
          '급격한 트래픽 증가 시 특정 파티션에 핫스팟이 발생하여 전체 테이블 성능이 저하되는 문제가 있었습니다. 기존 해시 기반 파티셔닝만으로는 불균등한 접근 패턴을 처리하기 어려웠습니다.',
        summary:
          'DynamoDB팀은 **적응형 파티셔닝(Adaptive Partitioning)** 알고리즘을 구현했습니다. 각 파티션의 처리량을 실시간 모니터링하고, 핫 파티션을 자동으로 분할하여 부하를 분산합니다. 또한 **Burst Capacity** 메커니즘을 통해 일시적인 트래픽 스파이크를 흡수하며, 사용하지 않은 처리량을 최대 5분간 축적하여 활용합니다.',
        status: PostStatus.SUMMARIZED,
      },
    ];

    for (const postData of posts) {
      const post = this.postRepo.create(postData);
      await this.postRepo.save(post);
    }
    this.logger.log(`Seeded ${posts.length} sample posts`);
  }

  private async seedNewsletter() {
    const count = await this.newsletterRepo.count();
    if (count > 0) {
      this.logger.log('Newsletters already exist, skipping seed.');
      return;
    }

    const posts = await this.postRepo.find({
      where: { status: PostStatus.PUBLISHED },
    });

    const content = `## Meta Engineering Blog

### 분산 캐시 시스템 개선기

**문제 상황**
글로벌 규모의 서비스에서 캐시 일관성을 유지하면서도 높은 처리량을 달성하는 것이 어려웠습니다. 기존 캐시 시스템은 데이터센터 간 동기화 지연으로 인해 사용자에게 오래된 데이터가 보여지는 문제가 빈번했습니다.

**핵심 요약**
Meta는 분산 캐시 계층을 재설계하여 **Regional Cache**와 **Global Cache**를 분리하고, 비동기 무효화 파이프라인을 도입했습니다. 캐시 히트율 99.5%를 유지하면서 평균 무효화 지연을 500ms 이하로 줄였습니다.

[원문 보기](https://engineering.fb.com/2024/distributed-caching/)

---

## Netflix Tech Blog

### 비디오 인코딩 파이프라인 최적화

**문제 상황**
수만 개의 영상 타이틀에 대해 다양한 해상도와 비트레이트 조합으로 인코딩해야 하는데, 기존 파이프라인은 비효율적이었습니다.

**핵심 요약**
Netflix는 **per-shot encoding**을 도입하여 장면 단위로 최적의 비트레이트를 동적으로 결정합니다. 동일 품질 대비 **평균 20%의 대역폭 절감**을 달성했습니다.

[원문 보기](https://netflixtechblog.com/video-encoding-optimization/)
`;

    const newsletter = this.newsletterRepo.create({
      title: '오늘을 만들었던 어제의 기술 #1 - 대규모 시스템의 캐싱과 인코딩',
      content,
      status: NewsletterStatus.DRAFT,
      posts,
    });
    await this.newsletterRepo.save(newsletter);
    this.logger.log('Seeded 1 sample newsletter');
  }
}
