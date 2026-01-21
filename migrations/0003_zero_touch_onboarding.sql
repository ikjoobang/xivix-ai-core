-- XIVIX Zero-Touch Onboarding Migration
-- 연동 상태 필드 추가 및 온보딩 테이블

-- 1. stores 테이블에 연동 상태 및 추가 필드 추가
ALTER TABLE xivix_stores ADD COLUMN owner_name TEXT;
ALTER TABLE xivix_stores ADD COLUMN owner_phone TEXT;
ALTER TABLE xivix_stores ADD COLUMN onboarding_status TEXT DEFAULT 'pending' CHECK(onboarding_status IN ('pending', 'active', 'paused'));
ALTER TABLE xivix_stores ADD COLUMN ai_features TEXT;
ALTER TABLE xivix_stores ADD COLUMN activated_at DATETIME;
ALTER TABLE xivix_stores ADD COLUMN activated_by TEXT;

-- 2. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_xivix_stores_onboarding_status ON xivix_stores(onboarding_status);

-- 3. 알림 설정 테이블
CREATE TABLE IF NOT EXISTS xivix_notification_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 관리자 활동 로그 테이블
CREATE TABLE IF NOT EXISTS xivix_admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_store_id INTEGER,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_xivix_admin_logs_created_at ON xivix_admin_logs(created_at);
