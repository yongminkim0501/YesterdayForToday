# 배포 및 인프라 현황

> 마지막 업데이트: 2026-03-17

## 서비스 현황

| 항목 | 상태 | URL/값 |
|------|------|--------|
| 프론트엔드 | 운영 중 | https://www.todaytech.me (Vercel) |
| 백엔드 API | 운영 중 | https://api.todaytech.me (EC2 + Caddy) |
| 이메일 발송 | 운영 중 | Resend SMTP (no-reply@todaytech.me) |
| 도메인 | 운영 중 | todaytech.me (가비아) |
| 콘텐츠 | 93개 포스트 / 93개 뉴스레터 | Meta·Netflix·Amazon 각 31개 |
| 모니터링 | 메트릭만 | /metrics (Grafana 미연동) |

---

## AWS EC2 인프라

### 인스턴스 정보
- **인스턴스 ID**: `i-0cb0134162940d25f`
- **Elastic IP**: `13.124.5.106` (eipalloc-008dc3aa98a068e25)
- **타입**: t3.micro (2 vCPU, 1GB RAM)
- **리전**: ap-northeast-2 (서울)
- **AMI**: Amazon Linux 2023
- **보안그룹**: sg-0521ef036338f03bd (22, 80, 443, 4000 포트)

### SSH 접속
```bash
ssh -i ~/.ssh/yesterday-for-today.pem ec2-user@13.124.5.106
```

### EC2 서비스 구성
```
EC2 (Amazon Linux 2023)
├── Caddy (systemd: caddy.service)
│   └── HTTPS 리버스 프록시: api.todaytech.me → localhost:4000
├── Docker Compose (systemd: docker-app.service)
│   ├── postgres (16-alpine, 볼륨 마운트)
│   └── backend (NestJS, port 4000)
├── DB 백업 (systemd timer: db-backup.timer)
│   └── 매일 4AM KST, 7일 보관
├── 만료 구독자 자동 정리 (앱 내 Cron)
│   └── 매일 4AM KST, 구독 취소 후 6개월 경과 시 삭제
└── Docker 로그 로테이션 (10MB x 3)
```

### systemd 서비스 파일 위치
- `/etc/systemd/system/caddy.service` — Caddy 자동 시작
- `/etc/systemd/system/docker-app.service` — Docker Compose 자동 시작
- `/etc/systemd/system/db-backup.service` + `db-backup.timer` — DB 백업
- `/etc/docker/daemon.json` — 로그 로테이션 설정

### Caddyfile (`~/Caddyfile`)
```
api.todaytech.me {
    reverse_proxy localhost:4000
}

todaytech.me {
    redir https://www.todaytech.me{uri} permanent
}
```
> 참고: todaytech.me 리다이렉트는 가비아에 @ A 레코드 추가 후 작동

### EC2 .env (`~/YesterdayForToday/.env`)
```
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=sXT9E7NdbrZygIjOg8ai
DB_DATABASE=yesterday_for_today
JWT_SECRET=apNTWvaG5uYCgugdj9J2RQipdlNskn0eGrwV3ocyikY=
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=(Resend API Key)
SMTP_FROM=no-reply@todaytech.me
ANTHROPIC_API_KEY=(Claude API Key)
FRONTEND_URL=https://www.todaytech.me,https://todaytech.me
```

### EC2 관리 명령어
```bash
# 인스턴스 중지/시작
aws ec2 stop-instances --instance-ids i-0cb0134162940d25f --region ap-northeast-2
aws ec2 start-instances --instance-ids i-0cb0134162940d25f --region ap-northeast-2

# 서비스 상태 확인 (SSH 접속 후)
sudo systemctl status caddy docker-app db-backup.timer
docker-compose ps
docker logs yesterdayfortoday-backend-1 --tail 50

# 재배포 (SSH 접속 후)
cd ~/YesterdayForToday
git pull origin main
docker-compose build --no-cache backend
docker-compose up -d

# Caddy 재시작
sudo caddy reload --config ~/Caddyfile --adapter caddyfile

# Elastic IP 해제 (서비스 종료 시)
aws ec2 disassociate-address --association-id eipassoc-0e69d83b77538eb08 --region ap-northeast-2
aws ec2 release-address --allocation-id eipalloc-008dc3aa98a068e25 --region ap-northeast-2
```

---

## DNS 설정 (가비아)

