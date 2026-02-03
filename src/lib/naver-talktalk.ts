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

  return {
    event: body.event,
    user: body.user,
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
  text: string
): Promise<TalkTalkResponse> {
  // 테스트 모드 체크
  if (isTestMode(env)) {
    console.log(`[TalkTalk] TEST MODE - Text to ${userId}: ${text.substring(0, 50)}...`);
    return { success: true, resultCode: 'TEST_MODE' };
  }

  // 환경 변수에서 Access Token 가져오기
  const accessToken = env.NAVER_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('[TalkTalk] No NAVER_ACCESS_TOKEN configured');
    return { success: false, resultCode: 'NO_TOKEN', resultMessage: 'Access Token이 설정되지 않았습니다.' };
  }

  try {
    // 네이버 톡톡 API는 Bearer prefix 없이 토큰만 사용
    const response = await fetch(`${TALKTALK_API_BASE}/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Authorization': accessToken
      },
      body: JSON.stringify({
        event: 'send',
        user: userId,
        textContent: { text }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TalkTalk] sendTextMessage error: ${response.status}`, errorText);
      return { success: false, resultCode: `HTTP_${response.status}`, resultMessage: errorText };
    }

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
  buttons: ButtonOption[]
): Promise<TalkTalkResponse> {
  // 테스트 모드 체크
  if (isTestMode(env)) {
    console.log(`[TalkTalk] TEST MODE - Button to ${userId}: ${text}, buttons: ${buttons.length}`);
    return { success: true, resultCode: 'TEST_MODE' };
  }

  const accessToken = env.NAVER_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('[TalkTalk] No NAVER_ACCESS_TOKEN configured');
    return { success: false, resultCode: 'NO_TOKEN', resultMessage: 'Access Token이 설정되지 않았습니다.' };
  }

  const buttonList = buttons.map(btn => ({
    type: btn.type,
    data: btn.type === 'LINK' 
      ? { title: btn.title, url: btn.linkUrl, mobileUrl: btn.linkUrl }
      : { title: btn.title, code: btn.value || btn.title }
  }));

  try {
    // 네이버 톡톡 API는 Bearer prefix 없이 토큰만 사용
    const response = await fetch(`${TALKTALK_API_BASE}/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Authorization': accessToken
      },
      body: JSON.stringify({
        event: 'send',
        user: userId,
        compositeContent: {
          compositeList: [{
            title: text,
            buttonList
          }]
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TalkTalk] sendButtonMessage error: ${response.status}`, errorText);
      return { success: false, resultCode: `HTTP_${response.status}`, resultMessage: errorText };
    }

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
