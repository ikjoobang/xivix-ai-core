// XIVIX AI Core V1.0 - KV Context Management
// Cloudflare KV를 활용한 대화 컨텍스트 관리 (Memory Window: 최근 10개)

import type { Env, ConversationContext } from '../types';

const CONTEXT_TTL = 60 * 60 * 24; // 24시간
const MAX_MESSAGES = 10;

// KV Key 생성
function getContextKey(storeId: number, customerId: string): string {
  return `ctx:${storeId}:${customerId}`;
}

// 대화 컨텍스트 조회
export async function getConversationContext(
  kv: KVNamespace,
  storeId: number,
  customerId: string
): Promise<ConversationContext | null> {
  const key = getContextKey(storeId, customerId);
  const data = await kv.get(key, 'json');
  return data as ConversationContext | null;
}

// 대화 컨텍스트 저장/업데이트
export async function updateConversationContext(
  kv: KVNamespace,
  storeId: number,
  customerId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  const key = getContextKey(storeId, customerId);
  const existing = await getConversationContext(kv, storeId, customerId);
  
  const now = Date.now();
  const messages = existing?.messages || [];
  
  // 사용자 메시지 추가
  messages.push({
    role: 'user',
    content: userMessage,
    timestamp: now
  });
  
  // AI 응답 추가
  messages.push({
    role: 'assistant',
    content: assistantResponse,
    timestamp: now
  });
  
  // Memory Window: 최근 10개만 유지
  const trimmedMessages = messages.slice(-MAX_MESSAGES * 2);
  
  const context: ConversationContext = {
    store_id: storeId,
    customer_id: customerId,
    messages: trimmedMessages,
    last_updated: now
  };
  
  await kv.put(key, JSON.stringify(context), {
    expirationTtl: CONTEXT_TTL
  });
}

// 대화 컨텍스트 삭제
export async function clearConversationContext(
  kv: KVNamespace,
  storeId: number,
  customerId: string
): Promise<void> {
  const key = getContextKey(storeId, customerId);
  await kv.delete(key);
}

// 세션 토큰 저장 (네이버 OAuth)
export async function setSessionToken(
  kv: KVNamespace,
  key: string,
  token: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  }
): Promise<void> {
  await kv.put(`token:${key}`, JSON.stringify(token), {
    expirationTtl: 60 * 60 * 24 * 30 // 30일
  });
}

// 세션 토큰 조회
export async function getSessionToken(
  kv: KVNamespace,
  key: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: number;
} | null> {
  const data = await kv.get(`token:${key}`, 'json');
  return data as { access_token: string; refresh_token: string; expires_at: number } | null;
}

// Rate Limiting (분당 요청 제한)
export async function checkRateLimit(
  kv: KVNamespace,
  identifier: string,
  maxRequests: number = 30,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;
  
  const data = await kv.get(key, 'json') as { requests: number[]; } | null;
  const requests = data?.requests || [];
  
  // 윈도우 내 요청만 필터링
  const validRequests = requests.filter(ts => ts > windowStart);
  
  if (validRequests.length >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.min(...validRequests) + windowSeconds
    };
  }
  
  // 새 요청 추가
  validRequests.push(now);
  await kv.put(key, JSON.stringify({ requests: validRequests }), {
    expirationTtl: windowSeconds * 2
  });
  
  return {
    allowed: true,
    remaining: maxRequests - validRequests.length,
    resetAt: now + windowSeconds
  };
}

// 매장별 통계 캐싱
export async function cacheStoreStats(
  kv: KVNamespace,
  storeId: number,
  stats: {
    total_conversations: number;
    today_conversations: number;
    conversion_rate: number;
    avg_response_time_ms: number;
  }
): Promise<void> {
  const key = `stats:${storeId}`;
  await kv.put(key, JSON.stringify({
    ...stats,
    cached_at: Date.now()
  }), {
    expirationTtl: 60 * 5 // 5분 캐싱
  });
}

// 매장별 통계 조회
export async function getStoreStats(
  kv: KVNamespace,
  storeId: number
): Promise<{
  total_conversations: number;
  today_conversations: number;
  conversion_rate: number;
  avg_response_time_ms: number;
  cached_at: number;
} | null> {
  const key = `stats:${storeId}`;
  return await kv.get(key, 'json') as {
    total_conversations: number;
    today_conversations: number;
    conversion_rate: number;
    avg_response_time_ms: number;
    cached_at: number;
  } | null;
}
