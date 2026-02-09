# XIVIX AI Core V3.0

> **GPT-4o + Gemini 2.5 Pro 듀얼 AI 엔진 기반 초정밀 상담 자동화**
> 
> **12개 업종 특화 + AI 모델 선택 + 실시간 DB 반영**

<p align="center">
  <img src="https://img.shields.io/badge/AI-GPT--4o%20%2B%20Gemini%202.5-blue?style=for-the-badge" alt="AI">
  <img src="https://img.shields.io/badge/Framework-Hono-orange?style=for-the-badge" alt="Hono">
  <img src="https://img.shields.io/badge/Platform-Cloudflare-yellow?style=for-the-badge" alt="Cloudflare">
  <img src="https://img.shields.io/badge/Version-3.0.1-green?style=for-the-badge" alt="Version">
</p>

---

## 서비스 URL (프로덕션)

| 서비스 | URL | 설명 |
|--------|-----|------|
| **메인 (커스텀 도메인)** | https://studioaibotbot.com | 커스텀 도메인 (SSL) |
| **메인 (Pages)** | https://xivix-ai-core.pages.dev | Cloudflare Pages |
| **로그인** | https://studioaibotbot.com/login | 마스터/사장님 로그인 |
| **마스터 대시보드** | https://studioaibotbot.com/master | 방대표님 전용 관리 |
| **통합 관리자 UI** | https://studioaibotbot.com/admin/{storeId} | AI/프롬프트/네이버 통합 설정 |
| **고객 연동 페이지** | https://studioaibotbot.com/connect | 사장님 30초 연동 |
| **결제 페이지** | https://studioaibotbot.com/payment/{storeId} | KG이니시스 결제 |
| **영업사원 정산** | https://studioaibotbot.com/sales | 영업사원 수수료 정산 대시보드 |
| **네이버 Webhook** | https://studioaibotbot.com/v1/naver/callback/{storeId} | 톡톡 메시지 수신 |
| **헬스체크** | https://studioaibotbot.com/api/health | 시스템 상태 |

---

## V3.0.1 신규 기능 (2026-02-09)

### 커스텀 도메인 studioaibotbot.com (NEW)
- **SSL 인증서 자동 발급**: Cloudflare에서 자동 관리
- **도메인 매핑**: studioaibotbot.com + www.studioaibotbot.com
- **결제 콜백 URL 변경**: returnUrl → https://studioaibotbot.com/api/payment/return

### KG이니시스 실결제 연동 (NEW)
- **웹표준 결제(INIStdPay)**: SHA-256 서명 + mKey 생성 (Web Crypto API)
- **결제 준비**: `/api/payment/prepare` → oid, signature, mKey, pg_params 생성
- **2차 인증**: `/api/payment/return` → authToken 서명 → 이니시스 승인 요청
- **결제 취소**: `/api/payment/cancel` → 이니시스 환불 API 호출
- **결제 페이지**: `/payment/{storeId}` → INIStdPay.js 연동 UI
- **지원 결제 유형**: 셋팅비(기본/프리미엄), 월이용료(미니~프리미엄), SMS 초과분
- **MID**: MOI9559449 (테스트)
- **부가세 10% 자동 계산**

### 영업사원 수수료 정산 시스템 (NEW)
- **영업사원 CRUD**: 등록/목록/상세/수정 (`/api/agents`)
- **매장 배정**: 영업사원-매장 매핑 (`/api/agents/:id/assign-store`)
- **월별 수수료 자동 계산**: 매월 1회 실행 (`/api/commissions/calculate`)
  - 셋팅비 수수료율: 기본 30%
  - 월이용료 수수료율: 기본 20%
  - 최소 유지 매장 3개 미만 시 15%로 하향
  - 중복 계산 방지 (period + store 기준)
- **수수료 정산 현황**: 기간별 조회 (`/api/commissions`)
- **개별/일괄 지급**: pending → paid 처리 (`/api/commissions/:id/pay`, `/api/commissions/bulk-pay`)
- **수익 시뮬레이션**: 영업사원별 월간/연간 예상 수수료 (`/api/agents/:id/simulation`)
- **전용 대시보드**: `/sales` → 3탭 (영업사원 관리 / 수수료 정산 / 수익 시뮬레이션)
- **계좌 정보 관리**: 은행/계좌번호/예금주 등록

---

## V3.0 주요 기능

### 통합 관리자 대시보드
- 한 화면에서 모든 설정: AI 프롬프트, 매장 정보, AI 모델, 고급 설정 통합
- 실시간 DB 반영: 설정 변경 즉시 네이버 톡톡에 적용
- 실시간 AI 테스트 + 빠른 테스트 버튼

