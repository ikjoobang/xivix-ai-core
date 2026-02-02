# XIVIX AI Core V2.0

> **Gemini 2.5 Flash 기반 초고속 AI 상담 자동화 엔진**
> 
> **Zero-Touch Onboarding & Extreme Speed**

<p align="center">
  <img src="https://img.shields.io/badge/Engine-Gemini%202.5%20Flash-blue?style=for-the-badge" alt="Gemini">
  <img src="https://img.shields.io/badge/Framework-Hono-orange?style=for-the-badge" alt="Hono">
  <img src="https://img.shields.io/badge/Platform-Cloudflare-yellow?style=for-the-badge" alt="Cloudflare">
  <img src="https://img.shields.io/badge/Version-2.0.0-green?style=for-the-badge" alt="Version">
</p>

---

## 🌐 서비스 URL (프로덕션)

| 서비스 | URL | 설명 |
|--------|-----|------|
| **🏠 메인 페이지** | https://xivix-ai-core.pages.dev | 랜딩 페이지 |
| **🔑 로그인** | https://xivix-ai-core.pages.dev/login | **마스터/사장님 로그인** |
| **🔗 고객 연동 페이지** | https://xivix-ai-core.pages.dev/connect | **사장님 30초 연동** |
| **👑 마스터 대시보드** | https://xivix-ai-core.pages.dev/master | **방대표님 전용 관리** |
| **📊 대시보드** | https://xivix-ai-core.pages.dev/dashboard | 매장별 통계 |
| **🔗 네이버 Webhook** | https://xivix-ai-core.pages.dev/v1/naver/callback/{storeId} | 톡톡 메시지 수신 |
| **❤️ 헬스체크** | https://xivix-ai-core.pages.dev/api/system/health | 시스템 상태 |

---

## 🆕 V2.0 신규 기능

### ✅ 인증 시스템 (완료)
- **마스터 로그인**: 마스터 계정 전용 인증
- **사장님 로그인**: 매장 사장님 인증
- **세션 관리**: 서버사이드 세션 기반
- **로그인 보안**: 5회 실패 시 30분 계정 잠금

### ✅ 네이버 톡톡 API 연동 (완료)
- **텍스트 메시지 발송**: 자동 AI 응답 발송
- **버튼 메시지 발송**: 예약 유도 버튼
- **복합 메시지**: 이미지 + 버튼 조합
- **테스트 모드**: IS_TEST_MODE=true 시 실제 발송 차단

### ✅ 예약 알림 리마인더 (완료)
- **자동 스케줄링**: 예약 확정 시 24h/2h/1h 전 알림 자동 생성
- **일괄 발송**: Cron Job으로 대기 알림 일괄 처리
- **취소 연동**: 예약 취소 시 리마인더 자동 취소

### ✅ SMS 예약 알림 자동화 (완료)
- **예약 확정 알림**: 예약 확정 시 고객에게 자동 SMS 발송
- **리마인더 SMS**: 24h/2h/1h 전 자동 리마인더 발송
- **취소 알림**: 예약 취소 시 고객에게 취소 안내 SMS
- **수동 SMS 발송**: 관리자 수동 SMS 발송 API

### ✅ 월간 수익 리포트 (완료)
- **자동 통계 집계**: 대화 수, 예약 수, 전환율
- **고객 분석**: 총 고객, 재방문 고객
- **시간대 분석**: 피크 시간대 파악
- **인기 서비스**: 예약 기준 인기 서비스 TOP 10

### ✅ 네이버 예약 API 연동 (완료)
- **예약 가능 시간 조회**: 영업시간 기반 30분 단위 슬롯 자동 계산
- **예약 생성/취소 API**: CRUD 완비
- **예약 흐름 상태 관리**: KV 기반 10분 TTL
- **Webhook 예약 의도 감지**: 자동 예약 안내

