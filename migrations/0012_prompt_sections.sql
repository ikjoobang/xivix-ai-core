-- Migration: 프롬프트 섹션별 분리 저장
-- Date: 2026-02-04
-- Description: AI 프롬프트의 안정성을 위해 섹션별로 분리 저장
-- 이유: AI에게 "병합해줘"라고 하면 결과가 불안정함. 코드에서 조합하면 100% 예측 가능.

-- =====================================================
-- 섹션별 필드 추가 (xivix_stores 테이블)
-- =====================================================

-- 1. 현재 진행 중인 이벤트/프로모션 (JSON 배열)
-- 예: [{"name": "미라클 필링", "original_price": 120000, "sale_price": 60000, "discount_rate": "50%", "description": "각질 제거"}]
ALTER TABLE xivix_stores ADD COLUMN events_data TEXT DEFAULT '[]';

-- 2. 서비스/메뉴 가격표 (JSON 배열)
-- 예: [{"name": "속눈썹 펌", "price": 50000, "duration": "1시간", "vat_included": false}]
ALTER TABLE xivix_stores ADD COLUMN services_data TEXT DEFAULT '[]';

-- 3. 예약 규정 (JSON 객체)
-- 예: {"deposit": 20000, "cancellation_policy": "당일 취소 불가", "vip_benefits": "예약금 면제"}
ALTER TABLE xivix_stores ADD COLUMN reservation_policy TEXT DEFAULT '{}';

-- 4. 매장 소개 (텍스트)
-- 예: "20년 현장 내공과 경영학 박사 데이터 로직 기반 1:1 맞춤 솔루션"
ALTER TABLE xivix_stores ADD COLUMN store_description TEXT;

-- 5. 금지 키워드 (쉼표 구분 텍스트)
-- 예: "100%, 보장, 확실히, 무조건"
ALTER TABLE xivix_stores ADD COLUMN forbidden_keywords TEXT DEFAULT '100%, 보장, 확실히';

-- 6. 프롬프트 템플릿 타입 (미리 정의된 틀 선택)
-- 예: 'beauty_default', 'restaurant_default', 'custom'
ALTER TABLE xivix_stores ADD COLUMN prompt_template_type TEXT DEFAULT 'beauty_default';

-- 7. 커스텀 응대 지침 (추가 지침)
-- 예: "VIP 고객에게는 특별 할인 안내"
ALTER TABLE xivix_stores ADD COLUMN custom_guidelines TEXT;

-- =====================================================
-- 인덱스 추가
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_xivix_stores_template_type ON xivix_stores(prompt_template_type);
