-- XIVIX AI Core V3.0 - 요금제 & 사용량 추적 시스템
-- 마이그레이션: 0014_plan_and_usage.sql
-- 생성일: 2026-02-09

-- ============ 1. 매장 요금제 필드 추가 ============
-- plan: mini(소상공인미니), light(라이트), standard(스탠다드), premium(프리미엄), enterprise(다점포)
ALTER TABLE xivix_stores ADD COLUMN plan TEXT DEFAULT 'light' CHECK(plan IN ('mini', 'light', 'standard', 'premium', 'enterprise'));

-- 셋팅 타입: basic(기본 30만), premium(프리미엄 50만), soho(소상공인 10만), enterprise(다점포 매장당 20만)
ALTER TABLE xivix_stores ADD COLUMN setup_type TEXT DEFAULT 'basic' CHECK(setup_type IN ('soho', 'basic', 'premium', 'enterprise'));

-- 월 이용료 (원)
ALTER TABLE xivix_stores ADD COLUMN monthly_fee INTEGER DEFAULT 49000;

-- 결제 상태
ALTER TABLE xivix_stores ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'active', 'overdue', 'cancelled', 'trial'));

-- 다점포 관련: 본점 ID (지점일 경우)
ALTER TABLE xivix_stores ADD COLUMN parent_store_id INTEGER REFERENCES xivix_stores(id);

-- 다점포 관련: 역할 (main=본점, branch=지점)
ALTER TABLE xivix_stores ADD COLUMN store_role TEXT DEFAULT 'single' CHECK(store_role IN ('single', 'main', 'branch'));

-- 전담매니저 ID
ALTER TABLE xivix_stores ADD COLUMN manager_id INTEGER;

-- 매장별 AI API 키 (선택사항 — 없으면 글로벌 키 사용)
ALTER TABLE xivix_stores ADD COLUMN store_openai_key TEXT;
ALTER TABLE xivix_stores ADD COLUMN store_gemini_key TEXT;

-- ============ 2. 월별 사용량 추적 테이블 ============
CREATE TABLE IF NOT EXISTS xivix_usage_counters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  month TEXT NOT NULL,                    -- 'YYYY-MM' 형식
  ai_conversations INTEGER DEFAULT 0,     -- AI 대화 건수
  sms_sent INTEGER DEFAULT 0,            -- SMS 발송 건수
  lms_sent INTEGER DEFAULT 0,            -- LMS 발송 건수
  talktalk_sent INTEGER DEFAULT 0,       -- 톡톡 발송 건수
  image_analyses INTEGER DEFAULT 0,       -- 이미지 분석 건수
  ai_limit INTEGER DEFAULT 1000,         -- AI 대화 한도
  sms_limit INTEGER DEFAULT 100,         -- SMS 포함 건수
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES xivix_stores(id),
  UNIQUE(store_id, month)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_usage_store_month ON xivix_usage_counters(store_id, month);

-- ============ 3. 수동 메시지 발송 이력 테이블 ============
CREATE TABLE IF NOT EXISTS xivix_manual_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  sender_type TEXT DEFAULT 'owner' CHECK(sender_type IN ('owner', 'manager', 'master')),
  sender_id INTEGER,                     -- 발송자 ID
  message_type TEXT DEFAULT 'individual' CHECK(message_type IN ('individual', 'bulk')),
  channel TEXT DEFAULT 'talktalk' CHECK(channel IN ('talktalk', 'sms', 'lms')),
  recipient_count INTEGER DEFAULT 1,     -- 수신자 수
  recipients TEXT,                       -- JSON: [{customer_id, name, phone}]
  message_content TEXT NOT NULL,          -- 발송 메시지 내용
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sending', 'sent', 'partial', 'failed')),
  success_count INTEGER DEFAULT 0,
  fail_count INTEGER DEFAULT 0,
  total_cost INTEGER DEFAULT 0,          -- SMS 비용 (원)
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES xivix_stores(id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_manual_msg_store ON xivix_manual_messages(store_id, created_at);

-- ============ 4. 결제 이력 테이블 (KG이니시스 연동용) ============
CREATE TABLE IF NOT EXISTS xivix_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  payment_type TEXT NOT NULL CHECK(payment_type IN ('setup', 'monthly', 'sms_extra', 'enterprise')),
  amount INTEGER NOT NULL,               -- 결제 금액 (원)
  vat_amount INTEGER DEFAULT 0,          -- 부가세
  total_amount INTEGER NOT NULL,         -- 총 결제 금액
  pg_provider TEXT DEFAULT 'kginicis',   -- PG사
  pg_tid TEXT,                           -- PG 거래 ID
  pg_mid TEXT,                           -- 상점 ID (MOI9559449)
  card_name TEXT,                        -- 카드사명
  card_number TEXT,                      -- 마스킹된 카드번호
  approval_number TEXT,                  -- 승인번호
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'cancelled', 'refunded', 'failed')),
  paid_at DATETIME,
  cancelled_at DATETIME,
  refund_amount INTEGER DEFAULT 0,
  description TEXT,                      -- 결제 설명
  receipt_url TEXT,                      -- 영수증 URL
  raw_response TEXT,                     -- PG 응답 원본 JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES xivix_stores(id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_payments_store ON xivix_payments(store_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_tid ON xivix_payments(pg_tid);

-- ============ 5. 구독 관리 테이블 ============
CREATE TABLE IF NOT EXISTS xivix_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK(plan IN ('mini', 'light', 'standard', 'premium', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'cancelled', 'expired', 'trial')),
  monthly_fee INTEGER NOT NULL,
  billing_day INTEGER DEFAULT 1,          -- 정기결제일 (1~28)
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  next_billing_at DATETIME,
  cancelled_at DATETIME,
  trial_ends_at DATETIME,
  auto_renew INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES xivix_stores(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_store ON xivix_subscriptions(store_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing ON xivix_subscriptions(next_billing_at, status);