### ✅ 20개 업종 템플릿 (완료)
- **업종별 맞춤 AI 프롬프트**: 전문가/뷰티/헬스/음식/교육/서비스/소매
- **자동화 설정 포함**:
  - CTA: 유입 및 행동 유도
  - Marketing: 자동 상담 및 전환
  - Action: 예약/결제/DB확보
  - Retention: 재방문/단골 관리
  - Recall: 이탈 고객 리콜
- **원클릭 매장 설정 API**: 업종 선택만으로 즉시 AI 챗봇 생성

---

## 📡 V2.0 API 엔드포인트

### 인증 API

```bash
# 마스터 로그인
curl -X POST https://xivix-ai-core.pages.dev/api/auth/master/login \
  -H "Content-Type: application/json" \
  -d '{"email":"master@xivix.kr","password":"your-password"}'

# 사장님 로그인
curl -X POST https://xivix-ai-core.pages.dev/api/auth/owner/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"your-password"}'

# 로그아웃
curl -X POST https://xivix-ai-core.pages.dev/api/auth/logout \
  -H "Authorization: Bearer {token}"

# 세션 검증
curl https://xivix-ai-core.pages.dev/api/auth/verify \
  -H "Authorization: Bearer {token}"

# 현재 사용자 정보
curl https://xivix-ai-core.pages.dev/api/auth/me \
  -H "Authorization: Bearer {token}"

# 비밀번호 변경
curl -X POST https://xivix-ai-core.pages.dev/api/auth/change-password \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"oldPassword":"current","newPassword":"new-password"}'
```

### 예약 알림 리마인더 API

```bash
# 대기 중인 리마인더 조회
curl https://xivix-ai-core.pages.dev/api/reminders/pending

# 리마인더 일괄 처리 (Cron Job용)
curl -X POST https://xivix-ai-core.pages.dev/api/reminders/process

# 매장별 리마인더 통계
curl https://xivix-ai-core.pages.dev/api/reminders/stats/1

# 전체 리마인더 조회 (필터 가능)
curl "https://xivix-ai-core.pages.dev/api/reminders/all?status=pending&storeId=1&limit=50"

# 예약 확정 + 리마인더 자동 생성
curl -X POST https://xivix-ai-core.pages.dev/api/reservations/1/confirm-with-reminder \
  -H "Content-Type: application/json" \
  -d '{"sendSmsNow": true}'

# 예약 취소 + 리마인더 취소
curl -X POST https://xivix-ai-core.pages.dev/api/reservations/1/cancel \
  -H "Content-Type: application/json" \
  -d '{"reason": "고객 요청", "notifyCustomer": true}'

# 예약에 리마인더 설정
curl -X POST https://xivix-ai-core.pages.dev/api/stores/1/booking/1/setup-reminders

# 리마인더 테스트 발송
curl -X POST https://xivix-ai-core.pages.dev/api/reminders/test/1
```

### SMS 알림 API

```bash
# 수동 SMS 발송
curl -X POST https://xivix-ai-core.pages.dev/api/notifications/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": 1,
    "customerPhone": "01012345678",
    "message": "[매장명] 예약 안내 메시지입니다.",
    "notificationType": "manual_sms"
  }'
```

### 월간 리포트 API

```bash
# 월간 리포트 생성
curl -X POST https://xivix-ai-core.pages.dev/api/reports/monthly/1 \
  -H "Content-Type: application/json" \
  -d '{"month":"2026-01"}'

# 월간 리포트 조회
curl "https://xivix-ai-core.pages.dev/api/reports/monthly/1?month=2026-01"

# 최근 12개월 리포트
curl https://xivix-ai-core.pages.dev/api/reports/monthly/1

# 전체 매장 리포트 생성 (마스터용)
curl -X POST https://xivix-ai-core.pages.dev/api/reports/generate-all \
  -H "Content-Type: application/json" \
  -d '{"month":"2026-01"}'
```

### 업종 템플릿 API

