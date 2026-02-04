# XIVIX AI Core V3.0

> **GPT-4o + Gemini 2.5 Pro 듀얼 AI 엔진 기반 초정밀 상담 자동화**
> 
> **12개 업종 특화 + AI 모델 선택 + 실시간 DB 반영**

<p align="center">
  <img src="https://img.shields.io/badge/AI-GPT--4o%20%2B%20Gemini%202.5-blue?style=for-the-badge" alt="AI">
  <img src="https://img.shields.io/badge/Framework-Hono-orange?style=for-the-badge" alt="Hono">
  <img src="https://img.shields.io/badge/Platform-Cloudflare-yellow?style=for-the-badge" alt="Cloudflare">
  <img src="https://img.shields.io/badge/Version-3.0.0-green?style=for-the-badge" alt="Version">
</p>

---

## 🌐 서비스 URL (프로덕션)

| 서비스 | URL | 설명 |
|--------|-----|------|
| **🏠 메인 페이지** | https://xivix-ai-core.pages.dev | 랜딩 페이지 |
| **🔑 로그인** | https://xivix-ai-core.pages.dev/login | **마스터/사장님 로그인** |
| **👑 마스터 대시보드** | https://xivix-ai-core.pages.dev/master | **방대표님 전용 관리** |
| **⚙️ 통합 관리자 UI** | https://xivix-ai-core.pages.dev/admin/{storeId} | **AI/프롬프트/네이버 통합 설정** |
| **🔗 고객 연동 페이지** | https://xivix-ai-core.pages.dev/connect | **사장님 30초 연동** |
| **📊 대시보드** | https://xivix-ai-core.pages.dev/dashboard | 매장별 통계 |
| **🔗 네이버 Webhook** | https://xivix-ai-core.pages.dev/v1/naver/callback/{storeId} | 톡톡 메시지 수신 |
| **❤️ 헬스체크** | https://xivix-ai-core.pages.dev/api/system/health | 시스템 상태 |

---

## 🆕 V3.0 신규 기능

### ⚙️ 통합 관리자 대시보드 (NEW)
- **한 화면에서 모든 설정**: AI 프롬프트, 매장 정보, AI 모델, 고급 설정 통합
- **실시간 DB 반영**: 설정 변경 즉시 네이버 톡톡에 적용
- **실시간 AI 테스트**: 테스트 메시지로 AI 응답 즉시 확인
- **빠른 테스트 버튼**: 가격문의, 이벤트, 예약, 영업시간 원클릭 테스트

### 🎯 12개 업종별 초정밀 프롬프트 (NEW)
| 카테고리 | 업종 |
|----------|------|
| **beauty** | 💇 1인미용실, 💇‍♀️ 대형미용실, ✨ 피부관리실, 💅 네일아트 |
| **medical** | 🦷 치과, 👶 산부인과, 🏥 산후조리원 |
| **finance** | 🛡️ 보험설계사 |
| **automotive** | 🚗 중고차딜러, 🚙 신차딜러 |
| **service** | 💼 프리랜서 |
| **food** | 🍗 치킨집 |

**각 업종별 50문항 테스트 파일 포함**: `test-questions/` 디렉토리

### 🤖 AI 모델 선택 기능 (NEW)
- **기본 모델**: GPT-4o (고품질 응답)
- **서브 모델**: Gemini 2.5 Pro (검증 및 대체)
- **관리자 모드에서 선택 가능**: 매장별 AI 모델 지정

### 🔄 프롬프트 생성 파이프라인 (NEW)
1. **Stage 1**: GPT-4o로 비정형 텍스트 → 구조화 데이터 추출
2. **Stage 2**: Gemini 2.5 Pro로 감정 자극형 프롬프트 검증/업그레이드
3. **자동 메뉴/이벤트 데이터 분리**: 할루시네이션 방지

### 📱 네이버톡톡 연동 강화 (NEW)
- **관리자 설정 즉시 반영**: DB 변경 → 톡톡 응답 즉시 적용
- **AI 모델 선택**: GPT-4o (기본), Gemini Pro (서브)
- **Webhook URL**: `https://xivix-ai-core.pages.dev/v1/naver/callback/{storeId}`

---

## 📡 V3.0 API 엔드포인트

### 업종 템플릿 API

```bash
# 전체 업종 템플릿 목록
curl https://xivix-ai-core.pages.dev/api/templates/industry

# 특정 업종 템플릿 조회
curl https://xivix-ai-core.pages.dev/api/templates/industry/BEAUTY_HAIR_SMALL

# 사용 가능한 업종 ID:
# BEAUTY_HAIR_SMALL, BEAUTY_HAIR_LARGE, BEAUTY_SKIN, BEAUTY_NAIL
# MEDICAL_DENTAL, MEDICAL_OBGYN, MEDICAL_POSTPARTUM
# FINANCE_INSURANCE, AUTO_USED, AUTO_NEW
# SERVICE_FREELANCER, FOOD_CHICKEN
```

### 프롬프트 생성 파이프라인 API

```bash
# GPT-4o → Gemini 2.5 Pro 2단계 프롬프트 생성
curl -X POST https://xivix-ai-core.pages.dev/api/stores/{storeId}/generate-prompt-pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "rawText": "블로그 글 또는 스마트플레이스 정보 붙여넣기",
    "storeName": "매장명",
    "businessType": "BEAUTY_HAIR_SMALL"
  }'
```

### 매장 설정 API

