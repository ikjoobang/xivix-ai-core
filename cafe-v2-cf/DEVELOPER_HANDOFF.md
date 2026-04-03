# cafe-auto-v2 개발자 인수인계 문서
> 최종 업데이트: 2026-04-03 (v2.2)

---

## 1. 프로젝트 개요

네이버 카페 자동 글쓰기 시스템. AI가 보험 관련 글을 자동 생성하고 네이버 카페 Open API로 발행한다.

- **고객**: 김미경 지사장 (프라임에셋(주), 23년차, CY22/CY23 전국 11위)
- **카페**: https://cafe.naver.com/aurakim24 (Club ID: 31153299)
- **목적**: 네이버 검색 상위노출(C-RANK/DIA) + 보험 상담 고객 유입

---

## 2. 인프라 현황

| 항목 | 값 |
|------|-----|
| 배포 URL | https://cafe-auto-v2.pages.dev |
| 플랫폼 | Cloudflare Pages + Workers |
| KV 바인딩 | `KV` (코드에서 `env.KV`로 접근. CAFE_KV 아님!) |
| Account ID | 764ebfb0ce23114e62876b1873e2154f |
| GitHub | ikjoobang/xivix-ai-core (cafe-v2-cf 폴더) |
| 로컬 경로 | C:\Users\user\Documents\GitHub\xivix-ai-core\cafe-v2-cf |
| 배포 명령 | `npx wrangler pages deploy . --project-name=cafe-auto-v2` |
| CF API Token | `TwgOR5oCD2oOODMZm2yXjbRmHCioD_wHNWeEMUG0` |

### 파일 구조 (2파일)
```
cafe-v2-cf/
├── _worker.js    # 백엔드 전체 (약 2350줄)
└── index.html    # SPA 프론트엔드 대시보드 (639줄)
```

### 배포 주의사항
- wrangler가 504 타임아웃 발생 시 Direct Upload API 사용:
```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCT/pages/projects/cafe-auto-v2/deployments" \
  -H "Authorization: Bearer $TOKEN" \
  -F "manifest=..." -F "/_worker.js=@_worker.js" -F "/index.html=@index.html"
```

---

## 3. AI 엔진 현황

### 글 생성
| 우선순위 | 모델 | 용도 | 장당 비용 |
|---------|------|------|----------|
| 1순위 | **GLM-5** (z.ai API) | 메인 글 생성 | ~12원 |
| 2순위 | Gemini 2.5 Flash | 백업 | ~3원 |
| 3순위 | GPT-4o-mini | 백업 | ~5원 |

### 이미지 생성
| 항목 | 값 |
|------|-----|
| 모델 | **gemini-3-pro-image-preview** |
| 장당 비용 | 185원 ($0.134) |
| 글당 | 1장 고정 |
| 프롬프트 | 키워드별 전용 씬 + NO TEXT 6중 금지 |
| 일일 상한 | 100장 |

### 이미지 풀(Pool) 시스템 (v2.2 신규)
| 항목 | 값 |
|------|-----|
| KV 키 | `image_pool` (JSON 배열) |
| 사전 생성 | 매일 22시 pool-generate.bat (25장) |
| 키워드 분배 | 20개 보험종류 균등 분배 |
| 소비 우선순위 | 1순위: 같은 키워드 매칭, 2순위: 아무거나 미사용 |
| 응답 필드 | `image_source: "pool" / "realtime" / "none"` |
| TTL | 30일 (KV expirationTtl: 2592000) |

---

## 4. 자동 스케줄링 현황

### Windows 작업 스케줄러 (현재 사용중)
```
작업명: CafePublish
실행: C:\Windows\system32\curl.exe -s https://cafe-auto-v2.pages.dev/api/auto-publish-sync
시작: 매일 오전 8시
간격: 30분
기간: 12시간 30분 (8시~20시30분)
하루: 최대 25건

작업명: PoolGenerate (v2.2 신규)
실행: pool-generate.bat
시작: 매일 오후 10시 (22:00)
반복: 없음 (1회 실행, 25장 약 6분)
```

