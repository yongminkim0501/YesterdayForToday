/**
 * 빅테크 엔지니어링 블로그 크롤링 스크립트
 *
 * 사용법: npx ts-node scripts/crawl-blogs.ts
 *
 * 각 회사(Meta, Netflix, Amazon) 엔지니어링 블로그에서
 * 최신 포스트를 크롤링하고, Claude API로 한국어 요약을 생성하여
 * DB에 포스트 + 뉴스레터로 저장합니다.
 */

import axios from 'axios';
import * as https from 'https';
import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';
import { DataSource } from 'typeorm';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// ── 설정 ──────────────────────────────────────────────

const POSTS_PER_COMPANY = 30;

const BLOG_CONFIGS = {
  META: {
    feedUrl: 'https://engineering.fb.com/feed/',
    archiveUrls: Array.from({ length: 5 }, (_, i) =>
      `https://engineering.fb.com/feed/?paged=${i + 1}`
    ),
    company: 'META',
  },
  NETFLIX: {
    // Netflix Tech Blog은 Medium 기반, API로 접근
    archiveUrls: Array.from({ length: 5 }, (_, i) =>
      `https://netflixtechblog.com/archive/${2026 - i}`
    ),
    feedUrl: '',
    company: 'NETFLIX',
  },
  AMAZON: {
    feedUrl: 'https://aws.amazon.com/blogs/architecture/feed/',
    archiveUrls: Array.from({ length: 5 }, (_, i) =>
      `https://aws.amazon.com/blogs/architecture/feed/?paged=${i + 1}`
    ),
    company: 'AMAZON',
  },
};

interface BlogPost {
  title: string;
  url: string;
  company: string;
}

interface SummarizedPost {
  title: string;
  url: string;
  company: string;
  problem: string;
  summary: string;
}

// ── DB 연결 ────────────────────────────────────────────

function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'yesterday_for_today',
    synchronize: false,
  });
}

// ── 크롤링 함수 ────────────────────────────────────────

