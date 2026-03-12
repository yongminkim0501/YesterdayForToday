# 배포 진행 상황 (Deployment Status)

> 마지막 업데이트: 2026-03-12 12:20

## 프로젝트 개요

**오늘을 만들었던 어제의 기술 (Yesterday's Technology that Made Today)**
- 빅테크(Meta, Netflix, Amazon) 엔지니어링 블로그를 요약하는 한국어 뉴스레터 서비스
- Frontend: React (CRA) → Vercel 배포
- Backend: NestJS + PostgreSQL → AWS EC2 Docker 배포

---

## 현재 상태: 배포 완료

- **프론트엔드**: https://www.todaytech.me (Vercel)
- **백엔드 API**: https://api.todaytech.me (AWS EC2 + Caddy HTTPS)
- **상태**: 정상 운영 중

---

## 완료된 작업

### 1. 코드 개발
- [x] Frontend: React SPA (구독, 구독취소, 관리자 대시보드)
- [x] Backend: NestJS (구독자 관리, 뉴스레터 CRUD, 이메일 발송, 관리자 인증)
- [x] Docker 설정 (multi-stage build, docker-compose)
- [x] 보안 헤더 (helmet) + CORS 하드닝 (`backend/src/main.ts`)
- [x] 단위 테스트 47개 (`backend/src/**/*.spec.ts`)
- [x] E2E 테스트 31개 (`backend/test/app.e2e-spec.ts`)
- [x] 마케팅 전략 보고서 (Notion 페이지 + `docs/` 폴더)

### 2. Vercel 프론트엔드 배포 (완료)
- **도메인**: https://www.todaytech.me
- **Vercel URL**: `https://frontend-pearl-beta-71.vercel.app`
- `frontend/vercel.json`에 보안 헤더 + SPA rewrite 설정됨
- 환경변수: `REACT_APP_API_URL=https://api.todaytech.me/api`

### 3. AWS EC2 백엔드 배포 (완료, 운영 중)
- **인스턴스 ID**: `i-0cb0134162940d25f`
- **Elastic IP**: `13.124.5.106` (고정 IP)
- **Elastic IP Allocation ID**: `eipalloc-008dc3aa98a068e25`
- **리전**: `ap-northeast-2` (서울)
- **인스턴스 타입**: t3.micro
- **AMI**: Amazon Linux 2023
- **SSH 키**: `~/.ssh/yesterday-for-today.pem`
- **보안그룹**: `sg-0521ef036338f03bd`
  - 포트 22 (SSH), 80 (HTTP), 443 (HTTPS), 4000 (API) 열림
- **상태**: 운영 중

#### SSH 접속 방법:
```bash
ssh -i ~/.ssh/yesterday-for-today.pem ec2-user@13.124.5.106
```

#### EC2에 설치/설정된 것:
- Docker + Docker Compose (`docker-compose` 명령 사용, `docker compose`는 미지원)
- Docker Buildx v0.17.1
- Caddy v2.11.2 (`/usr/local/bin/caddy`) — Let's Encrypt 자동 HTTPS
- `~/YesterdayForToday/` 프로젝트 디렉토리
- `~/Caddyfile` Caddy 리버스 프록시 설정

#### EC2 .env 파일 (`~/YesterdayForToday/.env`):
```
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=sXT9E7NdbrZygIjOg8ai
DB_DATABASE=yesterday_for_today
JWT_SECRET=apNTWvaG5uYCgugdj9J2RQipdlNskn0eGrwV3ocyikY=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yongmingim166@gmail.com
SMTP_PASS=iidx zikh svpd kvrv
FRONTEND_URL=https://www.todaytech.me,https://todaytech.me
```

#### Caddyfile (`~/Caddyfile`):
```
api.todaytech.me {
    reverse_proxy localhost:4000
}
```

#### Docker Compose 서비스:
- `postgres`: postgres:16-alpine (데이터: docker volume)
- `backend`: NestJS 앱 (포트 4000)

#### 서비스 시작/재시작 방법:
```bash
# SSH 접속 후
cd ~/YesterdayForToday
docker-compose up -d          # Docker 컨테이너 시작
sudo caddy start --config ~/Caddyfile --adapter caddyfile  # Caddy HTTPS 시작

# 재시작이 필요한 경우
docker-compose down && docker-compose up -d
sudo caddy reload --config ~/Caddyfile --adapter caddyfile
```

### 4. 도메인 설정 (완료)
- **도메인**: `todaytech.me`
- **구매처**: 가비아 (Gabia)
- **네임서버**: ns.gabia.co.kr

#### DNS 레코드:
| 타입 | 호스트 | 값 | TTL |
|------|--------|-----|-----|
| A | api | 13.124.5.106 | 600 |
| CNAME | www | cname.vercel-dns.com. | 600 |

---

## EC2 인스턴스 관리

### 인스턴스 중지 (비용 절감):
```bash
aws ec2 stop-instances --instance-ids i-0cb0134162940d25f --region ap-northeast-2
```
> 주의: Elastic IP는 인스턴스 중지 시 시간당 $0.005 과금

### 인스턴스 시작:
```bash
aws ec2 start-instances --instance-ids i-0cb0134162940d25f --region ap-northeast-2
# 시작 후 SSH 접속하여 서비스 재시작
ssh -i ~/.ssh/yesterday-for-today.pem ec2-user@13.124.5.106
cd ~/YesterdayForToday && docker-compose up -d
sudo caddy start --config ~/Caddyfile --adapter caddyfile
```

### Elastic IP 해제 (더 이상 안 쓸 때):
```bash
aws ec2 disassociate-address --association-id eipassoc-0e69d83b77538eb08 --region ap-northeast-2
aws ec2 release-address --allocation-id eipalloc-008dc3aa98a068e25 --region ap-northeast-2
```

---

## 테스트 체크리스트
- [x] `https://www.todaytech.me` 접속 확인 (200)
- [x] `https://api.todaytech.me` HTTPS 정상 (200)
- [ ] 구독 기능 테스트 (이메일 발송)
- [ ] 관리자 로그인 테스트 (admin / admin123)
- [ ] 뉴스레터 발송 테스트

---

## 향후 고려사항
- Gmail SMTP → AWS SES 전환 (대량 발송 시)
- 모니터링 설정 (Prometheus + Grafana)
- CI/CD 파이프라인 구축
- 백업 전략 (PostgreSQL 데이터)
- `todaytech.me` (www 없이) 접속 시 → www로 리다이렉트 설정

---

## AWS 계정 정보
- IAM 사용자: deployer (AdministratorAccess)
- 리전: ap-northeast-2 (서울)
- AWS CLI 프로필: default

## Git 커밋 히스토리
```
c80f556 Initial commit
74916e4 Add Docker setup for production deployment
9ff60d4 Add security headers and CORS hardening
0e924d5 Add unit tests for core backend services
4a1d0db Add e2e tests for all API endpoints
```

## Notion
- 마케팅 전략 보고서: https://www.notion.so/321c1fef77fe81cd88d5c5179e23163c
- 부모 페이지 (클로드 코드): ID `31dc1fef-77fe-8049-8ed4-da7d6890c053`
