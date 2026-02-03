-- Migration: Add system_prompt column to xivix_stores
-- Date: 2026-02-03
-- Description: 업종별 AI 시스템 프롬프트 저장용 컬럼 추가

-- Add system_prompt column
ALTER TABLE xivix_stores ADD COLUMN system_prompt TEXT;

-- Add custom_prompt column for additional customization
ALTER TABLE xivix_stores ADD COLUMN custom_prompt TEXT;

-- Add owner_email column
ALTER TABLE xivix_stores ADD COLUMN owner_email TEXT;

-- Add owner_phone column (if not exists)
-- Note: This may fail if column already exists, which is fine
-- ALTER TABLE xivix_stores ADD COLUMN owner_phone TEXT;
