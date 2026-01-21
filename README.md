# XIVIX AI Core V1.0

> **Gemini 2.5 Flash 기반 초고속 AI 상담 자동화 엔진**

<p align="center">
  <img src="https://img.shields.io/badge/Engine-Gemini%202.5%20Flash-blue?style=for-the-badge" alt="Gemini">
  <img src="https://img.shields.io/badge/Framework-Hono-orange?style=for-the-badge" alt="Hono">
  <img src="https://img.shields.io/badge/Platform-Cloudflare-yellow?style=for-the-badge" alt="Cloudflare">
</p>

---

## 📌 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | XIVIX AI Core |
| **버전** | 1.0.0 |
| **목표** | 네이버 톡톡/예약 연동 AI 상담 자동화 |
| **타겟 플랫폼** | Naver TalkTalk, Naver Reservation |
| **AI 엔진** | Google Gemini 2.5 Flash (멀티모달) |

---

## 🌐 서비스 URL

| 환경 | URL | 상태 |
|------|-----|------|
| **개발 (Sandbox)** | https://3000-i4f83ph6ja79fxnhju0nq-3844e1b6.sandbox.novita.ai | ✅ Active |
| **대시보드** | /dashboard | ✅ Active |
| **API 문서** | /api/system/info | ✅ Active |
| **헬스체크** | /api/system/health | ✅ Active |

---

## ✅ 구현 완료 기능

### ❶ AI 상담 엔진
- [x] Gemini 2.5 Flash API 연동
- [x] 텍스트 + 이미지 멀티모달 처리
- [x] SSE 스트리밍 응답 (첫 토큰 0.5초 내)
- [x] 전문가급 시스템 프롬프트 (매장 지배인 AI)
- [x] 개인정보 마스킹 처리

### ❷ 네이버 톡톡 연동
- [x] Webhook 엔드포인트 (`/v1/naver/callback`)
- [x] 메시지 수신 및 파싱
- [x] AI 응답 자동 발송
- [x] 버튼형 메시지 (예약 유도)
- [x] Rate Limiting (분당 30회)

### ❸ 데이터 저장소
- [x] **D1 Database**: 사용자/매장/상담이력/예약 테이블
- [x] **KV Storage**: 대화 컨텍스트 (Memory Window 10개)
- [x] **R2 Storage**: 이미지 저장 파이프라인

### ❹ 관리자 대시보드
- [x] Deep Black 테마 UI (Glassmorphism)
- [x] 실시간 상담 모니터링
- [x] 통계 위젯 (상담 건수, 전환율, 응답 속도)
- [x] 예약 관리 인터페이스
- [x] 시스템 리소스 현황

---

## 🚧 미구현 기능 (Next Phase)

### Phase 2: 고급 기능
- [ ] Cron Triggers (토큰 자동 갱신)
- [ ] 일일 성과 리포트 자동 발송
- [ ] 2단계 인증 (2FA) 구현
- [ ] 불만 감지 시 사장님 푸시 알림

### Phase 3: 확장
- [ ] 멀티 매장 관리
- [ ] 네이버 예약 API 직접 연동
- [ ] 사용자 권한 관리 (RBAC)
- [ ] 결제 시스템 연동

---

## 🔌 API 엔드포인트

### Webhook (네이버 톡톡)
```
GET  /v1/naver/callback     # Webhook 인증
POST /v1/naver/callback     # 메시지 수신 처리
POST /v1/test/chat          # 테스트용 채팅 API
```

### Dashboard API
```
GET  /api/dashboard/stats/:storeId   # 대시보드 통계
GET  /api/stores                      # 매장 목록
GET  /api/stores/:id                  # 매장 상세
POST /api/stores                      # 매장 생성
PUT  /api/stores/:id                  # 매장 수정
```

### Conversation & Reservations
```
GET  /api/logs/:storeId              # 상담 이력
GET  /api/logs/:storeId/realtime     # 실시간 로그 (SSE)
GET  /api/reservations/:storeId      # 예약 목록
POST /api/reservations               # 예약 생성
PUT  /api/reservations/:id/status    # 예약 상태 변경
```

