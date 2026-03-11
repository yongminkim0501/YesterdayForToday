# 오늘을 만들었던 어제의 기술

> 빅테크의 기술 블로그 내용을 정리하여 매일 아침 6시에 이메일로 보내드리는 뉴스레터 서비스

Meta, Netflix, Amazon 엔지니어링 블로그의 핵심 내용을 **문제 상황 → 핵심 요약 → 기술 심화**로 정리하여 구독자에게 전달합니다.

---

## 서비스 흐름

```
[빅테크 기술 블로그]
    ↓ 요약/정리
[관리자] → 포스트 등록(Markdown) → DB 저장
    ↓
[뉴스레터 생성] → 포스트 선택 → Markdown 콘텐츠 조합
    ↓
[발송] → DB에서 Markdown 조회 → marked로 HTML 변환 → 이메일 템플릿 래핑 → SMTP 발송
    ↓
[구독자] → 이메일 수신 → 원문 링크로 이동 가능
```

### 구독 플로우

```
사용자 이메일 입력 → 인증 이메일 발송 → 이메일 내 "구독 인증하기" 클릭
    → /verify?token=... 페이지에서 인증 완료 → 뉴스레터 수신 대상 등록
```

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| **Backend** | NestJS, TypeORM, SQLite, JWT, nodemailer, marked |
| **Frontend** | React, TypeScript, React Router v6, Axios, react-markdown |
| **이메일** | Markdown → HTML 변환 (marked), 인라인 CSS 이메일 템플릿 |
| **인프라** | AWS (예정), 로컬 개발 기준 |

---

## 프로젝트 구조

```
YesterdayForToday/
├── backend/                  # NestJS 백엔드 (포트 4000)
│   ├── src/
│   │   ├── admin/            # 관리자 API (JWT 보호)
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.service.ts
│   │   │   └── dto/          # CreatePost, CreateNewsletter 등
│   │   ├── auth/             # JWT 인증 (passport-jwt)
│   │   │   ├── jwt.strategy.ts
│   │   │   └── jwt-auth.guard.ts
│   │   ├── email/            # 이메일 발송 서비스
│   │   │   └── email.service.ts  # Markdown→HTML, 템플릿, SMTP
│   │   ├── entities/         # TypeORM 엔티티
│   │   │   ├── subscriber.entity.ts
│   │   │   ├── post.entity.ts
│   │   │   ├── newsletter.entity.ts
│   │   │   └── admin.entity.ts
│   │   ├── newsletters/      # 공개 뉴스레터 API
│   │   ├── subscribers/      # 구독/인증/해지 API
│   │   ├── seed/             # 시드 데이터 (admin 계정, 샘플 데이터)
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── data/                 # SQLite DB (gitignore)
│   ├── .env                  # 환경변수 (gitignore)
│   └── .env.example
│
├── frontend/                 # React 프론트엔드 (포트 3000)
│   ├── src/
│   │   ├── api/              # Axios API 클라이언트
│   │   │   ├── client.ts     # baseURL, JWT 인터셉터
│   │   │   ├── subscribers.ts
│   │   │   ├── newsletters.ts
│   │   │   ├── posts.ts
│   │   │   └── auth.ts
│   │   ├── components/
│   │   │   ├── common/       # Navbar, Footer, Pagination, Loading
│   │   │   ├── landing/      # HeroSection, SubscriptionForm 등
│   │   │   └── admin/        # AdminLayout, ProtectedRoute
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── pages/
│   │   │   ├── landing/      # 랜딩 페이지
│   │   │   ├── archive/      # 아카이브, 뉴스레터 상세
│   │   │   ├── admin/        # 관리자 (대시보드, 포스트, 뉴스레터, 구독자)
│   │   │   ├── verify/       # 이메일 인증 페이지
│   │   │   └── unsubscribe/  # 구독 해지 페이지
│   │   └── styles/
│   │       └── global.css
│   └── public/
│
└── docs/
    └── PAGE_PLAN.md          # 프론트엔드 페이지 기획서
```

---

## DB 스키마

### subscribers
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER (PK) | 자동 증가 |
| email | TEXT (UNIQUE) | 구독자 이메일 |
| isActive | BOOLEAN | 활성 여부 (해지 시 false) |
| isVerified | BOOLEAN | 이메일 인증 여부 |
| verificationToken | TEXT | 이메일 인증 토큰 |
| unsubscribeToken | TEXT (UNIQUE) | 구독 해지 토큰 (UUID) |

### posts
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER (PK) | 자동 증가 |
| title | TEXT | 원문 제목 |
| company | TEXT | META / NETFLIX / AMAZON |
| sourceUrl | TEXT | 원문 URL |
| problem | TEXT | 문제 상황 |
| summary | TEXT | 핵심 요약 (Markdown) |
| status | TEXT | DRAFT / SUMMARIZED / PUBLISHED |

### newsletters
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER (PK) | 자동 증가 |
| title | TEXT | 뉴스레터 제목 |
| content | TEXT | 전체 콘텐츠 (Markdown) |
| status | TEXT | DRAFT / SCHEDULED / SENT |
| scheduledAt | DATETIME | 발송 예약 시간 |
| sentAt | DATETIME | 실제 발송 시간 |

