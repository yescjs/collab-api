# 실시간 협업 태스크 API

Node.js/Express.js 기반 실시간 협업 태스크 관리 REST API.
WebSocket으로 실시간 알림, AWS EC2/RDS에 배포.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 런타임 | Node.js 20 LTS |
| 프레임워크 | Express.js + TypeScript |
| ORM | Prisma 7 |
| DB | PostgreSQL 16 (AWS RDS) |
| 실시간 | Socket.io |
| 인증 | JWT + RBAC |
| 컨테이너 | Docker (multi-stage build) |
| 서버 | AWS EC2 (t3.micro) |
| 리버스 프록시 | Nginx |
| CI/CD | GitHub Actions |
| 부하 테스트 | k6 |

## 실행 방법

### 로컬 개발

```bash
# PostgreSQL 구동
docker-compose up -d

# 환경 변수 설정
cp .env.example .env

# 의존성 설치
npm install

# DB 마이그레이션
npx prisma migrate dev

# 시드 데이터
npx prisma db seed

# 개발 서버
npm run dev
```

### Docker 빌드

```bash
docker build -t collab-api .
docker run -d --env-file .env -p 3000:3000 collab-api
```

## API 엔드포인트 (16개)

### 인증
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 (JWT 발급) |
| POST | `/api/auth/refresh` | 토큰 갱신 |
| GET | `/api/auth/me` | 내 정보 조회 |

### 프로젝트
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/projects` | 프로젝트 생성 |
| GET | `/api/projects` | 프로젝트 목록 |
| GET | `/api/projects/:id` | 프로젝트 상세 |
| PUT | `/api/projects/:id` | 프로젝트 수정 |
| DELETE | `/api/projects/:id` | 프로젝트 삭제 (soft delete) |
| POST | `/api/projects/:id/members` | 멤버 초대 |

### 태스크
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/projects/:pid/tasks` | 태스크 생성 |
| GET | `/api/projects/:pid/tasks` | 태스크 목록 (필터/정렬/페이지네이션) |
| GET | `/api/tasks/:id` | 태스크 상세 |
| PUT | `/api/tasks/:id` | 태스크 수정 |
| PATCH | `/api/tasks/:id/status` | 상태 변경 + WebSocket 브로드캐스트 |

### 시스템
| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 |

## WebSocket 이벤트

```
클라이언트 → 서버:
  join-project   { projectId }
  leave-project  { projectId }

서버 → 클라이언트:
  task-status-changed  { taskId, oldStatus, newStatus, changedBy, timestamp }
  task-assigned        { taskId, assigneeId, assignedBy, timestamp }
```

## AWS 아키텍처

```
[클라이언트] → [EC2 (Nginx → Docker)] → [RDS PostgreSQL]
```

- EC2 t3.micro (프리티어) + Nginx 리버스 프록시
- RDS db.t3.micro PostgreSQL 16 (프리티어)
- GitHub Actions → EC2 자동 배포

## 성능 수치

| 항목 | 목표 | 실측값 (100 VUs) | 실측값 (500 VUs 피크) |
|------|------|-----------------|---------------------|
| API 중앙값 응답 시간 | < 50ms | **22.9ms** | 351ms |
| P95 응답 시간 | < 200ms | **61.7ms** | 4.23s |
| 동시 접속 | 500 VUs | **100 VUs 안정** | 535 VUs 도달 |
| 처리량 | > 1,000 req/s | **35.9 req/s** | 39.4 req/s |
| HTTP 성공률 | > 99.9% | **99.08%** | 92.36% |

> t3.micro (1 vCPU, 1GB RAM) 환경 기준. 100 VUs에서 중앙값 22.9ms로 안정적이며,
> 500 VUs 피크에서는 리소스 병목이 발생하여 응답 시간이 증가함.
> 스케일업(t3.small) 시 선형 개선이 예상됨.

## 테스트

```bash
# 통합 테스트 (vitest + supertest)
npm test

# 부하 테스트 (k6)
k6 run -e BASE_URL=http://localhost:3000 k6/load-test.js
```
