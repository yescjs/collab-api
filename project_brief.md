# 프로젝트 005: Node.js + AWS 기반 실시간 협업 태스크 API

생성일: 2026-04-14
갭 기반: `04_채용분석/마드라스체크/마드라스체크_채용분석.txt` 필수 요건 (Node.js, AWS)
대상 공고: 마드라스체크(플로우) 엔터프라이즈개발자
난이도: ★★★☆☆ (웹 개발 경험자 기준)
예상 기간: 2주 (일 3~4시간 기준)

---

## 목적

> "마드라스체크(플로우) 채용공고에서 필수 요구하는 Node.js와 AWS 경험을 확보하고,
>  실시간 협업 API 서버를 구축하여 Before/After 수치를 자기소개서에 활용한다."

### 이 프로젝트를 하면 자소서에 추가되는 문장

> "Node.js/Express.js 기반의 협업 태스크 관리 REST API를 설계하고 AWS EC2/RDS/S3에 배포했습니다.
> WebSocket을 활용한 실시간 알림 기능을 구현하여 동시 접속 500명 환경에서 평균 응답 시간 50ms 이내를 달성했고,
> CloudWatch 모니터링과 GitHub Actions CI/CD 파이프라인으로 배포 자동화를 구축했습니다."

---

## 기술 스택

| 영역 | 기술 | 선택 이유 |
|------|------|---------|
| 런타임 | Node.js 20 LTS | 채용공고 필수 요건, 플로우 기술 스택 추정 |
| 프레임워크 | Express.js + TypeScript | Node.js 생태계 표준, 타입 안정성 확보 |
| ORM | Prisma | TypeScript 네이티브, 마이그레이션 관리 용이 |
| DB | PostgreSQL 16 | 채용공고 우대사항 "postgres", RDS 호환 |
| 실시간 | Socket.io | WebSocket 추상화, 재연결/룸 관리 내장 |
| 인증 | JWT (jsonwebtoken) | 기존 Spring Security JWT 경험 활용 |
| 파일 저장 | AWS S3 | 채용공고 AWS 필수 요건 커버 |
| 서버 | AWS EC2 (t3.micro) | 프리티어 범위, 실무 배포 경험 |
| DB 호스팅 | AWS RDS (PostgreSQL) | 관리형 DB 경험 확보 |
| 리버스 프록시 | Nginx (EC2 내 설치) | ALB 대신 무료 대안, 실무에서도 널리 사용 |
| 모니터링 | AWS CloudWatch | 채용공고 우대사항 "모니터링" 간접 커버 |
| CI/CD | GitHub Actions | 004 프로젝트 경험 확장 (AWS 배포 추가) |
| 컨테이너 | Docker + Docker Compose | 로컬 개발 + EC2 배포용 |
| 부하 테스트 | k6 (Grafana Labs) | 경량, 스크립트 기반, 수치 리포트 생성 |

### 기술 선택 근거 (면접 대비)

**왜 Express.js인가?**
- Koa, Fastify 등 대안이 있지만, Express는 npm 생태계에서 가장 많은 미들웨어를 보유
- 플로우처럼 레거시가 있는 엔터프라이즈 환경에서는 안정성과 커뮤니티 지원이 우선
- 학습 곡선이 낮아 2주 내 완성에 적합

**왜 Prisma인가?**
- TypeScript 네이티브: 스키마에서 타입이 자동 생성되어 런타임 에러 방지
- 기존 MyBatis 경험과 비교하여 "ORM 패러다임 차이"를 면접에서 설명 가능
- 마이그레이션 관리가 내장되어 팀 협업에 유리

**왜 PostgreSQL인가?**
- 채용공고 우대사항에 "postgres" 명시
- 기존 Oracle 경험과 비교하여 RDBMS 간 차이점을 이해하고 있음을 어필
- JSON 타입 지원으로 유연한 스키마 설계 가능

---

## 프로젝트 구조

