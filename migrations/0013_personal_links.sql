-- 개인 SNS/홈페이지 링크 컬럼 추가 (보험설계사용)
-- 마이그레이션: 0013_personal_links.sql
-- 생성일: 2026-02-09

-- 개인 홈페이지
ALTER TABLE xivix_stores ADD COLUMN personal_website TEXT;

-- 개인 인스타그램
ALTER TABLE xivix_stores ADD COLUMN personal_instagram TEXT;

-- 개인 블로그
ALTER TABLE xivix_stores ADD COLUMN personal_blog TEXT;

-- 개인 유튜브
ALTER TABLE xivix_stores ADD COLUMN personal_youtube TEXT;