async function fetchWithRetry(url: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const { data } = await axios.get(url, {
        timeout: 15000,
        httpsAgent,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      return data;
    } catch (e) {
      if (i === retries - 1) throw e;
      console.log(`  재시도 ${i + 1}/${retries}: ${url}`);
      await sleep(2000);
    }
  }
  throw new Error('unreachable');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── RSS 파싱 ───────────────────────────────────────────

function parseRssFeed(xml: string): { title: string; url: string }[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: { title: string; url: string }[] = [];
  $('item').each((_, el) => {
    const title = $(el).find('title').first().text().trim();
    const url = $(el).find('link').first().text().trim();
    if (title && url) {
      items.push({ title, url });
    }
  });
  return items;
}

// ── Meta 크롤링 ────────────────────────────────────────

async function crawlMeta(): Promise<BlogPost[]> {
  console.log('\n📘 Meta Engineering Blog 크롤링...');
  const posts: BlogPost[] = [];

  for (const feedUrl of BLOG_CONFIGS.META.archiveUrls) {
    if (posts.length >= POSTS_PER_COMPANY) break;
    try {
      const xml = await fetchWithRetry(feedUrl);
      const items = parseRssFeed(xml);
      for (const item of items) {
        if (posts.length >= POSTS_PER_COMPANY) break;
        if (!posts.some((p) => p.url === item.url)) {
          posts.push({ ...item, company: 'META' });
        }
      }
      console.log(`  피드 ${feedUrl}: ${items.length}개 발견 (누적 ${posts.length}개)`);
    } catch (e: any) {
      console.log(`  피드 실패: ${feedUrl} - ${e.message}`);
    }
    await sleep(1000);
  }

  return posts.slice(0, POSTS_PER_COMPANY);
}

// ── Netflix 크롤링 ─────────────────────────────────────

async function crawlNetflix(): Promise<BlogPost[]> {
  console.log('\n🎬 Netflix Tech Blog 크롤링...');
  const posts: BlogPost[] = [];

  // Netflix Tech Blog 메인 페이지 크롤링
  try {
    const html = await fetchWithRetry('https://netflixtechblog.com/');
    const $ = cheerio.load(html);

    // Medium 기반 블로그에서 링크 추출
    $('a[data-testid="postPreview-title"], h2 a, h3 a, article a').each((_, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();
      if (
        href &&
        title &&
        title.length > 10 &&
        href.includes('netflixtechblog.com') &&
        !posts.some((p) => p.url === href)
      ) {
        posts.push({ title, url: href, company: 'NETFLIX' });
      }
    });
    console.log(`  메인 페이지: ${posts.length}개 발견`);
  } catch (e: any) {
    console.log(`  메인 페이지 실패: ${e.message}`);
  }

  // 추가로 연도별 아카이브 페이지 크롤링
  if (posts.length < POSTS_PER_COMPANY) {
    for (const archiveUrl of BLOG_CONFIGS.NETFLIX.archiveUrls) {
      if (posts.length >= POSTS_PER_COMPANY) break;
      try {
        const html = await fetchWithRetry(archiveUrl);
        const $ = cheerio.load(html);
        $('a').each((_, el) => {
          const href = $(el).attr('href');
          const title = $(el).text().trim();
          if (
            href &&
            title &&
            title.length > 10 &&
            href.includes('netflixtechblog.com') &&
            !href.includes('/archive') &&
            !posts.some((p) => p.url === href)
          ) {
            posts.push({ title, url: href, company: 'NETFLIX' });
          }
        });
        console.log(`  아카이브 ${archiveUrl}: 누적 ${posts.length}개`);
      } catch (e: any) {
        console.log(`  아카이브 실패: ${archiveUrl} - ${e.message}`);
      }
      await sleep(1000);
    }
  }

  return posts.slice(0, POSTS_PER_COMPANY);
}

// ── Amazon 크롤링 ──────────────────────────────────────

async function crawlAmazon(): Promise<BlogPost[]> {
  console.log('\n📦 Amazon Architecture Blog 크롤링...');
  const posts: BlogPost[] = [];

  for (const feedUrl of BLOG_CONFIGS.AMAZON.archiveUrls) {
    if (posts.length >= POSTS_PER_COMPANY) break;
    try {
      const xml = await fetchWithRetry(feedUrl);
      const items = parseRssFeed(xml);
      for (const item of items) {
        if (posts.length >= POSTS_PER_COMPANY) break;
        if (!posts.some((p) => p.url === item.url)) {
          posts.push({ ...item, company: 'AMAZON' });
        }
      }
      console.log(`  피드 ${feedUrl}: ${items.length}개 발견 (누적 ${posts.length}개)`);
    } catch (e: any) {
      console.log(`  피드 실패: ${feedUrl} - ${e.message}`);
    }
    await sleep(1000);
  }

  return posts.slice(0, POSTS_PER_COMPANY);
}

// ── 블로그 본문 추출 ───────────────────────────────────

async function extractArticleContent(url: string): Promise<string> {
  const html = await fetchWithRetry(url);
  const $ = cheerio.load(html);

  // 불필요한 요소 제거
  $('script, style, nav, header, footer, .sidebar, .comments, .related').remove();

  // 본문 추출 (블로그별 셀렉터)
  let content = '';

  if (url.includes('engineering.fb.com')) {
    content = $('article, .entry-content, .post-content').text();
  } else if (url.includes('netflixtechblog.com')) {
    content = $('article, .meteredContent, section').text();
  } else if (url.includes('aws.amazon.com')) {
    content = $('article, .blog-post, .aws-blog-content, main').text();
  }

  if (!content) {
    content = $('body').text();
  }

  // 텍스트 정리: 연속 공백/줄바꿈 제거, 최대 4000자
  content = content.replace(/\s+/g, ' ').trim();
  return content.slice(0, 4000);
}

// ── Claude API 요약 ────────────────────────────────────

async function summarizeWithClaude(
  client: Anthropic,
  title: string,
  content: string,
  company: string,
): Promise<{ problem: string; summary: string }> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `당신은 빅테크 엔지니어링 블로그를 한국어로 요약하는 전문가입니다.

아래 ${company} 엔지니어링 블로그 글을 읽고, 두 가지를 작성해주세요:

1. **문제 상황** (2-3문장): 이 글이 다루는 기술적 문제/도전과제를 설명
2. **핵심 요약** (3-5문장): 어떤 기술/접근법으로 문제를 해결했는지, 핵심 성과/수치 포함

규칙:
- 한국어로 자연스럽게 작성
- 기술 용어는 영어 원문 유지 (예: Cache, Partitioning, Encoding)
- 핵심 수치/성과가 있으면 **굵게** 표시
- 각각 한 문단으로, 줄바꿈 없이

제목: ${title}
본문:
${content}

다음 JSON 형식으로만 응답하세요:
{"problem": "문제 상황 텍스트", "summary": "핵심 요약 텍스트"}`,
      },
    ],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    // JSON 파싱 시도
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // JSON 파싱 실패 시 텍스트 분리
  }

  return {
    problem: '(요약 생성 실패)',
    summary: text,
  };
}

// ── 뉴스레터 콘텐츠 생성 ──────────────────────────────

function buildNewsletterContent(
  post: SummarizedPost,
  companyLabel: string,
): string {
  return `## ${companyLabel}

### ${post.title}

**문제 상황**
${post.problem}

**핵심 요약**
${post.summary}

[원문 보기](${post.url})`;
}

