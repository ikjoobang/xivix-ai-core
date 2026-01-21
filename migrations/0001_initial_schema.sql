-- XIVIX AI Core V1.0 - Initial Database Schema
-- Cloudflare D1 (SQLite)

-- Users table (사업주 계정)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'owner' CHECK(role IN ('admin', 'owner', 'staff')),
  api_key TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Stores table (매장 정보)
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  store_name TEXT NOT NULL,
  business_type TEXT DEFAULT '일반',
  address TEXT,
  phone TEXT,
  operating_hours TEXT DEFAULT '09:00-18:00',
  menu_data TEXT DEFAULT '[]',
  ai_persona TEXT DEFAULT '',
  ai_tone TEXT DEFAULT '전문적이고 친절한',
  naver_talktalk_id TEXT,
  naver_reservation_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Conversation logs table (상담 이력)
CREATE TABLE IF NOT EXISTS conversation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  customer_id TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK(message_type IN ('text', 'image', 'mixed')),
  customer_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  image_url TEXT,
  response_time_ms INTEGER DEFAULT 0,
  converted_to_reservation INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

-- Reservations table (예약 정보)
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  service_name TEXT NOT NULL,
  reservation_date TEXT NOT NULL,
  reservation_time TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_by TEXT DEFAULT 'manual' CHECK(created_by IN ('ai', 'manual')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

-- API tokens table (네이버 등 외부 API 토큰)
CREATE TABLE IF NOT EXISTS api_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(is_active);
CREATE INDEX IF NOT EXISTS idx_logs_store_id ON conversation_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_logs_customer_id ON conversation_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON conversation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_reservations_store_id ON reservations(store_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
