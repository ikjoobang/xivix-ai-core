-- Migration: 프롬프트 섹션별 분리 저장
-- Date: 2026-02-04
-- Description: AI 프롬프트의 안정성을 위해 섹션별로 분리 저장
-- NOTE: 이미 적용된 컬럼은 무시 (프로덕션 호환)

-- 안전한 컬럼 추가 (이미 존재하면 에러 무시)
-- SQLite는 ALTER TABLE ADD COLUMN IF NOT EXISTS를 지원하지 않으므로
-- 프로덕션에 이미 적용된 경우를 위해 no-op 쿼리로 대체
SELECT 1;