function getCompanyLabel(company: string): string {
  switch (company) {
    case 'META':
      return 'Meta Engineering Blog';
    case 'NETFLIX':
      return 'Netflix Tech Blog';
    case 'AMAZON':
      return 'Amazon Tech Blog';
    default:
      return company;
  }
}

// ── 메인 실행 ──────────────────────────────────────────

async function main() {
  console.log('🚀 빅테크 엔지니어링 블로그 크롤링 시작\n');

  // API 키 확인
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY 환경변수가 필요합니다.');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  // DB 연결
  const ds = createDataSource();
  await ds.initialize();
  console.log('✅ DB 연결 완료');

  // 기존 포스트 URL 확인 (중복 방지)
  const existingUrls: Set<string> = new Set(
    (
      await ds.query('SELECT "sourceUrl" FROM posts')
    ).map((r: any) => r.sourceUrl),
  );
  console.log(`📋 기존 포스트: ${existingUrls.size}개\n`);

  // 기존 뉴스레터 수 확인 (번호 매기기용)
  const [{ count: existingNewsletterCount }] = await ds.query(
    'SELECT count(*) FROM newsletters',
  );
  let newsletterNumber = parseInt(existingNewsletterCount) + 1;

  // 크롤링
  const allPosts: BlogPost[] = [];
  const metaPosts = await crawlMeta();
  const netflixPosts = await crawlNetflix();
  const amazonPosts = await crawlAmazon();

  allPosts.push(...metaPosts, ...netflixPosts, ...amazonPosts);

  // 중복 제거
  const newPosts = allPosts.filter((p) => !existingUrls.has(p.url));
  console.log(
    `\n📊 크롤링 결과: Meta ${metaPosts.length}, Netflix ${netflixPosts.length}, Amazon ${amazonPosts.length}`,
  );
  console.log(`   신규 포스트: ${newPosts.length}개 (중복 제외)`);

  // 요약 + DB 저장
  let saved = 0;
  for (const post of newPosts) {
    try {
      console.log(`\n📝 [${saved + 1}/${newPosts.length}] ${post.company}: ${post.title}`);

      // 본문 추출
      console.log('   본문 추출 중...');
      const content = await extractArticleContent(post.url);
      if (content.length < 100) {
        console.log('   ⚠️ 본문이 너무 짧아 건너뜀');
        continue;
      }

      // Claude 요약
      console.log('   요약 생성 중...');
      const { problem, summary } = await summarizeWithClaude(
        client,
        post.title,
        content,
        post.company,
      );

      if (problem === '(요약 생성 실패)') {
        console.log('   ⚠️ 요약 실패, 건너뜀');
        continue;
      }

      // 포스트 저장
      const [insertedPost] = await ds.query(
        `INSERT INTO posts (title, company, "sourceUrl", problem, summary, status)
         VALUES ($1, $2, $3, $4, $5, 'PUBLISHED')
         RETURNING id`,
        [post.title, post.company, post.url, problem, summary],
      );

      // 뉴스레터 콘텐츠 생성
      const newsletterContent = buildNewsletterContent(
        { ...post, problem, summary },
        getCompanyLabel(post.company),
      );

      const newsletterTitle = `오늘을 만들었던 어제의 기술 #${newsletterNumber} - ${post.title}`;

      // 뉴스레터 저장
      const [insertedNewsletter] = await ds.query(
        `INSERT INTO newsletters (title, content, status)
         VALUES ($1, $2, 'SENT')
         RETURNING id`,
        [newsletterTitle, newsletterContent],
      );

      // 뉴스레터-포스트 연결
      await ds.query(
        `INSERT INTO newsletter_posts ("newsletterId", "postId") VALUES ($1, $2)`,
        [insertedNewsletter.id, insertedPost.id],
      );

      console.log(`   ✅ 저장 완료 (Post #${insertedPost.id}, Newsletter #${insertedNewsletter.id})`);
      saved++;
      newsletterNumber++;

      // API 호출 간 딜레이 (rate limit 방지)
      await sleep(1500);
    } catch (e: any) {
      console.error(`   ❌ 오류: ${e.message}`);
      await sleep(2000);
    }
  }

  console.log(`\n🎉 완료! ${saved}개 포스트 + 뉴스레터 저장됨`);

  // 최종 통계
  const [stats] = await ds.query(
    `SELECT company, count(*) as cnt FROM posts GROUP BY company ORDER BY company`,
  );
  console.log('\n📊 최종 포스트 현황:');
  const statRows = await ds.query(
    `SELECT company, count(*) as cnt FROM posts GROUP BY company ORDER BY company`,
  );
  for (const row of statRows) {
    console.log(`   ${row.company}: ${row.cnt}개`);
  }

  await ds.destroy();
}

main().catch((e) => {
  console.error('치명적 오류:', e);
  process.exit(1);
});
