# XIVIX AI Core V1.0

> **Gemini 2.5 Flash 기반 초고속 AI 상담 자동화 엔진**
> 
> **Zero-Touch Onboarding & Extreme Speed**

<p align="center">
  <img src="https://img.shields.io/badge/Engine-Gemini%202.5%20Flash-blue?style=for-the-badge" alt="Gemini">
  <img src="https://img.shields.io/badge/Framework-Hono-orange?style=for-the-badge" alt="Hono">
  <img src="https://img.shields.io/badge/Platform-Cloudflare-yellow?style=for-the-badge" alt="Cloudflare">
  <img src="https://img.shields.io/badge/Version-2026.01.21-green?style=for-the-badge" alt="Version">
</p>

---

## 🌐 서비스 URL (프로덕션)

| 서비스 | URL | 설명 |
|--------|-----|------|
| **🏠 메인 페이지** | https://xivix-ai-core.pages.dev | 랜딩 페이지 |
| **🔗 고객 연동 페이지** | https://xivix-ai-core.pages.dev/connect | **사장님 30초 연동** |
| **👑 슈퍼 마스터** | https://xivix-ai-core.pages.dev/master | **방대표님 전용 관리** |
| **📊 대시보드** | https://xivix-ai-core.pages.dev/dashboard | 매장별 통계 |
| **⚙️ 어드민** | https://xivix-ai-core.pages.dev/admin | 업체 설정 마법사 |
| **🔗 네이버 Webhook** | https://xivix-ai-core.pages.dev/v1/naver/callback | 톡톡 메시지 수신 |
| **❤️ 헬스체크** | https://xivix-ai-core.pages.dev/api/system/health | 시스템 상태 |

---

## 🚀 Zero-Touch Onboarding 플로우

### 고객 사장님용 (/connect)

**3단계 간편 연동 - 30초만에 완료!**

| 단계 | 내용 | 사장님 액션 |
|------|------|------------|
| **Step 1** | 톡톡 계정 ID 확인 | 파트너센터에서 6자리 코드 복사 (예: @wc92cf) |
| **Step 2** | XIVIX 관리자 초대 | 설정 → 상담 멤버관리 → `partner@xivix.kr` 초대 |
| **Step 3** | 연동 요청 | 매장 정보 입력 후 버튼 클릭 |

### 방대표님용 (/master)

**슈퍼 마스터 대시보드 - 모든 매장 관리**

| 기능 | 설명 |
|------|------|
| **연동 대기 목록** | 사장님들이 요청한 매장 리스트 |
| **원클릭 세팅** | Authorization Key + Webhook + AI 페르소나 설정 |
| **카카오톡 알림** | 세팅 완료 시 사장님께 알림 발송 |
| **실시간 모니터링** | 모든 매장 AI 상담 현황 |

---

## 📖 사용 가이드

### ❶ 신규 매장 연동 (사장님)

1. https://xivix-ai-core.pages.dev/connect 접속
2. **Step 1**: 네이버 톡톡 파트너센터에서 계정 ID 확인 (좌측 상단 프로필 아래 @xxx 코드)
3. **Step 2**: 파트너센터 > 설정 > 상담 멤버관리 > `partner@xivix.kr` 초대
4. **Step 3**: 매장 정보 입력 후 "연동 요청하기" 클릭
5. **완료**: 30분 이내 세팅 완료 알림 수신

### ❷ 매장 세팅 (방대표님)

1. https://xivix-ai-core.pages.dev/master 접속
2. **연동 대기** 목록에서 매장 선택
3. **세팅하기** 버튼 클릭
4. 네이버 API 설정:
   - Authorization Key 입력 (파트너센터에서 복사)
   - Webhook URL 복사하여 파트너센터에 등록
5. AI 페르소나 설정 (역할, 특징, 말투)
6. **세팅 완료 & 활성화** 클릭
7. **카카오톡 알림 발송** 버튼으로 사장님께 완료 알림

### ❸ 카카오톡 알림 설정

1. /master > 알림 설정 메뉴
2. 솔라피 API Key/Secret 입력
3. 발신 번호 설정
4. 마스터 수신 번호 설정 (새 연동 요청 알림용)

---

## 🔑 등록된 API 키 (Cloudflare Secrets)

| 키 이름 | 상태 | 용도 |
|---------|------|------|
| `GEMINI_API_KEY` | ✅ 등록됨 | Google AI Studio 인증 |
| `NAVER_CLIENT_ID` | ✅ 등록됨 | 네이버 파트너 인증 |
| `NAVER_CLIENT_SECRET` | ✅ 등록됨 | 네이버 파트너 인증 |
| `NAVER_ACCESS_TOKEN` | ⚠️ 매장별 저장 | 메시지 발송 인증 |

