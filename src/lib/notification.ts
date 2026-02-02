// XIVIX AI Core V2.0 - Notification Service
// SMS (Solapi) + Email (Resend) 알림 통합 모듈

import type { Env } from '../types';
import { createHmac } from 'node:crypto';

// ============ Types ============

interface SolapiResponse {
  groupId?: string;
  messageId?: string;
  statusCode?: string;
  statusMessage?: string;
  to?: string;
  errorCode?: string;
  errorMessage?: string;
}

interface NotificationResult {
  success: boolean;
  channel: 'sms' | 'email' | 'both';
  smsResult?: {
    success: boolean;
    messageId?: string;
    error?: string;
  };
  emailResult?: {
    success: boolean;
    messageId?: string;
    error?: string;
  };
  error?: string;
}

interface OnboardingNotificationData {
  storeName: string;
  ownerName: string;
  ownerPhone: string;
  businessType: string;
  storeId: number;
}

// ============ Solapi SMS ============

// Solapi API 인증 헤더 생성
function generateSolapiAuth(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString();
  const salt = Math.random().toString(36).substring(2, 15);
  const signature = createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex');
  
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

// SMS 발송
async function sendSMS(
  env: Env,
  to: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // 테스트 모드 체크
  if (env.IS_TEST_MODE === 'true') {
    console.log('[XIVIX] SMS 테스트 모드 - 실제 발송 차단');
    console.log(`[XIVIX] 수신: ${to}, 내용: ${text}`);
    return { 
      success: true, 
      messageId: 'TEST_MODE_' + Date.now(),
      error: undefined
    };
  }
  
  // 필수 환경변수 체크
  if (!env.SOLAPI_API_KEY || !env.SOLAPI_API_SECRET || !env.SOLAPI_SENDER_PHONE) {
    console.error('[XIVIX] Solapi 환경변수 미설정');
    return { 
      success: false, 
      error: 'Solapi API 설정이 필요합니다.' 
    };
  }
  
  try {
    const auth = generateSolapiAuth(env.SOLAPI_API_KEY, env.SOLAPI_API_SECRET);
    
    // 전화번호 정규화 (하이픈 제거)
    const normalizedTo = to.replace(/-/g, '');
    const normalizedFrom = env.SOLAPI_SENDER_PHONE.replace(/-/g, '');
    
    // 한글 바이트 계산 (한글 2바이트, 영문/숫자 1바이트)
    const textBytes = Buffer.from(text, 'utf-8').length;
    const messageType = textBytes > 90 ? 'LMS' : 'SMS';
    
    console.log(`[XIVIX] 메시지 타입: ${messageType} (${textBytes} bytes)`);
    
    const response = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          to: normalizedTo,
          from: normalizedFrom,
          text: text,
          type: messageType,  // 90바이트 초과 시 LMS 자동 전환
          ...(messageType === 'LMS' && { subject: '[XIVIX AI]' })
        }
      })
    });
    
    const result = await response.json() as SolapiResponse;
    
    if (response.ok && result.groupId) {
      console.log(`[XIVIX] SMS 발송 성공: ${result.groupId}`);
      return { 
        success: true, 
        messageId: result.groupId 
      };
    } else {
      console.error('[XIVIX] SMS 발송 실패:', result);
      return { 
        success: false, 
        error: result.errorMessage || 'SMS 발송 실패' 
      };
    }
  } catch (error) {
    console.error('[XIVIX] SMS 발송 에러:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'SMS 발송 중 오류 발생' 
    };
  }
}