| 타입 | 호스트 | 값 | 비고 |
|------|--------|-----|------|
| A | api | 13.124.5.106 | 백엔드 API |
| CNAME | www | cname.vercel-dns.com. | 프론트엔드 (Vercel) |
| CNAME | (DKIM 3개) | *.dkim.amazonses.com. | SES 이메일 인증 (레거시) |
| TXT | resend._domainkey | (DKIM 공개키) | Resend 도메인 인증 |
| MX | send | feedback-smtp.ap-northeast-1.amazonses.com | Resend SPF (Priority 10) |
| TXT | send | v=spf1 include:amazonses.com ~all | Resend SPF |
| TXT | _dmarc | v=DMARC1; p=none; | DMARC 정책 |
| **미추가** | **@** | **13.124.5.106** | **bare domain → www 리다이렉트용** |

---

## Vercel 프론트엔드

- **Vercel URL**: `frontend-pearl-beta-71.vercel.app`
- **커스텀 도메인**: `www.todaytech.me`
- **환경변수**: `REACT_APP_API_URL=https://api.todaytech.me/api`
- **설정**: `frontend/vercel.json` (보안 헤더 + SPA rewrite)

---

## 이메일 발송 (Resend)

- **서비스**: Resend (2026-03-14 AWS SES에서 전환)
- **SMTP 호스트**: smtp.resend.com:587
- **도메인**: todaytech.me (DKIM + SPF + DMARC 인증 완료)
- **발신 주소**: no-reply@todaytech.me
- **상태**: 운영 중 (Sandbox 제한 없음, 일반 구독자 발송 가능)
- **무료 티어**: 월 3,000건
- **전환 사유**: AWS SES Production 승인 거절 (계정 결제 이력 부족)

### 이전 AWS SES 정보 (레거시)
- SES 리전: ap-northeast-2, Sandbox 모드
- IAM 사용자: ses-smtp-user-todaytech (발송 전용)

---

## AWS 과금 관리

- **예상 비용**: 월 ~$8 (t3.micro + Elastic IP + 기타)
- **t3.micro**: ~$7.6/월 (서울 리전)
- **Elastic IP**: 인스턴스 실행 중 무료, 중지 시 $0.005/시간
- **Budget 알림**: $4 / $6.4 / $8 → yongmingim166@gmail.com

---

## Git 커밋 히스토리

```
c80f556 Initial commit
74916e4 Add Docker setup for production deployment
9ff60d4 Add security headers and CORS hardening
0e924d5 Add unit tests for core backend services
4a1d0db Add e2e tests for all API endpoints
318343d Fix FRONTEND_URL parsing for email verification links
8a2aedb Use SMTP_FROM env var for sender email address
761f6c4 Add health check endpoint and graceful shutdown
0b34ac6 Fix security vulnerabilities and frontend-backend API contract
f3dc59c Add drip newsletter system with sequential cycling
(미커밋) 코드 품질 리팩토링 — sendInBatches, frontendUrl 캐시, 벌크 save, 메트릭 헤더 인증
(미커밋) 구독자 상태 체계 개선 — active/pending/unsubscribed 3단계, 구독 취소 6개월 후 자동 삭제
(미커밋) 프론트엔드 리팩토링 — CSS 공통화(AdminLayout.css, global.css), formatDate 유틸 추출, any 타입 제거, deprecated 필드 정리, 인라인 스타일 CSS 파일 분리
```

---

## 해결했던 주요 문제들