---

## 5. API 엔드포인트 전체 목록

### 핵심 API
| Method | Path | 설명 |
|--------|------|------|
| POST | /api/generate | 키워드 기반 글 생성 |
| POST | /api/publish | 네이버 카페 발행 |
| **GET** | **/api/auto-publish-sync** | **PC bat용 (동기, 안정적)** |
| GET | /api/auto-publish-last | 마지막 자동발행 결과 |

### 이미지 풀 API (v2.2 신규)
| Method | Path | 설명 |
|--------|------|------|
| GET | /api/pool-generate | 이미지 1장 사전 생성 → 풀 저장 |
| GET | /api/pool-status | 풀 현황 (총/미사용/키워드별) |
| GET | /api/pool-clean | 사용완료+7일 경과 정리 |

### 텔레그램 봇 API (v2.2 신규)
| Method | Path | 설명 |
|--------|------|------|
| GET | /api/telegram-test | 텔레그램 연결 테스트 |

### 보조 API
| Method | Path | 설명 |
|--------|------|------|
| GET | /api/status | 시스템 상태 |
| GET/POST | /api/config | 설정 조회/변경 |
| GET | /api/categories | 카테고리 목록 |
| GET | /api/history | 발행 이력 |
| GET | /api/trend | 네이버 트렌드 |
| GET | /api/plan | 주간 플랜 |
| POST | /api/generate-image | AI 이미지 단독 생성 |
| GET | /api/image/:key | KV에서 이미지 서빙 |
| GET | /api/image-stats | 이미지 사용량/비용 |
| POST | /api/compliance | 금소법 준수 체크 |
| GET | /api/refresh-token | 네이버 토큰 갱신 |
| GET | /api/oauth | OAuth 인증 시작 |
| GET | /api/exchange-code?code=X | code→token 교환 |

---

## 6. 글 생성 프롬프트 핵심 규칙 (v2.2 강화)

### 오프닝 강제 로테이션
- KV `recent_openings` 배열로 최근 패턴 추적
- 6가지 패턴: A(에피소드), B(충격사실), C(질문), D(경험고백), E(트렌드), F(반전)
- 최근 2회 사용 패턴 제외 → 나머지에서 랜덤 선택
- userPrompt에 강제 지정: "이번 글은 X 방식으로 시작하세요"

### 소제목 4개 필수
- 8개 힌트 중 4개 랜덤 선택 → userPrompt에 제공
- "소제목 4개 미만이면 실패!" 명시
- 인라인 [소제목] → 전처리기에서 자동 줄분리

### Q&A 5개 필수 (v2.2 상향)
- 기존 3개 → 5개 (체류시간 핵심)
- GLM/Gemini/GPT 호출 시 "소제목 4개 필수, Q&A 5개 필수" 명시

### 글 길이 1800~2500자 (v2.2 상향)
- 기존 1500~2500 → 1800~2500
- minLen = 1800 + random(400), maxLen = minLen + 300

### 댓글 유도 강화
- "도발적이고 재치있는 질문" 명시
- "댓글로 공유해주시면 직접 답변" 패턴

### Rich HTML 강화 (v2.2)
- `{{강조}}` 단독줄 → 노란 핵심포인트 박스 (`background:#fef3c7`)
- 글 하단 "다음 글 예고" 블록 (`background:#f0fdf4`) + 카페 알림 유도

---

## 7. 텔레그램 봇 알림 (v2.2 신규)

### 설정
- config에 `telegram_bot_token`, `telegram_chat_id` 필요
- 텔레그램 봇 생성: @BotFather → /newbot → 토큰 복사
- chat_id 확인: `https://api.telegram.org/bot{토큰}/getUpdates`

### 자동 알림 트리거
| 이벤트 | 메시지 |
|--------|--------|
| 발행 성공 | 키워드, 제목, 이미지소스, 건수, 카페 링크 |
| 발행 실패 | 에러 메시지 |
| 토큰 만료 | 재발급 안내 + OAuth 링크 |

