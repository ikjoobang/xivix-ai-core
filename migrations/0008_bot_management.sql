-- XIVIX Bot Management V2.0 Migration
-- 봇 기간 관리 및 자동 운영 지원

-- 1. 봇 운영 기간 관련 필드 추가
ALTER TABLE xivix_stores ADD COLUMN bot_start_date TEXT;
ALTER TABLE xivix_stores ADD COLUMN bot_end_date TEXT;
ALTER TABLE xivix_stores ADD COLUMN bot_paused INTEGER DEFAULT 0;
ALTER TABLE xivix_stores ADD COLUMN ai_model TEXT DEFAULT 'gemini-2.5-flash';
ALTER TABLE xivix_stores ADD COLUMN ai_temperature REAL DEFAULT 0.7;
ALTER TABLE xivix_stores ADD COLUMN auto_reservation INTEGER DEFAULT 1;
ALTER TABLE xivix_stores ADD COLUMN greeting_message TEXT;

-- 2. 통계 관련 필드 (캐싱용)
ALTER TABLE xivix_stores ADD COLUMN today_conversations INTEGER DEFAULT 0;
ALTER TABLE xivix_stores ADD COLUMN total_conversations INTEGER DEFAULT 0;
ALTER TABLE xivix_stores ADD COLUMN total_reservations INTEGER DEFAULT 0;

-- 3. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_xivix_stores_bot_dates ON xivix_stores(bot_start_date, bot_end_date);
CREATE INDEX IF NOT EXISTS idx_xivix_stores_bot_paused ON xivix_stores(bot_paused);