### 인프라/배포
1. **FRONTEND_URL 쉼표 문제**: 이메일 인증 링크에 쉼표 포함 → `.split(',')[0].trim()`
2. **Vercel 환경변수 줄바꿈**: `<<<` heredoc이 `\n` 추가 → `printf` 사용
3. **CNAME 점(.) 누락**: 가비아 DNS에서 CNAME 끝에 `.` 필수
4. **Let's Encrypt NXDOMAIN**: DNS 전파 전 인증서 발급 시도 → DNS 전파 후 `caddy reload`
5. **EC2 메모리 부족**: Docker build 중 t3.micro OOM → 리부트 + systemd 자동 복구
6. **docker compose vs docker-compose**: EC2에 V2 플러그인 없음 → standalone 사용
7. **Gmail → AWS SES 전환**: 개인 Gmail 강제 표시 → SES DKIM 도메인 인증
15. **AWS SES → Resend 전환**: SES Production 승인 거절(계정 이력 부족) → Resend SMTP로 전환, 한글 from 주소 object 형식 수정, docker-compose에 SMTP_FROM 누락 수정
16. **뉴스레터 1통 다중 아티클 문제**: 시드 데이터가 2개 포스트를 1개 뉴스레터에 묶음 → 1통 = 1아티클 원칙 적용, admin 서비스에 postIds 1개 제한 추가
17. **블로그 크롤링 및 콘텐츠 구축**: Meta·Netflix·Amazon 엔지니어링 블로그에서 각 30개씩 총 90개 포스트 크롤링 → 한국어 요약(문제 상황 + 핵심 요약) 생성 → DB에 포스트 + 뉴스레터 93개 구축
18. **구독자 상태 미구분**: Admin에서 미인증 구독자도 "활성"으로 표시 → active/pending/unsubscribed 3단계 상태 도입, unsubscribedAt 컬럼 추가, 6개월 후 자동 삭제
19. **Admin 페이지 새로고침 시 CSS 깨짐**: 공통 테이블/폼 스타일이 AdminPostsPage.css에만 정의 → AdminLayout.css로 이동
20. **프론트엔드 코드 중복/품질**: @keyframes spin 3곳 중복, formatDate 3곳 중복, any 타입 4곳, deprecated snake_case 필드 잔존, 인라인 스타일, 하드코딩 색상 → 전면 리팩토링

### 코드
8. **JWT 시크릿 하드코딩**: 폴백 `'yesterday-for-today-secret-key'` 제거 → 환경변수 필수
9. **synchronize: true**: 프로덕션 DB 스키마 자동 변경 위험 → NODE_ENV 분기
10. **이메일 XSS**: escapeHtml() 함수 추가, 모든 동적 값 이스케이프
11. **CSV 수식 인젝션**: `=`, `+`, `-`, `@` 시작 필드 앞에 `'` 추가
12. **배치 발송 3곳 중복**: sendInBatches() 헬퍼로 통합
13. **구독자 개별 save N+1**: 벌크 save로 변경
14. **프론트-백 API 불일치**: token→access_token, stats 구조, 응답 형식 전면 수정

---

## 미완료 작업 (TODO)

### 우선순위 높음
- [ ] 가비아 `@` A 레코드 추가 (13.124.5.106) → bare domain 리다이렉트
- [x] ~~AWS SES Production 승인~~ → Resend로 전환 완료 (2026-03-14)
- [ ] 리팩토링 코드 git commit & push & EC2 재배포

### 2차 보안 감사 이슈 (18개)
- [ ] 메트릭 토큰 타이밍 안전 비교 (crypto.timingSafeEqual)
- [ ] 로그인 브루트포스 계정 잠금
- [ ] GET → POST 이메일 인증 (프리페치 공격 방지)
- [ ] DTO MaxLength 제약 추가
- [ ] 뉴스레터 중복 발송 방지
- [ ] 동시 구독 race condition 처리
- [ ] Prometheus 카디널리티 폭발 방지 (랜덤 경로 정규화)
- [ ] findAll 서버 사이드 페이지네이션

### 콘텐츠
- [ ] 크롤링 스크립트 자동화 (현재 수동 실행: `npx ts-node scripts/crawl-blogs.ts`)
- [ ] Anthropic API 크레딧 충전 후 자동 요약 활성화
- [ ] 새 포스트 추가 시 뉴스레터 자동 생성

### 향후 개선
- [ ] CI/CD 파이프라인 (GitHub Actions)
- [ ] Grafana 모니터링 대시보드
- [ ] Resend 웹훅으로 바운스/컴플레인 처리
- [ ] 뉴스레터 오픈율 추적
- [ ] 관리자 비밀번호 변경 기능

---

## Notion 문서

- **최종 기술 문서**: https://www.notion.so/321c1fef77fe8193a8d9d988a2a2da71
- **마케팅 전략**: https://www.notion.so/321c1fef77fe81cd88d5c5179e23163c
- **부모 페이지 (클로드 코드)**: ID `31dc1fef-77fe-8049-8ed4-da7d6890c053`

---

## AWS 계정 정보

- IAM 사용자: deployer (AdministratorAccess)
- 리전: ap-northeast-2 (서울)
- AWS CLI 프로필: default
- 알림 이메일: yongmingim166@gmail.com
