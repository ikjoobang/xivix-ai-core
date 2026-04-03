# 새 대화 시작 시 복사붙여넣기

---

[프로젝트: cafe-auto-v2] 네이버 카페 자동화 시스템 이어서 작업

배포: https://cafe-auto-v2.pages.dev
Cloudflare API Token: TwgOR5oCD2oOODMZm2yXjbRmHCioD_wHNWeEMUG0
Account ID: 764ebfb0ce23114e62876b1873e2154f
KV: CAFE_KV

파일구조: _worker.js (백엔드 전체 약 2350줄) + index.html (프론트)
배포: npx wrangler pages deploy . --project-name=cafe-auto-v2
(wrangler 타임아웃 시 Direct Upload API 사용)

[현재 상태 - 절대 변경하지 마!]
- AI글: GLM-5 (메인) → Gemini 2.5 Flash → GPT-4o-mini
- AI이미지: gemini-3-pro-image-preview (1장 고정, 장당 185원)
- 이미지 풀(pool): 사전 생성 → 발행 시 풀 우선 사용 → 없으면 실시간 생성
- CP949 인코딩 (절대 건드리지 마)
- multipart/form-data 발행
- openyn=true (전체공개)
- 일일 발행 한도: 25건
- auto-publish: GET /api/auto-publish-sync (동기 방식, PC bat용)
- 스케줄러: Windows 작업 스케줄러 (30분 간격, 8시~20시30분)

[이미지 풀 시스템]
- GET /api/pool-generate: 1장 사전 생성 (키워드 균등분배)
- GET /api/pool-status: 풀 현황 조회
- GET /api/pool-clean: 사용완료 7일경과 정리
- pool-generate.bat: Windows 매일 22시 실행 (25장)
- apiGenerate에서 풀 우선 → 실시간 백업
- 응답에 image_source: "pool" | "realtime" | "none"

[글 가독성 개선 - 적용중]
- 오프닝 6패턴 강제 로테이션 (KV recent_openings 추적, 최근2회 제외)
- 소제목 4개 필수 (힌트 사전생성 + 프롬프트 강제)
- Q&A 5개 필수 (체류시간 핵심)
- 글 길이 1800~2500자 (상향)
- 인라인 [소제목] 자동 줄바꿈 분리 (전처리기)
- {{강조}} 단독줄 → 노란 핵심포인트 박스
- 글 하단 "다음 글 예고" 재방문 유도 블록

[텔레그램 봇]
- GET /api/telegram-test: 연결 테스트
- 자동 알림: 발행 성공/실패, 토큰 만료
- config에 telegram_bot_token, telegram_chat_id 필요

[카페 정보]
카페: aurakim24 (https://cafe.naver.com/aurakim24)
Club ID: 31153299
메뉴: 4(보험정보), 5(보험비교), 7(Q&A), 18(설계사라운지), 9(자유게시판)
로테이션: 4→5→7→18→9 자동순환

[프로필 - 정확히 이대로]
김미경 지사장 | 프라임에셋(주)
현직 23년차 | CY22, CY23 실적우수 개인부문 전국 11위 달성
19개 생명보험사 고객 맞춤형 보장분석 설계
12개 손해보험사 고객 맞춤형 보장분석 설계
CTA: 홈페이지 https://aurakim.com + 톡톡 https://talk.naver.com/profile/wf71d5c

[해결된 버그 - 다시 발생시키지 마!]
- CP949 인코딩 → 절대 UTF-8 전환 금지
- ※ 문자 → * 로 교체 (CP949 미지원)
- --- 구분선 → <br>로 변환
- ## 마크다운 → [대괄호 소제목] 사용
- CTA 미표시 → aurakim.com 체크 후 자동 래핑
- 이미지 4장 버그 → count 가드 + max 1
- 외부 img src → 네이버 차단, multipart만 사용
- 이모지 → CP949 변환 불가, 생성단계 차단
- 긴 문단 → 150자+한국어종결어미 기준 분리
- KV 바인딩 → env.KV (CAFE_KV 아님!)
- 인라인 [소제목] → 전처리기에서 자동 줄분리

[작업 규칙]
1. 기존 코드 구조 변경하지 마 - 지시한 부분만 수정
2. CP949 코드 절대 건드리지 마
3. 수정하면 반드시 배포까지 완료
4. 설명만 하지 말고 실행 가능한 코드로
5. 할루시네이션 금지

---
