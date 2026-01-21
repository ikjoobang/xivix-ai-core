-- XIVIX Solapi Notification & Enhancement Migration
-- 카카오톡 알림 연동 및 기능 강화

-- 1. stores 테이블에 naver_talktalk_id 필드 추가 (없으면)
-- ALTER TABLE xivix_stores ADD COLUMN naver_talktalk_id TEXT;
-- 이미 존재할 수 있으므로 스킵

-- 2. 알림 로그 테이블
CREATE TABLE IF NOT EXISTS xivix_notification_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER,
  notification_type TEXT NOT NULL,  -- 'onboarding_request', 'onboarding_complete', 'daily_report'
  template_code TEXT,               -- 솔라피 템플릿 코드
  recipient_phone TEXT NOT NULL,    -- 수신자 전화번호
  recipient_type TEXT NOT NULL,     -- 'owner', 'master', 'customer'
  content TEXT,                     -- 발송 내용
  status TEXT DEFAULT 'pending',    -- 'pending', 'sent', 'failed', 'delivered'
  provider_message_id TEXT,         -- 솔라피 메시지 ID
  error_message TEXT,               -- 실패 시 에러 메시지
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES xivix_stores(id)
);

-- 3. 알림 템플릿 테이블
CREATE TABLE IF NOT EXISTS xivix_notification_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_code TEXT UNIQUE NOT NULL,
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,  -- #{변수} 형식 포함
  notification_type TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 기본 템플릿 삽입
INSERT OR IGNORE INTO xivix_notification_templates (template_code, template_name, template_content, notification_type)
VALUES 
  ('MSG_NEW_REQUEST', '신규 연동 요청 알림', '🔔 새로운 연동 요청!\n\n매장: #{storeName}\n사장님: #{ownerName}\n연락처: #{ownerPhone}\n요청시간: #{requestTime}\n\n▶ 마스터 대시보드에서 확인하세요.', 'onboarding_request'),
  ('MSG_SETUP_COMPLETE', '세팅 완료 알림', '🎉 AI 지배인 세팅 완료!\n\n#{ownerName} 사장님,\n#{storeName}에 AI 상담사가 배치되었습니다.\n\n지금부터 네이버 톡톡으로 들어오는 문의에 AI가 자동 응답합니다.\n\n문의: XIVIX 고객센터', 'onboarding_complete'),
  ('MSG_DAILY_REPORT', '일일 리포트', '📊 #{storeName} 일일 리포트\n\n📅 #{date}\n💬 상담: #{conversations}건\n📅 예약: #{reservations}건\n📈 전환율: #{conversionRate}%\n\n▶ 자세한 내용은 대시보드에서 확인하세요.', 'daily_report');

-- 5. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_notification_logs_store_id ON xivix_notification_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON xivix_notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON xivix_notification_logs(created_at);
