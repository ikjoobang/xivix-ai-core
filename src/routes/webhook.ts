// XIVIX AI Core V1.0 - 네이버 톡톡 Webhook Handler
// 실시간 메시지 수신 및 AI 응답 처리
// [XIVIX_TOTAL_AUTOMATION] Phase 03 - TalkTalk Binding (21~30)

import { Hono } from 'hono';
import type { Env, Store } from '../types';
import { 
  parseWebhookMessage, 
  maskPersonalInfo, 
  sendTextMessage,
  sendButtonMessage,
  ButtonOption
} from '../lib/naver-talktalk';
import { 
  buildGeminiMessages, 
  buildSystemInstruction, 
  streamGeminiResponse,
  getGeminiResponse 
} from '../lib/gemini';
import { 
  getConversationContext, 
  updateConversationContext,
  checkRateLimit 
} from '../lib/kv-context';
import { uploadImageFromUrl } from '../lib/r2-storage';
import { 
  routeAIRequest, 
  classifyConsultation,
  streamSimpleConsultation 
} from '../lib/ai-router';
import {
  detectBookingIntent,
  getAvailableSlotsForDays,
  generateAvailableSlotsMessage,
  generateBookingConfirmMessage,
  generateBookingCompleteMessage,
  createBooking,
  getBookingState,
  setBookingState,
  clearBookingState,
  getNaverBookingUrl,
  BookingIntent,
  BookingConversationState
} from '../lib/naver-booking';
import { sendSMS } from '../lib/notification';
import { canUseFeature, parsePlan, getPlanConfig, getAILimitMessage, type PlanType } from '../lib/plan-config';
import { incrementAIUsage, incrementTalkTalkUsage, incrementImageAnalysisUsage } from '../lib/usage-tracker';

// ============ [XIVIX WATCHDOG] 이벤트 타입 정의 ============
type NaverTalkTalkEventType = 'open' | 'leave' | 'friend' | 'send' | 'echo' | 'profile';

// ============ [V3.0.14] 다국어 번역 헬퍼 ============
const LANG_NAMES: Record<string, string> = {
  ko: '한국어', en: 'English', ja: '日本語', zh: '中文(简体)',
  tw: '中文(繁體)', th: 'ภาษาไทย', vi: 'Tiếng Việt', mn: 'Монгол'
};
const LANG_FLAGS: Record<string, string> = {
  ko: '🇰🇷', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳', tw: '🇹🇼', th: '🇹🇭', vi: '🇻🇳', mn: '🇲🇳'
};

/**
 * [V3.0.14] Gemini를 사용한 빠른 번역
 * 사장님 한국어 메시지 → 고객 외국어, 또는 그 반대
 */
async function translateWithGemini(
  env: Env,
  text: string,
  targetLang: string
): Promise<string | null> {
  try {
    const langName = LANG_NAMES[targetLang] || 'English';
    const prompt = `Translate the following message to ${langName}. Output ONLY the translation, no explanation:\n\n${text}`;
    const messages = [{ role: 'user' as const, parts: [{ text: prompt }] }];
    const result = await getGeminiResponse(env, messages, 'You are a professional translator. Output only the translated text.', 'gemini');
    return result || null;
  } catch (e) {
    console.error('[V3.0.14] Translation error:', e);
    return null;
  }
}

/**
 * [V3.0.14] AI 응답에 이중언어 포맷이 포함되어 있는지 체크
 */
function hasBilingualFormat(text: string): boolean {
  return text.includes('━━━━━━━━━━') || text.includes('🇰🇷');
}

/**
 * [V3.0.14] AI 자유 응답 이중언어 보장 — AI가 이중언어 포맷을 안 따라도 후처리로 보장
 * 외국어 고객: AI 응답(외국어) + 한국어 번역 → 사장님이 읽을 수 있음
 * 한국어 고객: 그대로 반환
 */
async function ensureBilingual(
  env: Env,
  aiResponse: string,
  customerLang: string
): Promise<string> {
  // 한국어 고객이거나 언어 미설정이면 그대로
  if (!customerLang || customerLang === 'ko') return aiResponse;
  // 이미 이중언어 포맷이면 그대로
  if (hasBilingualFormat(aiResponse)) return aiResponse;
  
  try {
    // AI 응답이 한국어인지 외국어인지 판단
    const koreanChars = (aiResponse.match(/[가-힣]/g) || []).length;
    const totalChars = aiResponse.replace(/\s/g, '').length;
    const koreanRatio = totalChars > 0 ? koreanChars / totalChars : 0;
    
    const flag = LANG_FLAGS[customerLang] || '🌐';
    
    if (koreanRatio > 0.3) {
      // 한국어 응답 → 고객 언어로 번역 추가 (위: 고객언어, 아래: 한국어 원문)
      const translated = await translateWithGemini(env, aiResponse, customerLang);
      if (translated) {
        return `${flag} ${translated}\n\n━━━━━━━━━━\n🇰🇷 한국어:\n${aiResponse}`;
      }
    } else {
      // 외국어 응답 → 한국어 번역 추가 (위: 외국어 원문, 아래: 한국어 번역)
      const koreanTranslation = await translateWithGemini(env, aiResponse, 'ko');
      if (koreanTranslation) {
        return `${flag} ${aiResponse}\n\n━━━━━━━━━━\n🇰🇷 한국어:\n${koreanTranslation}`;
      }
    }
  } catch (e) {
    console.warn('[V3.0.14] ensureBilingual error:', e);
  }
  
  return aiResponse; // 번역 실패 시 원본
}

// ============ [업종별 메뉴 시스템 사용 여부] ============
// 5번 메뉴 시스템(1~5번 버튼)을 사용하는 업종 목록
// 이 외 업종은 DB 설정 기반 AI 직접 응대
const MENU_BASED_BUSINESS_TYPES = [
  'BEAUTY_HAIR', 'BEAUTY_SKIN', 'BEAUTY_NAIL',
  'RESTAURANT', 'CAFE', 'FITNESS', 'MEDICAL'
];

function isMenuBasedBusiness(businessType: string): boolean {
  return MENU_BASED_BUSINESS_TYPES.includes(businessType);
}

// ============ [매장별 환영 메시지 생성] ============
/**
 * 인사말에서 마크다운 링크 [텍스트](URL) 파싱
 * 반환: { text: 링크 제거된 본문, buttons: [{title, url}] }
 */
function parseGreetingLinks(message: string): { text: string; buttons: { title: string; url: string }[] } {
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
  const buttons: { title: string; url: string }[] = [];
  
  let match;
  while ((match = linkPattern.exec(message)) !== null) {
    buttons.push({ title: match[1].trim(), url: match[2].trim() });
  }
  
  // 링크 문법 제거 + 빈 줄 정리
  const text = message
    .replace(linkPattern, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return { text, buttons };
}

/**
 * ★ 스마트 메시지 전송: 링크 감지 시 버튼으로 자동 변환
 * - [텍스트](URL) → 버튼
 * - 단독 URL (https://...) → 도메인명 버튼
 * - 링크 없으면 → 일반 텍스트
 */
async function sendSmartMessage(
  env: Env, userId: string, text: string, storeId: number
): Promise<void> {
  // 0. 마크다운 볼드/이탤릭 제거 (톡톡에서 렌더링 안 됨)
  let stripped = text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **볼드** → 볼드
    .replace(/\*(.+?)\*/g, '$1')       // *이탤릭* → 이탤릭
    .replace(/__(.+?)__/g, '$1')       // __볼드__ → 볼드
    .replace(/_(.+?)_/g, '$1')         // _이탤릭_ → 이탤릭
    .replace(/#{1,6}\s?/g, '');        // ### 헤딩 → 제거
  
  // 1. 마크다운 링크 파싱
  const { text: cleanText, buttons: mdButtons } = parseGreetingLinks(stripped);
  
  // 2. 남은 텍스트에서 단독 URL도 감지 (괄호 안 URL 포함)
  const standaloneUrlPattern = /\(?(?<url>https?:\/\/[^\s\)\]]+)\)?/g;
  const extraButtons: { title: string; url: string }[] = [];
  let finalText = cleanText;
  
  let urlMatch;
  const urlsToRemove: string[] = [];
  while ((urlMatch = standaloneUrlPattern.exec(cleanText)) !== null) {
    const fullMatch = urlMatch[0];
    const url = urlMatch.groups?.url || urlMatch[1];
    // 이미 마크다운 버튼으로 처리된 URL은 스킵
    if (!mdButtons.some(b => b.url === url)) {
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        const label = domain.includes('blog.naver') ? '📝 블로그 바로가기'
          : domain.includes('naver.com') ? '🔗 네이버 바로가기'
          : domain.includes('instagram') ? '📸 인스타그램'
          : domain.includes('youtube') ? '🎬 유튜브'
          : `🔗 ${domain}`;
        extraButtons.push({ title: label, url });
        urlsToRemove.push(fullMatch);
      } catch { /* invalid URL, skip */ }
    }
  }
  
  // URL 텍스트 제거
  for (const u of urlsToRemove) {
    finalText = finalText.replace(u, '');
  }
  finalText = finalText.replace(/\n{3,}/g, '\n\n').trim();
  
  const allButtons = [...mdButtons, ...extraButtons];
  
  // 3. 버튼이 있으면 composite, 없으면 텍스트
  if (allButtons.length > 0) {
    const buttonOptions: ButtonOption[] = allButtons.slice(0, 5).map(btn => ({
      type: 'LINK' as const,
      title: btn.title.substring(0, 40),
      linkUrl: btn.url
    }));
    await sendButtonMessage(env, userId, finalText, buttonOptions, storeId);
  } else {
    await sendTextMessage(env, userId, finalText, storeId);
  }
}

// ★ V3.0.19: 모바일 가독성 후처리 — AI 응답에 줄바꿈 강제 삽입
function formatForMobile(text: string): string {
  if (!text || text.length < 50) return text;
  
  // 이미 충분한 줄바꿈이 있으면 패스
  const lines = text.split('\n').filter(l => l.trim());
  const avgLineLen = text.replace(/\n/g, '').length / Math.max(lines.length, 1);
  if (avgLineLen < 60 && lines.length >= 3) return text; // 이미 잘 나뉨
  
  // 1단계: 마크다운 리스트(*, -, •) 앞에 줄바꿈 보장
  let result = text.replace(/([^\n])([\*\-•])\s/g, '$1\n$2 ');
  
  // 2단계: 이모지 포인트(🎯💰📊 등) 앞에 줄바꿈
  result = result.replace(/([^\n])([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}])/gu, (match, before, emoji) => {
    if (before === ' ' || before === '\n') return match;
    return before + '\n\n' + emoji;
  });
  
  // 3단계: 한국어 문장 종결 뒤 3문장 이상 붙어있으면 줄바꿈 삽입
  // 패턴: ~다. / ~요. / ~요! / ~세요. / ~까요? 등
  let sentenceCount = 0;
  result = result.replace(/([\.\!\?])\s+/g, (match, punct) => {
    sentenceCount++;
    if (sentenceCount % 2 === 0 && !match.includes('\n')) {
      return punct + '\n\n';
    }
    return match;
  });
  
  // 4단계: 연속 3줄바꿈 이상은 2줄바꿈으로 정리
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return result.trim();
}

function generateWelcomeMessage(store: Store | null): string {
  if (!store) {
    return '안녕하세요! XIVIX AI 상담사입니다. 무엇을 도와드릴까요?';
  }
  
  const storeName = store.store_name || '매장';
  const businessType = store.business_type || 'OTHER';
  
  // ★ DB에 커스텀 greeting_message가 있으면 그것을 그대로 사용 (업종 무관)
  if (store.greeting_message && store.greeting_message.trim()) {
    return store.greeting_message.trim();
  }
  
  // greeting_message가 없는 경우에만 업종별 기본 메시지 생성
  const greeting = `${storeName}에 오신 것을 환영합니다!`;
  
  // 메뉴 기반 업종만 suffix 추가
  if (!isMenuBasedBusiness(businessType)) {
    return `${greeting}\n\n무엇이든 물어보세요! 😊`;
  }
  
  let suffix = '';
  switch (businessType) {
    case 'BEAUTY_HAIR':
      suffix = '헤어 스타일, 예약, 가격 안내 등 무엇이든 물어보세요! 💇';
      break;
    case 'BEAUTY_SKIN':
      suffix = '피부 관리, 예약, 프로그램 안내 등 도와드릴게요! ✨';
      break;
    case 'BEAUTY_NAIL':
      suffix = '네일 디자인, 예약, 가격 안내 등 물어보세요! 💅';
      break;
    case 'RESTAURANT':
    case 'CAFE':
      suffix = '메뉴, 예약, 영업시간 등 물어보세요! 🍽️';
      break;
    case 'FITNESS':
      suffix = '프로그램, 시간표, 가격 안내 등 도와드릴게요! 💪';
      break;
    case 'MEDICAL':
      suffix = '진료 예약, 진료 시간, 위치 안내 등 도와드릴게요! 🏥';
      break;
    default:
      suffix = '무엇이든 물어보세요! 😊';
  }
  
  return `${greeting}\n\n${suffix}`;
}

// ============ [친구 추가 환영 메시지] ============
function generateFriendAddMessage(store: Store | null): string {
  const storeName = store?.store_name || 'XIVIX';
  return `${storeName}을(를) 친구 추가해 주셔서 감사합니다! 🎉\n\n앞으로 예약 알림, 특별 할인 소식 등을 보내드릴게요.\n언제든 편하게 말씀해 주세요!`;
}

const webhook = new Hono<{ Bindings: Env }>();

// Webhook verification (GET) - 기본 경로
webhook.get('/v1/naver/callback', (c) => {
  // 네이버 톡톡 Webhook 인증
  return c.text('OK', 200);
});

// Webhook verification (GET) - storeId 포함 경로
webhook.get('/v1/naver/callback/:storeId', (c) => {
  const storeId = c.req.param('storeId');
  console.log(`[Webhook] GET verification for Store ID: ${storeId}`);
  return c.text('OK', 200);
});

