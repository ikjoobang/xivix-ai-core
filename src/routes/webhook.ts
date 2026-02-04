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
      await sendTextMessage(env, customerId, welcomeMsg);
      
      // 다국어 안내 메시지 (환영 인사 바로 다음 - 무조건 표시)
      const languageMsg = `🌐 영어·중국어·일어 필요하신가요?\n\n` +
        `• English → "English" 입력\n` +
        `• 中文服务 → 请输入 "中文"\n` +
        `• 日本語 → 「日本語」と入力`;
      await sendTextMessage(env, customerId, languageMsg);
      
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
    
    // Rate limiting (KV가 있을 때만)
    if (env.KV) {
      try {
        const rateLimit = await checkRateLimit(env.KV, customerId, 30, 60);
        if (!rateLimit.allowed) {
          await sendTextMessage(env, customerId, 
            '잠시 후 다시 문의해주세요. (요청이 너무 많습니다)'
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
    const consultationType = classifyConsultation(userMessage, businessType, hasImage);
    
    console.log(`[Webhook] Consultation type: ${consultationType}, Business: ${businessType}`);
    
    // ============ [전화 문의 처리] ============
    const phoneInquiryPatterns = /전화.*문의|전화번호|연락처|전화.*알려|전화.*뭐예요|전화.*뭔가요/;
    if (phoneInquiryPatterns.test(userMessage)) {
      const storeName = storeResult?.store_name || '매장';
      const storePhone = storeResult?.phone || '031-235-5726';
      const storeAddress = storeResult?.address || '';
      
      await sendTextMessage(env, customerId, 
        `📞 ${storeName} 연락처 안내\n\n` +
        `☎️ 전화: ${storePhone}\n` +
        (storeAddress ? `📍 주소: ${storeAddress}\n\n` : '\n') +
        `전화가 어려우시면 네이버 톡톡으로 문의해주세요! 😊`
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
      const storePhone = storeResult?.phone || '031-235-5726'; // 매장 전화번호 (고객 안내용)
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
        const smsText = `[${storeName}] 고객 콜백 요청\n\n📞 고객 연락처: ${customerPhone}\n💬 메시지: ${originalMessage.slice(0, 40)}${originalMessage.length > 40 ? '...' : ''}\n\n⏰ ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
        
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
              `조금만 기다려주세요! 😊`
            );
          } else {
            // SMS 전송 실패 시 안내
            await sendTextMessage(env, customerId,
              `알림 전송에 문제가 있었어요. 😥\n\n` +
              `직접 전화해주시면 더 빠르게 상담받으실 수 있어요.\n` +
              `📞 ${storePhone}`
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
            `📞 ${storePhone}`
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
          ]
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
    // 패턴: 공백/하이픈 유연하게 처리 (010 4845 3065, 010-4845-3065, 01048453065 모두 인식)
    const flexiblePhonePattern = /(?:010|011|016|017|018|019)[\s\-]?\d{3,4}[\s\-]?\d{4}/;
    const phoneMatch = originalMessage.match(flexiblePhonePattern);
    
    if (phoneMatch) {
      const storeName2 = storeResult?.store_name || '매장';
      const storePhone2 = storeResult?.phone || '031-235-5726';
      const ownerPhone = storeResult?.owner_phone || storePhone2;
      const customerPhone = phoneMatch[0].replace(/[\s\-]/g, '').replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
      
      // 전화번호를 제외한 메시지 내용 추출
      const messageContent = originalMessage.replace(flexiblePhonePattern, '').trim();
      
      // SMS 내용 구성
      const smsText = `[${storeName2}] 고객 상담 요청\n\n` +
        `📞 연락처: ${customerPhone}\n` +
        `💬 내용: ${messageContent || '상담 요청'}\n\n` +
        `⏰ ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
      
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
          );
        } else {
          await sendTextMessage(env, customerId,
            `전송에 문제가 있었어요 😥\n\n` +
            `직접 전화주시면 바로 상담해드릴게요!\n` +
            `📞 ${storePhone2}`
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
      const storePhone = storeResult?.phone || '031-235-5726'; // 매장 전화번호 (고객 안내용)
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
      const recentContext = context.slice(-3).map(c => c.role === 'user' ? c.content : '').join(' ');
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
            );
          } else {
            await sendTextMessage(env, customerId,
              `알림 전송에 문제가 있었어요.\n` +
              `직접 전화해주시면 더 빠르게 상담받으실 수 있어요.\n` +
              `📞 ${storePhone}`
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
    
    // KV에서 고객 언어 설정 조회
    let customerLang = 'ko'; // 기본값: 한국어
    if (env.KV) {
      try {
        const savedLang = await env.KV.get(`lang:${storeId}:${customerId}`);
        if (savedLang) customerLang = savedLang;
      } catch (e) { console.warn('[Lang] KV read error:', e); }
    }
    
    // 영어 선택/감지 (확장된 패턴)
    const isEnglish = lowerMsg === 'english' || lowerMsg === 'eng' || 
      /^(hi|hello|yes|thanks|thank you|ok|okay|please|help|price|menu|book|location|address|phone).?$/i.test(lowerMsg) ||
      /^(i want|i need|can i|do you|how much|what is)/i.test(lowerMsg);
    
    if (isEnglish) {
      // KV에 언어 설정 저장
      if (env.KV) {
        try { await env.KV.put(`lang:${storeId}:${customerId}`, 'en', { expirationTtl: 86400 }); } 
        catch (e) { console.warn('[Lang] KV write error:', e); }
      }
      customerLang = 'en';
      
      const englishMenu = `🇺🇸 Welcome to ${storeName}!\n\n` +
        `✨ 50% OFF Grand Opening!\n\n` +
        `Please select:\n\n` +
        `1. 🎁 50% OFF Menu & Prices\n` +
        `2. 💡 Skin Analysis\n` +
        `3. 💬 Message to Director\n` +
        `4. 📅 Book Appointment\n` +
        `5. 📍 Location & Contact\n\n` +
        `Type a number!`;
      await sendTextMessage(env, customerId, englishMenu);
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, userMessage, '[lang] English menu', responseTime).run();
      
      return c.json({ success: true, store_id: storeId, language: 'en' });
    }
    
    // 중국어 선택/감지 (확장된 패턴)
    const isChinese = lowerMsg === '中文' || lowerMsg === '中国语' || lowerMsg === 'chinese' ||
      /^(你好|是的?|好的?|谢谢|请问|多少钱|价格|预约|地址|电话|帮忙|可以|我想|我要)/.test(lowerMsg);
    
    if (isChinese) {
      if (env.KV) {
        try { await env.KV.put(`lang:${storeId}:${customerId}`, 'zh', { expirationTtl: 86400 }); } 
        catch (e) { console.warn('[Lang] KV write error:', e); }
      }
      customerLang = 'zh';
      
      const chineseMenu = `🇨🇳 欢迎光临 ${storeName}!\n\n` +
        `✨ 开业优惠 50% 折扣!\n\n` +
        `请选择:\n\n` +
        `1. 🎁 50%折扣菜单和价格\n` +
        `2. 💡 皮肤分析\n` +
        `3. 💬 给院长留言\n` +
        `4. 📅 预约\n` +
        `5. 📍 地址和联系方式\n\n` +
        `请输入数字!`;
      await sendTextMessage(env, customerId, chineseMenu);
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, userMessage, '[lang] Chinese menu', responseTime).run();
      
      return c.json({ success: true, store_id: storeId, language: 'zh' });
    }
    
    // 일본어 선택/감지 (확장된 패턴)
    const isJapanese = lowerMsg === '日本語' || lowerMsg === 'japanese' ||
      /^(こんにちは|はい|お願い|ありがとう|すみません|予約|住所|電話|いくら|メニュー|値段)/.test(lowerMsg) ||
      /[\u3040-\u309F\u30A0-\u30FF]/.test(lowerMsg); // 히라가나/카타카나 감지
    
    if (isJapanese) {
      if (env.KV) {
        try { await env.KV.put(`lang:${storeId}:${customerId}`, 'ja', { expirationTtl: 86400 }); } 
        catch (e) { console.warn('[Lang] KV write error:', e); }
      }
      customerLang = 'ja';
      
      const japaneseMenu = `🇯🇵 ${storeName}へようこそ!\n\n` +
        `✨ オープン記念 50% OFF!\n\n` +
        `選択してください:\n\n` +
        `1. 🎁 50%割引メニュー\n` +
        `2. 💡 肌診断\n` +
        `3. 💬 院長へメッセージ\n` +
        `4. 📅 予約\n` +
        `5. 📍 住所・連絡先\n\n` +
        `番号を入力!`;
      await sendTextMessage(env, customerId, japaneseMenu);
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, userMessage, '[lang] Japanese menu', responseTime).run();
      
      return c.json({ success: true, store_id: storeId, language: 'ja' });
    }

    // ============ [메뉴 번호 선택 처리 - 다국어 지원] ============
    // 환영 인사말의 번호(1~5)는 AI 없이 직접 처리, 저장된 언어로 응답
    const menuNumber = userMessage.trim();
    
    if (menuNumber === '1') {
      // 1. 🎁 오픈 50% 이벤트 메뉴/가격 (다국어 지원)
      let priceResponse = '';
      if (customerLang === 'en') {
        priceResponse = `🎁 50% OFF Grand Opening Menu\n\n` +
          `Sagging/Elasticity\n→ Magic Pot [₩40,000]\n\n` +
          `Exfoliation/Regeneration\n→ Miracle Peeling [₩60,000]\n\n` +
          `Dullness/Brightening\n→ Toning Care [₩35,000]\n\n` +
          `Dryness/Glow\n→ LDM Water Drop [₩35,000]\n\n` +
          `Moisture/Radiance\n→ Derma-S [₩30,000]\n\n` +
          `Sebum/Pores\n→ Aqua Peeling [₩25,000]\n\n` +
          `━━━━━━━━━━\nWould you like to book?`;
      } else if (customerLang === 'zh') {
        priceResponse = `🎁 开业优惠 50%折扣菜单\n\n` +
          `松弛/弹力\n→ 魔力锅 [4万韩元]\n\n` +
          `角质/再生\n→ 奇迹焕肤 [6万韩元]\n\n` +
          `暗沉/美白\n→ 调理护理 [3.5万韩元]\n\n` +
          `干燥/光泽\n→ LDM水滴 [3.5万韩元]\n\n` +
          `保湿/光彩\n→ Derma-S [3万韩元]\n\n` +
          `皮脂/毛孔\n→ 水光焕肤 [2.5万韩元]\n\n` +
          `━━━━━━━━━━\n需要预约吗?`;
      } else if (customerLang === 'ja') {
        priceResponse = `🎁 オープン記念 50%割引メニュー\n\n` +
          `たるみ/弾力\n→ マジックポット [4万ウォン]\n\n` +
          `角質/再生\n→ ミラクルピーリング [6万ウォン]\n\n` +
          `くすみ/美白\n→ トーニングケア [3.5万ウォン]\n\n` +
          `乾燥/艶\n→ LDM水滴 [3.5万ウォン]\n\n` +
          `保湿/輝き\n→ ダーマ-S [3万ウォン]\n\n` +
          `皮脂/毛穴\n→ アクアピーリング [2.5万ウォン]\n\n` +
          `━━━━━━━━━━\nご予約されますか?`;
      } else {
        priceResponse = `🎁 오픈 50% 할인 메뉴\n\n` +
          `처짐/탄력\n→ 매직팟 [4만원]\n\n` +
          `각질/재생\n→ 미라클 필링 [6만원]\n\n` +
          `칙칙함/미백\n→ 토닝 케어 [3.5만원]\n\n` +
          `건조/속광\n→ LDM 물방울 [3.5만원]\n\n` +
          `보습/광채\n→ 더마-S [3만원]\n\n` +
          `피지/모공\n→ 아쿠아필링 [2.5만원]\n\n` +
          `━━━━━━━━━━\n예약 도와드릴까요?`;
      }
      await sendTextMessage(env, customerId, priceResponse);
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, '1', '[menu-1] 가격 안내', responseTime).run();
      
      return c.json({ success: true, store_id: storeId, menu_selected: 1 });
    }
    
    if (menuNumber === '2') {
      // 2. 💡 내 피부 상태 체크 (다국어 지원)
      let skinCheckResponse = '';
      if (customerLang === 'en') {
        skinCheckResponse = `💡 Skin Analysis\n\n` +
          `For accurate diagnosis:\n\n` +
          `📸 Send a [photo] of your concern\n\n` +
          `✍️ Or describe your [concern] in text\n\n` +
          `━━━━━━━━━━\nWe'll analyze with 20 years\nof data expertise! 😊`;
      } else if (customerLang === 'zh') {
        skinCheckResponse = `💡 皮肤分析\n\n` +
          `为了准确诊断:\n\n` +
          `📸 请发送问题部位的[照片]\n\n` +
          `✍️ 或用文字描述您的[问题]\n\n` +
          `━━━━━━━━━━\n我们将用20年的数据\n为您分析! 😊`;
      } else if (customerLang === 'ja') {
        skinCheckResponse = `💡 肌診断\n\n` +
          `正確な診断のため:\n\n` +
          `📸 お悩み部位の[写真]を送信\n\n` +
          `✍️ または[お悩み]をテキストで\n\n` +
          `━━━━━━━━━━\n20年のデータロジックで\n分析いたします! 😊`;
      } else {
        skinCheckResponse = `💡 피부 상태 체크\n\n` +
          `정확한 진단을 위해\n\n` +
          `📸 고민 부위 [사진] 보내주시거나\n\n` +
          `✍️ [고민]을 텍스트로 알려주세요\n\n` +
          `━━━━━━━━━━\n20년 데이터 로직으로\n분석해 드릴게요! 😊`;
      }
      await sendTextMessage(env, customerId, skinCheckResponse);
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, '2', '[menu-2] 피부 체크 안내', responseTime).run();
      
      return c.json({ success: true, store_id: storeId, menu_selected: 2 });
    }
    
    if (menuNumber === '3') {
      // 3. 💬 원장님께 상담 메시지 남기기 (다국어 지원)
      let messageResponse = '';
      if (customerLang === 'en') {
        messageResponse = `💬 Message to Director\n\n` +
          `We'll deliver your message right away!\n\n` +
          `Please leave your contact\nand consultation details 📝\n\n` +
          `━━━━━━━━━━\n` +
          `Example:\n` +
          `+82-10-1234-5678\n` +
          `I want to consult about pore care`;
      } else if (customerLang === 'zh') {
        messageResponse = `💬 给院长留言\n\n` +
          `我们会立即转达您的留言!\n\n` +
          `请留下您的联系方式\n和咨询内容 📝\n\n` +
          `━━━━━━━━━━\n` +
          `示例:\n` +
          `+82-10-1234-5678\n` +
          `想咨询毛孔问题`;
      } else if (customerLang === 'ja') {
        messageResponse = `💬 院長へメッセージ\n\n` +
          `すぐにお伝えします!\n\n` +
          `連絡先と相談内容を\n残してください 📝\n\n` +
          `━━━━━━━━━━\n` +
          `例:\n` +
          `+82-10-1234-5678\n` +
          `毛穴について相談したいです`;
      } else {
        messageResponse = `💬 원장님께 메시지 남기기\n\n` +
          `원장님께 바로 전달해 드릴게요!\n\n` +
          `답변받으실 연락처와 함께\n상담 내용을 남겨주세요 📝\n\n` +
          `━━━━━━━━━━\n` +
          `예시)\n` +
          `010-1234-5678\n` +
          `모공이 고민인데 상담받고 싶어요`;
      }
      await sendTextMessage(env, customerId, messageResponse);
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, '3', '[menu-3] 원장님 메시지 안내', responseTime).run();
      
      return c.json({ success: true, store_id: storeId, menu_selected: 3 });
    }
    
    if (menuNumber === '4') {
      // 4. 📅 오늘 예약 가능한 시간 확인 (다국어 지원)
      if (naverReservationId) {
        const bookingUrl = getNaverBookingUrl(naverReservationId);
        let bookingMsg = '';
        let buttonTitle1 = '';
        let buttonTitle2 = '';
        let selectMsg = '';
        
        if (customerLang === 'en') {
          bookingMsg = `📅 Check Available Times\n\nCheck real-time availability\non Naver Booking!`;
          selectMsg = '🗓️ Select date and time!';
          buttonTitle1 = '📱 Book on Naver';
          buttonTitle2 = '💬 Call Inquiry';
        } else if (customerLang === 'zh') {
          bookingMsg = `📅 查看可预约时间\n\n在Naver预约\n查看实时空闲时间!`;
          selectMsg = '🗓️ 请选择日期和时间!';
          buttonTitle1 = '📱 Naver预约';
          buttonTitle2 = '💬 电话咨询';
        } else if (customerLang === 'ja') {
          bookingMsg = `📅 予約可能時間確認\n\nNaverで\nリアルタイムの空き時間を確認!`;
          selectMsg = '🗓️ 日時を選択してください!';
          buttonTitle1 = '📱 Naver予約';
          buttonTitle2 = '💬 電話問い合わせ';
        } else {
          bookingMsg = `📅 예약 가능 시간 확인\n\n네이버 예약에서\n실시간 빈 시간을 확인하세요!`;
          selectMsg = '🗓️ 날짜와 시간을 선택해주세요!';
          buttonTitle1 = '📱 네이버 예약하기';
          buttonTitle2 = '💬 전화 문의';
        }
        
        await sendTextMessage(env, customerId, bookingMsg);
        await sendButtonMessage(env, customerId, selectMsg, [
          { type: 'LINK', title: buttonTitle1, linkUrl: bookingUrl },
          { type: 'TEXT', title: buttonTitle2, value: '전화번호알려주세요' }
        ]);
      } else {
        let noBookingMsg = '';
        if (customerLang === 'en') {
          noBookingMsg = `📅 Booking Info\n\nReservations by phone\n\n📞 ${storePhone}\n\n━━━━━━━━━━\nShall I connect you?`;
        } else if (customerLang === 'zh') {
          noBookingMsg = `📅 预约指南\n\n可电话预约\n\n📞 ${storePhone}\n\n━━━━━━━━━━\n需要我帮您联系吗?`;
        } else if (customerLang === 'ja') {
          noBookingMsg = `📅 予約案内\n\nお電話で予約可能です\n\n📞 ${storePhone}\n\n━━━━━━━━━━\nお電話おつなぎしますか?`;
        } else {
          noBookingMsg = `📅 예약 안내\n\n예약은 전화로 가능합니다\n\n📞 ${storePhone}\n\n━━━━━━━━━━\n전화 연결해드릴까요?`;
        }
        await sendTextMessage(env, customerId, noBookingMsg);
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
      // 5. 📍 매장 위치 및 전화 연결 (다국어 지원)
      let locationResponse = '';
      if (customerLang === 'en') {
        locationResponse = `📍 ${storeName}\n\n` +
          `🏠 Address\n${storeAddress}\n\n` +
          `📞 Phone\n${storePhone}\n\n` +
          `⏰ Hours\n${operatingHours}\n\n` +
          `━━━━━━━━━━\nWould you like to book?`;
      } else if (customerLang === 'zh') {
        locationResponse = `📍 ${storeName}\n\n` +
          `🏠 地址\n${storeAddress}\n\n` +
          `📞 电话\n${storePhone}\n\n` +
          `⏰ 营业时间\n${operatingHours}\n\n` +
          `━━━━━━━━━━\n需要帮您预约吗?`;
      } else if (customerLang === 'ja') {
        locationResponse = `📍 ${storeName}\n\n` +
          `🏠 住所\n${storeAddress}\n\n` +
          `📞 電話\n${storePhone}\n\n` +
          `⏰ 営業時間\n${operatingHours}\n\n` +
          `━━━━━━━━━━\nご予約しますか?`;
      } else {
        locationResponse = `📍 ${storeName}\n\n` +
          `🏠 주소\n${storeAddress}\n\n` +
          `📞 전화\n${storePhone}\n\n` +
          `⏰ 영업시간\n${operatingHours}\n\n` +
          `━━━━━━━━━━\n방문 예약 도와드릴까요?`;
      }
      await sendTextMessage(env, customerId, locationResponse);
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, '5', '[menu-5] 위치/전화 안내', responseTime).run();
      
      return c.json({ success: true, store_id: storeId, menu_selected: 5 });
    }

    // ============ [키워드 기반 정보 제공 - AI 의존 제거] ============
    const lowerMessage = userMessage.toLowerCase();
    
    // 위치/주소 관련 키워드
    if (/위치|주소|어디|찾아가|오시는.*길|길.*안내/.test(lowerMessage)) {
      const locationResponse = `📍 ${storeName}\n\n` +
        `🏠 주소\n${storeAddress}\n\n` +
        `📞 전화\n${storePhone}\n\n` +
        `⏰ 영업시간\n${storeResult?.operating_hours || '10:00-19:00'}\n\n` +
        `━━━━━━━━━━\n방문 예약 도와드릴까요?`;
      await sendTextMessage(env, customerId, locationResponse);
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, userMessage.slice(0, 100), '[keyword] 위치 안내', responseTime).run();
      
      return c.json({ success: true, store_id: storeId, intent: 'location' });
    }
    
    // 가격/메뉴/이벤트 관련 키워드
    if (/가격|얼마|메뉴|이벤트|할인|50%|오십|50프로/.test(lowerMessage)) {
      const priceResponse = `🎁 오픈 50% 할인 메뉴\n\n` +
        `처짐/탄력\n→ 매직팟 [4만원]\n\n` +
        `각질/재생\n→ 미라클 필링 [6만원]\n\n` +
        `칙칙함/미백\n→ 토닝 케어 [3.5만원]\n\n` +
        `건조/속광\n→ LDM 물방울 [3.5만원]\n\n` +
        `보습/광채\n→ 더마-S [3만원]\n\n` +
        `피지/모공\n→ 아쿠아필링 [2.5만원]\n\n` +
        `━━━━━━━━━━\n예약 도와드릴까요?`;
      await sendTextMessage(env, customerId, priceResponse);
      
      const responseTime = Date.now() - startTime;
      await env.DB.prepare(`
        INSERT INTO xivix_conversation_logs 
        (store_id, customer_id, message_type, customer_message, ai_response, response_time_ms, converted_to_reservation)
        VALUES (?, ?, 'text', ?, ?, ?, 0)
      `).bind(storeId, customerId, userMessage.slice(0, 100), '[keyword] 가격 안내', responseTime).run();
      
      return c.json({ success: true, store_id: storeId, intent: 'price' });
    }
    
    // 영업시간 관련 키워드
    if (/영업.*시간|몇.*시|언제.*까지|오픈|마감|휴무|쉬는.*날/.test(lowerMessage)) {
      const hoursResponse = `⏰ ${storeName} 영업시간\n\n` +
        `${storeResult?.operating_hours || '10:00-19:00'}\n\n` +
        `📞 전화\n${storePhone}\n\n` +
        `━━━━━━━━━━\n예약 도와드릴까요?`;
      await sendTextMessage(env, customerId, hoursResponse);
      
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
          // 네이버 예약 ID가 있으면 바로 예약 버튼 제공
          if (naverReservationId) {
            const bookingUrl = getNaverBookingUrl(naverReservationId);
            console.log(`[Webhook] Booking URL generated: ${bookingUrl}`);
            
            // 예약 안내 메시지
            const textResult = await sendTextMessage(env, customerId, 
              `📅 ${storeName} 예약 안내\n\n` +
              `아래 버튼을 눌러 바로 예약하실 수 있어요!\n` +
              `네이버 예약창에서 원하시는 날짜와 시술을 선택해주세요. 😊`
            );
            console.log(`[Webhook] Text message result:`, JSON.stringify(textResult));
            
            // 예약 버튼 전송
            const buttonResult = await sendButtonMessage(env, customerId,
              '🗓️ 네이버 예약창에서 빈 시간을 확인하고 바로 예약하세요!',
              [
                { type: 'LINK', title: '📱 네이버 예약하기', linkUrl: bookingUrl },
                { type: 'TEXT', title: '💬 전화 문의', value: '전화번호알려주세요' }
              ]
            );
            console.log(`[Webhook] Button message result:`, JSON.stringify(buttonResult));
            
            // 버튼 전송 실패 시 대체 메시지
            if (!buttonResult.success) {
              console.error(`[Webhook] Button send failed: ${buttonResult.resultCode} - ${buttonResult.resultMessage}`);
              // 버튼 대신 링크가 포함된 텍스트 메시지 전송
              await sendTextMessage(env, customerId,
                `📱 네이버 예약하기\n\n` +
                `아래 링크를 클릭하세요:\n${bookingUrl}\n\n` +
                `전화 문의: "전화번호알려주세요"라고 입력해주세요!`
              );
            }
          } else {
            // 네이버 예약 ID가 없으면 안내 메시지
            await sendTextMessage(env, customerId, 
              `${storeName} 예약 문의 감사합니다! 😊\n\n` +
              `예약은 전화 또는 방문으로 가능합니다.\n` +
              `전화번호를 알려드릴까요?`
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
        address: storeResult.address,
        phone: storeResult.phone,
        ai_persona: storeResult.ai_persona,
        ai_tone: storeResult.ai_tone,
        system_prompt: storeResult.system_prompt,
        greeting_message: storeResult.greeting_message
      } : undefined);
      
      // ⭐ 항상 전체 응답을 한 번에 전송 (스트리밍 제거 - 메시지 잘림 방지)
      aiResponse = await getGeminiResponse(env, messages, systemInstruction, 'gemini');
      await sendTextMessage(env, customerId, aiResponse);
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
    
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack || '';
    console.error(`[Webhook] Error for Store ${urlStoreId}:`, errorMessage);
    console.error(`[Webhook] Error stack:`, errorStack);
    return c.json({ 
      success: false, 
      error: 'Internal server error', 
      store_id: urlStoreId,
      error_message: errorMessage.slice(0, 200)
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
      address: storeResult.address,
      phone: storeResult.phone,
      ai_persona: storeResult.ai_persona,
      ai_tone: storeResult.ai_tone,
      system_prompt: storeResult.system_prompt,
      greeting_message: storeResult.greeting_message
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
      address: storeResult.address,
      phone: storeResult.phone,
      ai_persona: storeResult.ai_persona,
      ai_tone: storeResult.ai_tone,
      system_prompt: storeResult.system_prompt,
      greeting_message: storeResult.greeting_message
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