```
005_nodejs_aws_협업API/
├── src/
│   ├── app.ts                 # Express 앱 설정
│   ├── server.ts              # HTTP + WebSocket 서버 엔트리
│   ├── config/
│   │   ├── database.ts        # Prisma 클라이언트 설정
│   │   ├── s3.ts              # AWS S3 클라이언트
│   │   └── env.ts             # 환경 변수 검증
│   ├── middleware/
│   │   ├── auth.ts            # JWT 인증 미들웨어
│   │   ├── rbac.ts            # 역할 기반 접근 제어
│   │   ├── errorHandler.ts    # 전역 에러 핸들러
│   │   └── requestLogger.ts   # 요청 로깅
│   ├── routes/
│   │   ├── auth.routes.ts     # 회원가입/로그인
│   │   ├── project.routes.ts  # 프로젝트 CRUD
│   │   ├── task.routes.ts     # 태스크 CRUD + 상태 변경
│   │   ├── comment.routes.ts  # 댓글 CRUD
│   │   └── file.routes.ts     # 파일 업로드 (S3)
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── project.service.ts
│   │   ├── task.service.ts
│   │   ├── comment.service.ts
│   │   └── file.service.ts
│   ├── socket/
│   │   ├── index.ts           # Socket.io 초기화
│   │   └── taskEvents.ts      # 태스크 상태 변경 실시간 브로드캐스트
│   └── utils/
│       ├── pagination.ts      # 커서/오프셋 페이지네이션
│       └── response.ts        # 표준 응답 포맷
├── prisma/
│   ├── schema.prisma          # DB 스키마 정의
│   └── seed.ts                # 초기 데이터
├── tests/
│   ├── auth.test.ts
│   ├── task.test.ts
│   └── websocket.test.ts
├── k6/
│   ├── load-test.js           # 부하 테스트 시나리오
│   └── results/               # 테스트 결과 저장
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Actions → EC2 배포
├── docker-compose.yml         # 로컬 개발 (PostgreSQL + Redis)
├── Dockerfile                 # 프로덕션 빌드
├── .env.example
├── tsconfig.json
├── package.json
└── README.md
```

---

## 데이터 모델 (Prisma Schema)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(MEMBER)
  projects  ProjectMember[]
  tasks     Task[]   @relation("assignee")
  comments  Comment[]
  createdAt DateTime @default(now())
}

enum Role {
  ADMIN
  MANAGER
  MEMBER
}

