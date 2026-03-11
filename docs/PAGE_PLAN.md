# 프론트엔드 페이지 기획서

> **서비스명:** 오늘을 만들었던 어제의 기술
> **서비스 요약:** Meta, Netflix, Amazon 등 빅테크 기업 블로그 포스트를 요약하여 매일 오전 6시에 이메일 뉴스레터로 발송하는 서비스
> **콘텐츠 포맷:** 문제 상황 → 요약 (원문의 20%) → 원문 링크
> **기술 스택:** React (프론트엔드), NestJS (백엔드), AWS (클라우드)

---

## 목차

1. [랜딩/홈 페이지](#1-랜딩홈-페이지)
2. [뉴스레터 아카이브 페이지](#2-뉴스레터-아카이브-페이지)
3. [뉴스레터 상세 페이지](#3-뉴스레터-상세-페이지)
4. [관리자 페이지](#4-관리자-페이지)
5. [구독 해지 페이지](#5-구독-해지-페이지)
6. [이메일 템플릿 구조](#6-이메일-템플릿-구조)

---

## 1. 랜딩/홈 페이지

| 항목 | 내용 |
|------|------|
| **페이지명** | 랜딩/홈 페이지 |
| **URL 경로** | `/` |
| **목적** | 서비스 소개 및 이메일 구독 유도 |

### 레이아웃 설명

상단 네비게이션 바, Hero 섹션, 서비스 소개 섹션, 구독 폼 섹션, 최신 뉴스레터 미리보기 섹션, 하단 푸터로 구성된 단일 페이지 레이아웃. 스크롤 시 자연스럽게 서비스 가치를 전달하고 구독으로 전환하는 흐름.

### 주요 컴포넌트

#### 1.1 `Navbar`
- 서비스 로고 ("오늘을 만들었던 어제의 기술")
- 네비게이션 링크: 홈, 아카이브, 구독하기(앵커 링크)
- 반응형 햄버거 메뉴 (모바일)

#### 1.2 `HeroSection`
- 메인 헤드라인: "빅테크의 기술 블로그, 매일 아침 6시에 요약해 드립니다"
- 서브 헤드라인: "Meta, Netflix, Amazon의 엔지니어링 블로그를 한국어로 요약하여 이메일로 전달합니다"
- CTA 버튼: "무료로 구독하기" → 구독 폼 섹션으로 스크롤

#### 1.3 `ServiceIntroSection`
- 3개의 특징 카드로 구성:
  - **카드 1:** "매일 오전 6시 발송" — 출근 전 읽기 좋은 시간에 배달
  - **카드 2:** "원문의 20% 핵심 요약" — 문제 상황, 해결 방법, 핵심 내용만 정리
  - **카드 3:** "빅테크 엔지니어링 블로그" — Meta, Netflix, Amazon 공식 블로그 기반
- 콘텐츠 포맷 시각화: `문제 상황 → 핵심 요약 → 원문 링크`

#### 1.4 `SubscriptionForm`
- 이메일 입력 필드 (placeholder: "이메일 주소를 입력하세요")
- 구독 버튼: "구독하기"
- 이메일 유효성 검사 (형식 체크)
- 상태 메시지 표시:
  - 성공: "구독이 완료되었습니다! 매일 아침 6시에 뉴스레터를 보내드릴게요."
  - 중복: "이미 구독 중인 이메일입니다."
  - 오류: "구독 처리 중 문제가 발생했습니다. 다시 시도해 주세요."
- 개인정보 수집 동의 체크박스

#### 1.5 `RecentNewsletterPreview`
- 최근 뉴스레터 3건의 미리보기 카드
- 각 카드: 발행 날짜, 제목, 요약 첫 2줄, "자세히 보기" 링크
- "전체 아카이브 보기" 링크 → `/archive`

#### 1.6 `Footer`
- 서비스명 및 간단한 소개
- 링크: 아카이브, 구독 해지
- 저작권 표시

### 주요 기능/인터랙션

- 이메일 입력 시 실시간 유효성 검사 (debounce 적용)
- 구독 버튼 클릭 시 로딩 스피너 표시
- 구독 완료 시 성공 토스트 메시지
- 스크롤 애니메이션 (서비스 소개 카드 fade-in)

### 백엔드 API 연동 데이터

| API | Method | 설명 |
|-----|--------|------|
| `/api/subscribers` | `POST` | 이메일 구독 등록. Body: `{ email: string }` |
| `/api/newsletters?limit=3&sort=latest` | `GET` | 최근 뉴스레터 3건 조회. Response: `{ id, title, summary, publishedAt }[]` |

---

## 2. 뉴스레터 아카이브 페이지

| 항목 | 내용 |
|------|------|
| **페이지명** | 뉴스레터 아카이브 |
| **URL 경로** | `/archive` |
| **목적** | 과거 발행된 뉴스레터 목록 탐색 |

### 레이아웃 설명

상단 네비게이션 바, 페이지 타이틀 영역, 필터/검색 바, 뉴스레터 카드 목록 (그리드 또는 리스트), 페이지네이션, 푸터로 구성.

### 주요 컴포넌트

#### 2.1 `ArchiveHeader`
- 페이지 제목: "뉴스레터 아카이브"
- 설명 텍스트: "지금까지 발행된 뉴스레터를 모아볼 수 있습니다"

#### 2.2 `ArchiveFilterBar`
- 기업별 필터 태그: 전체 / Meta / Netflix / Amazon
- 날짜 범위 필터 (월별 선택)
- 검색 입력 필드 (키워드 검색, placeholder: "키워드로 검색하세요")

#### 2.3 `NewsletterCard`
- 발행 날짜 (예: "2026년 3월 10일")
- 뉴스레터 제목
- 포함된 블로그 포스트 수 (예: "3개의 포스트 요약")
- 출처 기업 태그 뱃지 (Meta, Netflix, Amazon)
- 요약 미리보기 텍스트 (2줄)
- 클릭 시 `/archive/:id`로 이동

#### 2.4 `Pagination`
- 페이지 번호 버튼
- 이전/다음 버튼
- 페이지당 10건 표시

### 주요 기능/인터랙션

- 필터 태그 클릭 시 해당 기업 뉴스레터만 표시 (query parameter 반영)
- 검색 입력 시 debounce 적용 후 결과 표시
- 날짜 필터 변경 시 URL query parameter 업데이트 (뒤로가기 지원)
- 무한 스크롤 또는 페이지네이션 선택 가능 (초기 구현은 페이지네이션)

### 백엔드 API 연동 데이터

| API | Method | 설명 |
|-----|--------|------|
| `/api/newsletters` | `GET` | 뉴스레터 목록 조회. Query: `page`, `limit`, `company`, `keyword`, `month` |

Response 예시:
```json
{
  "data": [
    {
      "id": 1,
      "title": "2026년 3월 10일 뉴스레터",
      "summary": "오늘의 요약 미리보기...",
      "companies": ["Meta", "Netflix"],
      "postCount": 3,
      "publishedAt": "2026-03-10T06:00:00Z"
    }
  ],
  "meta": {
    "total": 120,
    "page": 1,
    "limit": 10,
    "totalPages": 12
  }
}
```

---

## 3. 뉴스레터 상세 페이지

| 항목 | 내용 |
|------|------|
| **페이지명** | 뉴스레터 상세 |
| **URL 경로** | `/archive/:id` |
| **목적** | 개별 뉴스레터 콘텐츠 열람 |

### 레이아웃 설명

상단 네비게이션 바, 뉴스레터 메타 정보 영역, 본문 콘텐츠 영역 (Markdown 렌더링), 하단 네비게이션 (이전/다음 뉴스레터), 구독 유도 배너, 푸터로 구성. 읽기에 최적화된 단일 컬럼 레이아웃.

### 주요 컴포넌트

#### 3.1 `NewsletterMeta`
- 발행 날짜
- 뉴스레터 제목
- 출처 기업 태그 뱃지들
- 포함된 포스트 수

#### 3.2 `NewsletterContent`
- Markdown을 HTML로 변환하여 렌더링 (`marked` 또는 `react-markdown` 사용)
- 콘텐츠 구조 (포스트별 반복):
  - **포스트 제목** (원문 블로그 제목)
  - **출처 표시** (예: "Meta Engineering Blog")
  - **문제 상황** — 해당 포스트가 다루는 기술적 문제
  - **핵심 요약** — 원문의 20% 분량으로 정리된 내용
  - **원문 링크** — "원문 보기" 버튼
- 코드 블록 구문 강조 (syntax highlighting)
- 이미지 반응형 처리

#### 3.3 `NewsletterNavigation`
- "이전 뉴스레터" / "다음 뉴스레터" 링크 버튼
- "목록으로 돌아가기" 버튼 → `/archive`

#### 3.4 `SubscriptionBanner`
- 비구독자를 위한 구독 유도 배너
- "이 뉴스레터를 매일 받아보세요" 메시지
- 인라인 이메일 구독 폼 (이메일 입력 + 구독 버튼)

### 주요 기능/인터랙션

- Markdown 콘텐츠를 안전하게 HTML로 변환 (XSS 방지를 위한 sanitize 처리)
- 원문 링크 클릭 시 새 탭에서 열기
- 이전/다음 뉴스레터 키보드 단축키 (← →)
- 상단 스크롤 버튼

### 백엔드 API 연동 데이터

| API | Method | 설명 |
|-----|--------|------|
| `/api/newsletters/:id` | `GET` | 뉴스레터 상세 조회 |

Response 예시:
```json
{
  "id": 1,
  "title": "2026년 3월 10일 뉴스레터",
  "content": "## Meta Engineering Blog\n### 분산 캐시 시스템 개선기\n**문제 상황**\n...",
  "companies": ["Meta", "Netflix"],
  "postCount": 3,
  "publishedAt": "2026-03-10T06:00:00Z",
  "prevNewsletter": { "id": 0, "title": "..." },
  "nextNewsletter": { "id": 2, "title": "..." }
}
```

---

## 4. 관리자 페이지

| 항목 | 내용 |
|------|------|
| **페이지명** | 관리자 대시보드 |
| **URL 경로** | `/admin` (로그인: `/admin/login`) |
| **목적** | 블로그 포스트 관리, 뉴스레터 생성/발송, 구독자 관리 |

### 레이아웃 설명

좌측 사이드바 네비게이션 + 우측 메인 콘텐츠 영역의 대시보드 레이아웃. 사이드바에서 메뉴 선택 시 메인 영역이 변경됨. 상단에는 관리자 정보와 로그아웃 버튼.

### 하위 페이지 구성

관리자 페이지는 다음 4개의 하위 섹션으로 구성:

---

#### 4-A. 관리자 로그인 (`/admin/login`)

##### 컴포넌트: `AdminLoginForm`
- 아이디 입력 필드
- 비밀번호 입력 필드
- 로그인 버튼
- 로그인 실패 시 오류 메시지 표시

##### API 연동

| API | Method | 설명 |
|-----|--------|------|
| `/api/admin/login` | `POST` | 관리자 로그인. Body: `{ username, password }`. Response: JWT 토큰 |

---

#### 4-B. 대시보드 홈 (`/admin`)

##### 컴포넌트: `DashboardStats`
- 통계 카드:
  - 총 구독자 수
  - 오늘 신규 구독자 수
  - 총 발행 뉴스레터 수
  - 등록된 블로그 포스트 수
- 최근 활동 타임라인 (최근 구독/해지/발송 이력)

##### API 연동

| API | Method | 설명 |
|-----|--------|------|
| `/api/admin/stats` | `GET` | 대시보드 통계 데이터 조회 |

---

#### 4-C. 블로그 포스트 관리 (`/admin/posts`)

##### 컴포넌트: `PostList`
- 포스트 목록 테이블
  - 열: 제목, 출처 기업, 원문 URL, 요약 상태, 등록일, 액션
  - 요약 상태 뱃지: "미요약" / "요약 완료" / "발송 완료"
- 상단 필터: 기업별 / 상태별 필터
- "새 포스트 추가" 버튼

##### 컴포넌트: `PostForm` (모달 또는 별도 페이지)
- 원문 URL 입력 필드
- 출처 기업 선택 (드롭다운: Meta / Netflix / Amazon)
- 원문 제목 입력 필드
- 문제 상황 텍스트 영역 (Markdown 지원)
- 핵심 요약 텍스트 영역 (Markdown 지원)
- Markdown 미리보기 토글
- 저장 / 취소 버튼

##### API 연동

| API | Method | 설명 |
|-----|--------|------|
| `/api/admin/posts` | `GET` | 포스트 목록 조회. Query: `page`, `limit`, `company`, `status` |
| `/api/admin/posts` | `POST` | 새 포스트 등록 |
| `/api/admin/posts/:id` | `PUT` | 포스트 수정 |
| `/api/admin/posts/:id` | `DELETE` | 포스트 삭제 |

---

#### 4-D. 뉴스레터 관리 (`/admin/newsletters`)

##### 컴포넌트: `NewsletterList`
- 뉴스레터 목록 테이블
  - 열: 제목, 발행 날짜, 포함 포스트 수, 상태, 액션
  - 상태 뱃지: "작성 중" / "발송 예약" / "발송 완료"
- "새 뉴스레터 작성" 버튼

##### 컴포넌트: `NewsletterEditor` (`/admin/newsletters/new`, `/admin/newsletters/:id/edit`)
- 뉴스레터 제목 입력 필드
- 포스트 선택 영역:
  - 요약 완료된 포스트 목록에서 체크박스로 선택
  - 드래그 앤 드롭으로 순서 변경
- 선택된 포스트 미리보기 (Markdown 렌더링)
- 전체 뉴스레터 미리보기 버튼 (이메일 형태로 렌더링)
- 발송 예약 날짜/시간 설정 (기본값: 다음 날 오전 6시)
- 저장 (임시 저장) / 발송 예약 / 즉시 발송 버튼
- 테스트 발송 버튼 (관리자 이메일로 테스트 발송)

##### API 연동

| API | Method | 설명 |
|-----|--------|------|
| `/api/admin/newsletters` | `GET` | 뉴스레터 목록 조회 |
| `/api/admin/newsletters` | `POST` | 새 뉴스레터 생성 |
| `/api/admin/newsletters/:id` | `PUT` | 뉴스레터 수정 |
| `/api/admin/newsletters/:id` | `DELETE` | 뉴스레터 삭제 |
| `/api/admin/newsletters/:id/send` | `POST` | 뉴스레터 발송 (즉시 또는 예약) |
| `/api/admin/newsletters/:id/test-send` | `POST` | 테스트 발송 |
| `/api/admin/newsletters/:id/preview` | `GET` | 이메일 형태 미리보기 HTML 반환 |

---

#### 4-E. 구독자 관리 (`/admin/subscribers`)

##### 컴포넌트: `SubscriberList`
- 구독자 목록 테이블
  - 열: 이메일, 구독 날짜, 상태 (활성/해지), 액션
  - 상태 필터: 전체 / 활성 / 해지
- 검색 필드 (이메일 검색)
- CSV 내보내기 버튼
- 수동 구독자 추가 버튼

##### 컴포넌트: `SubscriberAddModal`
- 이메일 입력 필드
- 추가 버튼

##### API 연동

| API | Method | 설명 |
|-----|--------|------|
| `/api/admin/subscribers` | `GET` | 구독자 목록 조회. Query: `page`, `limit`, `status`, `keyword` |
| `/api/admin/subscribers` | `POST` | 수동 구독자 추가 |
| `/api/admin/subscribers/:id` | `DELETE` | 구독자 삭제 |
| `/api/admin/subscribers/export` | `GET` | CSV 내보내기 |

---

### 관리자 페이지 공통 컴포넌트

#### `AdminSidebar`
- 메뉴 항목:
  - 대시보드 (`/admin`)
  - 블로그 포스트 관리 (`/admin/posts`)
  - 뉴스레터 관리 (`/admin/newsletters`)
  - 구독자 관리 (`/admin/subscribers`)
- 현재 페이지 하이라이트
- 하단 로그아웃 버튼

#### `AdminHeader`
- 현재 페이지 제목 (breadcrumb)
- 관리자 이름 표시
- 로그아웃 버튼

### 관리자 페이지 주요 기능/인터랙션

- JWT 기반 인증 (로그인 시 토큰 발급, localStorage 저장)
- 인증되지 않은 접근 시 `/admin/login`으로 리다이렉트
- 삭제 작업 시 확인 모달 표시 ("정말 삭제하시겠습니까?")
- 테이블 정렬 기능 (열 헤더 클릭)
- 폼 입력 시 자동 저장 (뉴스레터 에디터)

---

## 5. 구독 해지 페이지

| 항목 | 내용 |
|------|------|
| **페이지명** | 구독 해지 |
| **URL 경로** | `/unsubscribe?token=:token` |
| **목적** | 구독자가 이메일의 해지 링크를 통해 구독을 취소 |

### 레이아웃 설명

심플한 중앙 정렬 레이아웃. 서비스 로고, 해지 확인 메시지, 해지 버튼, 결과 메시지로 구성.

### 주요 컴포넌트

#### 5.1 `UnsubscribeConfirm`
- 서비스 로고
- 메시지: "정말 구독을 해지하시겠습니까?"
- 구독 중인 이메일 주소 표시 (token에서 디코딩)
- "구독 해지" 버튼 (빨간색 계열)
- "계속 구독하기" 버튼 (회색 계열) → 홈으로 이동

#### 5.2 `UnsubscribeResult`
- 해지 완료 시:
  - 메시지: "구독이 해지되었습니다."
  - 부가 메시지: "언제든 다시 구독하실 수 있습니다."
  - "다시 구독하기" 링크 → 홈페이지 구독 폼
- 잘못된 토큰 시:
  - 메시지: "유효하지 않은 링크입니다."
  - "홈으로 돌아가기" 링크

### 주요 기능/인터랙션

- URL의 `token` query parameter를 통해 구독자 식별
- 해지 버튼 클릭 시 확인 후 API 호출
- 해지 완료 후 재구독 유도

### 백엔드 API 연동 데이터

| API | Method | 설명 |
|-----|--------|------|
| `/api/subscribers/unsubscribe` | `POST` | 구독 해지. Body: `{ token: string }` |
| `/api/subscribers/verify-token` | `GET` | 토큰 유효성 및 이메일 확인. Query: `token` |

---

## 6. 이메일 템플릿 구조

### 저장 및 변환 방식

- **DB 저장:** 뉴스레터 콘텐츠는 `newsletters` 테이블의 `content` 컬럼에 **Markdown** 형식으로 저장
- **변환:** 발송 시 `marked` 라이브러리 (JS/TS)를 사용하여 Markdown → HTML 변환
- **래핑:** 변환된 HTML을 이메일 템플릿 레이아웃으로 감싸서 발송

### 이메일 템플릿 레이아웃

```
┌─────────────────────────────────────┐
│            HEADER                   │
│  ┌─────────────────────────────┐    │
│  │  서비스 로고/이름              │    │
│  │  "오늘을 만들었던 어제의 기술"   │    │
│  │  발행 날짜                    │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│            CONTENT                  │
│  ┌─────────────────────────────┐    │
│  │  [포스트 1]                   │    │
│  │  ■ 출처: Meta Engineering     │    │
│  │  ■ 제목: 분산 캐시 시스템 개선기 │    │
│  │  ■ 문제 상황: ...             │    │
│  │  ■ 핵심 요약: ...             │    │
│  │  ■ [원문 보기] 버튼            │    │
│  │                               │    │
│  │  ──── 구분선 ────              │    │
│  │                               │    │
│  │  [포스트 2]                   │    │
│  │  ...                          │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│          SOURCE LINKS               │
│  ┌─────────────────────────────┐    │
│  │  오늘의 원문 링크 모음:        │    │
│  │  1. Meta - 분산 캐시 시스템    │    │
│  │  2. Netflix - 추천 알고리즘    │    │
│  │  3. Amazon - 서버리스 아키텍처  │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│            FOOTER                   │
│  ┌─────────────────────────────┐    │
│  │  오늘을 만들었던 어제의 기술    │    │
│  │  [구독 해지] 링크              │    │
│  │  [웹에서 보기] 링크            │    │
│  │  © 2026 All rights reserved  │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Markdown 콘텐츠 작성 규칙 (DB 저장 형식)

```markdown
## Meta Engineering Blog

### 분산 캐시 시스템 개선기

**문제 상황**

대규모 트래픽 환경에서 기존 캐시 시스템의 cache miss율이 증가하며
응답 시간이 불안정해지는 문제가 발생했다.

**핵심 요약**

Meta 엔지니어링 팀은 consistent hashing 기반의 새로운 분산 캐시
아키텍처를 도입하여 cache miss율을 40% 감소시켰다...

[원문 보기](https://engineering.fb.com/...)

---

## Netflix Tech Blog

### 추천 알고리즘 A/B 테스트 프레임워크

**문제 상황**

...
```

### `marked` 변환 설정 (NestJS 백엔드)

```typescript
import { marked } from 'marked';

// Markdown → HTML 변환
function convertNewsletterContent(markdown: string): string {
  const htmlContent = marked.parse(markdown);
  return wrapWithEmailTemplate(htmlContent);
}

// 이메일 템플릿 래핑
function wrapWithEmailTemplate(content: string): string {
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: 'Apple SD Gothic Neo', sans-serif;">
      <!-- Header -->
      <div style="background-color: #1a1a2e; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="font-size: 18px;">오늘을 만들었던 어제의 기술</h1>
        <p style="font-size: 14px; color: #cccccc;">${발행날짜}</p>
      </div>

      <!-- Content -->
      <div style="padding: 24px; line-height: 1.8; color: #333333;">
        ${content}
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #888888;">
        <p>오늘을 만들었던 어제의 기술</p>
        <p>
          <a href="${웹에서보기URL}">웹에서 보기</a> |
          <a href="${구독해지URL}">구독 해지</a>
        </p>
        <p>© 2026 All rights reserved.</p>
      </div>
    </div>
  `;
}
```

### 이메일 템플릿 주의사항

- 이메일 클라이언트 호환을 위해 **인라인 CSS** 사용 (외부 스타일시트 미지원)
- `<table>` 기반 레이아웃 권장 (일부 이메일 클라이언트에서 `flexbox`/`grid` 미지원)
- 이미지는 절대 URL 사용
- 구독 해지 링크는 반드시 포함 (스팸 방지 법률 준수)
- 최대 너비 600px (모바일/데스크톱 호환)
- `alt` 텍스트 포함 (이미지 차단 시 대비)

---

## 공통 컴포넌트 정리

| 컴포넌트 | 사용 페이지 | 설명 |
|----------|------------|------|
| `Navbar` | 랜딩, 아카이브, 상세 | 공통 상단 네비게이션 바 |
| `Footer` | 랜딩, 아카이브, 상세 | 공통 하단 푸터 |
| `SubscriptionForm` | 랜딩, 상세 | 이메일 구독 입력 폼 |
| `NewsletterCard` | 랜딩(미리보기), 아카이브 | 뉴스레터 요약 카드 |
| `Pagination` | 아카이브, 관리자 | 페이지네이션 |
| `LoadingSpinner` | 전체 | API 호출 중 로딩 표시 |
| `Toast` | 전체 | 성공/오류 알림 메시지 |
| `ConfirmModal` | 관리자 | 삭제 등 확인 모달 |
| `MarkdownPreview` | 관리자, 상세 | Markdown → HTML 미리보기 |
| `AdminSidebar` | 관리자 | 관리자 좌측 사이드바 |
| `AdminHeader` | 관리자 | 관리자 상단 헤더 |

---

## 라우팅 구조 요약

```
/                           → 랜딩/홈 페이지
/archive                    → 뉴스레터 아카이브
/archive/:id                → 뉴스레터 상세
/admin/login                → 관리자 로그인
/admin                      → 관리자 대시보드
/admin/posts                → 블로그 포스트 관리
/admin/newsletters          → 뉴스레터 관리
/admin/newsletters/new      → 새 뉴스레터 작성
/admin/newsletters/:id/edit → 뉴스레터 수정
/admin/subscribers          → 구독자 관리
/unsubscribe?token=:token   → 구독 해지
```