---

## API 엔드포인트

### 공개 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/subscribers` | 구독 신청 → 인증 이메일 발송 |
| GET | `/api/subscribers/verify-email?token=` | 이메일 인증 처리 |
| POST | `/api/subscribers/unsubscribe` | 구독 해지 |
| GET | `/api/subscribers/verify-token?token=` | 해지 토큰 검증 |
| GET | `/api/newsletters` | 뉴스레터 목록 (페이지네이션) |
| GET | `/api/newsletters/:id` | 뉴스레터 상세 |

### 관리자 API (JWT 필요)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/admin/login` | 로그인 → JWT 발급 |
| GET | `/api/admin/stats` | 대시보드 통계 |
| POST/GET/PUT/DELETE | `/api/admin/posts` | 포스트 CRUD |
| POST/GET/PUT/DELETE | `/api/admin/newsletters` | 뉴스레터 CRUD |
| POST | `/api/admin/newsletters/:id/send` | 전체 구독자에게 발송 |
| POST | `/api/admin/newsletters/:id/test-send` | 테스트 발송 |
| GET | `/api/admin/newsletters/:id/preview` | HTML 미리보기 |
| GET/POST/DELETE | `/api/admin/subscribers` | 구독자 관리 |
| GET | `/api/admin/subscribers/export` | CSV 내보내기 |

---

## 이메일 템플릿

뉴스레터 콘텐츠는 DB에 **Markdown**으로 저장되며, 발송 시 커스텀 파서로 변환됩니다.

### Markdown 저장 형식

```markdown
## Meta Engineering Blog

### How Meta trains large language models at scale

**문제 상황**

메타는 Llama 3 학습을 위해 수만 개의 GPU를 ...

**핵심 요약**

메타는 24K GPU 클러스터 두 개를 각각 다른 네트워크 기술로 ...

**RoCE와 InfiniBand**

RoCE는 기존 이더넷 인프라 위에서 RDMA를 구현하는 기술입니다 ...

[원문 보기](https://engineering.fb.com/...)
```

### 이메일 변환 결과

```
┌─────────────────────────────────────┐
│  [검은 배경]                          │
│  오늘을 만들었던 어제의 기술 (흰 볼드)    │
├─────────────────────────────────────┤
│                                     │
│  META              ← 회색 레터스페이싱  │
│  How Meta trains...  ← 큰 볼드 제목    │
│                                     │
│  ┌──────────┐                       │
│  │ 문제 상황  │  ← 검은 배경 흰 글씨 라벨 │
│  └──────────┘                       │
│  본문 텍스트 ...                      │
│                                     │
│  ┌──────────┐                       │
│  │ 핵심 요약  │                       │
│  └──────────┘                       │
│  본문 텍스트 ...                      │
│                                     │
│  ┌──────────────────┐               │
│  │ RoCE와 InfiniBand │               │
│  └──────────────────┘               │
│  기술 심화 텍스트 ...                  │
│                                     │
│  [ 원문 보기 → ]    ← 아웃라인 버튼     │
│                                     │
├─────────────────────────────────────┤
│  [검은 배경]                          │
│  © 오늘을 만들었던 어제의 기술           │
└─────────────────────────────────────┘
```

---

## 라우팅

| 경로 | 페이지 |
|------|--------|
| `/` | 랜딩 (서비스 소개 + 구독 폼) |
| `/archive` | 뉴스레터 아카이브 |
| `/archive/:id` | 뉴스레터 상세 |
| `/verify?token=` | 이메일 인증 |
| `/unsubscribe?token=` | 구독 해지 |
| `/admin/login` | 관리자 로그인 |
| `/admin` | 관리자 대시보드 |
| `/admin/posts` | 포스트 관리 |
| `/admin/newsletters` | 뉴스레터 관리 |
| `/admin/subscribers` | 구독자 관리 |

---

## 시작하기

### 1. 백엔드

```bash
cd backend
cp .env.example .env
# .env에 SMTP 설정 입력 (Gmail 앱 비밀번호 필요)
npm install
npm run start:dev    # http://localhost:4000
```

### 2. 프론트엔드

```bash
cd frontend
npm install
npm start            # http://localhost:3000
```

### 3. 기본 관리자 계정

서버 첫 실행 시 자동 생성됩니다.

- **ID**: `admin`
- **PW**: `admin123`

---

## 환경변수 (.env)

```env
DB_PATH=./data/database.sqlite
JWT_SECRET=your-secret-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password    # Google 앱 비밀번호
FRONTEND_URL=http://localhost:3000
```

---

## 시드 데이터

DB에 90개의 뉴스레터가 사전 등록되어 있습니다.

| 회사 | 개수 | 주요 주제 |
|------|------|-----------|
| Meta | 30 | 분산 캐싱, Threads, PyTorch, LLaMA, TAO, React Native 등 |
| Netflix | 30 | Zuul, Chaos Engineering, Open Connect, Titus, Iceberg 등 |
| Amazon | 30 | DynamoDB, Aurora, Lambda, Firecracker, Graviton, SageMaker 등 |

모든 원문 링크는 실제 접속 가능한 URL로 매핑되어 있습니다.

---

## 문의

yongmingim166@gmail.com