### 12개 업종별 초정밀 프롬프트
| 카테고리 | 업종 |
|----------|------|
| **beauty** | 1인미용실, 대형미용실, 피부관리실, 네일아트 |
| **medical** | 치과, 산부인과, 산후조리원 |
| **finance** | 보험설계사 |
| **automotive** | 중고차딜러, 신차딜러 |
| **service** | 프리랜서 |
| **food** | 치킨집 |

### AI 모델 선택 + 프롬프트 파이프라인
- 기본 모델: GPT-4o / 서브 모델: Gemini 2.5 Pro
- Stage 1: GPT-4o 비정형→구조화 / Stage 2: Gemini 검증/업그레이드

### 요금제 & 과금 시스템
| 요금제 | 월 이용료 | 셋팅비 | AI 한도 | SMS 한도 | SMS 초과 |
|--------|----------|--------|---------|---------|---------|
| 미니 | 29,000원 | 100,000원 | 500건 | 50건 | 25원 |
| 라이트 | 49,000원 | 300,000원 | 1,000건 | 100건 | 25원 |
| 스탠다드 | 99,000원 | 300,000원 | 5,000건 | 300건 | 20원 |
| 프리미엄 | 198,000원 | 500,000원 | 20,000건 | 1,000건 | 15원 |
| 다점포 | 198,000원+ | 500,000원+ | 20,000건+ | 1,000건+ | 15원 |

### 수동 메시지 발송
- 개별 발송: 사장님→고객 톡톡/SMS 직접 발송
- 단체 발송: CRM 고객 목록 다중 선택 → 일괄 발송
- 발송 이력 추적

### 사용량 추적 시스템
- 월별 자동 초기화 (매월 1일)
- AI/SMS/LMS/톡톡/이미지분석 실시간 카운트
- 마스터 대시보드 전체 매장 사용량 확인

---

## V3.0 API 엔드포인트 전체

### 요금제 & 사용량
```
GET  /api/plan/:storeId         — 매장 요금제 조회
PUT  /api/plan/:storeId         — 매장 요금제 변경
GET  /api/usage/:storeId        — 사용량 조회
GET  /api/usage/all/summary     — 전체 매장 사용량 (마스터)
GET  /api/plans/list            — 요금제 목록
```

### 수동 메시지 발송
```
POST /api/stores/:id/send-message  — 개별 메시지 발송
POST /api/stores/:id/send-bulk     — 단체 메시지 발송
GET  /api/stores/:id/messages      — 발송 이력
```

### KG이니시스 결제
```
POST /api/payment/prepare       — 결제 준비 (SHA-256 서명 생성)
POST /api/payment/return        — 결제 완료 콜백 (2차 인증)
POST /api/payment/cancel        — 결제 취소 (환불)
GET  /api/payments/:storeId     — 결제 이력
GET  /payment/:storeId          — 결제 페이지 UI
```

### 영업사원 수수료 정산
```
POST /api/agents                — 영업사원 등록
GET  /api/agents                — 영업사원 목록
GET  /api/agents/:agentId       — 영업사원 상세 (매장+수수료 이력)
PUT  /api/agents/:agentId       — 영업사원 수정
POST /api/agents/:agentId/assign-store — 매장 배정
POST /api/commissions/calculate — 월별 수수료 자동 계산
GET  /api/commissions           — 수수료 정산 현황 (?period=YYYY-MM)
PUT  /api/commissions/:id/pay   — 수수료 개별 지급
POST /api/commissions/bulk-pay  — 수수료 일괄 지급
GET  /api/agents/:agentId/simulation — 수익 시뮬레이션
```

### 매장 관리 & AI 키
```
PUT  /api/stores/:id/ai-keys    — AI API 키 설정
GET  /api/stores/:id/ai-keys    — AI API 키 조회 (마스킹)
```

### 업종 템플릿 & 프롬프트
```
GET  /api/templates/industry              — 전체 업종 목록
GET  /api/templates/industry/:industryId  — 특정 업종 템플릿
POST /api/stores/:id/generate-prompt-pipeline — 프롬프트 파이프라인
```

### 매장 설정 & 네이버톡톡
```
PUT  /api/stores/:id/settings              — 매장 설정 변경
POST /api/stores/:id/talktalk/config       — 톡톡 연동 설정
POST /api/chat/test                        — AI 응답 테스트
```

---

## 프로젝트 구조 (V3.0.1)

