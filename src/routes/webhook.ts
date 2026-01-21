// XIVIX AI Core V1.0 - 네이버 톡톡 Webhook Handler
// 실시간 메시지 수신 및 AI 응답 처리

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

const webhook = new Hono<{ Bindings: Env }>();

// Webhook verification (GET)
webhook.get('/v1/naver/callback', (c) => {
  // 네이버 톡톡 Webhook 인증
  return c.text('OK', 200);
});

// Webhook message handler (POST)
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
    
    // 이벤트 타입 처리
    if (event === 'open') {
      // 채팅방 입장 - 환영 메시지
      await sendTextMessage(env, customerId, 
        '안녕하세요, XIVIX AI 상담사입니다. 무엇을 도와드릴까요?'
      );
      return c.json({ success: true });
    }
    
    if (event === 'leave') {
      // 채팅방 퇴장
      return c.json({ success: true });
    }
    
    if (event !== 'send') {
      return c.json({ success: true });
    }
    
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
      'SELECT * FROM stores WHERE is_active = 1 LIMIT 1'
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
      INSERT INTO conversation_logs 
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
      'SELECT * FROM stores WHERE is_active = 1 LIMIT 1'
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
