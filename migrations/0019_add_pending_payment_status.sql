-- Migration: Add pending_payment status to xivix_subscriptions
-- This status is used when a new subscription order is created but payment is not yet completed

-- SQLite doesn't support ALTER CHECK CONSTRAINT directly
-- We need to recreate the table or use a workaround

-- For D1/SQLite, we can't modify CHECK constraints directly
-- Instead, we'll drop and recreate the check constraint by recreating the table
-- However, a simpler approach for production is to remove the CHECK constraint

-- Step 1: Create new table without restrictive CHECK
CREATE TABLE IF NOT EXISTS xivix_subscriptions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'mini',
  status TEXT NOT NULL DEFAULT 'pending_payment',
  monthly_fee INTEGER NOT NULL DEFAULT 29000,
  billing_day INTEGER DEFAULT 1,
  started_at DATETIME,
  next_billing_at DATETIME,
  cancelled_at DATETIME,
  trial_ends_at DATETIME,
  auto_renew INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  steppay_customer_id INTEGER,
  steppay_customer_code TEXT,
  steppay_order_id INTEGER,
  steppay_order_code TEXT,
  steppay_subscription_id INTEGER,
  steppay_product_id INTEGER,
  steppay_price_id INTEGER,
  payment_method TEXT DEFAULT 'steppay',
  steppay_product_code TEXT,
  steppay_price_code TEXT,
  FOREIGN KEY (store_id) REFERENCES xivix_stores(id)
);

-- Step 2: Copy data
INSERT OR IGNORE INTO xivix_subscriptions_new 
  SELECT * FROM xivix_subscriptions;

-- Step 3: Drop old table
DROP TABLE IF EXISTS xivix_subscriptions;

-- Step 4: Rename new table
ALTER TABLE xivix_subscriptions_new RENAME TO xivix_subscriptions;