```
/home/user/webapp/
├── src/
│   ├── index.tsx              # 메인 앱 엔트리 (라우팅)
│   ├── types.ts               # TypeScript 타입 정의
│   ├── routes/
│   │   ├── api.ts             # REST API 엔드포인트 (11600+ 줄)
│   │   └── webhook.ts         # 네이버 톡톡 웹훅 핸들러
│   ├── views/
│   │   ├── admin-unified.tsx  # 통합 관리자 UI
│   │   ├── super-master.tsx   # 마스터 대시보드
│   │   ├── payment.tsx        # KG이니시스 결제 페이지
│   │   ├── sales-agent.tsx    # 영업사원 수수료 정산 대시보드
│   │   ├── login.tsx          # 로그인 페이지
│   │   └── ...
│   └── lib/
│       ├── plan-config.ts     # 5개 요금제 기능 분기
│       ├── usage-tracker.ts   # AI/SMS 사용량 추적
│       ├── industry-templates.ts # 12개 업종 초정밀 템플릿
│       ├── prompt-pipeline.ts # GPT-4o → Gemini 검증 파이프라인
│       ├── ai-router.ts       # AI 모델 라우터
│       ├── openai.ts          # OpenAI GPT-4o 연동
│       ├── gemini.ts          # Gemini AI 연동
│       ├── naver-talktalk.ts  # 톡톡 API 클라이언트
│       └── ...
├── migrations/
│   ├── 0001~0013             # 기존 마이그레이션
│   ├── 0014_plan_and_usage.sql    # 요금제 + 사용량 테이블
│   └── 0015_sales_commission.sql  # 영업사원 + 수수료 테이블
├── test-questions/            # 업종별 50문항 테스트
├── wrangler.jsonc
├── package.json
└── ecosystem.config.cjs
```

---

## 데이터 아키텍처

### 핵심 테이블
| 테이블 | 설명 |
|--------|------|
| `xivix_users` | 사용자 (마스터/관리자) |
| `xivix_stores` | 매장 정보 + 요금제 + AI 설정 |
| `xivix_conversation_logs` | AI 대화 로그 |
| `xivix_usage_counters` | 월별 AI/SMS 사용량 |
| `xivix_manual_messages` | 수동 메시지 발송 이력 |
| `xivix_payments` | KG이니시스 결제 이력 |
| `xivix_subscriptions` | 구독 관리 |
| `xivix_agents` | 영업사원 정보 + 수수료율 |
| `xivix_agent_stores` | 영업사원-매장 매핑 |
| `xivix_commissions` | 수수료 정산 이력 |

### 스토리지 서비스
- **D1 Database**: 모든 관계형 데이터 (15개 마이그레이션)
- **KV Storage**: 대화 컨텍스트 캐시
- **R2 Storage**: 이미지/파일 저장

---

## 구현 현황

### 완료 (V3.0.1 기준)
- [x] 통합 관리자 대시보드
- [x] 12개 업종별 초정밀 프롬프트
- [x] GPT-4o → Gemini 2.5 Pro 파이프라인
- [x] AI 모델 선택 (GPT-4o/Gemini)
- [x] 요금제별 기능 분기 (5개 플랜 × 18개 기능키)
- [x] AI/SMS 사용량 추적 (월별 카운터)
- [x] 수동 메시지 발송 (개별/단체)
- [x] KG이니시스 결제 연동 (서명/결제/콜백/취소)
- [x] 영업사원 수수료 정산 시스템 (CRUD/계산/지급/시뮬레이션)
- [x] 커스텀 도메인 studioaibotbot.com (SSL)
- [x] 프로덕션 D1 마이그레이션 15개 전체 적용

### 미구현/추후
- [ ] 다점포 통합 대시보드
- [ ] 다점포 과금 체계
- [ ] 전담매니저 시스템
- [ ] KG이니시스 실서비스 MID 전환 (테스트→상용)
- [ ] 자동 결제 (정기 구독)
- [ ] 매출/예약 통계 대시보드

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| **Primary AI** | GPT-4o (OpenAI) |
| **Secondary AI** | Gemini 2.5 Pro/Flash (Google) |
| **Runtime** | Cloudflare Workers (Hono Framework) |
| **Database** | Cloudflare D1 (SQLite) |
| **Cache** | Cloudflare KV |
| **Storage** | Cloudflare R2 |
| **Payment** | KG이니시스 (INIStdPay 웹표준) |
| **Notification** | Solapi (KakaoTalk/SMS) |
| **Frontend** | TailwindCSS CDN + Vanilla JS |
| **Domain** | studioaibotbot.com (Cloudflare DNS + SSL) |

---

## 보안 주의사항

- 토큰/키는 비공개 저장: 환경변수 또는 Cloudflare Secrets 사용
- 민감 정보 노출 금지: 코드/로그에 API 키 직접 기재 금지
- 접근 관리: 마스터 계정만 전체 관리 가능
- 결제 MID/SignKey는 Cloudflare Secrets로 관리 권장

---

## 라이선스

(c) 2026 XIVIX. All rights reserved.

---

**Last Updated**: 2026-02-09  
**Version**: 3.0.1 (커스텀 도메인 + KG이니시스 결제 + 영업사원 수수료 정산)