```bash
# 전체 업종 목록 조회 (20개)
curl https://xivix-ai-core.pages.dev/api/industries

# 특정 업종 템플릿 상세 조회
curl https://xivix-ai-core.pages.dev/api/industries/BEAUTY_SALON

# 카테고리별 업종 조회
curl https://xivix-ai-core.pages.dev/api/industries/category/beauty
# 카테고리: professional, beauty, health, food, retail, service, education

# 원클릭 매장 설정 (업종 템플릿 기반)
curl -X POST https://xivix-ai-core.pages.dev/api/stores/quick-setup \
  -H "Content-Type: application/json" \
  -d '{
    "industryId": "BEAUTY_SALON",
    "storeName": "헤어플러스",
    "ownerName": "박미용",
    "ownerPhone": "01033334444",
    "address": "서울시 마포구 홍대입구역 근처",
    "operatingHours": "화-일 10:00-21:00, 월 휴무",
    "naverTalktalkId": "HAIRPLUS",
    "naverReservationId": "123456"
  }'
```

### 예약 API

```bash
# 예약 가능 시간 조회 (7일)
curl https://xivix-ai-core.pages.dev/api/stores/1/booking/available?days=7

# 예약 생성
curl -X POST https://xivix-ai-core.pages.dev/api/stores/1/booking \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-02-03",
    "time": "14:00",
    "customer_name": "홍길동",
    "customer_phone": "01012345678",
    "service_name": "커트"
  }'

# 예약 목록 조회
curl https://xivix-ai-core.pages.dev/api/stores/1/booking/list

# 예약 상태 변경
curl -X PATCH https://xivix-ai-core.pages.dev/api/stores/1/booking/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'

# 예약 삭제
curl -X DELETE https://xivix-ai-core.pages.dev/api/stores/1/booking/1
```

---

## 📁 프로젝트 구조 (V2.0)

```
/home/user/webapp/
├── src/
│   ├── index.tsx              # 메인 앱 엔트리 (라우팅)
│   ├── types.ts               # TypeScript 타입 정의
│   ├── routes/
│   │   ├── api.ts             # REST API 엔드포인트 (4600+ 줄)
│   │   └── webhook.ts         # 네이버 톡톡 웹훅 핸들러
│   ├── views/
│   │   ├── super-master.tsx   # 마스터 대시보드 V2.0
│   │   ├── client-onboarding.tsx  # 사장님 연동 페이지
│   │   ├── dashboard.tsx      # 매장 대시보드
│   │   └── login.tsx          # 로그인 페이지 V2.0
│   └── lib/
│       ├── auth.ts            # 인증 라이브러리 (V2.0 신규)
│       ├── naver-talktalk.ts  # 톡톡 API 클라이언트 (V2.0 강화)
│       ├── naver-booking.ts   # 예약 기능 (V2.0 신규)
│       ├── industry-templates.ts # 20개 업종 템플릿 (V2.0 신규)
│       ├── reminder.ts        # 예약 알림 리마인더 (V2.0 신규)
│       ├── gemini.ts          # Gemini AI 연동
│       ├── kv-context.ts      # KV 캐시 유틸
│       └── r2-storage.ts      # R2 이미지 저장 유틸
├── migrations/
│   ├── 0001_initial_schema.sql
│   ├── 0002_xivix_tables.sql
│   ├── ...
│   └── 0010_auth_system.sql   # V2.0 인증/리마인더/리포트 테이블
├── wrangler.jsonc
├── vite.config.ts
├── package.json
└── ecosystem.config.cjs       # PM2 설정 (로컬 개발용)
```

---

## 🗄️ 데이터베이스 스키마 (V2.0 추가)

### xivix_master_accounts (마스터 계정)
```sql
id, email, name, phone, password_hash, is_active, last_login_at
```

### xivix_sessions (세션 관리)
```sql
id, session_token, user_type, user_id, ip_address, user_agent, expires_at
```

### xivix_auth_logs (인증 로그)
```sql
id, user_type, user_id, action, ip_address, user_agent, details
```

### xivix_reminder_schedules (리마인더 스케줄)
```sql
id, store_id, reservation_id, reminder_type, scheduled_at, sent_at, status
```

