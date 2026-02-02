-- 설정 변경 요청 테이블
CREATE TABLE IF NOT EXISTS xivix_change_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  store_name TEXT NOT NULL,
  request_type TEXT NOT NULL,
  request_type_label TEXT,
  content TEXT NOT NULL,
  contact_time TEXT,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_change_requests_store ON xivix_change_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON xivix_change_requests(status);
