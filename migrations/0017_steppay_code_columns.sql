-- ============================================================================
-- XIVIX AI Core V3.0 — 0017 Steppay Code 컬럼 추가
-- Steppay API는 숫자 ID가 아닌 Code(문자열)로 상품/가격을 식별
-- productCode + priceCode 형식으로 주문 생성 시 사용
-- ============================================================================

-- 1. xivix_steppay_products 테이블에 Code 컬럼 추가
ALTER TABLE xivix_steppay_products ADD COLUMN steppay_product_code TEXT;
ALTER TABLE xivix_steppay_products ADD COLUMN steppay_price_code TEXT;

-- 2. xivix_steppay_setup_products 테이블에 Code 컬럼 추가
ALTER TABLE xivix_steppay_setup_products ADD COLUMN steppay_product_code TEXT;
ALTER TABLE xivix_steppay_setup_products ADD COLUMN steppay_price_code TEXT;

-- 3. xivix_subscriptions 테이블에 Code 컬럼 추가
ALTER TABLE xivix_subscriptions ADD COLUMN steppay_product_code TEXT;
ALTER TABLE xivix_subscriptions ADD COLUMN steppay_price_code TEXT;