```bash
# AI 모델 변경 (GPT-4o, gemini-pro, gemini)
curl -X PUT https://xivix-ai-core.pages.dev/api/stores/{storeId}/settings \
  -H "Content-Type: application/json" \
  -d '{
    "ai_model": "gpt-4o",
    "system_prompt": "커스텀 프롬프트...",
    "menu_data": "메뉴 정보...",
    "is_active": 1
  }'

# 네이버톡톡 설정
curl -X POST https://xivix-ai-core.pages.dev/api/stores/{storeId}/talktalk/config \
  -H "Content-Type: application/json" \
  -d '{
    "partner_id": "파트너 ID",
    "account_id": "계정 ID",
    "access_token": "액세스 토큰"
  }'
```

### AI 테스트 API

```bash
# AI 응답 테스트
curl -X POST https://xivix-ai-core.pages.dev/api/chat/test \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": 38,
    "message": "레이어드컷 얼마에요?",
    "ai_model": "gpt-4o"
  }'
```

---

## 📁 프로젝트 구조 (V3.0)

```
/home/user/webapp/
├── src/
│   ├── index.tsx              # 메인 앱 엔트리 (라우팅)
│   ├── types.ts               # TypeScript 타입 정의
│   ├── routes/
│   │   ├── api.ts             # REST API 엔드포인트 (10000+ 줄)
│   │   └── webhook.ts         # 네이버 톡톡 웹훅 핸들러
│   ├── views/
│   │   ├── admin-unified.tsx  # ⭐ V3.0 통합 관리자 UI
│   │   ├── super-master.tsx   # 마스터 대시보드
│   │   ├── login.tsx          # 로그인 페이지
│   │   └── ...
│   └── lib/
│       ├── industry-templates.ts # ⭐ 12개 업종 초정밀 템플릿
│       ├── prompt-pipeline.ts # ⭐ GPT-4o → Gemini 검증 파이프라인
│       ├── ai-router.ts       # AI 모델 라우터
│       ├── openai.ts          # OpenAI GPT-4o 연동
│       ├── gemini.ts          # Gemini AI 연동
│       ├── naver-talktalk.ts  # 톡톡 API 클라이언트
│       └── ...
├── test-questions/            # ⭐ V3.0 업종별 50문항 테스트
│   ├── 01-beauty-hair-small.txt
│   ├── 02-beauty-hair-large.txt
│   ├── ...
│   └── 12-food-chicken.txt
├── migrations/
├── wrangler.jsonc
├── package.json
└── ecosystem.config.cjs
```

---

## 🎯 이벤트 데이터 예시 (다듬다헤어)

### 하린원장님 이벤트 메뉴
| 시술 | 정가 | 이벤트가 |
|------|------|----------|
| 레이어드컷(여성) | 20,000원 | 15,000원 |
| 레이어드펌 | 80,000원 | 65,000원 |
| S컬펌 | 70,000원 | 55,000원 |

### 유나원장님 이벤트 메뉴
| 시술 | 정가 | 이벤트가 |
|------|------|----------|
| 매직셋팅펌 | 120,000원 | 99,000원 |
| 디지털펌 | 100,000원 | 85,000원 |
| 염색 | 60,000원 | 50,000원 |

**영업시간**: 화~일 10:00-20:00, 월요일 휴무

---

## ✅ V3.0 구현 완료 기능

### V3.0 (2026-02-04)
- [x] **통합 관리자 대시보드** (한 화면 통합 관리)
- [x] **12개 업종별 초정밀 프롬프트** (각 50문항 테스트)
- [x] **GPT-4o → Gemini 2.5 Pro 검증 파이프라인**
- [x] **관리자 모드 AI 모델 선택** (GPT-4o/Gemini)
- [x] **실시간 DB 반영** (설정 즉시 적용)
- [x] **네이버톡톡 통합 연동**

### V2.0 (2026-02-02)
- [x] 마스터/사장님 로그인 인증 시스템
- [x] 네이버 톡톡 메시지 발송 API
- [x] 예약 알림 자동 발송 (리마인더)
- [x] 월간 수익 리포트 생성
- [x] 네이버 예약 API 연동
- [x] 20개 업종 템플릿

### V1.0 (기존)
- [x] Zero-Touch Onboarding
- [x] Gemini 2.5 Flash AI 상담
- [x] 할루시네이션 가드

---

## 🔧 기술 스택

| 구분 | 기술 |
|------|------|
| **Primary AI** | GPT-4o (OpenAI) |
| **Secondary AI** | Gemini 2.5 Pro/Flash (Google) |
| **Runtime** | Cloudflare Workers (Hono Framework) |
| **Database** | Cloudflare D1 (SQLite) |
| **Cache** | Cloudflare KV |
| **Storage** | Cloudflare R2 |
| **Notification** | Solapi (KakaoTalk/SMS) |
| **Frontend** | TailwindCSS CDN + Vanilla JS |

---

## 🔐 보안 주의사항

- **토큰/키는 비공개 저장**: 환경변수 또는 Cloudflare Secrets 사용
- **민감 정보 노출 금지**: 코드/로그에 API 키 직접 기재 금지
- **접근 관리**: 마스터 계정만 전체 관리 가능

---

## 📝 라이선스

© 2026 XIVIX. All rights reserved.

---

**Last Updated**: 2026-02-04  
**Version**: 3.0.0 (Unified Admin + 12 Industries + AI Model Selection + Prompt Pipeline)
