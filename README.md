# XIVIX AI Core V1.0

> **Gemini 2.5 Flash 기반 초고속 AI 상담 자동화 엔진**

<p align="center">
  <img src="https://img.shields.io/badge/Engine-Gemini%202.5%20Flash-blue?style=for-the-badge" alt="Gemini">
  <img src="https://img.shields.io/badge/Framework-Hono-orange?style=for-the-badge" alt="Hono">
  <img src="https://img.shields.io/badge/Platform-Cloudflare-yellow?style=for-the-badge" alt="Cloudflare">
</p>

---

## 🌐 서비스 URL (프로덕션)

| 서비스 | URL |
|--------|-----|
| **🏠 메인 페이지** | https://xivix-ai-core.pages.dev |
| **📊 대시보드** | https://xivix-ai-core.pages.dev/dashboard |
| **🔗 네이버 톡톡 Webhook** | https://xivix-ai-core.pages.dev/v1/naver/callback |
| **❤️ 헬스체크** | https://xivix-ai-core.pages.dev/api/system/health |

---

## 📖 사용 가이드

### ❶ 대시보드 접속하기

1. **URL 접속**: https://xivix-ai-core.pages.dev/dashboard
2. **화면 구성**:
   - **좌측 사이드바**: 메뉴 네비게이션
   - **상단 헤더**: 새로고침, 헬스체크
   - **메인 영역**: 통계 카드, 차트, 기능별 섹션

### ❷ 사이드바 메뉴 설명

| 메뉴 | 기능 | 설명 |
|------|------|------|
| **📊 대시보드** | 메인 화면 | 상담 통계, 응답시간 차트, 전환 퍼널 |
| **💬 AI 테스트** | AI 대화 테스트 | Gemini 2.5 Flash와 직접 대화 |
| **📜 상담 이력** | 고객 상담 기록 | 고객 메시지 + AI 응답 확인 |
| **📅 예약 관리** | 예약 목록 | AI가 생성한 예약 현황 |
| **⚙️ 매장 설정** | 매장 정보 | 매장명, 영업시간, AI 페르소나 |

### ❸ AI 테스트 채팅 사용법

1. **사이드바에서 "AI 테스트" 클릭** 또는 대시보드의 "AI 테스트" 카드 클릭
2. **메시지 입력**:
   - 예시 1: `피부관리 예약하고 싶어요`
   - 예시 2: `가격표 알려주세요`
   - 예시 3: `오늘 오후 3시 예약 가능한가요?`
   - 예시 4: `여드름 피부인데 어떤 관리가 좋을까요?`
3. **전송 버튼 클릭** → AI 응답 확인 (응답 시간 표시됨)

### ❹ 대시보드 통계 카드

| 카드 | 의미 |
|------|------|
| **총 상담 건수** | 누적 고객 상담 총 횟수 |
| **오늘 상담** | 오늘 처리된 상담 건수 |
| **예약 전환율** | 상담 → 예약으로 이어진 비율 (%) |
| **응답 속도** | AI 평균 응답 시간 (ms) |

### ❺ 상담 이력 확인

1. **사이드바에서 "상담 이력" 클릭**
2. **표시 정보**:
   - 고객 ID
   - 상담 시간
   - 고객 메시지
   - AI 응답 내용
   - 응답 시간 (ms)

### ❻ 예약 관리

1. **사이드바에서 "예약 관리" 클릭**
2. **예약 상태 확인**:
   - 🟢 **확정**: 예약 완료
   - 🟡 **대기**: 확인 대기 중
   - 🔴 **취소**: 취소됨
   - ⚪ **완료**: 서비스 완료

---

## 🔧 네이버 톡톡 연동 가이드

### Step 1: 네이버 톡톡 파트너센터 설정

1. **파트너센터 접속**: https://partner.talk.naver.com
2. **API 설정 메뉴 진입**

### Step 2: Webhook URL 등록

| 항목 | 값 |
|------|-----|
| **이벤트 받을 URL** | `https://xivix-ai-core.pages.dev/v1/naver/callback` |
| **이벤트 종류** | send (메시지 수신), open (채팅방 입장), leave (채팅방 퇴장) |

### Step 3: 연동 완료

✅ Webhook URL 등록 후 자동으로 AI 상담이 작동합니다!

- 고객 메시지 수신 → Gemini AI 분석 → 자동 답변 발송

---

## 🔑 등록된 API 키 (Cloudflare Secrets)

| 키 이름 | 상태 | 용도 |
|---------|------|------|
| `GEMINI_API_KEY` | ✅ 등록됨 | Google AI Studio 인증 |
| `NAVER_CLIENT_ID` | ✅ 등록됨 | 네이버 파트너 인증 |
| `NAVER_CLIENT_SECRET` | ✅ 등록됨 | 네이버 파트너 인증 |
| `NAVER_ACCESS_TOKEN` | ✅ 등록됨 | 메시지 발송 인증 |

---

## 🏢 기본 매장 정보

현재 등록된 테스트 매장:

| 항목 | 값 |
|------|-----|
| **매장명** | 뷰티플 스킨케어 |
| **업종** | 피부관리 |
| **영업시간** | 10:00-21:00 (월-토), 10:00-18:00 (일) |
| **주소** | 서울시 강남구 테헤란로 123 |

### 메뉴 & 가격

| 서비스 | 가격 | 소요시간 |
|--------|------|----------|
| 기초 피부관리 | 80,000원 | 60분 |
| 프리미엄 케어 | 150,000원 | 90분 |
| 스페셜 트리트먼트 | 200,000원 | 120분 |
| 여드름 집중 케어 | 100,000원 | 60분 |
| 안티에이징 케어 | 180,000원 | 90분 |

---

## 📡 API 엔드포인트 목록

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

# 대시보드 통계
curl https://xivix-ai-core.pages.dev/api/dashboard/stats/1

# 상담 이력 조회
curl https://xivix-ai-core.pages.dev/api/logs/1?limit=10

# 매장 정보 조회
curl https://xivix-ai-core.pages.dev/api/stores/1

# 예약 목록 조회
curl https://xivix-ai-core.pages.dev/api/reservations/1
```

### 네이버 톡톡 Webhook

```bash
# Webhook 검증 (GET)
GET https://xivix-ai-core.pages.dev/v1/naver/callback

# 메시지 수신 (POST) - 네이버에서 자동 호출
POST https://xivix-ai-core.pages.dev/v1/naver/callback
```

---

## ✅ 구현 완료 기능

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
- [x] 매장 설정 확인

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
- [ ] 멀티 매장 관리

---

## 🎨 디자인 시스템

| 요소 | 값 |
|------|-----|
| **Theme** | Deep Black (#050505) |
| **Accent** | Electric Blue (#007AFF) |
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

## 📝 라이선스

© 2024 XIVIX. All rights reserved.

---

**Last Updated**: 2026-01-21