// LMS 발송 (장문)
async function sendLMS(
  env: Env,
  to: string,
  text: string,
  subject?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // 테스트 모드 체크
  if (env.IS_TEST_MODE === 'true') {
    console.log('[XIVIX] LMS 테스트 모드 - 실제 발송 차단');
    console.log(`[XIVIX] 수신: ${to}, 제목: ${subject}, 내용: ${text}`);
    return { 
      success: true, 
      messageId: 'TEST_MODE_LMS_' + Date.now() 
    };
  }
  
  if (!env.SOLAPI_API_KEY || !env.SOLAPI_API_SECRET || !env.SOLAPI_SENDER_PHONE) {
    return { success: false, error: 'Solapi API 설정이 필요합니다.' };
  }
  
  try {
    const auth = generateSolapiAuth(env.SOLAPI_API_KEY, env.SOLAPI_API_SECRET);
    const normalizedTo = to.replace(/-/g, '');
    const normalizedFrom = env.SOLAPI_SENDER_PHONE.replace(/-/g, '');
    
    const response = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          to: normalizedTo,
          from: normalizedFrom,
          text: text,
          subject: subject || 'XIVIX AI 알림',
          type: 'LMS'
        }
      })
    });
    
    const result = await response.json() as SolapiResponse;
    
    if (response.ok && result.groupId) {
      return { success: true, messageId: result.groupId };
    } else {
      return { success: false, error: result.errorMessage || 'LMS 발송 실패' };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'LMS 발송 중 오류 발생' 
    };
  }
}

// ============ Resend Email ============

interface ResendResponse {
  id?: string;
  error?: {
    message: string;
    name: string;
  };
}

async function sendEmail(
  env: Env,
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // 테스트 모드 체크
  if (env.IS_TEST_MODE === 'true') {
    console.log('[XIVIX] Email 테스트 모드 - 실제 발송 차단');
    console.log(`[XIVIX] 수신: ${to}, 제목: ${subject}`);
    return { 
      success: true, 
      messageId: 'TEST_MODE_EMAIL_' + Date.now() 
    };
  }
  
  if (!env.RESEND_API_KEY) {
    console.error('[XIVIX] Resend API Key 미설정');
    return { success: false, error: 'Resend API Key가 필요합니다.' };
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'XIVIX AI <noreply@xivix.kr>',  // Resend 인증 도메인 필요
        to: [to],
        subject: subject,
        html: htmlContent,
        text: textContent || subject
      })
    });
    
    const result = await response.json() as ResendResponse;
    
    if (response.ok && result.id) {
      console.log(`[XIVIX] Email 발송 성공: ${result.id}`);
      return { success: true, messageId: result.id };
    } else {
      console.error('[XIVIX] Email 발송 실패:', result);
      return { 
        success: false, 
        error: result.error?.message || 'Email 발송 실패' 
      };
    }
  } catch (error) {
    console.error('[XIVIX] Email 발송 에러:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Email 발송 중 오류 발생' 
    };
  }
}

// ============ 연동 요청 알림 (메인 함수) ============

