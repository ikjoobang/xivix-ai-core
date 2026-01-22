-- ============================================================================
-- XIVIX Master Pipeline & Safety Control 추가 마이그레이션
-- [1]~[6] 기능 지원을 위한 테이블 컬럼 추가
-- ============================================================================

-- xivix_reservations 테이블 컬럼 추가 (예약 승인 워크플로우용)
ALTER TABLE xivix_reservations ADD COLUMN IF NOT EXISTS ai_suggested INTEGER DEFAULT 0;
ALTER TABLE xivix_reservations ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE xivix_reservations ADD COLUMN IF NOT EXISTS approved_at DATETIME;
ALTER TABLE xivix_reservations ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- xivix_conversation_logs 테이블 컬럼 추가 (실시간 모니터링용)
ALTER TABLE xivix_conversation_logs ADD COLUMN IF NOT EXISTS hallucination_flag INTEGER DEFAULT 0;
ALTER TABLE xivix_conversation_logs ADD COLUMN IF NOT EXISTS intervention_by TEXT;
ALTER TABLE xivix_conversation_logs ADD COLUMN IF NOT EXISTS intervention_at DATETIME;

-- xivix_stores 테이블 컬럼 추가 (활성화 추적용)
ALTER TABLE xivix_stores ADD COLUMN IF NOT EXISTS activated_at DATETIME;
ALTER TABLE xivix_stores ADD COLUMN IF NOT EXISTS activated_by TEXT;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_reservations_status ON xivix_reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_store_date ON xivix_reservations(store_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_store_date ON xivix_conversation_logs(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON xivix_admin_logs(action);
