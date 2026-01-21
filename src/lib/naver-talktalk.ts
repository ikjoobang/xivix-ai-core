// XIVIX AI Core V1.0 - 네이버 톡톡 API Integration
// Webhook 수신 및 메시지 발송

import type { Env, NaverTalkTalkMessage, NaverTalkTalkResponse } from '../types';

const NAVER_TALKTALK_API = 'https://gw.talk.naver.com/chatbot/v1/event';

// 개인정보 마스킹 처리
export function maskPersonalInfo(text: string): string {
  // 전화번호 마스킹 (010-1234-5678 -> 010-****-5678)
  text = text.replace(/(\d{3})[-.]?(\d{4})[-.]?(\d{4})/g, '$1-****-$3');
  
  // 이메일 마스킹 (test@email.com -> t***@email.com)
  text = text.replace(/([a-zA-Z0-9])([a-zA-Z0-9._-]*)@/g, '$1***@');
  
  // 주민번호 마스킹
  text = text.replace(/(\d{6})[-.]?(\d{7})/g, '$1-*******');
  
  return text;
}

// Webhook 메시지 파싱
export function parseWebhookMessage(body: unknown): NaverTalkTalkMessage | null {
  try {
    const data = body as NaverTalkTalkMessage;
    
    if (!data.event || !data.user) {
      return null;
    }
    
    return {
      event: data.event,
      user: data.user,
      textContent: data.textContent,
      imageContent: data.imageContent,
      options: data.options
    };
  } catch {
    return null;
  }
}

// 톡톡 메시지 발송 (일반 텍스트)
export async function sendTextMessage(
  env: Env,
  userId: string,
  text: string
): Promise<NaverTalkTalkResponse> {
  const accessToken = env.NAVER_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error('Naver access token not configured');
    return { success: false, resultCode: 'NO_TOKEN' };
  }
  
  try {
    const response = await fetch(NAVER_TALKTALK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        event: 'send',
        user: userId,
        textContent: {
          text: text
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('TalkTalk API Error:', error);
      return { success: false, resultCode: 'API_ERROR', resultMessage: error };
    }
    
    const result = await response.json() as { success: boolean; resultCode: string };
    return { success: result.success, resultCode: result.resultCode };
  } catch (error) {
    console.error('TalkTalk Send Error:', error);
    return { success: false, resultCode: 'NETWORK_ERROR' };
  }
}

// 톡톡 메시지 발송 (스트리밍 - 청크 단위)
export async function sendStreamingMessage(
  env: Env,
  userId: string,
  textGenerator: AsyncGenerator<string, void, unknown>
): Promise<string> {
  const accessToken = env.NAVER_ACCESS_TOKEN;
  
  if (!accessToken) {
    return '시스템 오류: 인증 토큰이 없습니다.';
  }
  
  let fullResponse = '';
  let buffer = '';
  const CHUNK_SIZE = 50; // 50자 단위로 전송 (타이핑 효과)
  
  for await (const chunk of textGenerator) {
    buffer += chunk;
    fullResponse += chunk;
    
    // 문장 단위 또는 일정 길이마다 전송
    while (buffer.length >= CHUNK_SIZE || buffer.includes('다.') || buffer.includes('요.')) {
      let sendText = '';
      
      // 문장 끝 찾기
      const endIdx = Math.max(
        buffer.indexOf('다.'),
        buffer.indexOf('요.'),
        buffer.indexOf('니다.'),
        buffer.indexOf('세요.')
      );
      
      if (endIdx > 0) {
        sendText = buffer.slice(0, endIdx + 2);
        buffer = buffer.slice(endIdx + 2);
      } else if (buffer.length >= CHUNK_SIZE) {
        sendText = buffer.slice(0, CHUNK_SIZE);
        buffer = buffer.slice(CHUNK_SIZE);
      } else {
        break;
      }
      
      if (sendText.trim()) {
        await sendTextMessage(env, userId, sendText.trim());
        // 타이핑 효과를 위한 딜레이 (50ms)
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }
  
  // 남은 버퍼 전송
  if (buffer.trim()) {
    await sendTextMessage(env, userId, buffer.trim());
  }
  
  return fullResponse;
}

// 버튼형 메시지 발송 (예약 유도용)
export async function sendButtonMessage(
  env: Env,
  userId: string,
  text: string,
  buttons: Array<{
    type: 'TEXT' | 'LINK';
    title: string;
    value?: string;
    linkUrl?: string;
  }>
): Promise<NaverTalkTalkResponse> {
  const accessToken = env.NAVER_ACCESS_TOKEN;
  
  if (!accessToken) {
    return { success: false, resultCode: 'NO_TOKEN' };
  }
  
  try {
    const response = await fetch(NAVER_TALKTALK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        event: 'send',
        user: userId,
        compositeContent: {
          compositeList: [
            {
              title: text,
              buttonList: buttons.map(btn => ({
                type: btn.type,
                data: {
                  title: btn.title,
                  code: btn.value,
                  url: btn.linkUrl
                }
              }))
            }
          ]
        }
      })
    });
    
    if (!response.ok) {
      return { success: false, resultCode: 'API_ERROR' };
    }
    
    const result = await response.json() as { success: boolean; resultCode: string };
    return { success: result.success, resultCode: result.resultCode };
  } catch {
    return { success: false, resultCode: 'NETWORK_ERROR' };
  }
}

// 이미지 메시지 발송
export async function sendImageMessage(
  env: Env,
  userId: string,
  imageUrl: string
): Promise<NaverTalkTalkResponse> {
  const accessToken = env.NAVER_ACCESS_TOKEN;
  
  if (!accessToken) {
    return { success: false, resultCode: 'NO_TOKEN' };
  }
  
  try {
    const response = await fetch(NAVER_TALKTALK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        event: 'send',
        user: userId,
        imageContent: {
          imageUrl: imageUrl
        }
      })
    });
    
    if (!response.ok) {
      return { success: false, resultCode: 'API_ERROR' };
    }
    
    const result = await response.json() as { success: boolean; resultCode: string };
    return { success: result.success, resultCode: result.resultCode };
  } catch {
    return { success: false, resultCode: 'NETWORK_ERROR' };
  }
}
