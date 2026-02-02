// XIVIX AI Core V1.0 - 네이버 톡톡 Webhook Handler
// 실시간 메시지 수신 및 AI 응답 처리
// [XIVIX_TOTAL_AUTOMATION] Phase 03 - TalkTalk Binding (21~30)

import { Hono } from 'hono';
import type { Env, Store } from '../types';
import { 
  parseWebhookMessage, 
  maskPersonalInfo, 
  sendTextMessage,
  sendButtonMessage 
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

// ============ [XIVIX WATCHDOG] 이벤트 타입 정의 ============
type NaverTalkTalkEventType = 'open' | 'leave' | 'friend' | 'send' | 'echo' | 'profile';

// ============ [매장별 환영 메시지 생성] ============
function generateWelcomeMessage(store: Store | null): string {
  if (!store) {
    return '안녕하세요! XIVIX AI 상담사입니다. 무엇을 도와드릴까요?';
  }
  
  const storeName = store.store_name || '매장';
  const greeting = store.greeting_message || `${storeName}에 오신 것을 환영합니다!`;
  const aiTone = store.ai_tone || 'friendly';
  
  // 업종별 환영 메시지 커스터마이징
  const businessType = store.business_type || 'OTHER';
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
webhook.post('/v1/naver/callback/:storeId', async (c) => {
  const urlStoreId = parseInt(c.req.param('storeId'), 10);
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
    
    // ============ URL에서 받은 storeId로 매장 조회 ============
    const storeResult = await env.DB.prepare(
      'SELECT * FROM xivix_stores WHERE id = ? AND is_active = 1'
    ).bind(urlStoreId).first<Store>();
    
    if (!storeResult) {
      console.log(`[Webhook] Store not found for ID: ${urlStoreId}`);
      // 매장이 없어도 기본 응답 처리
    }
    
    const storeId = storeResult?.id || urlStoreId;
    
    // ============ [Phase 03-21] 이벤트 타입별 처리 ============
    
    // [open] 채팅방 입장 - 매장별 환영 메시지
    if (eventType === 'open') {
      console.log(`[Webhook] OPEN event - Sending welcome message for Store ${storeId}`);
      
      const welcomeMsg = generateWelcomeMessage(storeResult);
      await sendTextMessage(env, customerId, welcomeMsg);
      
      // [WATCHDOG] 입장 로그 기록
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'system', '[OPEN] 채팅방 입장', ?, ?, 0)
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
      await sendTextMessage(env, customerId, friendMsg);
      
      // [WATCHDOG] 친구 추가 로그 기록
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'system', '[FRIEND] 친구 추가', ?, ?, 0)
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
    
    // [echo] 본인 메시지 에코 - 무시
    if (eventType === 'echo') {
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
    
    // Rate limiting
    const rateLimit = await checkRateLimit(env.KV, customerId, 30, 60);
    if (!rateLimit.allowed) {
      await sendTextMessage(env, customerId, 
        '잠시 후 다시 문의해주세요. (요청이 너무 많습니다)'
      );
      return c.json({ success: true, store_id: storeId });
    }
    
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
    
    // ============ AI Router: 상담 유형별 처리 ============
    // 전문 상담 (의료/법률/보험): GPT-4o → Gemini Pro 검증
    // 일반 문의: Gemini Flash (빠른 응답)
    
    const businessType = storeResult?.business_type || 'OTHER';
    const hasImage = !!(imageBase64 && imageMimeType);
    const consultationType = classifyConsultation(userMessage, businessType, hasImage);
    
    console.log(`[Webhook] Consultation type: ${consultationType}, Business: ${businessType}`);
    
    let aiResponse = '';
    let aiModel = '';
    let verified = false;
    
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
      
      // 응답 전송
      await sendTextMessage(env, customerId, aiResponse);
      
      console.log(`[Webhook] AI Response (${aiModel}, verified: ${verified}): ${aiResponse.slice(0, 50)}...`);
    } 
    // 일반 문의: Gemini Flash (짧은 메시지는 일반, 긴 메시지는 스트리밍)
    else {
      console.log('[Webhook] Using Gemini Flash for simple consultation');
      aiModel = 'gemini-flash';
      
      // Gemini 메시지 구성
      const messages = buildGeminiMessages(context, userMessage, imageBase64, imageMimeType);
      const systemInstruction = buildSystemInstruction(storeResult ? {
        store_name: storeResult.store_name,
        menu_data: storeResult.menu_data,
        operating_hours: storeResult.operating_hours,
        ai_persona: storeResult.ai_persona,
        ai_tone: storeResult.ai_tone
      } : undefined);
      
      // 짧은 메시지는 일반 응답, 긴 메시지는 스트리밍
      if (userMessage.length < 20 && !imageBase64) {
        aiResponse = await getGeminiResponse(env, messages, systemInstruction, 'gemini');
        await sendTextMessage(env, customerId, aiResponse);
      } else {
        // 스트리밍 응답 (청크 단위 전송)
        const chunks: string[] = [];
        let currentChunk = '';
        
        for await (const text of streamGeminiResponse(env, messages, systemInstruction, 'gemini')) {
          currentChunk += text;
          
          // 문장 완료 시 전송
          if (currentChunk.includes('다.') || currentChunk.includes('요.') || 
              currentChunk.includes('니다.') || currentChunk.includes('세요.') ||
              currentChunk.length > 100) {
            chunks.push(currentChunk);
            aiResponse += currentChunk;
            await sendTextMessage(env, customerId, currentChunk.trim());
            currentChunk = '';
            // 타이핑 효과를 위한 짧은 딜레이
            await new Promise(r => setTimeout(r, 100));
          }
        }
        
        // 남은 텍스트 전송
        if (currentChunk.trim()) {
          chunks.push(currentChunk);
          aiResponse += currentChunk;
          await sendTextMessage(env, customerId, currentChunk.trim());
        }
        
        aiModel = 'gemini-flash-stream';
      }
    }
    
    // 예약 유도 메시지 (특정 키워드 감지)
    const needsReservation = /예약|방문|언제|시간|가격/.test(userMessage);
    if (needsReservation && storeResult?.naver_reservation_id) {
      await sendButtonMessage(env, customerId, 
        '바로 예약하시겠어요?',
        [
          { type: 'LINK', title: '지금 예약하기', linkUrl: `https://booking.naver.com/booking/12/bizes/${storeResult.naver_reservation_id}` },
          { type: 'TEXT', title: '더 알아보기', value: '상담' }
        ]
      );
    }
    
    // 대화 컨텍스트 저장
    await updateConversationContext(env.KV, storeId, customerId, userMessage, aiResponse);
    
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
      `[${aiModel}${verified ? ',verified' : ''}] ${aiResponse}`.slice(0, 1000),
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
    
  } catch (error) {
    console.error(`[Webhook] Error for Store ${urlStoreId}:`, error);
    return c.json({ success: false, error: 'Internal server error', store_id: urlStoreId }, 500);
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
      await sendTextMessage(env, customerId, welcomeMsg);
      
      // [WATCHDOG] 입장 로그 기록
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'system', '[OPEN] 채팅방 입장', ?, ?, 0)
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
      await sendTextMessage(env, customerId, friendMsg);
      
      // [WATCHDOG] 친구 추가 로그 기록
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'system', '[FRIEND] 친구 추가', ?, ?, 0)
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
    
    // [echo] 본인 메시지 에코 - 무시
    if (eventType === 'echo') {
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
    
    // Gemini 메시지 구성
    const messages = buildGeminiMessages(context, userMessage, imageBase64, imageMimeType);
    const systemInstruction = buildSystemInstruction(storeResult ? {
      store_name: storeResult.store_name,
      menu_data: storeResult.menu_data,
      operating_hours: storeResult.operating_hours,
      ai_persona: storeResult.ai_persona,
      ai_tone: storeResult.ai_tone
    } : undefined);
    
    // AI 응답 생성 (스트리밍 또는 일반)
    let aiResponse = '';
    
    // 짧은 메시지는 일반 응답, 긴 메시지는 스트리밍
    if (userMessage.length < 20 && !imageBase64) {
      aiResponse = await getGeminiResponse(env, messages, systemInstruction);
      await sendTextMessage(env, customerId, aiResponse);
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
          await sendTextMessage(env, customerId, currentChunk.trim());
          currentChunk = '';
          // 타이핑 효과를 위한 짧은 딜레이
          await new Promise(r => setTimeout(r, 100));
        }
      }
      
      // 남은 텍스트 전송
      if (currentChunk.trim()) {
        chunks.push(currentChunk);
        aiResponse += currentChunk;
        await sendTextMessage(env, customerId, currentChunk.trim());
      }
    }
    
    // 예약 유도 메시지 (특정 키워드 감지)
    const needsReservation = /예약|방문|언제|시간|가격/.test(userMessage);
    if (needsReservation && storeResult) {
      await sendButtonMessage(env, customerId, 
        '바로 예약하시겠어요?',
        [
          { type: 'LINK', title: '지금 예약하기', linkUrl: `https://booking.naver.com/booking/12/bizes/${storeResult.naver_reservation_id}` },
          { type: 'TEXT', title: '더 알아보기', value: '상담' }
        ]
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
      userMessage.slice(0, 500),
      aiResponse.slice(0, 1000),
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
      ai_persona: storeResult.ai_persona,
      ai_tone: storeResult.ai_tone
    } : undefined);
    
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