model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  members     ProjectMember[]
  tasks       Task[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ProjectMember {
  id        String  @id @default(uuid())
  user      User    @relation(fields: [userId], references: [id])
  userId    String
  project   Project @relation(fields: [projectId], references: [id])
  projectId String
  role      ProjectRole @default(MEMBER)
  @@unique([userId, projectId])
}

enum ProjectRole {
  OWNER
  MANAGER
  MEMBER
}

model Task {
  id          String     @id @default(uuid())
  title       String
  description String?
  status      TaskStatus @default(TODO)
  priority    Priority   @default(MEDIUM)
  assignee    User?      @relation("assignee", fields: [assigneeId], references: [id])
  assigneeId  String?
  project     Project    @relation(fields: [projectId], references: [id])
  projectId   String
  dueDate     DateTime?
  files       File[]
  comments    Comment[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  REVIEW
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model Comment {
  id        String   @id @default(uuid())
  content   String
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  task      Task     @relation(fields: [taskId], references: [id])
  taskId    String
  createdAt DateTime @default(now())
}

model File {
  id        String   @id @default(uuid())
  name      String
  url       String       // S3 URL
  size      Int
  mimeType  String
  task      Task     @relation(fields: [taskId], references: [id])
  taskId    String
  createdAt DateTime @default(now())
}
```

---

## API 엔드포인트 설계

### 인증 (Auth)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 (JWT 발급) |
| POST | `/api/auth/refresh` | 토큰 갱신 |
| GET | `/api/auth/me` | 내 정보 조회 |

### 프로젝트 (Project)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| POST | `/api/projects` | 프로젝트 생성 | ADMIN, MANAGER |
| GET | `/api/projects` | 프로젝트 목록 (페이지네이션) | ALL |
| GET | `/api/projects/:id` | 프로젝트 상세 | 멤버 |
| PUT | `/api/projects/:id` | 프로젝트 수정 | OWNER, MANAGER |
| DELETE | `/api/projects/:id` | 프로젝트 삭제 | OWNER |
| POST | `/api/projects/:id/members` | 멤버 추가 | OWNER, MANAGER |

### 태스크 (Task)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| POST | `/api/projects/:pid/tasks` | 태스크 생성 | 멤버 |
| GET | `/api/projects/:pid/tasks` | 태스크 목록 (필터/정렬/페이지네이션) | 멤버 |
| GET | `/api/tasks/:id` | 태스크 상세 | 멤버 |
| PUT | `/api/tasks/:id` | 태스크 수정 | 담당자, MANAGER |
| PATCH | `/api/tasks/:id/status` | 상태 변경 → **WebSocket 브로드캐스트** | 담당자, MANAGER |
| DELETE | `/api/tasks/:id` | 태스크 삭제 | OWNER, MANAGER |

### 댓글 (Comment)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/tasks/:tid/comments` | 댓글 작성 → **WebSocket 알림** |
| GET | `/api/tasks/:tid/comments` | 댓글 목록 |
| DELETE | `/api/comments/:id` | 댓글 삭제 (본인만) |

### 파일 (File)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/tasks/:tid/files` | 파일 업로드 (S3 Presigned URL) |
| GET | `/api/files/:id/download` | 파일 다운로드 (S3 Presigned URL) |
| DELETE | `/api/files/:id` | 파일 삭제 |

**총 엔드포인트: 18개**

---

## WebSocket 이벤트 설계

```typescript
// 클라이언트 → 서버
socket.emit('join-project', { projectId })     // 프로젝트 룸 참여
socket.emit('leave-project', { projectId })    // 프로젝트 룸 퇴장

// 서버 → 클라이언트 (자동 브로드캐스트)
socket.on('task-status-changed', {             // 태스크 상태 변경 알림
  taskId, oldStatus, newStatus, changedBy, timestamp
})
socket.on('task-assigned', {                   // 태스크 할당 알림
  taskId, assigneeId, assignedBy, timestamp
})
socket.on('comment-added', {                   // 새 댓글 알림
  taskId, commentId, authorName, preview, timestamp
})
```

---

## 일정별 구현 계획 (2주)

### 1주차: Node.js 백엔드 개발

#### Day 1-2: 프로젝트 초기화 + 인증

**구현 내용:**
- Express.js + TypeScript 프로젝트 셋업
- Prisma 스키마 정의 + 마이그레이션
- Docker Compose로 로컬 PostgreSQL 구동
- JWT 인증 미들웨어 (회원가입/로그인/토큰 갱신)
- RBAC 미들웨어 (Role 기반 접근 제어)

**체크포인트:**
- [ ] `docker-compose up`으로 PostgreSQL 구동 확인
- [ ] `POST /api/auth/register` → 회원가입 성공
- [ ] `POST /api/auth/login` → JWT 토큰 발급
- [ ] 인증 없는 요청 → 401 응답 확인
- [ ] MEMBER 역할로 ADMIN 전용 API 접근 → 403 응답 확인

**EHSS 경험 연결:**
> Spring Security RBAC를 Node.js/Express로 재구현하면서,
> "동일한 보안 패턴을 다른 프레임워크로 적용할 수 있음"을 증명

#### Day 3-4: 프로젝트 + 태스크 CRUD

**구현 내용:**
- 프로젝트 CRUD (멤버 관리 포함)
- 태스크 CRUD (필터: 상태/우선순위/담당자, 정렬: 생성일/마감일)
- 커서 기반 페이지네이션 (대량 데이터 대비)
- 댓글 CRUD
- 전역 에러 핸들러 + 요청 로깅 미들웨어

**체크포인트:**
- [ ] 프로젝트 생성 → 멤버 추가 → 태스크 생성 플로우 동작
- [ ] `GET /api/projects/:pid/tasks?status=TODO&priority=HIGH&sort=dueDate` 필터링 동작
- [ ] 페이지네이션: 100건 데이터에서 20건씩 조회 확인
- [ ] 프로젝트 비멤버의 접근 차단 확인

**자소서 어필 포인트:**
> "Express.js로 18개 RESTful API 엔드포인트를 설계하고, 커서 기반 페이지네이션과
>  다중 필터/정렬을 지원하는 태스크 관리 시스템을 구현했습니다."

#### Day 5: WebSocket 실시간 알림 + S3 파일 업로드

**구현 내용:**
- Socket.io 초기화 (프로젝트별 룸 관리)
- 태스크 상태 변경 시 프로젝트 룸에 실시간 브로드캐스트
- 댓글 작성 시 태스크 담당자에게 실시간 알림
- AWS S3 Presigned URL 기반 파일 업로드/다운로드
- 파일 메타데이터 DB 저장

**체크포인트:**
- [ ] 브라우저 2개로 동시 접속 → 태스크 상태 변경 시 실시간 알림 수신 확인
- [ ] S3에 파일 업로드 → 다운로드 URL 생성 확인
- [ ] 5MB 파일 업로드 성공 확인

**자소서 어필 포인트:**
> "Socket.io를 활용한 실시간 알림 시스템을 구현하여,
>  프로젝트 룸 기반으로 태스크 상태 변경과 댓글 알림을 실시간 전달했습니다."

---

### 2주차: AWS 배포 + 운영

#### Day 6-7: AWS 인프라 구축

**구현 내용:**
- AWS EC2 인스턴스 생성 (t3.micro, Amazon Linux 2023)
- AWS RDS PostgreSQL 인스턴스 생성 (db.t3.micro)
- AWS S3 버킷 생성 (파일 업로드용)
- VPC + 보안 그룹 설정 (EC2↔RDS 간 통신만 허용)
- Nginx 리버스 프록시 설정 (HTTPS 지원, 포트 포워딩)
- Docker로 앱 컨테이너화 → EC2에 배포

**체크포인트:**
- [ ] EC2에서 Docker 컨테이너 실행 확인
- [ ] EC2 → RDS PostgreSQL 연결 확인
- [ ] Nginx를 통한 외부 접근 → API 응답 확인
- [ ] S3 Presigned URL로 파일 업로드/다운로드 확인

**AWS 아키텍처:**
```
[클라이언트] → [EC2 (Nginx → Docker)]
                       ↓
                 [RDS PostgreSQL]
                       ↓
                 [S3 (파일 저장)]
                       ↓
                 [CloudWatch (모니터링)]
```

**자소서 어필 포인트:**
> "AWS EC2/RDS/S3를 활용한 프로덕션 배포 환경을 직접 구축했습니다.
>  VPC 보안 그룹으로 네트워크 접근을 제어하고, Nginx 리버스 프록시로 HTTPS 전환과 포트 포워딩을 설정했습니다."

#### Day 8-9: 모니터링 + CI/CD

**구현 내용:**
- CloudWatch 대시보드 구성 (CPU, 메모리, 네트워크, 요청 수)
- CloudWatch 알람 설정 (CPU > 80% → 알림)
- GitHub Actions CI/CD 파이프라인:
  1. Push → TypeScript 빌드 + 린트
  2. Docker 이미지 빌드
  3. ECR에 푸시 (또는 EC2에 직접 배포)
  4. EC2에서 Docker 컨테이너 재시작
- 헬스체크 엔드포인트 (`GET /health`)

**체크포인트:**
- [ ] `git push` → GitHub Actions 자동 빌드 → EC2 배포 완료 확인
- [ ] CloudWatch 대시보드에서 CPU/메모리 그래프 확인
- [ ] 의도적 CPU 부하 → CloudWatch 알람 트리거 확인
- [ ] 헬스체크 엔드포인트 200 응답 확인

**자소서 어필 포인트:**
> "GitHub Actions CI/CD 파이프라인을 구축하여 코드 푸시부터 EC2 배포까지 자동화하고,
>  CloudWatch로 서버 리소스를 실시간 모니터링하는 운영 체계를 구축했습니다."

#### Day 10: 부하 테스트 + 문서화

**구현 내용:**
- k6 부하 테스트 시나리오 작성:
  - 시나리오 1: 태스크 목록 조회 (동시 100명, 30초)
  - 시나리오 2: 태스크 상태 변경 + WebSocket (동시 500명, 60초)
  - 시나리오 3: 파일 업로드 (동시 50명, 30초)
- 성능 수치 측정 및 기록
- README 작성 (프로젝트 설명, 실행 방법, API 문서)
- 성능 리포트 작성

**측정 목표 수치:**
| 항목 | 목표 | 측정 방법 |
|------|------|---------|
| API 평균 응답 시간 | < 50ms | k6 http_req_duration |
| P95 응답 시간 | < 200ms | k6 http_req_duration(p95) |
| 동시 접속 | 500명 | k6 VUs |
| WebSocket 메시지 지연 | < 100ms | 커스텀 측정 |
| 처리량 | > 1,000 req/s | k6 http_reqs |
| 에러율 | < 0.1% | k6 http_req_failed |

**자소서 어필 포인트:**
> "k6 부하 테스트로 동시 접속 500명 환경에서 평균 응답 시간 50ms 이내,
>  P95 응답 시간 200ms 이내, 에러율 0.1% 미만을 확인했습니다."

---

## 자소서 반영 계획

### 항목2 (직무 역량)에 추가할 문단

현재:
> (Java/Spring Boot + EHSS 시스템 연동 + SQL 튜닝 중심)

추가:
> "또한 Node.js/Express.js 환경에서도 REST API 설계와 WebSocket 실시간 통신을
>  구현한 경험이 있습니다. AWS EC2/RDS/S3 기반의 배포 환경을 직접 구축하고,
>  k6 부하 테스트로 동시 접속 500명 환경에서 평균 응답 50ms 이내를 확인했습니다.
>  Java와 Node.js 양쪽 생태계를 경험하면서 '언어와 프레임워크는 도구이며,
>  중요한 것은 문제 해결 방식'이라는 확신이 더 강해졌습니다."

### 공통질문 1 (기능 제안)에 보강

현재:
> 비동기 상태 체크와 장애 격리 패턴 적용 가능

보강:
> "실제로 Node.js/Socket.io로 실시간 상태 모니터링을 구현하고
>  AWS CloudWatch와 연동하여 이상 징후를 감지하는 시스템을 구축한 경험이 있어,
>  이 기능의 기술적 실현 가능성에 자신이 있습니다."

---

## 기존 경험과의 연결 포인트 (면접 대비)

| EHSS 경험 | 이번 프로젝트 | 연결 스토리 |
|----------|------------|-----------|
| Spring Security RBAC | Express JWT + RBAC 미들웨어 | "동일한 보안 패턴을 Node.js로 재구현하며 프레임워크 독립적 사고를 증명" |
| Oracle SQL 튜닝 | PostgreSQL 쿼리 최적화 | "RDBMS 간 차이를 이해하고 각각에 맞는 최적화를 적용하는 능력" |
| WebFlux 비동기 통신 | Socket.io WebSocket | "비동기 통신의 개념은 동일하며, 구현 방식의 차이를 빠르게 흡수" |
| Linux/VMware 인프라 | AWS EC2/RDS/ALB | "온프레미스 경험이 클라우드 이해의 기반이 됨 — VPC 보안 그룹 = 방화벽 규칙" |
| 이기종 시스템 연동 | REST API + WebSocket | "프로토콜이 달라도 연동의 원리는 동일 — 데이터 정합성과 장애 격리" |
| Docker 컨테이너 | Docker + ECR 배포 | "로컬 개발→프로덕션 배포까지 컨테이너 기반 일관성 확보" |

---

## skill_profile.md 업데이트 예정 항목

프로젝트 완료 후 아래 항목 상태를 변경:

```
- `Node.js` — ❌ → ⚠️ 프로젝트 수준 (Express.js REST API + WebSocket)
- `AWS (EC2/RDS/S3/ALB)` — ❌ → ⚠️ 프로젝트 수준 (배포 + 모니터링)
- `PostgreSQL` — ⚠️ → ⚠️ (Prisma ORM 경험 추가)
- `Docker` — ❌ → ⚠️ 프로젝트 수준 (Dockerfile + Compose + ECR)
- `CloudWatch` — ❌ → ⚠️ 기초 수준 (대시보드 + 알람)
```

---

## 비용 추정 (AWS 신규 가입 프리티어 — 완전 무료)

| 서비스 | 사양 | 예상 비용 |
|--------|------|---------|
| EC2 | t3.micro (프리티어) | $0 (750시간/월 무료) |
| RDS | db.t3.micro (프리티어) | $0 (750시간/월 무료) |
| S3 | 5GB 이하 | $0 (5GB 무료) |
| Nginx | EC2 내 설치 | $0 (오픈소스) |
| CloudWatch | 기본 모니터링 | $0 (기본 무료) |
| 합계 | | **$0 (완전 무료)** |

> ALB 대신 Nginx 리버스 프록시를 사용하여 비용 $0 달성.
> 프로젝트 완료 후 리소스를 삭제하면 프리티어 한도 소모도 최소화.

---

## 완료 기준

- [ ] 18개 REST API 엔드포인트 정상 동작
- [ ] JWT 인증 + RBAC 접근 제어 동작
- [ ] WebSocket 실시간 알림 동작 (태스크 상태 변경, 댓글)
- [ ] S3 파일 업로드/다운로드 동작
- [ ] AWS EC2 + RDS에 배포 완료
- [ ] GitHub Actions CI/CD 파이프라인 동작
- [ ] CloudWatch 모니터링 대시보드 구성
- [ ] k6 부하 테스트 수치 기록 (목표 달성 여부)
- [ ] README + API 문서 작성
- [ ] 자소서 반영 문구 확정 (실측값 기반)
