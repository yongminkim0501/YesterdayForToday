# 오늘을 만들었던 어제의 기술 (todaytech.me)

빅테크(Meta, Netflix, Amazon) 엔지니어링 블로그를 한국어로 요약해 이메일로 발송하는 뉴스레터 서비스.

## 프로젝트 구조

```
YesterdayForToday/
├── frontend/          # React CRA + TypeScript (Vercel 배포)
│   ├── src/
│   │   ├── api/       # Axios API 클라이언트 (auth, posts, newsletters, subscribers)
│   │   ├── components/  # landing/, admin/ (공통 CSS), common/ (ErrorBoundary, Loading)
│   │   ├── contexts/  # AuthContext (JWT)
│   │   ├── utils/     # 공통 유틸 (formatDate 등)
│   │   └── pages/     # admin/ (Dashboard, Posts, Newsletters, Subscribers)
│   └── vercel.json    # 보안 헤더 + SPA rewrite
├── backend/           # NestJS + TypeORM + PostgreSQL
│   ├── src/
│   │   ├── entities/  # Subscriber, Post, Newsletter, Admin
│   │   ├── admin/     # 관리자 CRUD + 뉴스레터 발송
│   │   ├── subscribers/ # 구독/인증/해지
│   │   ├── email/     # EmailService (AWS SES SMTP, HTML 템플릿, sendInBatches)
│   │   ├── scheduler/ # 드립 발송(6AM), 예약 발송(6:05AM), 만료 구독자 정리(4AM), 메트릭 갱신(매분)
│   │   ├── metrics/   # Prometheus 메트릭 (Bearer 토큰 인증)
│   │   ├── auth/      # JWT 인증 (JWT_SECRET 환경변수 필수)
│   │   └── seed/      # 초기 관리자 계정 (프로덕션 비활성화)
│   ├── test/          # E2E 테스트 (31개, 실제 PostgreSQL 사용)
│   └── Dockerfile     # multi-stage build (node:lts-alpine)
├── docker-compose.yml # postgres + backend (127.0.0.1:5432)
└── docs/              # 배포 문서, 마케팅 전략 등
```

## 개발 명령어

```bash
# 백엔드
cd backend && npm run start:dev        # 개발 서버
cd backend && npm test                  # 단위 테스트 (47개)
cd backend && npm run test:e2e          # E2E 테스트 (PostgreSQL 필요)
cd backend && npx tsc --noEmit          # 타입 체크

# 프론트엔드
cd frontend && npm start                # 개발 서버 (port 3000)
cd frontend && npm run build            # 프로덕션 빌드

# Docker
docker-compose up -d                    # 로컬 실행
docker-compose down                     # 중지
```

## 핵심 아키텍처 결정

- **이메일 발송**: `EmailService.sendInBatches()` 공통 헬퍼 사용 (10개 병렬, 100ms 딜레이)
- **드립 시스템**: Subscriber.lastSentNewsletterIndex로 순서 추적, 순환 방식
- **구독자 상태**: active(인증완료)/pending(인증대기)/unsubscribed(구독취소) 3단계
- **구독 취소 데이터 보존**: 취소 후 6개월 보관, 매일 4AM(KST) 자동 삭제
- **FRONTEND_URL**: 쉼표 구분 시 첫 번째만 사용 (EmailService.frontendUrl에 캐시)
- **메트릭 인증**: Authorization: Bearer 헤더 또는 localhost 제한
- **JWT_SECRET**: 환경변수 필수, 미설정 시 앱 시작 불가
- **synchronize**: 프로덕션에서 false (NODE_ENV=production)
- **프론트엔드 CSS**: 공통 스타일은 `global.css`(spin, spinner) 또는 `AdminLayout.css`(테이블, 폼, status-badge)에 정의. 페이지별 CSS는 해당 페이지 전용 스타일만 포함

## 현재 상태 (2026-03-17)

- 서비스 정상 운영 중 (홍보 없이 대기 상태)
- 이메일: AWS SES → Resend SMTP 전환 완료 (일반 구독자 발송 가능)
- 콘텐츠: 93개 포스트/뉴스레터 (Meta·Netflix·Amazon 각 31개), 약 3개월치
- 뉴스레터: 1통 = 1아티클 원칙 (포스트 2개 이상 묶기 금지)
- 드립 발송: 매일 오전 6시(KST) 구독자별 순서대로 1개씩 자동 발송
- 크롤링 스크립트: `backend/scripts/crawl-blogs.ts` (수동 실행)
- 가비아 @ A 레코드 미추가 (todaytech.me → www 리다이렉트 안 됨)
- 2차 보안 감사 18개 이슈 미수정

상세 인프라/배포 정보는 `docs/DEPLOYMENT_STATUS.md` 참조.
