-- XIVIX AI Core V3.0 - 영업사원/대리점 수수료 정산 시스템
-- 마이그레이션: 0015_sales_commission.sql
-- 생성일: 2026-02-09

-- ============ 1. 영업사원(대리점) 테이블 ============
CREATE TABLE IF NOT EXISTS xivix_agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                      -- 영업사원 이름
  phone TEXT NOT NULL,                     -- 연락처
  email TEXT,                              -- 이메일
  bank_name TEXT,                          -- 입금 은행
  bank_account TEXT,                       -- 계좌번호
  bank_holder TEXT,                        -- 예금주
  commission_rate_setup REAL DEFAULT 0.30, -- 셋팅비 수수료율 (기본 30%)
  commission_rate_monthly REAL DEFAULT 0.20, -- 월 이용료 수수료율 (기본 20%)
  min_stores INTEGER DEFAULT 3,           -- 최소 유지 매장 수
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'terminated')),
  notes TEXT,                              -- 비고
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============ 2. 영업사원-매장 매핑 테이블 ============
CREATE TABLE IF NOT EXISTS xivix_agent_stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL,
  store_id INTEGER NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER DEFAULT 1,             -- 해지 시 0
  deactivated_at DATETIME,
  FOREIGN KEY (agent_id) REFERENCES xivix_agents(id),
  FOREIGN KEY (store_id) REFERENCES xivix_stores(id),
  UNIQUE(agent_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_stores_agent ON xivix_agent_stores(agent_id, is_active);

-- ============ 3. 수수료 정산 이력 테이블 ============
CREATE TABLE IF NOT EXISTS xivix_commissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL,
  store_id INTEGER NOT NULL,
  period TEXT NOT NULL,                    -- 정산 기간 'YYYY-MM'
  commission_type TEXT NOT NULL CHECK(commission_type IN ('setup', 'monthly')),
  base_amount INTEGER NOT NULL,            -- 매장 판매가 (원)
  commission_rate REAL NOT NULL,           -- 적용 수수료율
  commission_amount INTEGER NOT NULL,      -- 수수료 금액 (원)
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'paid', 'cancelled')),
  payment_date DATETIME,                   -- 지급일
  payment_method TEXT,                     -- 지급 방법 (계좌이체/현금 등)
  payment_ref TEXT,                        -- 지급 참조번호
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES xivix_agents(id),
  FOREIGN KEY (store_id) REFERENCES xivix_stores(id)
);

CREATE INDEX IF NOT EXISTS idx_commissions_agent ON xivix_commissions(agent_id, period);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON xivix_commissions(status, period);
