// XIVIX AI Core - 네이버 톡톡 API 연동 라이브러리
// 네이버 톡톡 파트너센터 API를 통한 메시지 발송

import type { Env } from '../types';

// 네이버 톡톡 API 기본 URL
const TALKTALK_API_BASE = 'https://gw.talk.naver.com/chatbot/v1';

// 톡톡 메시지 타입
export interface TalkTalkTextMessage {
  event: 'send';
  user: string;
  textContent: {
    text: string;
  };
}

export interface TalkTalkImageMessage {
  event: 'send';
  user: string;
  imageContent: {
    imageUrl: string;
  };
}

export interface TalkTalkCompositeMessage {
  event: 'send';
  user: string;
  compositeContent: {
    compositeList: CompositeItem[];
  };
}

export interface CompositeItem {
  title?: string;
  description?: string;
  image?: {
    imageUrl: string;
  };
  elementList?: {
    type: 'TEXT' | 'BUTTON' | 'IMAGE';
    data?: {
      title?: string;
      description?: string;
      subDescription?: string;
      imageUrl?: string;
      buttonType?: 'TEXT' | 'LINK';
      buttonText?: string;
      link?: {
        pc?: string;
        mobile?: string;
      };
    };
  };
  buttonList?: {
    type: 'TEXT' | 'LINK' | 'PAY' | 'OPTION';
    data: {
      title: string;
      code?: string;
      url?: string;        // LINK 버튼용 PC URL
      mobileUrl?: string;  // LINK 버튼용 모바일 URL
      payInfo?: Record<string, unknown>;
    };
  }[];
}

// 톡톡 API 응답
export interface TalkTalkResponse {
  success: boolean;
  resultCode: string;
  resultMessage?: string;
}

// 톡톡 설정 정보
export interface TalkTalkConfig {
  storeId: number;
  partnerId?: string;
  accountId?: string;
  accessToken?: string;
  webhookVerified: boolean;
}

/**
 * 네이버 톡톡 API 클라이언트
 */
export class NaverTalkTalkClient {
  private accessToken: string;
  private storeId: number;

  constructor(accessToken: string, storeId: number) {
    this.accessToken = accessToken;
    this.storeId = storeId;
  }

  /**
   * 텍스트 메시지 발송
   */
  async sendTextMessage(userId: string, text: string): Promise<TalkTalkResponse> {
    const message: TalkTalkTextMessage = {
      event: 'send',
      user: userId,
      textContent: { text }
    };

    return this.sendMessage(message);
  }

  /**
   * 이미지 메시지 발송
   */
  async sendImageMessage(userId: string, imageUrl: string): Promise<TalkTalkResponse> {
    const message: TalkTalkImageMessage = {
      event: 'send',
      user: userId,
      imageContent: { imageUrl }
    };

    return this.sendMessage(message);
  }

  /**
   * 버튼이 포함된 복합 메시지 발송
   */
  async sendCompositeMessage(
    userId: string,
    title: string,
    description: string,
    buttons: { title: string; link?: string; code?: string }[]
  ): Promise<TalkTalkResponse> {
    const buttonList = buttons.map(btn => ({
      type: btn.link ? 'LINK' as const : 'TEXT' as const,
      data: {
        title: btn.title,
        ...(btn.link ? { url: btn.link, mobileUrl: btn.link } : { code: btn.code || btn.title })
      }
    }));

    const message: TalkTalkCompositeMessage = {
      event: 'send',
      user: userId,
      compositeContent: {
        compositeList: [{
          title,
          description,
          buttonList
        }]
      }
    };

    return this.sendMessage(message);
  }

