// XIVIX AI Core V1.0 - Gemini 2.5 Flash Integration
// Multimodal streaming with SSE support

import type { Env, GeminiMessage, GeminiRequest, ConversationContext } from '../types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// XIVIX AI 시스템 프롬프트 - 전문가급 매장 지배인 AI
export const XIVIX_SYSTEM_PROMPT = `당신은 XIVIX 매장 지배인 AI입니다.

## 역할
- 매장을 대표하는 전문 상담사로서 고객 문의에 응대합니다
- 냉철하고 전문적이며, 낭비 없는 세련된 말투를 사용합니다
- 모든 대화는 '예약' 또는 '방문' 유도로 자연스럽게 마무리합니다

## 핵심 원칙
1. **정확성 최우선**: 매장 정보(메뉴, 가격, 영업시간 등)에 없는 내용은 절대 추측하지 않습니다
   - 모르는 정보: "정확한 확인 후 안내드리겠습니다"로 대응
2. **이미지 분석**: 고객이 보낸 이미지를 분석하여 맞춤 시술/상품을 추천합니다
   - 피부 상태, 스타일, 원하는 분위기를 파악합니다
3. **전환 유도**: 상담 끝에는 반드시 예약 또는 방문을 권유합니다
   - "지금 예약하시면 [혜택]을 드립니다"
   - "방문 시 자세한 상담 도와드리겠습니다"

## 응답 스타일
- 간결하고 명확하게 (3-4문장 이내)
- 이모지 최소화 (전문성 유지)
- 존칭 사용 ("~하실 수 있습니다", "~드리겠습니다")

## 제약사항
- 개인정보 요청 금지 (전화번호, 주소 등)
- 타 업체 언급 금지
- 가격 할인 임의 제안 금지`;

// Build conversation history for Gemini
export function buildGeminiMessages(
  context: ConversationContext | null,
  currentMessage: string,
  imageBase64?: string,
  imageMimeType?: string
): GeminiMessage[] {
  const messages: GeminiMessage[] = [];
  
  // Add conversation history (최근 10개)
  if (context?.messages) {
    const recentMessages = context.messages.slice(-10);
    for (const msg of recentMessages) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }
  }
  
  // Add current message
  const currentParts: GeminiMessage['parts'] = [];
  
  if (currentMessage) {
    currentParts.push({ text: currentMessage });
  }
  
  if (imageBase64 && imageMimeType) {
    currentParts.push({
      inlineData: {
        mimeType: imageMimeType,
        data: imageBase64
      }
    });
    // Add image analysis instruction
    if (!currentMessage) {
      currentParts.push({ 
        text: '이 이미지를 분석하고 적절한 시술이나 서비스를 추천해주세요.' 
      });
    }
  }
  
  if (currentParts.length > 0) {
    messages.push({ role: 'user', parts: currentParts });
  }
  
  return messages;
}

// Build system instruction with store context
export function buildSystemInstruction(store?: {
  store_name: string;
  menu_data: string;
  operating_hours: string;
  ai_persona?: string;
  ai_tone?: string;
}): string {
  let instruction = XIVIX_SYSTEM_PROMPT;
  
  if (store) {
    instruction += `\n\n## 매장 정보
- 매장명: ${store.store_name}
- 영업시간: ${store.operating_hours}`;
    
    try {
      const menu = JSON.parse(store.menu_data);
      instruction += `\n- 메뉴/서비스:\n${JSON.stringify(menu, null, 2)}`;
    } catch {
      instruction += `\n- 메뉴/서비스: ${store.menu_data}`;
    }
    
    if (store.ai_persona) {
      instruction += `\n\n## AI 페르소나\n${store.ai_persona}`;
    }
    if (store.ai_tone) {
      instruction += `\n\n## 말투 스타일\n${store.ai_tone}`;
    }
  }
  
  return instruction;
}

// Streaming response generator for Gemini 2.5 Flash
export async function* streamGeminiResponse(
  env: Env,
  messages: GeminiMessage[],
  systemInstruction: string
): AsyncGenerator<string, void, unknown> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    yield 'API 키가 설정되지 않았습니다. 관리자에게 문의해주세요.';
    return;
  }
  
  const model = env.AI_MODEL || 'gemini-2.5-flash';
  const url = `${GEMINI_API_BASE}/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
  
  const request: GeminiRequest = {
    contents: messages,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 1024
    }
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API Error:', error);
      yield '죄송합니다. 잠시 후 다시 시도해주세요.';
      return;
    }
    
    const reader = response.body?.getReader();
    if (!reader) {
      yield '응답을 받을 수 없습니다.';
      return;
    }
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(jsonStr);
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              yield text;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    console.error('Gemini Stream Error:', error);
    yield '네트워크 오류가 발생했습니다. 다시 시도해주세요.';
  }
}

// Non-streaming response for quick replies
export async function getGeminiResponse(
  env: Env,
  messages: GeminiMessage[],
  systemInstruction: string
): Promise<string> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return 'API 키가 설정되지 않았습니다.';
  }
  
  const model = env.AI_MODEL || 'gemini-2.5-flash';
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
  
  const request: GeminiRequest = {
    contents: messages,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 1024
    }
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      console.error('Gemini API Error:', await response.text());
      return '죄송합니다. 잠시 후 다시 시도해주세요.';
    }
    
    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '응답을 생성할 수 없습니다.';
  } catch (error) {
    console.error('Gemini Error:', error);
    return '네트워크 오류가 발생했습니다.';
  }
}