// Webhook message handler (POST) - storeId 포함 경로 (네이버 파트너센터 등록용)
// 참고: storeId는 내부 DB ID 또는 네이버 플레이스 ID 모두 지원
webhook.post('/v1/naver/callback/:storeId', async (c) => {
  const urlStoreId = c.req.param('storeId');
  console.log(`[Webhook] POST with Store ID: ${urlStoreId}`);
  
  const startTime = Date.now();
  const env = c.env;
  
  try {
    const body = await c.req.json();
    const message = parseWebhookMessage(body);
    
    if (!message) {
      return c.json({ success: false, error: 'Invalid message format' }, 400);
    }
    
    const { event, user: customerId, textContent, imageContent } = message;
    const eventType = event as NaverTalkTalkEventType;
    
    // ============ [XIVIX_WATCHDOG] 이벤트 로깅 ============
    console.log(`[Webhook] Event: ${eventType}, Store: ${urlStoreId}, Customer: ${customerId?.slice(0, 8)}...`);
    
    // ============ 매장 조회 (내부 ID 또는 네이버 플레이스 ID로) ============
    let storeResult: Store | null = null;
    
    // 1차: 네이버 톡톡 ID로 조회 (플레이스 ID)
    storeResult = await env.DB.prepare(
      'SELECT * FROM xivix_stores WHERE naver_talktalk_id = ? AND is_active = 1'
    ).bind(urlStoreId).first<Store>();
    
    // 2차: 내부 DB ID로 조회 (숫자인 경우)
    if (!storeResult && /^\d+$/.test(urlStoreId)) {
      storeResult = await env.DB.prepare(
        'SELECT * FROM xivix_stores WHERE id = ? AND is_active = 1'
      ).bind(parseInt(urlStoreId, 10)).first<Store>();
    }
    
    if (!storeResult) {
      console.log(`[Webhook] Store not found for ID: ${urlStoreId} (tried naver_talktalk_id and internal id)`);
      // 매장이 없어도 기본 응답 처리
    } else {
      console.log(`[Webhook] Store found: ${storeResult.store_name} (ID: ${storeResult.id})`);
    }
    
    const storeId = storeResult?.id || parseInt(urlStoreId, 10) || 0;
    
    // ============ [Phase 03-21] 이벤트 타입별 처리 ============
    
    // [open] 채팅방 입장 - 매장별 환영 메시지 + 다국어 안내
    if (eventType === 'open') {
      console.log(`[Webhook] OPEN event - Sending welcome message for Store ${storeId}`);
      
      const welcomeMsg = generateWelcomeMessage(storeResult);
      
      // ★ 마크다운 링크 [텍스트](URL) 감지 → compositeContent 버튼으로 변환
      const { text: greetText, buttons: greetButtons } = parseGreetingLinks(welcomeMsg);
      
      let welcomeResult;
      if (greetButtons.length > 0) {
        // 링크 버튼이 있으면 → compositeContent (URL 숨기고 버튼으로 표시)
        const buttonOptions: ButtonOption[] = greetButtons.map(btn => ({
          type: 'LINK' as const,
          title: btn.title,
          linkUrl: btn.url
        }));
        welcomeResult = await sendButtonMessage(env, customerId, greetText, buttonOptions, storeId);
        console.log(`[Webhook] Composite welcome (${greetButtons.length} buttons) result:`, JSON.stringify(welcomeResult));
      } else {
        // 링크 없으면 → 기존 텍스트 메시지
        welcomeResult = await sendTextMessage(env, customerId, welcomeMsg, storeId);
        console.log(`[Webhook] Welcome message result:`, JSON.stringify(welcomeResult));
      }
      
      // 8개국어 안내 메시지 (환영 인사 바로 다음 - 요금제에 따라 표시)
      const openPlan = (storeResult?.plan || 'light') as PlanType;
      if (canUseFeature(openPlan, 'multiLanguage')) {
        const languageMsg = `🌐 Need another language?\n\n` +
        `EN  English\n` +
        `JP  日本語\n` +
        `CN  简体中文\n` +
        `TW  繁體中文\n` +
        `TH  ภาษาไทย\n` +
        `VN  Tiếng Việt\n` +
        `MN  Монгол\n\n` +
        `위 코드를 입력해주세요 ✍️`;
      const langResult = await sendTextMessage(env, customerId, languageMsg, storeId);
      console.log(`[Webhook] Language message result:`, JSON.stringify(langResult));
      } // end multiLanguage check
      
      // [WATCHDOG] 입장 로그 기록
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', '[OPEN] 채팅방 입장', ?, ?, 0)
      `).bind(
        storeId,
        customerId,
        welcomeMsg,
        Date.now() - startTime
      ).run();
      
      return c.json({ success: true, event: 'open', store_id: storeId, message_sent: true });
    }
    
    // [friend] 친구 추가 - 감사 메시지 + 쿠폰/혜택 안내
    if (eventType === 'friend') {
      console.log(`[Webhook] FRIEND event - Sending friend add message for Store ${storeId}`);
      
      const friendMsg = generateFriendAddMessage(storeResult);
      await sendTextMessage(env, customerId, friendMsg, storeId);
      
      // [WATCHDOG] 친구 추가 로그 기록
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', '[FRIEND] 친구 추가', ?, ?, 0)
      `).bind(
        storeId,
        customerId,
        friendMsg,
        Date.now() - startTime
      ).run();
      
      return c.json({ success: true, event: 'friend', store_id: storeId, message_sent: true });
    }
    
    // [leave] 채팅방 퇴장
    if (eventType === 'leave') {
      console.log(`[Webhook] LEAVE event - Customer left Store ${storeId}`);
      return c.json({ success: true, event: 'leave', store_id: storeId });
    }
    
    // [echo] 파트너(사장님) 메시지 에코 → 외국어 고객에게 번역 발송
    // V3.0.14: 사장님이 한국어로 답변 → 고객 언어로 자동 번역
    if (eventType === 'echo') {
      const ownerMessage = textContent?.trim();
      if (ownerMessage && env.KV) {
        try {
          const savedLang = await env.KV.get(`lang:${storeId}:${customerId}`);
          if (savedLang && savedLang !== 'ko' && ['en', 'ja', 'zh', 'tw', 'th', 'vi', 'mn'].includes(savedLang)) {
            const translated = await translateWithGemini(env, ownerMessage, savedLang);
            if (translated) {
              const flag = LANG_FLAGS[savedLang] || '🌐';
              const bilingualMsg = `${flag} ${translated}\n\n━━━━━━━━━━\n🇰🇷 원문(Original):\n${ownerMessage}`;
              await sendTextMessage(env, customerId, bilingualMsg, storeId);
              console.log(`[V3.0.14] Echo translated: ko → ${savedLang} for customer ${customerId?.slice(0, 8)}`);
              return c.json({ success: true, event: 'echo', translated: true, lang: savedLang });
            }
          }
        } catch (echoErr) {
          console.warn('[V3.0.14] Echo translation error:', echoErr);
        }
      }
      return c.json({ success: true, event: 'echo', ignored: true });
    }
    
    // [profile] 프로필 변경 - 무시
    if (eventType === 'profile') {
      return c.json({ success: true, event: 'profile', ignored: true });
    }
    
    // [send] 외 이벤트는 무시
    if (eventType !== 'send') {
      console.log(`[Webhook] Unknown event type: ${eventType}`);
      return c.json({ success: true, event: eventType, ignored: true });
    }
    
    // ============ [Phase 03-22] send 이벤트 처리 ============
    console.log(`[Webhook] SEND event - Processing message for Store ${storeId}`);
    
    // Rate limiting (KV가 있을 때만)
    if (env.KV) {
      try {
        const rateLimit = await checkRateLimit(env.KV, customerId, 30, 60);
        if (!rateLimit.allowed) {
          await sendTextMessage(env, customerId, 
            '잠시 후 다시 문의해주세요. (요청이 너무 많습니다)',
            storeId
          );
          return c.json({ success: true, store_id: storeId });
        }
      } catch (rateLimitError) {
        console.warn('[Webhook] Rate limit check error:', rateLimitError);
      }
    }
    
    // 메시지 처리
    const originalMessage = textContent?.text || ''; // 콜백 요청에서 전화번호 추출용 원본 보존
    let userMessage = maskPersonalInfo(originalMessage); // 개인정보 마스킹 (AI 응답 및 로그용)
    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;
    
    // 이미지 처리
    if (imageContent?.imageUrl) {
      const uploaded = await uploadImageFromUrl(env.R2, imageContent.imageUrl, 'customer');
      if (uploaded) {
        imageBase64 = uploaded.base64;
        imageMimeType = uploaded.mimeType;
      }
    }
    
    // 대화 컨텍스트 조회
    const context = await getConversationContext(env.KV, storeId, customerId);
    
    // ============ AI Router: 상담 유형별 처리 ============
    // 전문 상담 (의료/법률/보험): GPT-4o → Gemini Pro 검증
    // 일반 문의: Gemini Flash (빠른 응답)
    
    const businessType = storeResult?.business_type || 'OTHER';
    const hasImage = !!(imageBase64 && imageMimeType);
    let consultationType = classifyConsultation(userMessage, businessType, hasImage);
    
    console.log(`[Webhook] Consultation type: ${consultationType}, Business: ${businessType}`);
    
    // ============ [전화 문의 처리] ============
    // ★ V3.0.19: 커스텀 프롬프트가 있는 매장은 AI가 처리 (전화번호 텍스트 노출 방지)
    const hasCustomPrompt = storeResult?.system_prompt && storeResult.system_prompt.trim().length > 100;
    const phoneInquiryPatterns = /전화.*문의|전화번호|연락처|전화.*알려|전화.*뭐예요|전화.*뭔가요/;
    if (phoneInquiryPatterns.test(userMessage) && !hasCustomPrompt) {
      const storeName = storeResult?.store_name || '매장';
      const storePhone = storeResult?.phone || '';
      const storeAddress = storeResult?.address || '';
      
      await sendTextMessage(env, customerId, 
        `📞 ${storeName} 연락처 안내\n\n` +
        `☎️ 전화: ${storePhone}\n` +
        (storeAddress ? `📍 주소: ${storeAddress}\n\n` : '\n') +
        `전화가 어려우시면 네이버 톡톡으로 문의해주세요! 😊`,
        storeId
      );
      
      // 로그 저장 후 리턴
      const phoneResponseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `).bind(storeId, customerId, 'text', userMessage.slice(0, 500), `[phone-inquiry] 전화번호 안내: ${storePhone}`, phoneResponseTime).run();
      
      return c.json({ success: true, store_id: storeId, response_time_ms: phoneResponseTime, intent: 'phone_inquiry' });
    }
    
    // ============ [콜백 요청 처리 - SMS 알림] ============
    // 고객이 "전화해주세요", "연락 부탁", "메모 남겨주세요" 등 요청 시 원장님 + 추가 관리자에게 SMS 알림
    const callbackRequestPatterns = /전화.*해.*주|연락.*해.*주|연락.*부탁|메모.*남|원장님.*전달|콜백|다시.*전화|전화.*바|연락.*드|통화.*원|상담.*원|원장님.*상담|사장님.*전달/;
    const phoneNumberPattern = /(?:010|011|016|017|018|019)[-\s]?\d{3,4}[-\s]?\d{4}/;
    
    // 원본 메시지로 패턴 매칭 (마스킹 전 전화번호 추출 필요)
    if (callbackRequestPatterns.test(originalMessage)) {
      const storeName = storeResult?.store_name || '매장';
      const storePhone = storeResult?.phone || ''; // 매장 전화번호 (고객 안내용)
      const ownerPhone = storeResult?.owner_phone || storePhone; // 원장님 휴대폰 (SMS 발송용)
      
      // 추가 관리자 연락처 파싱 (JSON 배열 형식: [{"name":"디자이너A","phone":"010-1234-5678"},...]
      let additionalContacts: Array<{name: string; phone: string}> = [];
      if (storeResult?.additional_contacts) {
        try {
          additionalContacts = JSON.parse(storeResult.additional_contacts);
        } catch (e) {
          console.warn('[Webhook] Failed to parse additional_contacts:', e);
        }
      }
      
      // 원본 메시지에서 고객 전화번호 추출 시도
      const customerPhoneMatch = originalMessage.match(phoneNumberPattern);
      
      if (customerPhoneMatch) {
        // 고객이 전화번호를 같이 입력한 경우 - 즉시 원장님 + 추가 관리자에게 SMS 전송
        const customerPhone = customerPhoneMatch[0].replace(/[-\s]/g, '-');
        
        // SMS 내용 구성
        const smsText = `[네이버톡톡] ${storeName} 고객메세지\n\n📞 고객 연락처: ${customerPhone}\n💬 메시지: ${originalMessage.slice(0, 60)}\n\n⏰ ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
        
        try {
          // 1. 원장님께 SMS 전송
          const ownerSmsResult = await sendSMS(env, ownerPhone, smsText);
          console.log(`[Webhook] SMS to owner (${ownerPhone}) result:`, ownerSmsResult);
          
          // 2. 추가 관리자들에게 SMS 전송
          const additionalResults: Array<{name: string; success: boolean}> = [];
          for (const contact of additionalContacts) {
            if (contact.phone) {
              const result = await sendSMS(env, contact.phone, smsText);
              additionalResults.push({ name: contact.name, success: result.success });
              console.log(`[Webhook] SMS to ${contact.name} (${contact.phone}) result:`, result);
            }
          }
          
          // 발송 결과 집계
          const totalSent = 1 + additionalContacts.length;
          const successCount = (ownerSmsResult.success ? 1 : 0) + additionalResults.filter(r => r.success).length;
          
          if (successCount > 0) {
            await sendTextMessage(env, customerId,
              `📱 담당자에게 연락 요청을 전달해드렸어요!\n\n` +
              `입력해주신 번호: ${customerPhone}\n\n` +
              `시술 중이시더라도 확인 후 연락드릴게요.\n` +
              `조금만 기다려주세요! 😊`,
              storeId
            );
          } else {
            // SMS 전송 실패 시 안내
            await sendTextMessage(env, customerId,
              `알림 전송에 문제가 있었어요. 😥\n\n` +
              `직접 전화해주시면 더 빠르게 상담받으실 수 있어요.\n` +
              `📞 ${storePhone}`,
              storeId
            );
          }
          
          // 로그 저장
          const callbackResponseTime = Date.now() - startTime;
          await env.DB.prepare(`
            INSERT INTO xivix_conversation_logs 
            (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
            VALUES (?, ?, ?, ?, ?, ?, 0)
          `).bind(storeId, customerId, 'text', userMessage.slice(0, 500), `[callback-request] SMS 발송 ${successCount}/${totalSent}명: ${customerPhone}`, callbackResponseTime).run();
          
          return c.json({ 
            success: true, 
            store_id: storeId, 
            response_time_ms: callbackResponseTime, 
            intent: 'callback_request', 
            sms_sent: true,
            sms_recipients: totalSent,
            sms_success: successCount
          });
        } catch (smsError) {
          console.error('[Webhook] SMS send error:', smsError);
          await sendTextMessage(env, customerId,
            `죄송합니다, 일시적인 오류가 발생했어요.\n\n` +
            `직접 전화주시면 바로 상담해드릴게요!\n` +
            `📞 ${storePhone}`,
            storeId
          );
          
          return c.json({ success: false, store_id: storeId, error: 'SMS send failed' }, 500);
        }
      } else {
        // 전화번호 없이 콜백 요청만 한 경우 - 전화번호 요청
        await sendButtonMessage(env, customerId,
          `📱 담당자에게 연락 전달해드릴게요!\n\n` +
          `연락받으실 전화번호를 입력해주세요.\n` +
          `예) 010-1234-5678`,
          [
            { type: 'TEXT', title: '📞 전화번호 직접 입력', value: '전화번호입력' },
            { type: 'TEXT', title: '💬 직접 전화하기', value: '전화번호알려주세요' }
          ],
          storeId
        );
        
        // 로그 저장
        const callbackResponseTime = Date.now() - startTime;
        await env.DB.prepare(`
          INSERT INTO xivix_conversation_logs 
          (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
          VALUES (?, ?, ?, ?, ?, ?, 0)
        `).bind(storeId, customerId, 'text', userMessage.slice(0, 500), `[callback-request] 전화번호 요청`, callbackResponseTime).run();
        
        return c.json({ success: true, store_id: storeId, response_time_ms: callbackResponseTime, intent: 'callback_request', waiting_phone: true });
      }
    }
    
    // ============ [전화번호 포함 메시지 - 원장님께 SMS 전송] ============
    // 메시지에 전화번호가 포함되어 있으면 원장님께 SMS 전송 (3번 메뉴 응답 후)
    // 패턴: 공백/하이픈 유연하게 처리 (010 4845 3065, 010-3988-0124, 01048453065 모두 인식)
    const flexiblePhonePattern = /(?:010|011|016|017|018|019)[\s\-]?\d{3,4}[\s\-]?\d{4}/;
    const phoneMatch = originalMessage.match(flexiblePhonePattern);
    
    if (phoneMatch) {
      const storeName2 = storeResult?.store_name || '매장';
      const storePhone2 = storeResult?.phone || '';
      const ownerPhone = storeResult?.owner_phone || storePhone2;
      const customerPhone = phoneMatch[0].replace(/[\s\-]/g, '').replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
      
      // 전화번호를 제외한 메시지 내용 추출
      const messageContent = originalMessage.replace(flexiblePhonePattern, '').trim();
      
      // ★ 이전 대화에서 고객 요청사항 추출 (전달사항)
      const contextMessages = Array.isArray(context?.messages) ? context.messages : [];
      const recentUserMessages = contextMessages
        .filter((c: {role: string; content: string}) => c.role === 'user')
        .slice(-3)
        .map((c: {role: string; content: string}) => c.content)
        .join(' / ');
      
      // SMS 내용 구성 - 전달사항 포함
      const smsText = `[네이버톡톡] ${storeName2} 고객메세지\n\n` +
        `📞 연락처: ${customerPhone}\n` +
        `👤 내용: ${messageContent || '상담 요청'}\n` +
        (recentUserMessages ? `💬 전달사항: ${recentUserMessages.slice(0, 60)}\n` : '') +
        `\n⏰ ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
      
      try {
        // 원장님께 SMS 전송
        const smsResult = await sendSMS(env, ownerPhone, smsText);
        console.log(`[Webhook] SMS to owner (${ownerPhone}) result:`, smsResult);
        
        // 추가 관리자에게도 전송
        let additionalContacts2: Array<{name: string; phone: string}> = [];
        if (storeResult?.additional_contacts) {
          try {
            additionalContacts2 = JSON.parse(storeResult.additional_contacts);
            for (const contact of additionalContacts2) {
              if (contact.phone) {
                await sendSMS(env, contact.phone, smsText);
              }
            }
          } catch (e) {
            console.warn('[Webhook] Failed to parse additional_contacts:', e);
          }
        }
        
        if (smsResult.success) {
          await sendTextMessage(env, customerId,
            `✅ 원장님께 전달 완료!\n\n` +
            `📞 ${customerPhone}\n` +
            `💬 ${messageContent || '상담 요청'}\n\n` +
            `━━━━━━━━━━\n` +
            `확인 후 빠르게 연락드릴게요! 😊`
          ,
            storeId
          );
        } else {
          await sendTextMessage(env, customerId,
            `전송에 문제가 있었어요 😥\n\n` +
            `직접 전화주시면 바로 상담해드릴게요!\n` +
            `📞 ${storePhone2}`
          ,
            storeId
          );
        }
        
        const responseTime = Date.now() - startTime;
        await env.DB.prepare(`
          INSERT INTO xivix_conversation_logs 
          (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
          VALUES (?, ?, 'text', ?, ?, ?, 0)
        `).bind(storeId, customerId, originalMessage.slice(0, 100), `[sms-sent] ${customerPhone}: ${messageContent?.slice(0, 50) || '상담요청'}`, responseTime).run();
        
        return c.json({ success: true, store_id: storeId, intent: 'sms_callback', sms_sent: smsResult.success });
      } catch (smsError) {
        console.error('[Webhook] SMS send error:', smsError);
      }
    }

    // ============ [전화번호만 입력한 경우 - 레거시 지원] ============
    const phoneOnlyPattern = /^(?:010|011|016|017|018|019)[-\s]?\d{3,4}[-\s]?\d{4}$/;
    if (phoneOnlyPattern.test(originalMessage.trim())) {
      const storeName = storeResult?.store_name || '매장';
      const storePhone = storeResult?.phone || ''; // 매장 전화번호 (고객 안내용)
      const ownerPhone = storeResult?.owner_phone || storePhone; // 원장님 휴대폰 (SMS 발송용)
      const customerPhone = originalMessage.trim().replace(/[-\s]/g, '-');
      
      // 추가 관리자 연락처 파싱
      let additionalContacts: Array<{name: string; phone: string}> = [];
      if (storeResult?.additional_contacts) {
        try {
          additionalContacts = JSON.parse(storeResult.additional_contacts);
        } catch (e) {
          console.warn('[Webhook] Failed to parse additional_contacts:', e);
        }
      }
      
      // 대화 맥락 확인 (이전에 콜백 요청이 있었는지)
      const contextMessages = Array.isArray(context?.messages) ? context.messages : [];
      const recentContext = contextMessages.slice(-3).map((c: {role: string; content: string}) => c.role === 'user' ? c.content : '').join(' ');
      const hadCallbackRequest = callbackRequestPatterns.test(recentContext) || 
                                 recentContext.includes('전화번호입력') ||
                                 recentContext.includes('연락');
      
      if (hadCallbackRequest) {
        // SMS 내용 구성
        const smsText = `[${storeName}] 고객 콜백 요청\n\n📞 고객 연락처: ${customerPhone}\n\n⏰ ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
        
        try {
          // 1. 원장님께 SMS 전송
          const ownerSmsResult = await sendSMS(env, ownerPhone, smsText);
          console.log(`[Webhook] SMS to owner (${ownerPhone}) phone-only result:`, ownerSmsResult);
          
          // 2. 추가 관리자들에게 SMS 전송
          for (const contact of additionalContacts) {
            if (contact.phone) {
              const result = await sendSMS(env, contact.phone, smsText);
              console.log(`[Webhook] SMS to ${contact.name} (${contact.phone}) phone-only result:`, result);
            }
          }
          
          const totalSent = 1 + additionalContacts.length;
          
          if (ownerSmsResult.success) {
            await sendTextMessage(env, customerId,
              `✅ 담당자에게 전달 완료!\n\n` +
              `입력해주신 번호: ${customerPhone}\n\n` +
              `시술 중이시더라도 확인 후 연락드릴게요.\n` +
              `감사합니다! 😊`
            ,
            storeId
          );
          } else {
            await sendTextMessage(env, customerId,
              `알림 전송에 문제가 있었어요.\n` +
              `직접 전화해주시면 더 빠르게 상담받으실 수 있어요.\n` +
              `📞 ${storePhone}`
            ,
            storeId
          );
          }
          
          // 로그 저장
          const callbackResponseTime = Date.now() - startTime;
          await env.DB.prepare(`
            INSERT INTO xivix_conversation_logs 
            (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
            VALUES (?, ?, ?, ?, ?, ?, 0)
          `).bind(storeId, customerId, 'text', userMessage.slice(0, 500), `[callback-complete] SMS 발송 ${totalSent}명: ${customerPhone}`, callbackResponseTime).run();
          
          return c.json({ success: true, store_id: storeId, response_time_ms: callbackResponseTime, intent: 'callback_complete', sms_sent: true, sms_recipients: totalSent });
        } catch (smsError) {
          console.error('[Webhook] SMS send error:', smsError);
          await sendTextMessage(env, customerId,
            `죄송합니다, 일시적인 오류가 발생했어요.\n` +
            `직접 전화주시면 바로 상담해드릴게요!\n` +
            `📞 ${storePhone}`
          ,
            storeId
          );
          return c.json({ success: false, store_id: storeId, error: 'SMS send failed' }, 500);
        }
      }
    }
    
    // ============ [다국어 지원 처리] ============
    const lowerMsg = userMessage.toLowerCase().trim();
    const storeName = storeResult?.store_name || '매장';
    const storePhone = storeResult?.phone || '전화번호 미등록';
    const storeAddress = storeResult?.address || '주소 미등록';
    const operatingHours = storeResult?.operating_hours || '영업시간 미등록';
    const naverReservationId = storeResult?.naver_reservation_id;
    
    // ============ [언어 설정 - KV에서 저장된 언어 유지] ============
    // 고객이 선택한 언어를 KV에서 읽어와서 유지
    let customerLang = 'ko'; // 기본값: 한국어
    
    // KV에서 저장된 언어 읽기
    if (env.KV) {
      try {
        const savedLang = await env.KV.get(`lang:${storeId}:${customerId}`);
        if (savedLang && ['ko', 'en', 'ja', 'zh', 'tw', 'th', 'vi', 'mn'].includes(savedLang)) {
          customerLang = savedLang;
        }
      } catch (e) {
        console.warn('[Lang] KV read error:', e);
      }
      
      // ★ V3.0.17: 한국어 메시지인데 KV가 외국어면 → 한국어로 자동 리셋
      if (customerLang !== 'ko') {
        const koreanChars = (userMessage.match(/[가-힣]/g) || []).length;
        if (koreanChars >= 1 && userMessage.length <= 20) {
          // 짧은 한국어 메시지 (네, 아니요, 주차는요 등)
          customerLang = 'ko';
          try { await env.KV.put(`lang:${storeId}:${customerId}`, 'ko', { expirationTtl: 86400 }); }
          catch (e) { /* ignore */ }
        } else if (koreanChars / Math.max(userMessage.replace(/\s/g, '').length, 1) > 0.5) {
          // 긴 메시지에서 한국어 비율 50% 이상
          customerLang = 'ko';
          try { await env.KV.put(`lang:${storeId}:${customerId}`, 'ko', { expirationTtl: 86400 }); }
          catch (e) { /* ignore */ }
        }
      }
    }
    
    // ============ [8개국어 지원 시스템] ============
    // 🇰🇷 한국어(ko) | 🇺🇸 영어(en) | 🇯🇵 일본어(ja) | 🇨🇳 중국어 간체(zh)
    // 🇹🇼 중국어 번체(tw) | 🇹🇭 태국어(th) | 🇻🇳 베트남어(vi) | 🇲🇳 몽골어(mn)
    
    // 8개국어 메뉴 메시지 템플릿 (한국어 포함)
    const langMenus: Record<string, { flag: string; welcome: string; menu: string; logName: string }> = {
      ko: {
        flag: '🇰🇷',
        welcome: `🇰🇷 ${storeName}에 오신 것을 환영합니다! ✨\n\n원하시는 서비스를 선택해 주세요:\n\n`,
        menu: `1. 🎁 메뉴/가격 안내\n2. 💇 스타일 상담\n3. 💬 원장님께 상담 요청\n4. 📅 예약하기\n5. 📍 매장 위치 및 전화\n\n번호를 입력해주세요!`,
        logName: '[lang] Korean'
      },
      en: {
        flag: '🇺🇸',
        welcome: `🇺🇸 Welcome to ${storeName}! ✨\n\nPlease select:\n\n`,
        menu: `1. 🎁 Menu & Prices\n2. 💇 Style Consultation\n3. 💬 Message to Director\n4. 📅 Book Appointment\n5. 📍 Location & Contact\n\nType a number!`,
        logName: '[lang] English'
      },
      ja: {
        flag: '🇯🇵',
        welcome: `🇯🇵 ${storeName}へようこそ! ✨\n\n選択してください:\n\n`,
        menu: `1. 🎁 メニュー・料金\n2. 💇 スタイル相談\n3. 💬 院長へメッセージ\n4. 📅 予約\n5. 📍 住所・連絡先\n\n番号を入力!`,
        logName: '[lang] Japanese'
      },
      zh: {
        flag: '🇨🇳',
        welcome: `🇨🇳 欢迎光临 ${storeName}! ✨\n\n请选择:\n\n`,
        menu: `1. 🎁 菜单和价格\n2. 💇 发型咨询\n3. 💬 给院长留言\n4. 📅 预约\n5. 📍 地址和联系方式\n\n请输入数字!`,
        logName: '[lang] Chinese Simplified'
      },
      tw: {
        flag: '🇹🇼',
        welcome: `🇹🇼 歡迎光臨 ${storeName}! ✨\n\n請選擇:\n\n`,
        menu: `1. 🎁 菜單和價格\n2. 💇 髮型諮詢\n3. 💬 給院長留言\n4. 📅 預約\n5. 📍 地址和聯繫方式\n\n請輸入數字!`,
        logName: '[lang] Chinese Traditional'
      },
      th: {
        flag: '🇹🇭',
        welcome: `🇹🇭 ยินดีต้อนรับสู่ ${storeName}! ✨\n\nกรุณาเลือก:\n\n`,
        menu: `1. 🎁 เมนูและราคา\n2. 💇 ปรึกษาทรงผม\n3. 💬 ฝากข้อความถึงผู้อำนวยการ\n4. 📅 จองคิว\n5. 📍 ที่ตั้งและติดต่อ\n\nพิมพ์ตัวเลข!`,
        logName: '[lang] Thai'
      },
      vi: {
        flag: '🇻🇳',
        welcome: `🇻🇳 Chào mừng đến ${storeName}! ✨\n\nVui lòng chọn:\n\n`,
        menu: `1. 🎁 Menu & Giá\n2. 💇 Tư vấn kiểu tóc\n3. 💬 Nhắn tin cho Giám đốc\n4. 📅 Đặt lịch hẹn\n5. 📍 Địa chỉ & Liên hệ\n\nNhập số!`,
        logName: '[lang] Vietnamese'
      },
      mn: {
        flag: '🇲🇳',
        welcome: `🇲🇳 ${storeName}-д тавтай морил! ✨\n\nСонгоно уу:\n\n`,
        menu: `1. 🎁 Меню & Үнэ\n2. 💇 Үсний загвар зөвлөгөө\n3. 💬 Захиралд мессеж\n4. 📅 Цаг захиалга\n5. 📍 Хаяг & Холбоо барих\n\nТоо оруулна уу!`,
        logName: '[lang] Mongolian'
      }
    };
    
    // 언어 감지 패턴 (8개국어 + 한국어) - 한국어로 언어명 입력도 지원
    // 한국어 일반 메시지 감지 (언어 선택 목적이 아닌 일반 대화)
    const koreanTextPattern = /[가-힣]/; // 한글 포함 여부
    const isKoreanMessage = koreanTextPattern.test(userMessage);
    
    // V3.0.14: 한국어 메시지가 오더라도 외국인 고객 세션이면 언어 리셋 안 함
    // → 사장님이 한국어로 입력할 수 있으므로, AI가 이중언어로 응답하도록 유지
    // (언어 리셋은 명시적으로 "한국어", "KO" 입력 시에만)
    const isExplicitKoreanSwitch = /^(ko|kr|korean|한국어|한글)$/i.test(userMessage.trim());
    if (isExplicitKoreanSwitch && customerLang !== 'ko') {
      customerLang = 'ko';
      if (env.KV) {
        try { await env.KV.put(`lang:${storeId}:${customerId}`, 'ko', { expirationTtl: 86400 }); }
        catch (e) { console.warn('[Lang] KV write error:', e); }
      }
    }
    
    // V3.0.14: 언어 감지 패턴 수정 — 명시적 코드/키워드만 매칭
    // ⚠️ 이전: 일본어 문자 포함 시 전부 "언어 선택"으로 인식 → 자유 질문 차단
    // ⭐ 수정: 짧은 명시적 코드(JP, EN 등)와 인사말만 매칭. 자유 텍스트는 AI로 넘김
    const langPatterns: Record<string, RegExp> = {
      ko: /^(ko|kr|korean|한국어|한글)$/i,
      en: /^(en|eng|english|영어)$/i,
      ja: /^(jp|japanese|日本語|일본어|일어)$/i,
      zh: /^(cn|chinese|中文|简体|중국어|중문)$/i,
      tw: /^(tw|繁體|繁体|台灣|台湾|번체|대만)$/i,
      th: /^(th|thai|ภาษาไทย|태국어)$/i,
      vi: /^(vn|vietnamese|tiếng việt|베트남어)$/i,
      mn: /^(mn|mongol|монгол|몽골어)$/i
    };
    
    // ============ [번역 기능] ============
    // "영어로 번역", "일본어로 번역해줘", "translate to english" 등
    const translatePattern = /(.+)(?:로|으로)\s*번역|translate\s+(?:to\s+)?(\w+)|(.+)(?:로|으로)\s*(?:바꿔|변환|알려)/i;
    const translateMatch = userMessage.match(translatePattern);
    
    if (translateMatch) {
      // 번역 대상 언어 감지
      let targetLang = 'en';
      const langKeywords: Record<string, string> = {
        '영어': 'en', 'english': 'en', 'en': 'en',
        '일본어': 'ja', '일어': 'ja', 'japanese': 'ja', 'jp': 'ja',
        '중국어': 'zh', '중문': 'zh', 'chinese': 'zh', 'cn': 'zh',
        '번체': 'tw', '대만': 'tw', 'taiwanese': 'tw', 'tw': 'tw',
        '태국어': 'th', 'thai': 'th', 'th': 'th',
        '베트남어': 'vi', 'vietnamese': 'vi', 'vn': 'vi',
        '몽골어': 'mn', 'mongolian': 'mn', 'mn': 'mn',
        '한국어': 'ko', '한글': 'ko', 'korean': 'ko', 'ko': 'ko'
      };
      
      for (const [keyword, lang] of Object.entries(langKeywords)) {
        if (userMessage.toLowerCase().includes(keyword.toLowerCase())) {
          targetLang = lang;
          break;
        }
      }
      
      // 번역 안내 메시지 (해당 언어로)
      const translateGuides: Record<string, string> = {
        ko: `🇰🇷 한국어로 변경되었습니다!\n\n원하시는 서비스를 선택해주세요:\n\n1. 🎁 메뉴/가격 안내\n2. 💇 스타일 상담\n3. 💬 원장님께 상담 요청\n4. 📅 예약하기\n5. 📍 위치/연락처`,
        en: `🇺🇸 Switched to English!\n\nPlease select:\n\n1. 🎁 Menu & Prices\n2. 💇 Style Consultation\n3. 💬 Message to Director\n4. 📅 Book Appointment\n5. 📍 Location & Contact`,
        ja: `🇯🇵 日本語に変更しました!\n\n選択してください:\n\n1. 🎁 メニュー・料金\n2. 💇 スタイル相談\n3. 💬 院長へメッセージ\n4. 📅 予約\n5. 📍 住所・連絡先`,
        zh: `🇨🇳 已切换到中文!\n\n请选择:\n\n1. 🎁 菜单和价格\n2. 💇 发型咨询\n3. 💬 给院长留言\n4. 📅 预约\n5. 📍 地址和联系方式`,
        tw: `🇹🇼 已切換到繁體中文!\n\n請選擇:\n\n1. 🎁 菜單和價格\n2. 💇 髮型諮詢\n3. 💬 給院長留言\n4. 📅 預約\n5. 📍 地址和聯繫方式`,
        th: `🇹🇭 เปลี่ยนเป็นภาษาไทยแล้ว!\n\nกรุณาเลือก:\n\n1. 🎁 เมนูและราคา\n2. 💇 ปรึกษาทรงผม\n3. 💬 ฝากข้อความ\n4. 📅 จองคิว\n5. 📍 ที่ตั้ง`,
        vi: `🇻🇳 Đã chuyển sang tiếng Việt!\n\nVui lòng chọn:\n\n1. 🎁 Menu & Giá\n2. 💇 Tư vấn kiểu tóc\n3. 💬 Nhắn tin\n4. 📅 Đặt lịch\n5. 📍 Địa chỉ`,
        mn: `🇲🇳 Монгол хэл рүү шилжлээ!\n\nСонгоно у|:\n\n1. 🎁 Меню & Үнэ\n2. 💇 Үсний загвар зөвлөгөө\n3. 💬 Мессеж\n4. 📅 Захиалга\n5. 📍 Хаяг`
      };
      
      // KV에 언어 설정 저장
      if (env.KV) {
        try { await env.KV.put(`lang:${storeId}:${customerId}`, targetLang, { expirationTtl: 86400 }); } 
        catch (e) { console.warn('[Lang] KV write error:', e); }
      }
      
      // ★ 업종별 분기: 메뉴 기반 업종만 5번 메뉴 표시
      const translateBusinessType = storeResult?.business_type || 'OTHER';
      if (isMenuBasedBusiness(translateBusinessType)) {
        await sendTextMessage(env, customerId, translateGuides[targetLang] || translateGuides.en, storeId);
      } else {
        // 비메뉴 업종: 메뉴 없이 언어 변경 안내만
        const aiTranslateGuides: Record<string, string> = {
          ko: `🇰🇷 한국어로 변경되었습니다!\n\n${storeName}입니다. 무엇이든 물어보세요! 😊`,
          en: `🇺🇸 Switched to English!\n\nWelcome to ${storeName}. Ask me anything! 😊`,
          ja: `🇯🇵 日本語に変更しました!\n\n${storeName}です。何でもお聞きください! 😊`,
          zh: `🇨🇳 已切换到中文!\n\n${storeName}。请随时提问! 😊`,
          tw: `🇹🇼 已切換到繁體中文!\n\n${storeName}。請隨時提問! 😊`,
          th: `🇹🇭 เปลี่ยนเป็นภาษาไทยแล้ว!\n\n${storeName} ถามได้เลยค่ะ! 😊`,
          vi: `🇻🇳 Đã chuyển sang tiếng Việt!\n\n${storeName}. Hãy hỏi bất cứ điều gì! 😊`,
          mn: `🇲🇳 Монгол хэл рүү шилжлээ!\n\n${storeName}. Юу ч асууна уу! 😊`
        };
        await sendTextMessage(env, customerId, aiTranslateGuides[targetLang] || aiTranslateGuides.en, storeId);
      }
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, userMessage, `[translate] ${targetLang}`, responseTime).run();
      
      return c.json({ success: true, store_id: storeId, action: 'translate', language: targetLang });
    }
    
    // 언어 선택 처리 (8개국어)
    let detectedLang: string | null = null;
    let hasExplicitLangChoice = false; // 이번 대화에서 명시적 언어 선택 여부
    
    for (const [lang, pattern] of Object.entries(langPatterns)) {
      if (pattern.test(lowerMsg) || pattern.test(userMessage)) {
        detectedLang = lang;
        break;
      }
    }
    
    if (detectedLang && langMenus[detectedLang]) {
      // 명시적 언어 선택 완료
      hasExplicitLangChoice = true;
      customerLang = detectedLang;
      
      // KV에 언어 설정 저장
      if (env.KV) {
        try { await env.KV.put(`lang:${storeId}:${customerId}`, detectedLang, { expirationTtl: 86400 }); } 
        catch (e) { console.warn('[Lang] KV write error:', e); }
      }
      customerLang = detectedLang;
      
      // ★ 업종별 분기: 메뉴 기반 업종만 5번 메뉴 표시
      const storeBusinessType = storeResult?.business_type || 'OTHER';
      if (isMenuBasedBusiness(storeBusinessType)) {
        // 미용실/음식점 등: 기존 메뉴 시스템
        const langData = langMenus[detectedLang];
        await sendTextMessage(env, customerId, langData.welcome + langData.menu, storeId);
      } else {
        // IT/프리랜서 등 비메뉴 업종: 언어 변경 확인 + AI 안내만
        const aiDirectGreetings: Record<string, string> = {
          ko: `🇰🇷 한국어로 변경되었습니다!\n\n${storeName}입니다. 무엇이든 물어보세요! 😊`,
          en: `🇺🇸 Switched to English!\n\nWelcome to ${storeName}. Ask me anything! 😊`,
          ja: `🇯🇵 日本語に変更しました!\n\n${storeName}です。何でもお聞きください! 😊`,
          zh: `🇨🇳 已切换到中文!\n\n${storeName}。请随时提问! 😊`,
          tw: `🇹🇼 已切換到繁體中文!\n\n${storeName}。請隨時提問! 😊`,
          th: `🇹🇭 เปลี่ยนเป็นภาษาไทยแล้ว!\n\n${storeName} ถามได้เลยค่ะ! 😊`,
          vi: `🇻🇳 Đã chuyển sang tiếng Việt!\n\n${storeName}. Hãy hỏi bất cứ điều gì! 😊`,
          mn: `🇲🇳 Монгол хэл рүү шилжлээ!\n\n${storeName}. Юу ч асууна уу! 😊`
        };
        await sendTextMessage(env, customerId, aiDirectGreetings[detectedLang] || aiDirectGreetings.en, storeId);
      }
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, userMessage, langData.logName, responseTime).run();
      
      return c.json({ success: true, store_id: storeId, language: detectedLang });
    }

    // ============ [메뉴 번호 선택 처리 - 다국어 지원] ============
    // V3.0.14: 이중언어 응답 헬퍼 — 외국어 고객이면 "외국어 + 한국어" 이중 표시
    // 목적: 사장님이 톡톡에서 외국어 대화 내용을 한국어로 파악 가능
    const makeBilingual = (foreignText: string, koreanText: string, lang: string): string => {
      if (lang === 'ko') return koreanText; // 한국어 고객은 한국어만
      const flagMap: Record<string, string> = {
        en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳', tw: '🇹🇼', th: '🇹🇭', vi: '🇻🇳', mn: '🇲🇳'
      };
      const flag = flagMap[lang] || '🌐';
      return `${foreignText}\n\n━━━━━━━━━━\n🇰🇷 한국어:\n${koreanText}`;
    };

    // ============ [V3.0.17] 디렉터 상담 대기 상태 체크 ============
    // KV에서 "awaiting_director_consultation" 상태면 → 메시지 캡처 → SMS 발송
    if (env.KV) {
      const consultKey = `consult:${storeId}:${customerId}`;
      const pendingConsult = await env.KV.get(consultKey, 'json') as { pending: boolean; timestamp: number } | null;
      
      // 일반 질문 패턴 (주차, 위치, 가격 등)은 상담 캡처 대신 일반 플로우로
      const isGeneralQuestion = /주차|위치|주소|어디|가격|얼마|메뉴|예약|영업|몇시|시간|전화|번호/.test(userMessage);
      const isMenuSelection = /^[1-5]$/.test(userMessage.trim());
      
      if (pendingConsult?.pending && !isGeneralQuestion && !isMenuSelection && userMessage.trim() !== '5') {
        // 고객이 문의 내용(연락처+상담내용)을 남겼다 → SMS 발송
        const ownerPhone = storeResult?.owner_phone;
        const directorName = storeResult?.store_name || '담당자';
        
        if (ownerPhone) {
          try {
            const { sendSMS, sendLMS } = await import('../lib/notification');
            const smsText = `[XIVIX 톡톡 상담요청]\n${directorName}\n\n고객 메시지:\n${userMessage.slice(0, 200)}\n\n톡톡에서 확인해주세요.`;
            
            if (smsText.length > 80) {
              await sendLMS(env, ownerPhone, smsText);
            } else {
              await sendSMS(env, ownerPhone, smsText);
            }
            console.log(`[Webhook] Director consultation SMS sent to ${ownerPhone.slice(0, 7)}...`);
          } catch (smsErr) {
            console.error('[Webhook] SMS send error:', smsErr);
          }
        }
        
        // 고객에게 확인 메시지
        await sendSmartMessage(env, customerId, 
          `감사합니다! 📝\n\n정다운 디렉터님께\n메시지를 전달했습니다 ✅\n\n시술 후 확인하시는 대로\n바로 연락드릴 거예요!\n\n다른 궁금한 점이 있으시면\n언제든 물어봐주세요 😊`, storeId);
        
        // 상태 클리어
        await env.KV.delete(consultKey);
        
        const responseTime = Date.now() - startTime;
        await env.DB.prepare(`
          INSERT INTO xivix_conversation_logs 
          (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
          VALUES (?, ?, 'text', ?, ?, ?, 1)
        `).bind(storeId, customerId, userMessage.slice(0, 100), '[director-consultation] SMS 발송 완료', responseTime).run();
        
        return c.json({ success: true, store_id: storeId, intent: 'director_consultation_captured' });
      }
    }

    // 환영 인사말의 번호(1~5)는 AI 없이 직접 처리
    // KV에서 저장된 언어 사용 (이미 위에서 customerLang에 로드됨)
    const menuNumber = userMessage.trim();
    const menuLang = customerLang; // KV에서 로드된 언어 사용
    
    // ★ 메뉴 기반 업종만 번호(1~5) 가로채기 — 비메뉴 업종은 AI에게 전달
    const menuGateBusinessType = storeResult?.business_type || 'OTHER';
    // ★ V3.0.17: 커스텀 시스템 프롬프트가 있는 매장은 1/2/3을 AI에게 넘김 (4/5만 하드코딩)
    const hasCustomMenuFlow = storeResult?.system_prompt && storeResult.system_prompt.includes('[A]');
    const menuNumbersToIntercept = hasCustomMenuFlow ? ['4', '5'] : ['1', '2', '3', '4', '5'];
    if (isMenuBasedBusiness(menuGateBusinessType) && menuNumbersToIntercept.includes(menuNumber)) {
    
    if (menuNumber === '1') {
      // 1. 🎁 메뉴/가격 (DB에서 매장별 데이터 사용, 다국어 지원)
      const storeName = storeResult?.store_name || '매장';
      const menuData = storeResult?.menu_data || '';
      const eventsData = storeResult?.events_data || '';
      
      // 이벤트 정보 파싱
      let eventText = '';
      if (eventsData) {
        try {
          const events = JSON.parse(eventsData);
          if (Array.isArray(events) && events.length > 0) {
            eventText = events[0].discount_rate ? `${events[0].discount_rate}` : '';
          }
        } catch {
          // 이벤트 파싱 실패 시 무시
        }
      }
      
      // 다국어 메뉴 헤더/푸터
      const menuTexts: Record<string, { header: string; eventHeader: string; footer: string }> = {
        ko: { header: `📋 ${storeName} 메뉴\n\n`, eventHeader: `🎁 ${eventText} 할인 메뉴\n\n`, footer: `\n\n━━━━━━━━━━\n예약 도와드릴까요?` },
        en: { header: `📋 ${storeName} Menu\n\n`, eventHeader: `🎁 ${eventText} OFF Menu\n\n`, footer: `\n\n━━━━━━━━━━\nWould you like to book?` },
        ja: { header: `📋 ${storeName} メニュー\n\n`, eventHeader: `🎁 ${eventText} 割引メニュー\n\n`, footer: `\n\n━━━━━━━━━━\nご予約しますか?` },
        zh: { header: `📋 ${storeName} 菜单\n\n`, eventHeader: `🎁 ${eventText} 折扣菜单\n\n`, footer: `\n\n━━━━━━━━━━\n需要预约吗?` },
        tw: { header: `📋 ${storeName} 菜單\n\n`, eventHeader: `🎁 ${eventText} 折扣菜單\n\n`, footer: `\n\n━━━━━━━━━━\n需要預約嗎?` },
        th: { header: `📋 ${storeName} เมนู\n\n`, eventHeader: `🎁 ${eventText} ลดราคา\n\n`, footer: `\n\n━━━━━━━━━━\nต้องการจองไหม?` },
        vi: { header: `📋 ${storeName} Menu\n\n`, eventHeader: `🎁 ${eventText} Giảm giá\n\n`, footer: `\n\n━━━━━━━━━━\nBạn muốn đặt lịch?` },
        mn: { header: `📋 ${storeName} Меню\n\n`, eventHeader: `🎁 ${eventText} Хөнгөлөлт\n\n`, footer: `\n\n━━━━━━━━━━\nЗахиалга хийх үү?` }
      };
      
      const langText = menuTexts[menuLang] || menuTexts.ko;
      
      // 메뉴 데이터가 있으면 사용, 없으면 AI에게 맡김
      let priceResponse = '';
      if (menuData && menuData.trim()) {
        const header = eventText ? langText.eventHeader : langText.header;
        
        // 외국어인 경우 AI로 메뉴 번역
        if (menuLang !== 'ko') {
          const langNames: Record<string, string> = {
            en: 'English', ja: '日本語', zh: '中文(简体)', tw: '中文(繁體)',
            th: 'ภาษาไทย', vi: 'Tiếng Việt', mn: 'Монгол хэл'
          };
          const targetLang = langNames[menuLang] || 'English';
          
          try {
            // Gemini로 메뉴 번역
            const translatePrompt = `Translate this Korean menu to ${targetLang}. 
Keep the format exactly the same (line breaks, structure).
Keep prices in Korean Won (원).
Only translate, do not add any extra text.

Menu to translate:
${menuData.trim()}`;
            
            const translatedMenu = await getGeminiResponse(
              env,
              [{ role: 'user', parts: [{ text: translatePrompt }] }],
              `You are a professional translator. Translate accurately to ${targetLang}.`,
              'gemini-2.0-flash'
            );
            
            if (translatedMenu && translatedMenu.trim()) {
              priceResponse = header + translatedMenu.trim() + langText.footer;
            } else {
              // 번역 실패 시 원본 사용
              priceResponse = header + menuData.trim() + langText.footer;
            }
          } catch (e) {
            console.warn('[Menu] Translation failed, using original:', e);
            priceResponse = header + menuData.trim() + langText.footer;
          }
        } else {
          // 한국어는 그대로 사용
          priceResponse = header + menuData.trim() + langText.footer;
        }
      } else {
        // 메뉴 데이터가 없는 경우 다국어 안내
        const noMenuTexts: Record<string, string> = {
          ko: `📋 ${storeName} 메뉴/가격\n\n정확한 메뉴와 가격은 상담 후 안내드립니다.\n\n예약하시면 자세한 상담 받으실 수 있어요!`,
          en: `📋 ${storeName} Menu/Prices\n\nDetailed menu and prices will be provided after consultation.\n\nBook now for detailed consultation!`,
          ja: `📋 ${storeName} メニュー/料金\n\n詳しいメニューと料金は相談後にご案内します。\n\nご予約いただければ詳しくご相談できます!`,
          zh: `📋 ${storeName} 菜单/价格\n\n详细菜单和价格将在咨询后提供。\n\n预约后可获得详细咨询!`,
          tw: `📋 ${storeName} 菜單/價格\n\n詳細菜單和價格將在諮詢後提供。\n\n預約後可獲得詳細諮詢!`,
          th: `📋 ${storeName} เมนู/ราคา\n\nเมนูและราคาจะแจ้งหลังปรึกษา\n\nจองเพื่อรับคำปรึกษาโดยละเอียด!`,
          vi: `📋 ${storeName} Menu/Giá\n\nMenu và giá chi tiết sẽ được cung cấp sau khi tư vấn.\n\nĐặt lịch để được tư vấn chi tiết!`,
          mn: `📋 ${storeName} Меню/Үнэ\n\nДэлгэрэнгүй меню, үнийг зөвлөгөөний дараа мэдэгдэнэ.\n\nЗахиалга хийж дэлгэрэнгүй зөвлөгөө аваарай!`
        };
        priceResponse = (noMenuTexts[menuLang] || noMenuTexts.ko) + langText.footer;
      }
      
      // V3.0.14: 이중언어 — 외국어 고객이면 한국어 원본도 함께 표시
      const koreanPriceResponse = menuData && menuData.trim()
        ? (menuTexts.ko.header + menuData.trim() + menuTexts.ko.footer)
        : `📋 ${storeName} 메뉴/가격\n\n정확한 메뉴와 가격은 상담 후 안내드립니다.\n\n예약하시면 자세한 상담 받으실 수 있어요!` + menuTexts.ko.footer;
      await sendTextMessage(env, customerId, makeBilingual(priceResponse, koreanPriceResponse, menuLang), storeId);
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, '1', `[menu-1] 가격 안내 (${menuLang})`, responseTime).run();
      
      return c.json({ success: true, store_id: storeId, menu_selected: 1, language: menuLang });
    }
    
    if (menuNumber === '2') {
      // 2. 상담 안내 (업종별 분기 - 8개국어 지원)
      const businessType = storeResult?.business_type || 'BEAUTY_HAIR';
      
      let styleResponse = '';
      let koreanStyleResponse = ''; // V3.0.14: 이중언어용
      
      if (businessType === 'BEAUTY_SKIN') {
        // 피부관리샵용 템플릿
        const skinTemplates: Record<string, string> = {
          ko: `✨ 피부 상담\n\n정확한 상담을 위해\n\n📸 현재 피부 [사진] 보내주시거나\n\n✍️ 피부 [고민]을 알려주세요\n\n━━━━━━━━━━\n20년 경력 피부 전문가가\n맞춤 상담해 드릴게요! 😊`,
          en: `✨ Skin Consultation\n\nFor accurate consultation:\n\n📸 Send a [photo] of your skin\n\n✍️ Or describe your skin [concerns]\n\n━━━━━━━━━━\nOur expert with 20 years experience\nwill consult you! 😊`,
          ja: `✨ 肌相談\n\n正確な相談のため:\n\n📸 現在の肌の[写真]を送信\n\n✍️ または肌の[悩み]を教えてください\n\n━━━━━━━━━━\n20年の経験を持つ専門家が\nご相談いたします! 😊`,
          zh: `✨ 皮肤咨询\n\n为了准确咨询:\n\n📸 请发送您皮肤的[照片]\n\n✍️ 或描述您的皮肤[问题]\n\n━━━━━━━━━━\n20年经验的专家\n为您咨询! 😊`,
          tw: `✨ 皮膚諮詢\n\n為了準確諮詢:\n\n📸 請發送您皮膚的[照片]\n\n✍️ 或描述您的皮膚[問題]\n\n━━━━━━━━━━\n20年經驗的專家\n為您諮詢! 😊`,
          th: `✨ ปรึกษาผิวพรรณ\n\nเพื่อการปรึกษาที่แม่นยำ:\n\n📸 ส่ง[รูปภาพ]ผิวของคุณ\n\n✍️ หรืออธิบาย[ปัญหาผิว]ของคุณ\n\n━━━━━━━━━━\nผู้เชี่ยวชาญ 20 ปี\nจะให้คำปรึกษา! 😊`,
          vi: `✨ Tư vấn da\n\nĐể tư vấn chính xác:\n\n📸 Gửi [ảnh] da của bạn\n\n✍️ Hoặc mô tả [vấn đề da] của bạn\n\n━━━━━━━━━━\nChuyên gia 20 năm kinh nghiệm\nsẽ tư vấn cho bạn! 😊`,
          mn: `✨ Арьсны зөвлөгөө\n\nЗөв зөвлөгөө авахын тулд:\n\n📸 Арьсны [зураг] илгээнэ үү\n\n✍️ Эсвэл арьсны [асуудлаа] тайлбарлана уу\n\n━━━━━━━━━━\n20 жилийн туршлагатай мэргэжилтэн\nзөвлөгөө өгнө! 😊`
        };
        styleResponse = skinTemplates[menuLang] || skinTemplates.ko;
        koreanStyleResponse = skinTemplates.ko;
      } else {
        // 헤어샵용 템플릿 (기본)
        const hairTemplates: Record<string, string> = {
          ko: `💇 스타일 상담\n\n정확한 상담을 위해\n\n📸 현재 머리 [사진] 보내주시거나\n\n✍️ 원하시는 [스타일]을 알려주세요\n\n━━━━━━━━━━\n15년 경력 전문가가\n상담해 드릴게요! 😊`,
          en: `💇 Style Consultation\n\nFor accurate consultation:\n\n📸 Send a [photo] of your current hair\n\n✍️ Or describe your desired [style]\n\n━━━━━━━━━━\nOur expert with 15 years experience\nwill consult you! 😊`,
          ja: `💇 スタイル相談\n\n正確な相談のため:\n\n📸 現在の髪の[写真]を送信\n\n✍️ または希望の[スタイル]を教えてください\n\n━━━━━━━━━━\n15年の経験を持つ専門家が\nご相談いたします! 😊`,
          zh: `💇 发型咨询\n\n为了准确咨询:\n\n📸 请发送您目前头发的[照片]\n\n✍️ 或描述您想要的[发型]\n\n━━━━━━━━━━\n15年经验的专家\n为您咨询! 😊`,
          tw: `💇 髮型諮詢\n\n為了準確諮詢:\n\n📸 請發送您目前頭髮的[照片]\n\n✍️ 或描述您想要的[髮型]\n\n━━━━━━━━━━\n15年經驗的專家\n為您諮詢! 😊`,
          th: `💇 ปรึกษาทรงผม\n\nเพื่อการปรึกษาที่แม่นยำ:\n\n📸 ส่ง[รูปภาพ]ผมปัจจุบันของคุณ\n\n✍️ หรืออธิบาย[ทรงผม]ที่ต้องการ\n\n━━━━━━━━━━\nผู้เชี่ยวชาญ 15 ปี\nจะให้คำปรึกษา! 😊`,
          vi: `💇 Tư vấn kiểu tóc\n\nĐể tư vấn chính xác:\n\n📸 Gửi [ảnh] tóc hiện tại của bạn\n\n✍️ Hoặc mô tả [kiểu tóc] bạn muốn\n\n━━━━━━━━━━\nChuyên gia 15 năm kinh nghiệm\nsẽ tư vấn cho bạn! 😊`,
          mn: `💇 Загвар зөвлөгөө\n\nЗөв зөвлөгөө авахын тулд:\n\n📸 Одоогийн үсний [зураг] илгээнэ үү\n\n✍️ Эсвэл хүссэн [загвараа] тайлбарлана уу\n\n━━━━━━━━━━\n15 жилийн туршлагатай мэргэжилтэн\nзөвлөгөө өгнө! 😊`
        };
        styleResponse = hairTemplates[menuLang] || hairTemplates.ko;
        koreanStyleResponse = hairTemplates.ko;
      }
      
      // V3.0.14: 이중언어 
      await sendTextMessage(env, customerId, makeBilingual(styleResponse, koreanStyleResponse, menuLang), storeId);
      
      const responseTime = Date.now() - startTime;
      const logMessage = businessType === 'BEAUTY_SKIN' ? '[menu-2] 피부 상담 안내' : '[menu-2] 스타일 상담 안내';
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, '2', logMessage, responseTime).run();
      
      return c.json({ success: true, store_id: storeId, menu_selected: 2 });
    }
    
    if (menuNumber === '3') {
      // 3. 💬 담당자에게 상담 메시지 남기기 (업종별 호칭, 8개국어 지원)
      const ownerTitles: Record<string, Record<string, string>> = {
        BEAUTY_HAIR: { ko: '원장님', en: 'Director', ja: '院長', zh: '院长', tw: '院長', th: 'ผู้อำนวยการ', vi: 'Giám đốc', mn: 'Захирал' },
        BEAUTY_SKIN: { ko: '원장님', en: 'Director', ja: '院長', zh: '院长', tw: '院長', th: 'ผู้อำนวยการ', vi: 'Giám đốc', mn: 'Захирал' },
        BEAUTY_NAIL: { ko: '원장님', en: 'Director', ja: '院長', zh: '院长', tw: '院長', th: 'ผู้อำนวยการ', vi: 'Giám đốc', mn: 'Захирал' },
        RESTAURANT: { ko: '사장님', en: 'Owner', ja: 'オーナー', zh: '老板', tw: '老闆', th: 'เจ้าของ', vi: 'Chủ quán', mn: 'Эзэн' },
        CAFE: { ko: '사장님', en: 'Owner', ja: 'オーナー', zh: '老板', tw: '老闆', th: 'เจ้าของ', vi: 'Chủ quán', mn: 'Эзэн' },
        FITNESS: { ko: '대표님', en: 'Director', ja: '代表', zh: '负责人', tw: '負責人', th: 'ผู้จัดการ', vi: 'Giám đốc', mn: 'Захирал' },
        MEDICAL: { ko: '원장님', en: 'Doctor', ja: '院長', zh: '院长', tw: '院長', th: 'แพทย์', vi: 'Bác sĩ', mn: 'Эмч' },
      };
      const defaultTitle: Record<string, string> = { ko: '담당자', en: 'Manager', ja: '担当者', zh: '负责人', tw: '負責人', th: 'ผู้จัดการ', vi: 'Người phụ trách', mn: 'Хариуцагч' };
      const titleMap = ownerTitles[menuGateBusinessType] || defaultTitle;
      const ownerTitle = titleMap[menuLang] || titleMap.ko;
      const ownerTitleKo = titleMap.ko || '담당자';
      
      const msgTemplates: Record<string, string> = {
        ko: `💬 ${ownerTitleKo}께 메시지 남기기\n\n${ownerTitleKo}께 바로 전달해 드릴게요!\n\n답변받으실 연락처와 함께\n상담 내용을 남겨주세요 📝\n\n━━━━━━━━━━\n예시)\n010-1234-5678\n상담받고 싶어요`,
        en: `💬 Message to ${ownerTitle}\n\nWe'll deliver your message right away!\n\nPlease leave your contact\nand consultation details 📝\n\n━━━━━━━━━━\nExample:\n+82-10-1234-5678\nI want to consult`,
        ja: `💬 ${ownerTitle}へメッセージ\n\nすぐにお伝えします!\n\n連絡先と相談内容を\n残してください 📝\n\n━━━━━━━━━━\n例:\n+82-10-1234-5678\n相談したいです`,
        zh: `💬 给${ownerTitle}留言\n\n我们会立即转达您的留言!\n\n请留下您的联系方式\n和咨询内容 📝\n\n━━━━━━━━━━\n示例:\n+82-10-1234-5678\n想咨询`,
        tw: `💬 給${ownerTitle}留言\n\n我們會立即轉達您的留言!\n\n請留下您的聯繫方式\n和諮詢內容 📝\n\n━━━━━━━━━━\n範例:\n+82-10-1234-5678\n想諮詢`,
        th: `💬 ฝากข้อความถึง${ownerTitle}\n\nเราจะส่งข้อความให้ทันที!\n\nกรุณาฝากเบอร์ติดต่อ\nและรายละเอียดการปรึกษา 📝\n\n━━━━━━━━━━\nตัวอย่าง:\n+82-10-1234-5678\nอยากปรึกษา`,
        vi: `💬 Nhắn tin cho ${ownerTitle}\n\nChúng tôi sẽ chuyển tin nhắn ngay!\n\nVui lòng để lại số liên hệ\nvà nội dung tư vấn 📝\n\n━━━━━━━━━━\nVí dụ:\n+82-10-1234-5678\nTôi muốn tư vấn`,
        mn: `💬 ${ownerTitle}-д мессеж\n\nБид таны мессежийг шууд дамжуулна!\n\nХолбоо барих болон\nзөвлөгөөний дэлгэрэнгүйг үлдээнэ үү 📝\n\n━━━━━━━━━━\nЖишээ:\n+82-10-1234-5678\nЗөвлөгөө авмаар байна`
      };
      const messageResponse = msgTemplates[menuLang] || msgTemplates.ko;
      // V3.0.14: 이중언어
      await sendTextMessage(env, customerId, makeBilingual(messageResponse, msgTemplates.ko, menuLang), storeId);
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, '3', `[menu-3] ${ownerTitleKo} 메시지 안내`, responseTime).run();
      
      return c.json({ success: true, store_id: storeId, menu_selected: 3 });
    }
    
    if (menuNumber === '4') {
      // 4. 📅 오늘 예약 가능한 시간 확인 (8개국어 지원)
      const bookingTemplates: Record<string, { msg: string; select: string; btn1: string; btn2: string; noBooking: string }> = {
        ko: { msg: `📅 예약 가능 시간 확인\n\n네이버 예약에서\n실시간 빈 시간을 확인하세요!`, select: '🗓️ 날짜와 시간을 선택해주세요!', btn1: '📱 네이버 예약하기', btn2: '💬 전화 문의', noBooking: `📅 예약 안내\n\n예약은 전화로 가능합니다\n\n📞 ${storePhone}\n\n━━━━━━━━━━\n전화 연결해드릴까요?` },
        en: { msg: `📅 Check Available Times\n\nCheck real-time availability\non Naver Booking!`, select: '🗓️ Select date and time!', btn1: '📱 Book on Naver', btn2: '💬 Call Inquiry', noBooking: `📅 Booking Info\n\nReservations by phone\n\n📞 ${storePhone}\n\n━━━━━━━━━━\nShall I connect you?` },
        ja: { msg: `📅 予約可能時間確認\n\nNaverで\nリアルタイムの空き時間を確認!`, select: '🗓️ 日時を選択してください!', btn1: '📱 Naver予約', btn2: '💬 電話問い合わせ', noBooking: `📅 予約案内\n\nお電話で予約可能です\n\n📞 ${storePhone}\n\n━━━━━━━━━━\nお電話おつなぎしますか?` },
        zh: { msg: `📅 查看可预约时间\n\n在Naver预约\n查看实时空闲时间!`, select: '🗓️ 请选择日期和时间!', btn1: '📱 Naver预约', btn2: '💬 电话咨询', noBooking: `📅 预约指南\n\n可电话预约\n\n📞 ${storePhone}\n\n━━━━━━━━━━\n需要我帮您联系吗?` },
        tw: { msg: `📅 查看可預約時間\n\n在Naver預約\n查看即時空閒時間!`, select: '🗓️ 請選擇日期和時間!', btn1: '📱 Naver預約', btn2: '💬 電話諮詢', noBooking: `📅 預約指南\n\n可電話預約\n\n📞 ${storePhone}\n\n━━━━━━━━━━\n需要我幫您聯繫嗎?` },
        th: { msg: `📅 ตรวจสอบเวลาว่าง\n\nตรวจสอบเวลาว่าง\nบน Naver Booking!`, select: '🗓️ เลือกวันและเวลา!', btn1: '📱 จองบน Naver', btn2: '💬 โทรสอบถาม', noBooking: `📅 ข้อมูลการจอง\n\nจองทางโทรศัพท์\n\n📞 ${storePhone}\n\n━━━━━━━━━━\nให้โทรติดต่อไหมคะ?` },
        vi: { msg: `📅 Kiểm tra giờ trống\n\nKiểm tra thời gian thực\ntrên Naver Booking!`, select: '🗓️ Chọn ngày và giờ!', btn1: '📱 Đặt trên Naver', btn2: '💬 Gọi điện', noBooking: `📅 Thông tin đặt lịch\n\nĐặt lịch qua điện thoại\n\n📞 ${storePhone}\n\n━━━━━━━━━━\nBạn muốn tôi kết nối không?` },
        mn: { msg: `📅 Боломжтой цаг шалгах\n\nNaver дээр\nцаг шалгана уу!`, select: '🗓️ Огноо, цаг сонгоно уу!', btn1: '📱 Naver захиалга', btn2: '💬 Утасны лавлагаа', noBooking: `📅 Захиалгын мэдээлэл\n\nУтсаар захиалах\n\n📞 ${storePhone}\n\n━━━━━━━━━━\nХолбох уу?` }
      };
      const bt = bookingTemplates[menuLang] || bookingTemplates.ko;
      const btKo = bookingTemplates.ko; // V3.0.14: 이중언어용
      
      // ★ V3.0.17: personal_website(인포크 등) 우선 사용 → 네이버 예약 → 전화 폴백
      const personalLink = storeResult?.personal_website;
      const kakaoMatch = storeResult?.system_prompt?.match(/https:\/\/open\.kakao\.com\/[^\s"\\]+/);
      const kakaoUrl = kakaoMatch ? kakaoMatch[0] : null;
      
      if (personalLink || naverReservationId) {
        const bookingButtons: ButtonOption[] = [];
        
        // 1순위: 인포크/개인 링크 (메뉴·예약·상담 올인원)
        if (personalLink) {
          bookingButtons.push({ type: 'LINK', title: '📋 메뉴 확인 & 예약하기', linkUrl: personalLink });
        }
        // 2순위: 네이버 예약 직접 링크
        if (naverReservationId) {
          const bookingUrl = getNaverBookingUrl(naverReservationId);
          bookingButtons.push({ type: 'LINK', title: bt.btn1, linkUrl: bookingUrl });
        }
        // 3순위: 카카오톡 상담
        if (kakaoUrl) {
          bookingButtons.push({ type: 'LINK', title: '💬 카카오톡 상담', linkUrl: kakaoUrl });
        }
        
        await sendButtonMessage(env, customerId, 
          `📅 예약 안내\n\n아래 버튼으로\n편하게 예약하실 수 있어요! 😊`,
          bookingButtons.slice(0, 4),
          storeId
        );
      } else {
        await sendTextMessage(env, customerId, makeBilingual(bt.noBooking, btKo.noBooking, menuLang), storeId);
      }
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 1)
      `).bind(storeId, customerId, '4', '[menu-4] 예약 시간 안내', responseTime).run();
      
      return c.json({ success: true, store_id: storeId, menu_selected: 4 });
    }
    
    if (menuNumber === '5') {
      // 5. ★ V3.0.17: 디렉터/담당자 직접 상담 요청 (문의 수집 → SMS 발송)
      const ownerTitle = storeResult?.business_type?.startsWith('BEAUTY') ? '디렉터' : '담당자';
      const personalKakao = storeResult?.system_prompt?.match(/https:\/\/open\.kakao\.com\/[^\s"\\]+/);
      const kakaoUrl = personalKakao ? personalKakao[0] : null;
      const ownerPhone = storeResult?.owner_phone;
      const storePhoneClean = storePhone?.replace(/[-\s]/g, '');
      
      // 상담 연결 옵션 메시지
      const consultMsg = `💬 정다운 ${ownerTitle}님께\n상담을 요청해드릴게요! ✨\n\n궁금하신 내용과 연락처를\n함께 남겨주세요 📝\n\n예시)\n010-1234-5678\n에어랩펌 상담 받고 싶어요\n\n${ownerTitle}님 시술 후\n바로 연락드릴 수 있도록\n전달해드리겠습니다! 😊`;
      
      await sendTextMessage(env, customerId, consultMsg, storeId);
      
      // 전화/카톡 즉시 연결 버튼도 제공
      const consultButtons: ButtonOption[] = [];
      if (storePhoneClean) {
        consultButtons.push({ type: 'LINK', title: '📞 전화로 바로 연결', linkUrl: `tel:${storePhoneClean}` });
      }
      if (kakaoUrl) {
        consultButtons.push({ type: 'LINK', title: '💬 카카오톡 상담', linkUrl: kakaoUrl });
      }
      if (consultButtons.length > 0) {
        await sendButtonMessage(env, customerId, '바로 연결도 가능해요! 😊', consultButtons, storeId);
      }
      
      // KV에 상담 대기 상태 저장 (30분 TTL)
      if (env.KV) {
        const consultKey = `consult:${storeId}:${customerId}`;
        await env.KV.put(consultKey, JSON.stringify({ pending: true, timestamp: Date.now() }), { expirationTtl: 1800 });
      }
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 1)
      `).bind(storeId, customerId, '5', '[menu-5] 디렉터 상담 요청', responseTime).run();
      
      return c.json({ success: true, store_id: storeId, menu_selected: 5 });
    }
    } // ★ END: isMenuBasedBusiness() 게이트

    // ============ [키워드 기반 정보 제공 - AI 의존 제거] ============
    const lowerMessage = userMessage.toLowerCase();
    
    // ★ V3.0.17: 주차 관련 키워드 (위치보다 먼저 체크)
    if (/주차/.test(lowerMessage)) {
      // 매장별 주차 정보: system_prompt에서 추출 시도, 없으면 기본 안내
      const parkingInfo = storeResult?.system_prompt?.match(/주차[^.]*(?:\.|$)/)?.[0];
      
      // 매장별 커스텀 주차 안내 (DB에 parking_info 필드가 있으면 사용)
      const customParking = (storeResult as any)?.parking_info;
      
      let parkingResponse: string;
      if (customParking) {
        parkingResponse = customParking;
      } else if (storeResult?.store_name?.includes('연산') || storeResult?.store_name?.includes('위닛')) {
        // 위닛 연산점 전용 주차 안내
        parkingResponse = `🚗 주차 안내\n\n📍 카카오T 연산동스마트주차장\n부산 연제구 연산동 1279-5\n매장에서 도보 1분!\n\n💰 시술 금액별\n최대 2시간 주차 지원\n(디렉터별 상이)\n\n━━━━━━━━━━\n예약하시면 더 편하게\n안내받으실 수 있어요! 😊`;
      } else {
        parkingResponse = `🚗 주차 안내\n\n매장 근처 주차장을\n이용하실 수 있어요!\n\n자세한 내용은\n방문 전 문의해주세요 📞\n${storePhone}`;
      }
      
      await sendSmartMessage(env, customerId, parkingResponse, storeId);
      
      // ★ KV 컨텍스트 저장 (후속 "네" 등 맥락 유지)
      if (env.KV) {
        try { await updateConversationContext(env.KV, storeId, customerId, userMessage, parkingResponse); }
        catch (e) { console.warn('[Parking] KV context save error:', e); }
      }
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, userMessage.slice(0, 100), '[keyword] 주차 안내', responseTime).run();
      
      return c.json({ success: true, store_id: storeId, intent: 'parking' });
    }
    
    // 위치/주소 관련 키워드 (주차 제외)
    if (/위치|주소|어디(?!.*주차)|찾아가|오시는.*길|길.*안내/.test(lowerMessage)) {
      const locationResponse = `📍 ${storeName}\n\n` +
        `🏠 주소\n${storeAddress}\n\n` +
        `📞 전화\n${storePhone}\n\n` +
        `⏰ 영업시간\n${storeResult?.operating_hours || '10:00-19:00'}\n\n` +
        `━━━━━━━━━━\n방문 예약 도와드릴까요?`;
      await sendTextMessage(env, customerId, locationResponse, storeId);
      
      // ★ KV 컨텍스트 저장 (후속 맥락 유지)
      if (env.KV) {
        try { await updateConversationContext(env.KV, storeId, customerId, userMessage, locationResponse); }
        catch (e) { console.warn('[Location] KV context save error:', e); }
      }
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, userMessage.slice(0, 100), '[keyword] 위치 안내', responseTime).run();
      
      return c.json({ success: true, store_id: storeId, intent: 'location' });
    }
    
    // 🎁 이벤트/할인 관련 키워드 (이벤트 먼저 체크) - 다국어 지원
    if (/이벤트|할인|50%|오십|50프로|30%|삼십|프로모션|특가|혜택|event|discount|sale|promotion|offer/i.test(lowerMessage)) {
      const eventsData = storeResult?.events_data || '';
      const menuData = storeResult?.menu_data || '';
      
      // 다국어 이벤트 텍스트
      const eventTexts: Record<string, { header: string; footer: string; noEvent: string }> = {
        ko: { header: `🎁 ${storeName} 이벤트\n\n`, footer: `\n\n━━━━━━━━━━\n관심 있는 이벤트가 있으시면 말씀해주세요!`, noEvent: `현재 진행 중인 이벤트 정보는 매장에 직접 문의해주세요.` },
        en: { header: `🎁 ${storeName} Events\n\n`, footer: `\n\n━━━━━━━━━━\nLet me know if you're interested in any event!`, noEvent: `Please contact the salon directly for current event information.` },
        ja: { header: `🎁 ${storeName} イベント\n\n`, footer: `\n\n━━━━━━━━━━\n気になるイベントがあればお知らせください!`, noEvent: `現在のイベント情報はサロンに直接お問い合わせください。` },
        zh: { header: `🎁 ${storeName} 活动\n\n`, footer: `\n\n━━━━━━━━━━\n如有感兴趣的活动请告诉我!`, noEvent: `请直接联系沙龙了解当前活动信息。` },
        tw: { header: `🎁 ${storeName} 活動\n\n`, footer: `\n\n━━━━━━━━━━\n如有感興趣的活動請告訴我!`, noEvent: `請直接聯繫沙龍了解當前活動資訊。` },
        th: { header: `🎁 ${storeName} กิจกรรม\n\n`, footer: `\n\n━━━━━━━━━━\nแจ้งให้ทราบหากสนใจกิจกรรมใด!`, noEvent: `กรุณาติดต่อร้านโดยตรงสำหรับข้อมูลกิจกรรมปัจจุบัน` },
        vi: { header: `🎁 ${storeName} Sự kiện\n\n`, footer: `\n\n━━━━━━━━━━\nHãy cho tôi biết nếu bạn quan tâm sự kiện nào!`, noEvent: `Vui lòng liên hệ trực tiếp salon để biết thông tin sự kiện hiện tại.` },
        mn: { header: `🎁 ${storeName} Үйл явдал\n\n`, footer: `\n\n━━━━━━━━━━\nСонирхсон үйл явдал байвал хэлнэ үү!`, noEvent: `Одоогийн арга хэмжээний мэдээллийг салоноос шууд асууна уу.` }
      };
      
      const eventLangText = eventTexts[customerLang] || eventTexts.ko;
      let eventResponse = '';
      
      // events_data가 있으면 이벤트 정보 표시
      if (eventsData && eventsData.trim()) {
        // 텍스트 형태 or JSON 형태 모두 처리
        let eventsText = eventsData;
        try {
          const parsed = JSON.parse(eventsData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            eventsText = parsed.map((e: any) => `${e.title || e.name}: ${e.discount_rate || e.price || ''}`).join('\n');
          }
        } catch {
          // JSON이 아니면 텍스트 그대로 사용
        }
        
        // 외국어인 경우 AI로 번역
        if (customerLang !== 'ko') {
          const langNames: Record<string, string> = {
            en: 'English', ja: '日本語', zh: '中文(简体)', tw: '中文(繁體)',
            th: 'ภาษาไทย', vi: 'Tiếng Việt', mn: 'Монгол хэл'
          };
          const targetLang = langNames[customerLang] || 'English';
          
          try {
            const translatePrompt = `Translate this Korean hair salon event/promotion information to ${targetLang}. 
Keep the format exactly the same (line breaks, structure).
Keep prices in Korean Won (원).
Only translate, do not add any extra text.

Text to translate:
${eventsText.trim()}`;
            
            const translatedEvents = await getGeminiResponse(
              env,
              [{ role: 'user', parts: [{ text: translatePrompt }] }],
              `You are a professional translator. Translate accurately to ${targetLang}.`,
              'gemini-2.0-flash'
            );
            
            if (translatedEvents && translatedEvents.trim()) {
              eventResponse = eventLangText.header + translatedEvents.trim() + eventLangText.footer;
            } else {
              eventResponse = eventLangText.header + eventsText.trim() + eventLangText.footer;
            }
          } catch (e) {
            console.warn('[Event] Translation failed:', e);
            eventResponse = eventLangText.header + eventsText.trim() + eventLangText.footer;
          }
        } else {
          eventResponse = eventLangText.header + eventsText.trim() + eventLangText.footer;
        }
      } else if (menuData && menuData.trim()) {
        // 이벤트 데이터가 없으면 메뉴 데이터 표시
        eventResponse = `📋 ${storeName} 메뉴\n\n${menuData.trim()}\n\n━━━━━━━━━━\n${eventLangText.noEvent}`;
      } else {
        eventResponse = `🎁 ${storeName}\n\n${eventLangText.noEvent}\n\n📞 ${storePhone}`;
      }
      
      await sendTextMessage(env, customerId, eventResponse, storeId);
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, userMessage.slice(0, 100), `[keyword] 이벤트 안내 (${customerLang})`, responseTime).run();
      
      return c.json({ success: true, store_id: storeId, intent: 'event', language: customerLang });
    }
    
    // 💰 가격/메뉴 관련 키워드 - AI 프롬프트로 처리하도록 변경
    // 이전: 키워드 감지 시 메뉴판 강제 출력
    // 변경: AI가 시스템 프롬프트에 따라 스타일 상담 + 원장님 매칭으로 응대
    // (가격 문의도 AI가 처리하도록 아래 AI 응답 로직으로 넘김)
    
    // 영업시간 관련 키워드
    if (/영업.*시간|몇.*시|언제.*까지|오픈|마감|휴무|쉬는.*날/.test(lowerMessage)) {
      const hoursResponse = `⏰ ${storeName} 영업시간\n\n` +
        `${storeResult?.operating_hours || '10:00-19:00'}\n\n` +
        `📞 전화\n${storePhone}\n\n` +
        `━━━━━━━━━━\n예약 도와드릴까요?`;
      await sendTextMessage(env, customerId, hoursResponse, storeId);
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, userMessage.slice(0, 100), '[keyword] 영업시간 안내', responseTime).run();
      
      return c.json({ success: true, store_id: storeId, intent: 'hours' });
    }

    // ============ [Phase 04] 네이버 예약 연동 처리 (AI 응답 전에 체크) ============
    const bookingIntent = detectBookingIntent(userMessage);
    let bookingState = { isBookingFlow: false, step: 'idle' as const, lastUpdated: Date.now() };
    
    // KV가 있을 때만 상태 조회
    if (env.KV) {
      try {
        bookingState = await getBookingState(env.KV, storeId, customerId);
      } catch (kvError) {
        console.warn('[Webhook] KV getBookingState error:', kvError);
      }
    }
    
    // 예약 의도가 있거나 예약 흐름 중인 경우 - 예약 로직 처리 후 리턴
    if (bookingIntent.hasBookingIntent || bookingState.isBookingFlow) {
      console.log(`[Webhook] Booking intent detected: ${bookingIntent.intentType}, state: ${bookingState.step}`);
      
      const storeName = storeResult?.store_name || '매장';
      const naverReservationId = storeResult?.naver_reservation_id;
      
      // 예약 문의 또는 가능 시간 조회 요청
      if (bookingIntent.intentType === 'check_available' || bookingIntent.intentType === 'inquiry') {
        try {
          // 네이버 예약 ID가 있으면 바로 예약 링크 제공
          if (naverReservationId) {
            const bookingUrl = getNaverBookingUrl(naverReservationId);
            console.log(`[Webhook] Booking URL generated: ${bookingUrl}`);
            
            // 예약 안내 메시지 + 클릭 가능한 링크
            await sendTextMessage(env, customerId, 
              `📅 ${storeName} 예약 안내\n\n` +
              `아래 링크를 눌러 바로 예약하세요! 😊\n\n` +
              `🗓️ 네이버 예약하기 👇\n${bookingUrl}\n\n` +
              `📞 전화 문의: ${storePhone}`
            ,
            storeId
          );
          } else {
            // 네이버 예약 ID가 없으면 안내 메시지
            await sendTextMessage(env, customerId, 
              `${storeName} 예약 문의 감사합니다! 😊\n\n` +
              `예약은 전화 또는 방문으로 가능합니다.\n` +
              `전화번호를 알려드릴까요?`
            ,
            storeId
          );
          }
        } catch (bookingError) {
          console.error('[Webhook] Booking inquiry error:', bookingError);
        }
      }
      // 일반 예약 문의 (네이버 예약 버튼 제공)
      else if (naverReservationId) {
        await sendButtonMessage(env, customerId, 
          '바로 예약하시겠어요?',
          [
            { type: 'LINK', title: '지금 예약하기', linkUrl: getNaverBookingUrl(naverReservationId) },
            { type: 'TEXT', title: '예약 가능 시간 확인', value: '예약가능시간' }
          ]
        ,
            storeId
          );
      }
      
      // 예약 처리 완료 - 로그 저장 후 리턴
      const bookingResponseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).bind(
        storeId,
        customerId,
        'text',
        userMessage.slice(0, 500),
        `[booking-flow] 예약 의도 감지: ${bookingIntent.intentType}`,
        bookingResponseTime
      ).run();
      
      return c.json({ 
        success: true, 
        store_id: storeId,
        response_time_ms: bookingResponseTime,
        booking_intent: bookingIntent.intentType
      });
    }
    
    // ============ 일반 AI 응답 처리 ============
    let aiResponse = '';
    let aiModel = '';
    let verified = false;
    
    // [V3.0] 요금제 기반 AI 사용량 체크
    const storePlan = parsePlan(storeResult?.plan);
    
    // AI 대화 건수 한도 체크
    try {
      const usageCheck = await incrementAIUsage(env, storeId, storePlan);
      if (!usageCheck.allowed) {
        // 한도 초과 — 안내 메시지 발송
        const limitMsg = getAILimitMessage(storePlan, usageCheck.current, usageCheck.limit);
        await sendTextMessage(env, customerId, limitMsg, storeId);
        console.log(`[Webhook] AI limit exceeded for store ${storeId} (plan: ${storePlan}, used: ${usageCheck.current}/${usageCheck.limit})`);
        return c.json({ success: true, store_id: storeId, action: 'ai_limit_exceeded' });
      }
    } catch (usageError) {
      // 사용량 추적 실패 시 AI 응답은 계속 진행 (서비스 중단 방지)
      console.error('[Webhook] Usage tracking error (continuing):', usageError);
    }
    
    // [V3.0] 전문상담AI/검증AI/이미지분석 요금제 체크
    if (consultationType === 'expert' && !canUseFeature(storePlan, 'expertAI')) {
      // 전문상담AI 미지원 요금제 → 일반 Gemini로 폴백
      consultationType = 'simple' as any;
      console.log(`[Webhook] Expert AI not available for plan ${storePlan}, falling back to simple`);
    }
    
    if (consultationType === 'image' && !canUseFeature(storePlan, 'imageAnalysis')) {
      // 이미지 분석 미지원 요금제 → 안내 메시지
      await sendTextMessage(env, customerId, '이미지 분석 기능은 프리미엄 요금제에서 이용 가능합니다.\n\n업그레이드 문의: 010-3988-0124', storeId);
      return c.json({ success: true, store_id: storeId, action: 'feature_disabled' });
    }
    
    // 톡톡 발송 카운트 (통계용)
    try { await incrementTalkTalkUsage(env, storeId); } catch {}
    
    // 전문 상담 또는 이미지 분석: AI Router 사용
    if (consultationType === 'expert' || consultationType === 'image') {
      console.log(`[Webhook] Using AI Router for ${consultationType} consultation`);
      
      const result = await routeAIRequest(
        env,
        storeResult,
        userMessage,
        context,
        imageBase64,
        imageMimeType
      );
      
      aiResponse = result.response;
      aiModel = result.model;
      verified = result.verified || false;
      
      // V3.0.14: 이중언어 후처리 — 외국어 고객이면 한국어 번역 추가
      aiResponse = await ensureBilingual(env, aiResponse, customerLang);
      
      // 응답 전송
      aiResponse = formatForMobile(aiResponse);
      await sendSmartMessage(env, customerId, aiResponse, storeId);
      
      console.log(`[Webhook] AI Response (${aiModel}, verified: ${verified}): ${String(aiResponse || '').slice(0, 50)}...`);
    } 
    // 일반 문의: ★ V3.0.17 하이브리드 모델 라우팅
    else {
      // 메시지 복잡도 분류 → Flash(단순) / Pro(상담)
      const simplePatterns = /^(안녕|반갑|하이|hello|hi|hey|감사|고마워|ㅎㅇ|ㅎㅎ|네|넵|응|좋아|알겠|오케이|ok|yes|아니|ㄴㄴ|됐어|괜찮|bye|잘가)/i;
      const infoPatterns = /주차|위치|주소|어디|찾아가|영업시간|몇시|언제.*열|언제.*닫|전화번호|번호.*알려|연락처|휴무|쉬는.*날|정기휴무|화장실|와이파이|wifi/;
      const consultPatterns = /상담|추천|스타일|펌|염색|컬러|클리닉|탈색|매직|볼륨|커트|가격|얼마|비용|할인|이벤트|사진|머리|두피|손상|시술/;
      const isSimpleMessage = !consultPatterns.test(userMessage) && (simplePatterns.test(userMessage.trim()) || infoPatterns.test(userMessage));
      
      const baseModel = storeResult?.ai_model || 'gemini';
      // Pro 매장: 단순질문만 Flash, 나머지 Pro | Flash 매장: 전부 Flash
      const selectedModel = (baseModel === 'gemini-pro' && isSimpleMessage) ? 'gemini' : baseModel;
      
      const storeAiOptions = {
        temperature: (storeResult?.ai_temperature as number) || 0.7,
        maxTokens: isSimpleMessage ? 400 : ((storeResult?.max_tokens as number) || 800)
      };
      console.log(`[Webhook] Hybrid routing: "${userMessage.slice(0,20)}" → ${selectedModel} (simple=${isSimpleMessage}), temp=${storeAiOptions.temperature}, maxTokens=${storeAiOptions.maxTokens}`);
      aiModel = selectedModel;
      
      // Gemini 메시지 구성
      const messages = buildGeminiMessages(context, userMessage, imageBase64, imageMimeType);
      const systemInstruction = buildSystemInstruction(storeResult ? {
        store_name: storeResult.store_name,
        menu_data: storeResult.menu_data,
        operating_hours: storeResult.operating_hours,
        address: storeResult.address,
        phone: storeResult.phone,
        ai_persona: storeResult.ai_persona,
        ai_tone: storeResult.ai_tone,
        system_prompt: storeResult.system_prompt,
        greeting_message: storeResult.greeting_message
      } : undefined, customerLang); // 다국어 지원을 위해 언어 전달
      
      // ⭐ 매장 설정 모델로 응답 생성 (GPT-4o, Gemini Pro, Gemini Flash)
      if (selectedModel === 'gpt-4o') {
        // GPT-4o 사용
        const { getOpenAIResponse, buildOpenAISystemPrompt, buildOpenAIMessages } = await import('../lib/openai');
        const openAIApiKey = env.OPENAI_API_KEY;
        if (!openAIApiKey) {
          console.warn('[Webhook] OpenAI API key not set, falling back to Gemini');
          aiResponse = await getGeminiResponse(env, messages, systemInstruction, 'gemini', storeAiOptions);
        } else {
          // 다국어 지시 (GPT-4o용)
          const gptLangInstructions: Record<string, string> = {
            ko: '',
            en: '\n\n## 🌐 CRITICAL: RESPOND IN ENGLISH ONLY\nYou MUST respond in English. Translate all Korean content to English. Keep prices in Korean Won (원). Menu names: Korean (English translation).',
            ja: '\n\n## 🌐 重要: 日本語で回答\n必ず日本語で回答してください。韓国語は日本語に翻訳。価格は원のまま。',
            zh: '\n\n## 🌐 重要: 用中文回复\n必须用中文回复。翻译韩语内容。价格保持원格式。',
            tw: '\n\n## 🌐 重要: 用繁體中文回覆\n必須用繁體中文回覆。翻譯韓語內容。價格保持원格式。',
            th: '\n\n## 🌐 สำคัญ: ตอบเป็นภาษาไทย\nต้องตอบเป็นภาษาไทย แปลเนื้อหาเกาหลี ราคาเก็บเป็น원',
            vi: '\n\n## 🌐 QUAN TRỌNG: TRẢ LỜI BẰNG TIẾNG VIỆT\nPhải trả lời bằng tiếng Việt. Dịch nội dung tiếng Hàn. Giữ giá bằng 원.',
            mn: '\n\n## 🌐 ЧУХАЛ: МОНГОЛ ХЭЛЭЭР ХАРИУЛНА УУ\nМонгол хэлээр хариулах ёстой. Солонгос агуулгыг орчуулна уу. Үнийг 원 хэлбэрээр хадгална уу.'
          };
          const gptLangInstruction = customerLang !== 'ko' ? (gptLangInstructions[customerLang] || gptLangInstructions.en) : '';
          
          // storeResult 필드를 buildOpenAISystemPrompt 인터페이스에 맞게 매핑
          const openAISystemPrompt = buildOpenAISystemPrompt({
            persona: storeResult?.ai_persona || '전문 상담 AI',
            tone: storeResult?.ai_tone || 'friendly',
            storeName: storeResult?.store_name || '매장',
            menuData: storeResult?.menu_data || '',
            operatingHours: storeResult?.operating_hours || '',
            customPrompt: (gptLangInstruction + '\n\n' + (storeResult?.system_prompt || '')).trim(),
            forbiddenKeywords: storeResult?.forbidden_keywords || ''
          });
          // context가 ConversationContext 타입일 경우 messages 배열 추출 (안전하게)
          const conversationHistory = Array.isArray(context?.messages) ? context.messages : [];
          const openAIMessages = buildOpenAIMessages(openAISystemPrompt, conversationHistory, userMessage);
          try {
            aiResponse = await getOpenAIResponse(openAIApiKey, openAIMessages, { temperature: storeAiOptions.temperature, maxTokens: storeAiOptions.maxTokens }) || '응답을 생성할 수 없습니다.';
          } catch (gptError: any) {
            console.error('[Webhook] GPT-4o error, falling back to Gemini:', gptError.message);
            aiResponse = await getGeminiResponse(env, messages, systemInstruction, 'gemini', storeAiOptions);
            aiModel = 'gemini-flash (fallback)';
          }
        }
      } else {
        // Gemini 모델 사용 (gemini-pro 또는 gemini/gemini-flash)
        aiResponse = await getGeminiResponse(env, messages, systemInstruction, selectedModel, storeAiOptions);
      }
      
      // AI 응답이 null이면 재시도 또는 기본 응답
      if (!aiResponse) {
        console.error('[Webhook] AI response is null, retrying...');
        aiResponse = await getGeminiResponse(env, messages, systemInstruction, 'gemini-2.5-flash', storeAiOptions);
        if (!aiResponse) {
          aiResponse = '죄송합니다. 잠시 후 다시 문의해주세요.';
        }
      }
      
      // V3.0.14: 이중언어 후처리 — 외국어 고객이면 한국어 번역 추가
      aiResponse = await ensureBilingual(env, aiResponse, customerLang);
      
      aiResponse = formatForMobile(aiResponse);
      await sendSmartMessage(env, customerId, aiResponse, storeId);
      
      // ★ V3.0.16: AI 응답에 상담 연결 키워드 → 전화/카톡 클릭 버튼 자동 추가
      const contactKeywords = /상담.*연결|직접.*상담|예약.*도와|연락.*드리|전화.*버튼|카톡.*버튼|버튼.*눌러|바로.*연결|상담.*받아보|메모.*남겨|연결.*드릴까|상담을.*시작/;
      if (contactKeywords.test(aiResponse || '')) {
        const contactOwnerPhone = storeResult?.owner_phone || storeResult?.phone;
        const kakaoMatch = storeResult?.system_prompt?.match(/https:\/\/open\.kakao\.com\/[^\s"\\]+/);
        const kakaoUrl = kakaoMatch ? kakaoMatch[0] : null;
        
        const contactButtons: ButtonOption[] = [];
        if (contactOwnerPhone) {
          const cleanPhone = contactOwnerPhone.replace(/[-\s]/g, '');
          contactButtons.push({ 
            type: 'LINK' as const, 
            title: '📞 전화 상담', 
            linkUrl: `tel:${cleanPhone}`
          });
        }
        if (kakaoUrl) {
          contactButtons.push({ 
            type: 'LINK' as const, 
            title: '💬 카카오톡 상담', 
            linkUrl: kakaoUrl
          });
        }
        
        if (contactButtons.length > 0) {
          await sendButtonMessage(env, customerId, '바로 연결하실 수 있어요! 😊', contactButtons, storeId);
        }
      }
    }
    
    // 대화 컨텍스트 저장
    if (env.KV) {
      try {
        await updateConversationContext(env.KV, storeId, customerId, userMessage, aiResponse);
      } catch (kvError) {
        console.warn('[Webhook] KV updateConversationContext error:', kvError);
      }
    }
    
    // 로그 저장 (AI 모델 정보 포함)
    const responseTime = Date.now() - startTime;
    await env.DB.prepare(`
      INSERT INTO xivix_conversation_logs 
      (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).bind(
      storeId,
      customerId,
      imageBase64 ? 'mixed' : 'text',
      userMessage.slice(0, 500),
      `[${aiModel}${verified ? ',verified' : ''}] ${String(aiResponse || '')}`.slice(0, 1000),
      responseTime
    ).run();
    
    return c.json({ 
      success: true, 
      store_id: storeId,
      response_time_ms: responseTime,
      ai_model: aiModel,
      consultation_type: consultationType,
      verified
    });
    
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack || '';
    console.error(`[Webhook] Error for Store ${urlStoreId}:`, errorMessage);
    console.error(`[Webhook] Error stack:`, errorStack);
    return c.json({ 
      success: false, 
      error: 'Internal server error', 
      store_id: urlStoreId,
      error_message: String(errorMessage || '').slice(0, 200),
      error_stack: String(errorStack || '').slice(0, 500)
    }, 500);
  }
});

// Webhook message handler (POST) - 기본 경로 (fallback)
webhook.post('/v1/naver/callback', async (c) => {
  const startTime = Date.now();
  const env = c.env;
  
  try {
    const body = await c.req.json();
    const message = parseWebhookMessage(body);
    
    if (!message) {
      return c.json({ success: false, error: 'Invalid message format' }, 400);
    }
    
    const { event, user: customerId, textContent, imageContent } = message;
    const eventType = event as NaverTalkTalkEventType;
    
    // ============ [XIVIX_WATCHDOG] 이벤트 로깅 ============
    console.log(`[Webhook] Event: ${eventType}, Customer: ${customerId?.slice(0, 8)}...`);
    
    // ============ [Phase 03-21] 이벤트 타입별 처리 ============
    
    // [open] 채팅방 입장 - 매장별 환영 메시지
    if (eventType === 'open') {
      console.log(`[Webhook] OPEN event - Sending welcome message`);
      
      // 매장 정보 조회 (환영 메시지 커스터마이징용)
      const storeResult = await env.DB.prepare(
        'SELECT * FROM xivix_stores WHERE is_active = 1 LIMIT 1'
      ).first<Store>();
      
      const welcomeMsg = generateWelcomeMessage(storeResult);
      await sendTextMessage(env, customerId, welcomeMsg, storeId);
      
      // [WATCHDOG] 입장 로그 기록
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', '[OPEN] 채팅방 입장', ?, ?, 0)
      `).bind(
        storeResult?.id || 1,
        customerId,
        welcomeMsg,
        Date.now() - startTime
      ).run();
      
      return c.json({ success: true, event: 'open', message_sent: true });
    }
    
    // [friend] 친구 추가 - 감사 메시지 + 쿠폰/혜택 안내
    if (eventType === 'friend') {
      console.log(`[Webhook] FRIEND event - Sending friend add message`);
      
      const storeResult = await env.DB.prepare(
        'SELECT * FROM xivix_stores WHERE is_active = 1 LIMIT 1'
      ).first<Store>();
      
      const friendMsg = generateFriendAddMessage(storeResult);
      await sendTextMessage(env, customerId, friendMsg, storeId);
      
      // [WATCHDOG] 친구 추가 로그 기록
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', '[FRIEND] 친구 추가', ?, ?, 0)
      `).bind(
        storeResult?.id || 1,
        customerId,
        friendMsg,
        Date.now() - startTime
      ).run();
      
      return c.json({ success: true, event: 'friend', message_sent: true });
    }
    
    // [leave] 채팅방 퇴장
    if (eventType === 'leave') {
      console.log(`[Webhook] LEAVE event - Customer left`);
      return c.json({ success: true, event: 'leave' });
    }
    
    // [echo] 파트너(사장님) 메시지 에코 → 외국어 고객에게 번역 발송
    // V3.0.14: 범용 핸들러 (storeId 없음 → DB에서 활성 매장 조회)
    if (eventType === 'echo') {
      const ownerMessage = textContent?.trim();
      if (ownerMessage && env.KV) {
        try {
          // 활성 매장 중 이 고객의 언어 설정이 있는지 확인
          const stores = await env.DB.prepare(
            'SELECT id FROM xivix_stores WHERE is_active = 1'
          ).all<{ id: number }>();
          for (const s of stores.results || []) {
            const savedLang = await env.KV.get(`lang:${s.id}:${customerId}`);
            if (savedLang && savedLang !== 'ko' && ['en', 'ja', 'zh', 'tw', 'th', 'vi', 'mn'].includes(savedLang)) {
              const translated = await translateWithGemini(env, ownerMessage, savedLang);
              if (translated) {
                const flag = LANG_FLAGS[savedLang] || '🌐';
                await sendTextMessage(env, customerId, `${flag} ${translated}\n\n━━━━━━━━━━\n🇰🇷 원문(Original):\n${ownerMessage}`);
                console.log(`[V3.0.14] Echo translated (generic): ko → ${savedLang}`);
              }
              break;
            }
          }
        } catch (echoErr) {
          console.warn('[V3.0.14] Echo translation error (generic):', echoErr);
        }
      }
      return c.json({ success: true, event: 'echo', ignored: true });
    }
    
    // [profile] 프로필 변경 - 무시
    if (eventType === 'profile') {
      return c.json({ success: true, event: 'profile', ignored: true });
    }
    
    // [send] 외 이벤트는 무시
    if (eventType !== 'send') {
      console.log(`[Webhook] Unknown event type: ${eventType}`);
      return c.json({ success: true, event: eventType, ignored: true });
    }
    
    // ============ [Phase 03-22] send 이벤트 처리 ============
    console.log(`[Webhook] SEND event - Processing message`);
    
    // Rate limiting
    const rateLimit = await checkRateLimit(env.KV, customerId, 30, 60);
    if (!rateLimit.allowed) {
      await sendTextMessage(env, customerId, 
        '잠시 후 다시 문의해주세요. (요청이 너무 많습니다)'
      ,
            storeId
          );
      return c.json({ success: true });
    }
    
    // 매장 정보 조회 (기본 매장 사용 - 실제로는 톡톡 ID로 매핑)
    const storeResult = await env.DB.prepare(
      'SELECT * FROM xivix_stores WHERE is_active = 1 LIMIT 1'
    ).first<Store>();
    
    const storeId = storeResult?.id || 1;
    
    // 메시지 처리
    let userMessage = textContent?.text || '';
    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;
    
    // 개인정보 마스킹
    userMessage = maskPersonalInfo(userMessage);
    
    // 이미지 처리
    if (imageContent?.imageUrl) {
      const uploaded = await uploadImageFromUrl(env.R2, imageContent.imageUrl, 'customer');
      if (uploaded) {
        imageBase64 = uploaded.base64;
        imageMimeType = uploaded.mimeType;
      }
    }
    
    // 대화 컨텍스트 조회
    const context = await getConversationContext(env.KV, storeId, customerId);
    
    // V3.0.14: 범용 핸들러에서도 고객 언어 확인
    let genericLang = 'ko';
    if (env.KV) {
      try {
        const savedLang = await env.KV.get(`lang:${storeId}:${customerId}`);
        if (savedLang) genericLang = savedLang;
      } catch {}
    }
    
    // Gemini 메시지 구성
    const messages = buildGeminiMessages(context, userMessage, imageBase64, imageMimeType);
    const systemInstruction = buildSystemInstruction(storeResult ? {
      store_name: storeResult.store_name,
      menu_data: storeResult.menu_data,
      operating_hours: storeResult.operating_hours,
      address: storeResult.address,
      phone: storeResult.phone,
      ai_persona: storeResult.ai_persona,
      ai_tone: storeResult.ai_tone,
      system_prompt: storeResult.system_prompt,
      greeting_message: storeResult.greeting_message
    } : undefined, genericLang); // V3.0.14: 고객 언어 전달
    
    // AI 응답 생성 (스트리밍 또는 일반)
    let aiResponse = '';
    
    // 짧은 메시지는 일반 응답, 긴 메시지는 스트리밍
    if (userMessage.length < 20 && !imageBase64) {
      aiResponse = await getGeminiResponse(env, messages, systemInstruction);
      // V3.0.14: 이중언어 후처리
      aiResponse = await ensureBilingual(env, aiResponse, genericLang);
      aiResponse = formatForMobile(aiResponse);
      await sendSmartMessage(env, customerId, aiResponse, storeId);
    } else {
      // 스트리밍 응답 (청크 단위 전송)
      const chunks: string[] = [];
      let currentChunk = '';
      
      for await (const text of streamGeminiResponse(env, messages, systemInstruction)) {
        currentChunk += text;
        
        // 문장 완료 시 전송
        if (currentChunk.includes('다.') || currentChunk.includes('요.') || 
            currentChunk.includes('니다.') || currentChunk.includes('세요.') ||
            currentChunk.length > 100) {
          chunks.push(currentChunk);
          aiResponse += currentChunk;
          // 마크다운 제거 후 전송
          const cleanChunk = currentChunk.trim()
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/__(.+?)__/g, '$1')
            .replace(/_(.+?)_/g, '$1')
            .replace(/#{1,6}\s?/g, '');
          await sendTextMessage(env, customerId, cleanChunk, storeId);
          currentChunk = '';
          // 타이핑 효과를 위한 짧은 딜레이
          await new Promise(r => setTimeout(r, 100));
        }
      }
      
      // 남은 텍스트 전송
      if (currentChunk.trim()) {
        chunks.push(currentChunk);
        aiResponse += currentChunk;
        const cleanChunk = currentChunk.trim()
          .replace(/\*\*(.+?)\*\*/g, '$1')
          .replace(/\*(.+?)\*/g, '$1')
          .replace(/__(.+?)__/g, '$1')
          .replace(/_(.+?)_/g, '$1')
          .replace(/#{1,6}\s?/g, '');
        await sendTextMessage(env, customerId, cleanChunk, storeId);
      }
    }
    
    // 예약 유도 메시지 (특정 키워드 감지) — ★ V3.0.19: 네이버 예약 ID가 있는 매장만
    const needsReservation = /예약|방문/.test(userMessage);
    if (needsReservation && storeResult && storeResult.naver_reservation_id && !hasCustomPrompt) {
      await sendButtonMessage(env, customerId, 
        '바로 예약하시겠어요?',
        [
          { type: 'LINK', title: '지금 예약하기', linkUrl: `https://booking.naver.com/booking/12/bizes/${storeResult.naver_reservation_id}` },
          { type: 'TEXT', title: '더 알아보기', value: '상담' }
        ]
      ,
            storeId
          );
    }
    
    // 대화 컨텍스트 저장
    await updateConversationContext(env.KV, storeId, customerId, userMessage, aiResponse);
    
    // 로그 저장
    const responseTime = Date.now() - startTime;
    await env.DB.prepare(`
      INSERT INTO xivix_conversation_logs 
      (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).bind(
      storeId,
      customerId,
      imageBase64 ? 'mixed' : 'text',
      String(userMessage || '').slice(0, 500),
      String(aiResponse || '').slice(0, 1000),
      responseTime
    ).run();
    
    return c.json({ 
      success: true, 
      response_time_ms: responseTime 
    });
    
  } catch (error) {
    console.error('Webhook Error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// 테스트용 직접 메시지 처리 (개발용)
webhook.post('/v1/test/chat', async (c) => {
  const startTime = Date.now();
  const env = c.env;
  
  try {
    const { message, customer_id = 'test-user', image_url } = await c.req.json() as {
      message?: string;
      customer_id?: string;
      image_url?: string;
    };
    
    if (!message && !image_url) {
      return c.json({ success: false, error: 'Message or image_url required' }, 400);
    }
    
    // 기본 매장 정보
    const storeResult = await env.DB.prepare(
      'SELECT * FROM xivix_stores WHERE is_active = 1 LIMIT 1'
    ).first<Store>();
    
    const storeId = storeResult?.id || 1;
    
    // 이미지 처리
    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;
    
    if (image_url) {
      const uploaded = await uploadImageFromUrl(env.R2, image_url, 'test');
      if (uploaded) {
        imageBase64 = uploaded.base64;
        imageMimeType = uploaded.mimeType;
      }
    }
    
    // 대화 컨텍스트
    const context = await getConversationContext(env.KV, storeId, customer_id);
    
    // Gemini 호출
    const messages = buildGeminiMessages(context, message || '', imageBase64, imageMimeType);
    const systemInstruction = buildSystemInstruction(storeResult ? {
      store_name: storeResult.store_name,
      menu_data: storeResult.menu_data,
      operating_hours: storeResult.operating_hours,
      address: storeResult.address,
      phone: storeResult.phone,
      ai_persona: storeResult.ai_persona,
      ai_tone: storeResult.ai_tone,
      system_prompt: storeResult.system_prompt,
      greeting_message: storeResult.greeting_message
    } : undefined, 'ko'); // API 테스트는 한국어
    
    const aiResponse = await getGeminiResponse(env, messages, systemInstruction);
    
    // 컨텍스트 저장
    await updateConversationContext(env.KV, storeId, customer_id, message || '[이미지]', aiResponse);
    
    const responseTime = Date.now() - startTime;
    
    return c.json({
      success: true,
      response: aiResponse,
      response_time_ms: responseTime,
      context_messages: context?.messages?.length || 0
    });
    
  } catch (error) {
    console.error('Test Chat Error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export default webhook;
