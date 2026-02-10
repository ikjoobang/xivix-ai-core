-- ============================================================================
-- XIVIX AI Core V3.0 — 0016 Steppay 구독 결제 연동
-- 스텝페이(Steppay) 자동 월결제 시스템
-- ============================================================================

-- ============ 0. 시스템 설정 테이블 (API 키 등 저장) ============
CREATE TABLE IF NOT EXISTS xivix_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============ 1. xivix_subscriptions 테이블에 Steppay 필드 추가 ============
ALTER TABLE xivix_subscriptions ADD COLUMN steppay_customer_id INTEGER;
ALTER TABLE xivix_subscriptions ADD COLUMN steppay_customer_code TEXT;
ALTER TABLE xivix_subscriptions ADD COLUMN steppay_order_id INTEGER;
ALTER TABLE xivix_subscriptions ADD COLUMN steppay_order_code TEXT;
ALTER TABLE xivix_subscriptions ADD COLUMN steppay_subscription_id INTEGER;
ALTER TABLE xivix_subscriptions ADD COLUMN steppay_product_id INTEGER;
ALTER TABLE xivix_subscriptions ADD COLUMN steppay_price_id INTEGER;
ALTER TABLE xivix_subscriptions ADD COLUMN payment_method TEXT DEFAULT 'steppay';

-- ============ 2. xivix_payments 테이블에 Steppay 필드 추가 ============
ALTER TABLE xivix_payments ADD COLUMN steppay_order_id INTEGER;
ALTER TABLE xivix_payments ADD COLUMN steppay_payment_id INTEGER;
ALTER TABLE xivix_payments ADD COLUMN subscription_id INTEGER;

-- ============ 3. Steppay 웹훅 이벤트 로그 ============
CREATE TABLE IF NOT EXISTS xivix_steppay_webhook_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  event_id TEXT,
  order_code TEXT,
  subscription_id INTEGER,
  store_id INTEGER,
  raw_payload TEXT NOT NULL,
  processed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_steppay_webhooks_event ON xivix_steppay_webhook_logs(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_steppay_webhooks_order ON xivix_steppay_webhook_logs(order_code);

-- ============ 4. Steppay 상품/요금제 매핑 테이블 ============
CREATE TABLE IF NOT EXISTS xivix_steppay_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan TEXT NOT NULL UNIQUE CHECK(plan IN ('mini', 'light', 'standard', 'premium', 'enterprise')),
  steppay_product_id INTEGER,
  steppay_price_id INTEGER,
  product_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  billing_period TEXT DEFAULT 'MONTH',
  billing_cycle INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기본 요금제 매핑 데이터 삽입 (steppay_product_id/price_id는 연동 후 업데이트)
INSERT OR IGNORE INTO xivix_steppay_products (plan, product_name, price) VALUES
  ('mini', 'XIVIX AI 미니', 29000),
  ('light', 'XIVIX AI 라이트', 49000),
  ('standard', 'XIVIX AI 스탠다드', 99000),
  ('premium', 'XIVIX AI 프리미엄', 149000),
  ('enterprise', 'XIVIX AI 엔터프라이즈', 149000);

-- ============ 5. 셋팅비 상품 테이블 ============
CREATE TABLE IF NOT EXISTS xivix_steppay_setup_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setup_type TEXT NOT NULL UNIQUE CHECK(setup_type IN ('basic', 'premium')),
  steppay_product_id INTEGER,
  steppay_price_id INTEGER,
  product_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO xivix_steppay_setup_products (setup_type, product_name, price) VALUES
  ('basic', 'XIVIX AI 기본 셋팅비', 300000),
  ('premium', 'XIVIX AI 프리미엄 셋팅비', 500000);

-- ============ 6. 인덱스 추가 ============
CREATE INDEX IF NOT EXISTS idx_subscriptions_steppay ON xivix_subscriptions(steppay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_steppay_customer ON xivix_subscriptions(steppay_customer_code);