  /**
   * 예약 확인 메시지 발송
   */
  async sendReservationConfirmMessage(
    userId: string,
    storeName: string,
    reservationDate: string,
    reservationTime: string,
    serviceName?: string
  ): Promise<TalkTalkResponse> {
    const dateObj = new Date(reservationDate);
    const formattedDate = dateObj.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });

    const text = `🎉 예약이 확정되었습니다!

📍 ${storeName}
📅 ${formattedDate} ${reservationTime}
${serviceName ? `💇 ${serviceName}` : ''}

방문 전 변경사항이 있으시면 미리 말씀해주세요.
감사합니다! 😊`;

    return this.sendTextMessage(userId, text);
  }

  /**
   * 예약 리마인더 메시지 발송
   */
  async sendReservationReminderMessage(
    userId: string,
    storeName: string,
    reservationDate: string,
    reservationTime: string,
    hoursBeforeText: string
  ): Promise<TalkTalkResponse> {
    const dateObj = new Date(reservationDate);
    const formattedDate = dateObj.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });

    const text = `⏰ 예약 알림

안녕하세요! ${storeName}입니다.
${hoursBeforeText} 예약이 있으신 것 잊지 않으셨죠?

📅 ${formattedDate} ${reservationTime}

방문을 기다리고 있겠습니다! 😊`;

    return this.sendTextMessage(userId, text);
  }

  /**
   * 환영 메시지 발송
   */
  async sendWelcomeMessage(userId: string, storeName: string, greeting?: string): Promise<TalkTalkResponse> {
    const text = greeting || `안녕하세요! ${storeName}입니다. 😊

무엇을 도와드릴까요?
- 예약 문의
- 가격/메뉴 안내
- 위치/영업시간 확인

편하게 말씀해주세요!`;

    return this.sendTextMessage(userId, text);
  }

  /**
   * 메시지 발송 (내부 메서드)
   */
  private async sendMessage(message: TalkTalkTextMessage | TalkTalkImageMessage | TalkTalkCompositeMessage): Promise<TalkTalkResponse> {
    try {
      const response = await fetch(`${TALKTALK_API_BASE}/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TalkTalk] API Error: ${response.status}`, errorText);
        return {
          success: false,
          resultCode: `HTTP_${response.status}`,
          resultMessage: errorText
        };
      }

      const result = await response.json() as TalkTalkResponse;
      
      // 네이버 톡톡 API는 성공 시 빈 응답 또는 success 필드 반환
      return {
        success: result.success !== false && result.resultCode !== 'FAIL',
        resultCode: result.resultCode || 'OK',
        resultMessage: result.resultMessage
      };
    } catch (error: any) {
      console.error('[TalkTalk] Send message error:', error);
      return {
        success: false,
        resultCode: 'NETWORK_ERROR',
        resultMessage: error.message
      };
    }
  }
}

/**
 * 매장의 톡톡 설정 조회
 */
export async function getTalkTalkConfig(db: D1Database, storeId: number): Promise<TalkTalkConfig | null> {
  const config = await db.prepare(`
    SELECT * FROM xivix_naver_talktalk_config WHERE store_id = ?
  `).bind(storeId).first<{
    store_id: number;
    partner_id?: string;
    account_id?: string;
    access_token?: string;
    webhook_verified: number;
  }>();

  if (!config) return null;

  return {
    storeId: config.store_id,
    partnerId: config.partner_id,
    accountId: config.account_id,
    accessToken: config.access_token,
    webhookVerified: config.webhook_verified === 1
  };
}

/**
 * 매장의 톡톡 설정 저장/업데이트
 */
