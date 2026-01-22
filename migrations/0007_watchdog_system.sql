-- XIVIX Watchdog System V1 Migration
-- 개발자 할루시네이션 방지 시스템 테이블

-- 에러 로그 테이블 (500 에러 블랙박스)
CREATE TABLE IF NOT EXISTS xivix_error_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  error_type TEXT NOT NULL DEFAULT 'UNKNOWN',
  error_message TEXT,
  endpoint TEXT,
  severity TEXT DEFAULT 'ERROR',
  stack_trace TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 에러 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON xivix_error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON xivix_error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON xivix_error_logs(error_type);

-- 예약 테이블에 리마인더 발송 여부 컬럼 추가
-- ALTER TABLE xivix_reservations ADD COLUMN reminder_sent INTEGER DEFAULT 0;

-- 매장 테이블에 AI 활성화 상태 컬럼 추가 (개입 모드용)
-- ALTER TABLE xivix_stores ADD COLUMN ai_active INTEGER DEFAULT 1;