---

## 📡 API 엔드포인트 목록

### Zero-Touch Onboarding API

```bash
# 연동 요청 (고객 페이지에서 호출)
curl -X POST https://xivix-ai-core.pages.dev/api/onboarding/request \
  -H "Content-Type: application/json" \
  -d '{
    "store_name": "뷰티플 헤어샵",
    "owner_name": "홍길동",
    "owner_phone": "010-1234-5678",
    "business_type": "beauty",
    "naver_talktalk_id": "wc92cf"
  }'

# 대기 중인 매장 목록 (마스터용)
curl https://xivix-ai-core.pages.dev/api/master/pending

# 전체 매장 목록 (마스터용)
curl https://xivix-ai-core.pages.dev/api/master/stores

# 매장 활성화 (마스터용)
curl -X POST https://xivix-ai-core.pages.dev/api/master/activate/1 \
  -H "Content-Type: application/json" \
  -d '{
    "auth_key": "Bearer xxx...",
    "ai_persona": "뷰티 컨설턴트",
    "ai_features": "10년 경력, 친절한 어조",
    "ai_tone": "professional"
  }'

# 사장님에게 알림 발송 (마스터용)
curl -X POST https://xivix-ai-core.pages.dev/api/master/notify/1 \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "onboarding_complete",
    "message": "AI 지배인 세팅이 완료되었습니다!"
  }'
```

### 테스트용 API

```bash
# AI 채팅 테스트
curl -X POST https://xivix-ai-core.pages.dev/v1/test/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "예약 가능한 시간 알려주세요", "customer_id": "test-001"}'

# 시스템 정보
curl https://xivix-ai-core.pages.dev/api/system/info

# 헬스체크
curl https://xivix-ai-core.pages.dev/api/system/health
```

---

## ✅ 구현 완료 기능

### Zero-Touch Onboarding (신규!)
- [x] 고객용 30초 연동 페이지 (/connect)
- [x] 톡톡 계정 ID 입력 방식
- [x] XIVIX 매니저 초대 가이드
- [x] 슈퍼 마스터 대시보드 (/master)
- [x] 연동 대기 목록 관리
- [x] 원클릭 매장 세팅
- [x] Solapi 카카오톡 알림 연동

### AI 상담 엔진
- [x] Gemini 2.5 Flash API 연동
- [x] 텍스트 + 이미지 멀티모달 처리
- [x] 스트리밍 응답 (첫 토큰 ~0.5초)
- [x] 전문가급 시스템 프롬프트
- [x] 개인정보 마스킹 처리

### 네이버 톡톡 연동
- [x] Webhook 엔드포인트
- [x] 메시지 수신/발송
- [x] 버튼형 예약 유도 메시지
- [x] Rate Limiting (분당 30회)

### 관리자 대시보드
- [x] Deep Black 테마 UI
- [x] 실시간 통계 조회
- [x] AI 테스트 채팅
- [x] 상담 이력 조회
- [x] 예약 관리
- [x] 10단계 설정 마법사

### 데이터 저장소
- [x] D1 Database (SQLite)
- [x] KV Storage (컨텍스트)
- [x] R2 Storage (이미지)

---

## 🚧 예정 기능 (Phase 2)

- [ ] Cron Triggers (토큰 자동 갱신)
- [ ] 일일 성과 리포트 자동 발송
- [ ] 2단계 인증 (2FA)
- [ ] 불만 감지 시 푸시 알림
- [ ] 네이버 OAuth 자동 연동

---

## 🎨 디자인 시스템

| 요소 | 값 |
|------|-----|
| **Theme** | Deep Black (#050505) |
| **Accent** | Gold (#D4AF37) |
| **Secondary** | Electric Blue (#007AFF) |
| **Font** | Pretendard (Wide Spacing) |
| **Layout** | Grid-based Glassmorphism |

---

## 📊 성능 지표

| 메트릭 | 목표 | 실측 |
|--------|------|------|
| 첫 토큰 응답 | < 0.5s | ~0.4s |
| 전체 응답 | < 3s | ~2s |
| 예약 전환율 | > 25% | 66.7% |

---

## 🔧 기술 스택

| 구분 | 기술 |
|------|------|
| **AI Engine** | Gemini 2.5 Flash (Single Engine Mode) |
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

**Last Updated**: 2026-01-21  
**Version**: 2026.01.21 (Zero-Touch Onboarding)