export async function saveTalkTalkConfig(
  db: D1Database,
  storeId: number,
  config: Partial<TalkTalkConfig>
): Promise<void> {
  const existing = await getTalkTalkConfig(db, storeId);

  if (existing) {
    await db.prepare(`
      UPDATE xivix_naver_talktalk_config SET
        partner_id = COALESCE(?, partner_id),
        account_id = COALESCE(?, account_id),
        access_token = COALESCE(?, access_token),
        webhook_verified = COALESCE(?, webhook_verified),
        updated_at = datetime('now')
      WHERE store_id = ?
    `).bind(
      config.partnerId || null,
      config.accountId || null,
      config.accessToken || null,
      config.webhookVerified !== undefined ? (config.webhookVerified ? 1 : 0) : null,
      storeId
    ).run();
  } else {
    await db.prepare(`
      INSERT INTO xivix_naver_talktalk_config (store_id, partner_id, account_id, access_token, webhook_verified)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      storeId,
      config.partnerId || null,
      config.accountId || null,
      config.accessToken || null,
      config.webhookVerified ? 1 : 0
    ).run();
  }
}

/**
 * 매장용 톡톡 클라이언트 생성
 */
export async function createTalkTalkClient(
  db: D1Database,
  storeId: number
): Promise<NaverTalkTalkClient | null> {
  const config = await getTalkTalkConfig(db, storeId);

  if (!config || !config.accessToken) {
    console.warn(`[TalkTalk] No access token for store ${storeId}`);
    return null;
  }

  return new NaverTalkTalkClient(config.accessToken, storeId);
}

/**
 * 테스트 모드 체크
 */
export function isTestMode(env: Env): boolean {
  return env.IS_TEST_MODE === 'true';
}

// ============ Webhook 파싱 및 유틸리티 함수들 ============

/**
 * 웹훅 메시지 파싱
 */
export interface ParsedWebhookMessage {
  event: 'send' | 'open' | 'leave' | 'friend' | 'echo' | 'profile';
  user: string;
  textContent?: { text: string };
  imageContent?: { imageUrl: string };
  options?: { inflow?: string; referer?: string };
}

export function parseWebhookMessage(body: any): ParsedWebhookMessage | null {
  if (!body || !body.event || !body.user) {
    console.warn('[TalkTalk] Invalid webhook body:', body);
    return null;
  }

  // user가 객체인 경우 id를 추출, 문자열인 경우 그대로 사용
  const userId = typeof body.user === 'object' ? body.user.id : body.user;
  
  return {
    event: body.event,
    user: userId,
    textContent: body.textContent,
    imageContent: body.imageContent,
    options: body.options
  };
}

/**
 * 개인정보 마스킹
 */
export function maskPersonalInfo(text: string): string {
  // 전화번호 마스킹 (010-1234-5678 → 010-****-5678)
  text = text.replace(/(\d{3})[-.\s]?(\d{4})[-.\s]?(\d{4})/g, '$1-****-$3');
  
  // 이메일 마스킹 (test@example.com → t***@example.com)
  text = text.replace(/([a-zA-Z0-9])[a-zA-Z0-9._%+-]*(@[a-zA-Z0-9.-]+)/g, '$1***$2');
  
  // 주민번호 마스킹
  text = text.replace(/(\d{6})[-\s]?(\d{7})/g, '$1-*******');
  
  return text;
}

/**
 * 텍스트 메시지 발송 (Env 기반 - 기존 webhook 호환)
 */
export async function sendTextMessage(
  env: Env,
  userId: string,
  text: string,
  storeId?: number
): Promise<TalkTalkResponse> {
  // 테스트 모드 체크
  if (isTestMode(env)) {
    console.log(`[TalkTalk] TEST MODE - Text to ${userId}: ${text.substring(0, 50)}...`);
    return { success: true, resultCode: 'TEST_MODE' };
  }

  // ⭐ 긴 메시지 자동 분할 (네이버 톡톡 텍스트 제한 ~1000자)
  const MAX_LENGTH = 900;
  if (text.length > MAX_LENGTH) {
    console.log(`[TalkTalk] Long message detected (${text.length} chars), splitting...`);
    const chunks = splitMessage(text, MAX_LENGTH);
    let lastResult: TalkTalkResponse = { success: true, resultCode: 'OK' };
    for (let i = 0; i < chunks.length; i++) {
      // 분할 전송 간 딜레이 (톡톡 API 부하 방지)
      if (i > 0) await new Promise(r => setTimeout(r, 300));
      lastResult = await sendSingleMessage(env, userId, chunks[i], storeId);
      if (!lastResult.success) break;
    }
    return lastResult;
  }

  return sendSingleMessage(env, userId, text, storeId);
}

// 메시지 분할 헬퍼 - 문장/문단 단위로 자연스럽게 나눔
function splitMessage(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let remaining = text;
  
  while (remaining.length > maxLen) {
    // 1순위: 문단 나누기 (빈 줄)
    let splitIdx = remaining.lastIndexOf('\n\n', maxLen);
    // 2순위: 줄바꿈
    if (splitIdx < maxLen * 0.3) splitIdx = remaining.lastIndexOf('\n', maxLen);
    // 3순위: 문장 끝 (. ! ?)
    if (splitIdx < maxLen * 0.3) {
      const sentenceEnd = Math.max(
        remaining.lastIndexOf('. ', maxLen),
        remaining.lastIndexOf('! ', maxLen),
        remaining.lastIndexOf('? ', maxLen),
        remaining.lastIndexOf('요 ', maxLen),
        remaining.lastIndexOf('다 ', maxLen)
      );
      if (sentenceEnd > maxLen * 0.3) splitIdx = sentenceEnd + 1;
    }
    // 최후: 강제 분할
    if (splitIdx < maxLen * 0.3) splitIdx = maxLen;
    
    chunks.push(remaining.substring(0, splitIdx).trim());
    remaining = remaining.substring(splitIdx).trim();
  }
  
  if (remaining.trim()) chunks.push(remaining.trim());
  return chunks;
}

// 단일 메시지 전송 (내부용)
async function sendSingleMessage(
  env: Env,
  userId: string,
  text: string,
  storeId?: number
): Promise<TalkTalkResponse> {

  // 1. 먼저 DB에서 매장별 토큰 조회 (storeId가 있는 경우)
  let accessToken: string | undefined;
  
  if (storeId && env.DB) {
    try {
      const config = await getTalkTalkConfig(env.DB, storeId);
      if (config?.accessToken) {
        accessToken = config.accessToken;
        console.log(`[TalkTalk] Using DB token for store ${storeId}`);
      }
    } catch (err) {
      console.warn(`[TalkTalk] Failed to get DB token for store ${storeId}:`, err);
    }
  }
  
  // 2. DB에 없으면 환경 변수에서 가져오기 (fallback)
  if (!accessToken) {
    accessToken = env.NAVER_ACCESS_TOKEN;
  }
  
  if (!accessToken) {
    console.warn('[TalkTalk] No access token available (DB or ENV)');
    return { success: false, resultCode: 'NO_TOKEN', resultMessage: 'Access Token이 설정되지 않았습니다. 매장 설정에서 Authorization 토큰을 입력해주세요.' };
  }

  try {
    // 네이버 톡톡 API는 Bearer prefix 없이 토큰만 사용
    const requestBody = {
      event: 'send',
      user: userId,
      textContent: { text }
    };
    
    console.log(`[TalkTalk] Sending message to ${userId}, text length: ${text.length}`);
    console.log(`[TalkTalk] API URL: ${TALKTALK_API_BASE}/event`);
    
    const response = await fetch(`${TALKTALK_API_BASE}/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Authorization': accessToken
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log(`[TalkTalk] Response status: ${response.status}, body: ${responseText}`);

    if (!response.ok) {
      console.error(`[TalkTalk] sendTextMessage error: ${response.status}`, responseText);
      return { success: false, resultCode: `HTTP_${response.status}`, resultMessage: responseText };
    }

    console.log(`[TalkTalk] Message sent successfully to ${userId}`);
    return { success: true, resultCode: 'OK' };
  } catch (error: any) {
    console.error('[TalkTalk] sendTextMessage exception:', error);
    return { success: false, resultCode: 'NETWORK_ERROR', resultMessage: error.message };
  }
}

/**
 * 버튼 메시지 발송 (Env 기반 - 기존 webhook 호환)
 */
export interface ButtonOption {
  type: 'TEXT' | 'LINK';
  title: string;
  value?: string;
  linkUrl?: string;
}

export async function sendButtonMessage(
  env: Env,
  userId: string,
  text: string,
  buttons: ButtonOption[],
  storeId?: number
): Promise<TalkTalkResponse> {
  // 테스트 모드 체크
  if (isTestMode(env)) {
    console.log(`[TalkTalk] TEST MODE - Button to ${userId}: ${text}, buttons: ${buttons.length}`);
    return { success: true, resultCode: 'TEST_MODE' };
  }

  // 1. 먼저 DB에서 매장별 토큰 조회 (storeId가 있는 경우)
  let accessToken: string | undefined;
  
  if (storeId && env.DB) {
    try {
      const config = await getTalkTalkConfig(env.DB, storeId);
      if (config?.accessToken) {
        accessToken = config.accessToken;
        console.log(`[TalkTalk] Using DB token for store ${storeId} (button)`);
      }
    } catch (err) {
      console.warn(`[TalkTalk] Failed to get DB token for store ${storeId}:`, err);
    }
  }
  
  // 2. DB에 없으면 환경 변수에서 가져오기 (fallback)
  if (!accessToken) {
    accessToken = env.NAVER_ACCESS_TOKEN;
  }
  
  if (!accessToken) {
    console.warn('[TalkTalk] No access token available (DB or ENV)');
    return { success: false, resultCode: 'NO_TOKEN', resultMessage: 'Access Token이 설정되지 않았습니다.' };
  }

  const buttonList = buttons.map(btn => ({
    type: btn.type,
    data: btn.type === 'LINK' 
      ? { title: btn.title, url: btn.linkUrl, mobileUrl: btn.linkUrl }
      : { title: btn.title, code: btn.value || btn.title }
  }));

  try {
    // ★ 긴 텍스트는 title(1줄) + description(본문)으로 분리
    const lines = text.split('\n');
    const titleLine = lines[0].substring(0, 100);  // 첫 줄 = 제목 (max 100자)
    const descriptionText = lines.length > 1 
      ? lines.slice(1).join('\n').trim()
      : '';
    
    // ★ V3.0.18: 본문이 800자 초과 시 → 텍스트 먼저 전송 + 버튼 별도 전송
    if (descriptionText.length > 800) {
      // 1) 전체 텍스트를 일반 메시지로 먼저 전송
      await sendTextMessage(env, userId, text, storeId);
      
      // 2) 버튼만 짧은 안내와 함께 전송
      const requestBody = {
        event: 'send',
        user: userId,
        compositeContent: {
          compositeList: [{
            title: '👇 아래 버튼을 눌러보세요!',
            buttonList
          }]
        }
      };
      
      console.log(`[TalkTalk] Long text detected (${descriptionText.length} chars) - sending text + buttons separately`);
      
      const response = await fetch(`${TALKTALK_API_BASE}/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Authorization': accessToken
        },
        body: JSON.stringify(requestBody)
      });
      
      const responseText2 = await response.text();
      console.log(`[TalkTalk] Button-only response: ${response.status}, body: ${responseText2}`);
      
      return { success: response.ok, resultCode: response.ok ? 'OK' : `HTTP_${response.status}`, resultMessage: responseText2 };
    }
    
    // 800자 이내: 기존 방식 (title + description + 버튼 한 덩어리)
    const requestBody = {
      event: 'send',
      user: userId,
      compositeContent: {
        compositeList: [{
          title: titleLine,
          ...(descriptionText ? { description: descriptionText } : {}),
          buttonList
        }]
      }
    };
    
    console.log(`[TalkTalk] Sending button message to ${userId}`);
    console.log(`[TalkTalk] Button request:`, JSON.stringify(requestBody));
    
    const response = await fetch(`${TALKTALK_API_BASE}/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Authorization': accessToken
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log(`[TalkTalk] Button response status: ${response.status}, body: ${responseText}`);

    if (!response.ok) {
      console.error(`[TalkTalk] sendButtonMessage error: ${response.status}`, responseText);
      return { success: false, resultCode: `HTTP_${response.status}`, resultMessage: responseText };
    }

    console.log(`[TalkTalk] Button message sent successfully to ${userId}`);
    return { success: true, resultCode: 'OK' };
  } catch (error: any) {
    console.error('[TalkTalk] sendButtonMessage exception:', error);
    return { success: false, resultCode: 'NETWORK_ERROR', resultMessage: error.message };
  }
}

/**
 * 메시지 발송 (테스트 모드 고려)
 */
export async function sendTalkTalkMessage(
  db: D1Database,
  env: Env,
  storeId: number,
  userId: string,
  text: string
): Promise<TalkTalkResponse> {
  // 테스트 모드면 실제 발송하지 않음
  if (isTestMode(env)) {
    console.log(`[TalkTalk] TEST MODE - Message to ${userId}: ${text.substring(0, 50)}...`);
    return {
      success: true,
      resultCode: 'TEST_MODE',
      resultMessage: '테스트 모드에서는 실제 발송되지 않습니다.'
    };
  }

  const client = await createTalkTalkClient(db, storeId);
  if (!client) {
    return {
      success: false,
      resultCode: 'NO_CLIENT',
      resultMessage: '톡톡 클라이언트를 생성할 수 없습니다. Access Token을 확인해주세요.'
    };
  }

  return client.sendTextMessage(userId, text);
}