---

## 8. KV에 저장되는 설정 키

```
config (JSON 객체):
├── naver_client_id / secret
├── naver_cafe_id / menu_id
├── naver_access_token / refresh_token
├── datalab_client_id / secret
├── zai_api_key (GLM-5)
├── openai_api_key (GPT-4o-mini 백업)
├── gemini_api_key (이미지 생성)
├── telegram_bot_token (v2.2)
├── telegram_chat_id (v2.2)
├── post_interval_minutes: 180
└── daily_post_limit: 25

image_pool (JSON 배열): 이미지 풀 (v2.2)
recent_openings (JSON 배열): 최근 오프닝 패턴 (v2.2)
post_history (JSON 배열): 발행 이력
auto_publish_last (JSON): 마지막 자동발행 결과
img_count_YYYY-MM-DD (숫자): 이미지 일일 카운터
```

---

## 9. 해결된 버그 (다시 발생시키지 말 것)

| 버그 | 해결 |
|------|------|
| 한글 깨짐 "占쏙옙" | CP949 인코딩 |
| 500 에러 | multipart boundary 형식 확정 |
| 이모지 깨짐 | 생성 단계 차단 |
| 스팸 차단 999 | 7개 용어 대체 + 밀도 제한 |
| 태그 미표시 | tag 파라미터로 전환 |
| CTA 미표시 | 스팸필터 후 CTA 래핑 |
| ※ 깨짐 | * 로 교체 |
| --- 구분선 노출 | `<br>`로 변환 |
| 이미지 4장 버그 | count 가드 + max 1 |
| [대괄호] 쪼개짐 | 인라인도 자동 줄분리 (v2.2) |
| 문단 과도 분리 | 150자 + 한국어 종결어미만 |
| KV 접근 불가 | env.KV로 통일 |
| cron-job.org 실패 | auto-publish-sync 동기 방식 |
| 태아보험 소주 이미지 | 키워드 전용 씬만 |
| 이미지 한글 깨짐 | 프롬프트 6중 금지 |
| 토큰 만료 | /api/exchange-code |
| 소제목 1~2개 | 4개 필수 강제 + 힌트 제공 (v2.2) |
| 오프닝 A편향 | 6패턴 강제 로테이션 (v2.2) |

---

## 10. 앞으로 개발해야 하는 것

### 완료 (v2.2)
- ~~이미지 풀 사전 생성~~ ✅
- ~~글 가독성/서식 개선~~ ✅
- ~~오프닝 로테이션~~ ✅
- ~~텔레그램 봇 알림~~ ✅
- ~~체류시간 강화 (Q&A 5개, 소제목 4개, 다음글 예고)~~ ✅

### 중요 (이번 달)
- 콘텐츠 캘린더 자동화 (625개 주제 미리 생성 → 25일치)
- Batch API 도입 (이미지 비용 50% 추가 절감)
- 새싹→나무 등급 모니터링 (조회수/댓글 추이)

### 개선 (다음 달)
- 네이버 블로그 동시 발행
- SEO 성과 모니터링 (검색 순위 자동 체크)
- 대시보드 개선 (이미지 사용량, 캘린더 뷰)
- 일일 요약 리포트 (텔레그램)

---

## 11. 새 대화 시작 시 프롬프트

```
cafe-auto-v2 이어서 작업. NEXT_SESSION_PROMPT.md 읽고 시작해.

[추가 지시사항]
1. KV 바인딩 = env.KV (CAFE_KV 아님)
2. 글 생성 = GLM-5 (glm-5)
3. 이미지 = gemini-3-pro-image-preview (풀 우선 → 실시간 백업)
4. auto-publish-sync = 동기 방식 (PC bat용)
5. CP949, publish 코드 절대 건드리지 마
6. 이미지 풀: /api/pool-generate, /api/pool-status
7. 텔레그램: /api/telegram-test (config에 토큰 필요)
```
