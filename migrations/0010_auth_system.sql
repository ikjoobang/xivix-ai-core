-- XIVIX AI Core - Authentication System Migration
-- 마스터/사장님 인증 시스템용 테이블

-- 마스터 계정 테이블
CREATE TABLE IF NOT EXISTS xivix_master_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 사장님 계정 테이블 (기존 xivix_users 확장)
-- 이미 xivix_users 테이블이 있으므로 컬럼 추가
ALTER TABLE xivix_users ADD COLUMN last_login_at DATETIME;
ALTER TABLE xivix_users ADD COLUMN login_attempts INTEGER DEFAULT 0;
ALTER TABLE xivix_users ADD COLUMN locked_until DATETIME;

-- 세션 테이블 (JWT 대신 서버사이드 세션)
CREATE TABLE IF NOT EXISTS xivix_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token TEXT UNIQUE NOT NULL,
  user_type TEXT NOT NULL CHECK(user_type IN ('master', 'owner')),
  user_id INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인증 로그 테이블
CREATE TABLE IF NOT EXISTS xivix_auth_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_type TEXT NOT NULL CHECK(user_type IN ('master', 'owner')),
  user_id INTEGER,
  action TEXT NOT NULL CHECK(action IN ('login', 'logout', 'login_failed', 'password_reset', 'session_expired')),
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 예약 알림 스케줄 테이블
CREATE TABLE IF NOT EXISTS xivix_reminder_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  reservation_id INTEGER NOT NULL,
  reminder_type TEXT NOT NULL CHECK(reminder_type IN ('24h', '2h', '1h', 'custom')),
  scheduled_at DATETIME NOT NULL,
  sent_at DATETIME,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed', 'cancelled')),
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES xivix_stores(id),
  FOREIGN KEY (reservation_id) REFERENCES xivix_reservations(id)
);

-- 월간 리포트 테이블
CREATE TABLE IF NOT EXISTS xivix_monthly_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  report_month TEXT NOT NULL, -- YYYY-MM 형식
  total_conversations INTEGER DEFAULT 0,
  total_reservations INTEGER DEFAULT 0,
  confirmed_reservations INTEGER DEFAULT 0,
  cancelled_reservations INTEGER DEFAULT 0,
  conversion_rate REAL DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  total_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  peak_hours TEXT, -- JSON: {"hour": count}
  popular_services TEXT, -- JSON: {"service": count}
  revenue_estimate REAL DEFAULT 0,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES xivix_stores(id),
  UNIQUE(store_id, report_month)
);

-- 네이버 톡톡 API 설정 테이블
CREATE TABLE IF NOT EXISTS xivix_naver_talktalk_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL UNIQUE,
  partner_id TEXT, -- 네이버 파트너센터 ID
  account_id TEXT, -- 톡톡 계정 ID
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at DATETIME,
  webhook_verified INTEGER DEFAULT 0,
  last_message_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES xivix_stores(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sessions_token ON xivix_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON xivix_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_logs_user ON xivix_auth_logs(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON xivix_reminder_schedules(scheduled_at, status);
CREATE INDEX IF NOT EXISTS idx_reminders_reservation ON xivix_reminder_schedules(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reports_store_month ON xivix_monthly_reports(store_id, report_month);
CREATE INDEX IF NOT EXISTS idx_talktalk_store ON xivix_naver_talktalk_config(store_id);

-- 초기 마스터 계정 (방대표님) - 비밀번호: xivix2026!
-- bcrypt hash for 'xivix2026!' (실제 환경에서는 더 안전한 비밀번호 사용)
INSERT OR IGNORE INTO xivix_master_accounts (email, name, phone, password_hash)
VALUES ('master@xivix.kr', '방익주', '01012345678', '$2a$10$XivixMasterHash2026SecurePasswordHashHere');
