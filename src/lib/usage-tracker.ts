// XIVIX AI Core V3.0 - 사용량 추적 시스템
// AI 대화 건수 / SMS 건수를 월별로 카운트 & 한도 체크

import type { Env } from '../types';
import { parsePlan, getPlanConfig, type PlanType } from './plan-config';

// ============ 현재 월 문자열 (KST) ============
function getCurrentMonth(): string {
  const now = new Date();
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ============ 사용량 레코드 타입 ============
export interface UsageCounters {
  id: number;
  store_id: number;
  month: string;
  ai_conversations: number;
  sms_sent: number;
  lms_sent: number;
  talktalk_sent: number;
  image_analyses: number;
  ai_limit: number;
  sms_limit: number;
}

// ============ 사용량 레코드 가져오기 (없으면 생성) ============
export async function getOrCreateUsage(
  env: Env,
  storeId: number,
  plan?: PlanType
): Promise<UsageCounters> {
  const month = getCurrentMonth();
  const planType = plan || 'light';
  const config = getPlanConfig(planType);

  // 기존 레코드 조회
  const existing = await env.DB.prepare(`
    SELECT * FROM xivix_usage_counters 
    WHERE store_id = ? AND month = ?
  `).bind(storeId, month).first<UsageCounters>();

  if (existing) return existing;

  // 새 레코드 생성 (매월 자동 초기화)
  const result = await env.DB.prepare(`
    INSERT INTO xivix_usage_counters 
    (store_id, month, ai_conversations, sms_sent, lms_sent, talktalk_sent, image_analyses, ai_limit, sms_limit)
    VALUES (?, ?, 0, 0, 0, 0, 0, ?, ?)
  `).bind(storeId, month, config.aiLimit, config.smsLimit).run();

  return {
    id: result.meta.last_row_id as number,
    store_id: storeId,
    month,
    ai_conversations: 0,
    sms_sent: 0,
    lms_sent: 0,
    talktalk_sent: 0,
    image_analyses: 0,
    ai_limit: config.aiLimit,
    sms_limit: config.smsLimit,
  };
}

// ============ AI 대화 건수 증가 + 한도 체크 ============
export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  overLimit: boolean;
}

export async function incrementAIUsage(
  env: Env,
  storeId: number,
  plan?: PlanType
): Promise<UsageCheckResult> {
  const usage = await getOrCreateUsage(env, storeId, plan);
  const newCount = usage.ai_conversations + 1;
  const limit = usage.ai_limit;

  // 한도 초과 여부 체크 (초과해도 일단 카운트는 증가 — 로그 목적)
  const overLimit = newCount > limit;

  await env.DB.prepare(`
    UPDATE xivix_usage_counters 
    SET ai_conversations = ai_conversations + 1, updated_at = CURRENT_TIMESTAMP
    WHERE store_id = ? AND month = ?
  `).bind(storeId, usage.month).run();

  return {
    allowed: !overLimit,
    current: newCount,
    limit,
    remaining: Math.max(0, limit - newCount),
    overLimit,
  };
}

// ============ SMS 건수 증가 + 한도 체크 ============
export async function incrementSMSUsage(
  env: Env,
  storeId: number,
  plan?: PlanType
): Promise<UsageCheckResult & { isExtra: boolean; extraPrice: number }> {
  const usage = await getOrCreateUsage(env, storeId, plan);
  const planType = plan || 'light';
  const config = getPlanConfig(planType);
  const newCount = usage.sms_sent + 1;
  const limit = usage.sms_limit;
  const isExtra = newCount > limit;

  await env.DB.prepare(`
    UPDATE xivix_usage_counters 
    SET sms_sent = sms_sent + 1, updated_at = CURRENT_TIMESTAMP
    WHERE store_id = ? AND month = ?
  `).bind(storeId, usage.month).run();

  return {
    allowed: true, // SMS는 초과해도 과금으로 발송 가능
    current: newCount,
    limit,
    remaining: Math.max(0, limit - newCount),
    overLimit: isExtra,
    isExtra,
    extraPrice: isExtra ? config.smsExtraPrice : 0,
  };
}

// ============ LMS 건수 증가 ============
export async function incrementLMSUsage(
  env: Env,
  storeId: number
): Promise<void> {
  const usage = await getOrCreateUsage(env, storeId);
  await env.DB.prepare(`
    UPDATE xivix_usage_counters 
    SET lms_sent = lms_sent + 1, updated_at = CURRENT_TIMESTAMP
    WHERE store_id = ? AND month = ?
  `).bind(storeId, usage.month).run();
}

// ============ 톡톡 건수 증가 ============
export async function incrementTalkTalkUsage(
  env: Env,
  storeId: number
): Promise<void> {
  const usage = await getOrCreateUsage(env, storeId);
  await env.DB.prepare(`
    UPDATE xivix_usage_counters 
    SET talktalk_sent = talktalk_sent + 1, updated_at = CURRENT_TIMESTAMP
    WHERE store_id = ? AND month = ?
  `).bind(storeId, usage.month).run();
}

// ============ 이미지 분석 건수 증가 ============
export async function incrementImageAnalysisUsage(
  env: Env,
  storeId: number
): Promise<void> {
  const usage = await getOrCreateUsage(env, storeId);
  await env.DB.prepare(`
    UPDATE xivix_usage_counters 
    SET image_analyses = image_analyses + 1, updated_at = CURRENT_TIMESTAMP
    WHERE store_id = ? AND month = ?
  `).bind(storeId, usage.month).run();
}

// ============ 사용량 조회 (대시보드용) ============
export async function getUsageSummary(
  env: Env,
  storeId: number,
  plan?: PlanType
): Promise<{
  month: string;
  ai: { used: number; limit: number; percentage: number };
  sms: { used: number; limit: number; percentage: number; extraCount: number; extraCost: number };
  lms: number;
  talktalk: number;
  imageAnalyses: number;
}> {
  const usage = await getOrCreateUsage(env, storeId, plan);
  const planType = plan || 'light';
  const config = getPlanConfig(planType);

  const smsExtra = Math.max(0, usage.sms_sent - usage.sms_limit);

  return {
    month: usage.month,
    ai: {
      used: usage.ai_conversations,
      limit: usage.ai_limit,
      percentage: usage.ai_limit > 0 ? Math.round((usage.ai_conversations / usage.ai_limit) * 100) : 0,
    },
    sms: {
      used: usage.sms_sent,
      limit: usage.sms_limit,
      percentage: usage.sms_limit > 0 ? Math.round((usage.sms_sent / usage.sms_limit) * 100) : 0,
      extraCount: smsExtra,
      extraCost: smsExtra * config.smsExtraPrice,
    },
    lms: usage.lms_sent,
    talktalk: usage.talktalk_sent,
    imageAnalyses: usage.image_analyses,
  };
}

// ============ 전체 매장 사용량 (마스터용) ============
export async function getAllStoresUsage(
  env: Env
): Promise<UsageCounters[]> {
  const month = getCurrentMonth();
  const result = await env.DB.prepare(`
    SELECT u.*, s.store_name, s.plan 
    FROM xivix_usage_counters u
    JOIN xivix_stores s ON u.store_id = s.id
    WHERE u.month = ?
    ORDER BY u.ai_conversations DESC
  `).bind(month).all<UsageCounters & { store_name: string; plan: string }>();

  return result.results || [];
}