### xivix_monthly_reports (월간 리포트)
```sql
id, store_id, report_month, total_conversations, total_reservations,
confirmed_reservations, cancelled_reservations, conversion_rate,
avg_response_time_ms, total_customers, returning_customers, peak_hours, popular_services
```

### xivix_naver_talktalk_config (톡톡 API 설정)
```sql
id, store_id, partner_id, account_id, access_token, webhook_verified
```

---

## ✅ 구현 완료 기능

### V2.0 (2026-02-02)
- [x] 마스터/사장님 로그인 인증 시스템
- [x] 서버사이드 세션 관리
- [x] 네이버 톡톡 메시지 발송 API
- [x] 예약 알림 자동 발송 (리마인더)
- [x] 월간 수익 리포트 생성
- [x] 로그인 페이지 UI 개선
- [x] 마스터 대시보드 인증 연동
- [x] **네이버 예약 API 연동** (예약 가능 시간 조회/생성/관리)
- [x] **20개 업종 템플릿** (업종별 맞춤 AI 프롬프트)
- [x] **원클릭 매장 설정 API** (quick-setup)

### V1.0 (기존)
- [x] Zero-Touch Onboarding
- [x] Gemini 2.5 Flash AI 상담
- [x] 원클릭 AI 셋팅
- [x] 봇 기간 관리
- [x] 매장 삭제 기능
- [x] 할루시네이션 가드

---

## 📋 20개 업종 템플릿

| 카테고리 | 업종 |
|----------|------|
| **professional** | 🛡️ 보험설계사, ⚖️ 변호사, 🏠 부동산, 📊 세무사 |
| **beauty** | 💇 미용실, ✨ 피부관리, 💅 네일아트 |
| **health** | 💪 헬스/PT, 🏥 치과/성형 |
| **food** | 🍽️ 맛집/카페 |
| **retail** | 🚗 중고차, 💐 꽃집 |
| **service** | 🐕 펫훈련, 🏡 인테리어, 🚚 이사, 🧹 청소, 💒 웨딩, 🔧 수리 |
| **education** | 📚 학원, ⛳ 스포츠레슨 |

---

## 🚧 예정 기능 (Phase 3)

- [ ] Cron Triggers (리마인더 자동 발송)
- [ ] 실시간 대화 모니터링 (WebSocket)
- [ ] 2단계 인증 (2FA)
- [ ] 비밀번호 찾기 (이메일 인증)
- [ ] 네이버 OAuth 자동 연동
- [x] ~~예약 SMS 알림 자동화~~ **(V2.1 완료)**
- [ ] 실전 톡톡 Webhook 테스트 (네이버 파트너센터 등록 대기)

---

## 🔧 개발 환경 설정

```bash
# 1. 의존성 설치
npm install

# 2. 로컬 D1 마이그레이션
npx wrangler d1 migrations apply xivix-production --local

# 3. 빌드
npm run build

# 4. 개발 서버 시작
pm2 start ecosystem.config.cjs

# 5. 테스트
curl http://localhost:3000/api/system/health
```

---

## 📊 성능 지표

| 메트릭 | 목표 | 실측 |
|--------|------|------|
| 첫 토큰 응답 | < 0.5s | ~0.4s |
| 전체 응답 | < 3s | ~2s |
| 예약 전환율 | > 25% | 66.7% |
| 인증 응답 | < 100ms | ~50ms |

---

## 🔧 기술 스택

| 구분 | 기술 |
|------|------|
| **AI Engine** | Gemini 2.5 Flash |
| **Runtime** | Cloudflare Workers (Hono Framework) |
| **Database** | Cloudflare D1 (SQLite) |
| **Cache** | Cloudflare KV |
| **Storage** | Cloudflare R2 |
| **Notification** | Solapi (KakaoTalk) |
| **Frontend** | TailwindCSS CDN + Vanilla JS |

---

## 📝 라이선스

© 2026 XIVIX. All rights reserved.

---

**Last Updated**: 2026-02-02  
**Version**: 2.1.1 (Authentication + Reminder + Report + Booking + Industry Templates + SMS Automation)