### System
```
GET  /api/system/info                # 시스템 정보
GET  /api/system/health              # 헬스 체크
POST /api/maintenance/cleanup-images # 이미지 정리 (Cron)
```

---

## 🗄️ 데이터 아키텍처

### D1 Database (SQLite)
```sql
├── users           # 사업주 계정
├── stores          # 매장 정보 + AI 설정
├── conversation_logs  # 상담 이력
├── reservations    # 예약 데이터
└── api_tokens      # 외부 API 토큰
```

### KV Storage
```
ctx:{storeId}:{customerId}  # 대화 컨텍스트 (24h TTL)
token:{key}                 # OAuth 토큰 (30d TTL)
stats:{storeId}             # 통계 캐시 (5min TTL)
ratelimit:{identifier}      # Rate limit 카운터
```

### R2 Storage
```
uploads/   # 일반 업로드 이미지
customer/  # 고객 전송 이미지
test/      # 테스트용 이미지
```

---

## 🚀 빠른 시작 가이드

### 1. 환경 변수 설정
```bash
# .dev.vars 파일 생성
GEMINI_API_KEY=your-gemini-api-key
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
NAVER_ACCESS_TOKEN=your-naver-access-token
```

### 2. 로컬 개발
```bash
# 의존성 설치
npm install

# D1 데이터베이스 초기화
npm run db:migrate:local
npm run db:seed

# 개발 서버 실행
npm run build
npm run dev:d1

# 또는 PM2로 실행
pm2 start ecosystem.config.cjs
```

### 3. API 테스트
```bash
# 시스템 정보
curl http://localhost:3000/api/system/info

# 대시보드 통계
curl http://localhost:3000/api/dashboard/stats/1

# 테스트 채팅
curl -X POST http://localhost:3000/v1/test/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "예약 가능한 시간 알려주세요"}'
```

---

## 📦 프로젝트 구조
```
webapp/
├── src/
│   ├── index.tsx           # 메인 앱 엔트리
│   ├── types.ts            # TypeScript 타입 정의
│   ├── lib/
│   │   ├── gemini.ts       # Gemini API 연동
│   │   ├── kv-context.ts   # KV 컨텍스트 관리
│   │   ├── naver-talktalk.ts  # 네이버 톡톡 API
│   │   └── r2-storage.ts   # R2 이미지 저장
│   ├── routes/
│   │   ├── api.ts          # REST API 라우트
│   │   └── webhook.ts      # Webhook 핸들러
│   └── views/
│       ├── dashboard.tsx   # 대시보드 UI
│       └── login.tsx       # 로그인 페이지
├── migrations/
│   └── 0001_initial_schema.sql
├── public/static/          # 정적 파일
├── ecosystem.config.cjs    # PM2 설정
├── wrangler.jsonc          # Cloudflare 설정
└── package.json
```

---

## 🎨 디자인 시스템

| 요소 | 값 |
|------|-----|
| **Theme** | Deep Black (#050505) |
| **Accent** | Electric Blue (#007AFF) |
| **Font** | Pretendard (Wide Spacing) |
| **Layout** | Grid-based Glassmorphism |

---

## 🔒 보안 정책

- ✅ 개인정보(전화번호 등) 마스킹 후 AI 전달
- ✅ 모든 API 통신 TLS 암호화
- ✅ API 키는 Cloudflare Secrets으로 관리
- ⏳ 2단계 인증 (2FA) - 예정
- ⏳ RBAC 권한 관리 - 예정

---

## 📊 성능 지표

| 메트릭 | 목표 | 현재 |
|--------|------|------|
| 첫 토큰 응답 | < 0.5s | ~0.4s |
| 전체 응답 | < 3s | ~2s |
| 예약 전환율 | > 25% | 66.7% (샘플) |

---

## 📝 라이선스

© 2024 XIVIX. All rights reserved.

---

**Last Updated**: 2026-01-21
