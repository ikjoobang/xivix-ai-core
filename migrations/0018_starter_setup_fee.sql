-- ============================================================================
-- XIVIX AI Core V3.0 — 0018 소상공인 셋팅비 추가
-- setup_type에 'starter' 추가 (소상공인 100,000원)
-- D1 SQLite는 ALTER TABLE로 CHECK 제약 변경이 불가하므로 새 테이블로 교체
-- ============================================================================

-- 1. 기존 테이블 백업
CREATE TABLE IF NOT EXISTS xivix_steppay_setup_products_backup AS 
  SELECT * FROM xivix_steppay_setup_products;

-- 2. 기존 테이블 삭제
DROP TABLE IF EXISTS xivix_steppay_setup_products;

-- 3. 새 테이블 생성 (starter 포함)
CREATE TABLE xivix_steppay_setup_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setup_type TEXT NOT NULL UNIQUE CHECK(setup_type IN ('starter', 'basic', 'premium')),
  steppay_product_id INTEGER,
  steppay_price_id INTEGER,
  steppay_product_code TEXT,
  steppay_price_code TEXT,
  product_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 기존 데이터 복원
INSERT INTO xivix_steppay_setup_products (setup_type, steppay_product_id, steppay_price_id, steppay_product_code, steppay_price_code, product_name, price, is_active, created_at)
  SELECT setup_type, steppay_product_id, steppay_price_id, steppay_product_code, steppay_price_code, product_name, price, is_active, created_at
  FROM xivix_steppay_setup_products_backup;

-- 5. 소상공인 셋팅비 추가
INSERT OR IGNORE INTO xivix_steppay_setup_products (setup_type, product_name, price)
  VALUES ('starter', 'XIVIX AI 소상공인 셋팅비', 100000);

-- 6. 백업 테이블 삭제
DROP TABLE IF EXISTS xivix_steppay_setup_products_backup;