export async function notifyMasterOnboarding(
  env: Env,
  data: OnboardingNotificationData
): Promise<NotificationResult> {
  const { storeName, ownerName, ownerPhone, businessType, storeId } = data;
  
  const result: NotificationResult = {
    success: false,
    channel: 'both',
    smsResult: undefined,
    emailResult: undefined
  };
  
  // 마스터 연락처
  const masterPhone = env.MASTER_PHONE || '010-4845-3065';
  const masterEmail = env.MASTER_EMAIL || 'xivix.kr@gmail.com';
  
  // 1. SMS 발송
  const smsText = `[XIVIX AI] 새 연동 요청
매장: ${storeName}
사장님: ${ownerName}
연락처: ${ownerPhone}
업종: ${businessType}
👉 마스터 대시보드에서 확인하세요`;

  result.smsResult = await sendSMS(env, masterPhone, smsText);
  
  // 2. Email 발송
  const emailSubject = `[XIVIX AI] 새 연동 요청 - ${storeName}`;
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Pretendard', -apple-system, sans-serif; background: #1a1a1a; color: #fff; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: #2a2a2a; border-radius: 12px; padding: 24px; }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; color: #d4af37; }
    .badge { display: inline-block; background: #d4af37; color: #000; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-top: 8px; }
    .info-card { background: #333; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #444; }
    .info-row:last-child { border-bottom: none; }
    .label { color: #888; }
    .value { color: #fff; font-weight: 500; }
    .cta-button { display: block; background: linear-gradient(135deg, #d4af37, #b8962f); color: #000; text-align: center; padding: 14px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">XIVIX AI Core</div>
      <div class="badge">🔔 새 연동 요청</div>
    </div>
    
    <div class="info-card">
      <div class="info-row">
        <span class="label">매장명</span>
        <span class="value">${storeName}</span>
      </div>
      <div class="info-row">
        <span class="label">사장님</span>
        <span class="value">${ownerName}</span>
      </div>
      <div class="info-row">
        <span class="label">연락처</span>
        <span class="value">${ownerPhone}</span>
      </div>
      <div class="info-row">
        <span class="label">업종</span>
        <span class="value">${businessType}</span>
      </div>
      <div class="info-row">
        <span class="label">요청 ID</span>
        <span class="value">#${storeId}</span>
      </div>
    </div>
    
    <a href="https://xivix-ai-core.pages.dev/master" class="cta-button">
      마스터 대시보드에서 확인하기 →
    </a>
    
    <div class="footer">
      XIVIX AI Core V2.0<br>
      © 2026 XIVIX. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;
  
  const emailText = `
[XIVIX AI] 새 연동 요청

매장명: ${storeName}
사장님: ${ownerName}
연락처: ${ownerPhone}
업종: ${businessType}
요청 ID: #${storeId}

마스터 대시보드에서 확인하세요:
https://xivix-ai-core.pages.dev/master
  `;
  
  result.emailResult = await sendEmail(env, masterEmail, emailSubject, emailHtml, emailText);
  
  // 결과 판정
  result.success = result.smsResult?.success || result.emailResult?.success || false;
  
  if (result.smsResult?.success && result.emailResult?.success) {
    result.channel = 'both';
  } else if (result.smsResult?.success) {
    result.channel = 'sms';
  } else if (result.emailResult?.success) {
    result.channel = 'email';
  }
  
  console.log(`[XIVIX] 마스터 알림 발송 결과:`, {
    success: result.success,
    channel: result.channel,
    sms: result.smsResult?.success,
    email: result.emailResult?.success
  });
  
  return result;
}

// ============ 기타 알림 함수들 ============

// 원클릭 세팅 완료 알림 (사장님에게)
export async function notifyOwnerSetupComplete(
  env: Env,
  ownerPhone: string,
  storeName: string
): Promise<{ success: boolean; error?: string }> {
  const text = `[XIVIX AI] ${storeName} 세팅 완료!
AI 챗봇이 활성화되었습니다.
네이버 톡톡으로 고객 응대를 시작합니다.
👉 문의: 010-4845-3065`;

  return sendSMS(env, ownerPhone, text);
}

// 예약 확정 알림 (고객에게)
export async function notifyReservationConfirmed(
  env: Env,
  customerPhone: string,
  storeName: string,
  reservationDate: string,
  reservationTime: string,
  serviceName?: string
): Promise<{ success: boolean; error?: string }> {
  const text = `[${storeName}] 예약 확정
📅 ${reservationDate} ${reservationTime}
${serviceName ? `서비스: ${serviceName}\n` : ''}방문을 기다리겠습니다!`;

  return sendSMS(env, customerPhone, text);
}

// 예약 리마인더 알림
export async function notifyReservationReminder(
  env: Env,
  customerPhone: string,
  storeName: string,
  reservationDate: string,
  reservationTime: string,
  hoursBeforeText: string
): Promise<{ success: boolean; error?: string }> {
  const text = `[${storeName}] 예약 알림
📅 ${reservationDate} ${reservationTime}
${hoursBeforeText} 예정입니다.
방문 예정대로 괜찮으신가요?`;

  return sendSMS(env, customerPhone, text);
}

// Export individual functions for testing
export { sendSMS, sendLMS, sendEmail };
