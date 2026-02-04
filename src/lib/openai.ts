// XIVIX AI Core - OpenAI Integration Module
// GPT-4o 및 기타 OpenAI 모델 지원

import type { Env } from '../types';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * OpenAI API 키 검증
 */
export async function validateOpenAIKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (response.ok) {
      return { valid: true };
    } else {
      const error = await response.json() as { error?: { message?: string } };
      return { valid: false, error: error.error?.message || 'Invalid API key' };
    }
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

/**
 * OpenAI GPT 응답 생성
 */
export async function getOpenAIResponse(
  apiKey: string,
  messages: OpenAIMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const {
    model = 'gpt-4o',
    temperature = 0.7,
    maxTokens = 1024
  } = options;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { message?: string } };
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json() as OpenAIResponse;
    return data.choices[0]?.message?.content || '응답을 생성하지 못했습니다.';
  } catch (err: any) {
    console.error('[OpenAI] Error:', err);
    throw err;
  }
}

/**
 * OpenAI Vision (이미지 분석) - OCR 포함
 */
export async function analyzeImageWithOpenAI(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  prompt: string = '이 이미지에서 텍스트를 추출하고 내용을 분석해주세요.'
): Promise<string> {
  const messages: OpenAIMessage[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { 
          type: 'image_url', 
          image_url: { 
            url: `data:${mimeType};base64,${imageBase64}` 
          } 
        }
      ]
    }
  ];

  return getOpenAIResponse(apiKey, messages, { model: 'gpt-4o', maxTokens: 2048 });
}

/**
 * 시스템 프롬프트 빌드 (OpenAI용)
 */
export function buildOpenAISystemPrompt(config: {
  persona?: string;
  tone?: string;
  storeName?: string;
  menuData?: string;
  operatingHours?: string;
  customPrompt?: string;
  forbiddenKeywords?: string;
}): string {
  const {
    persona = '친절한 AI 어시스턴트',
    tone = 'friendly',
    storeName = '매장',
    menuData,
    operatingHours,
    customPrompt,
    forbiddenKeywords
  } = config;

  const toneDescriptions: Record<string, string> = {
    friendly: '친근하고 따뜻한 말투로 대화하세요.',
    professional: '전문적이고 신뢰감 있는 말투로 대화하세요.',
    casual: '캐주얼하고 편안한 말투로 대화하세요.',
    formal: '격식있고 정중한 말투로 대화하세요.',
    energetic: '활기차고 긍정적인 말투로 대화하세요.'
  };

  let systemPrompt = `당신은 ${storeName}의 ${persona}입니다.

## 기본 지침
- ${toneDescriptions[tone] || toneDescriptions.friendly}
- 고객의 질문에 정확하고 친절하게 답변하세요.
- 모르는 내용은 솔직히 "확인이 필요합니다"라고 답변하세요.
- 예약이나 문의가 필요한 경우 적절히 안내하세요.
`;

  if (menuData) {
    systemPrompt += `
## 메뉴/서비스 정보
${menuData}
`;
  }

  if (operatingHours) {
    systemPrompt += `
## 영업시간
${operatingHours}
`;
  }

  if (customPrompt) {
    systemPrompt += `
## 추가 지침
${customPrompt}
`;
  }

  if (forbiddenKeywords) {
    systemPrompt += `
## 금지 키워드 (사용하지 마세요)
${forbiddenKeywords}
`;
  }

  return systemPrompt;
}

/**
 * 대화 메시지 빌드 (OpenAI용)
 */
export function buildOpenAIMessages(
  systemPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  userMessage: string,
  imageBase64?: string,
  imageMimeType?: string
): OpenAIMessage[] {
  const messages: OpenAIMessage[] = [
    { role: 'system', content: systemPrompt }
  ];

  // 대화 히스토리 추가 (안전하게 처리)
  const history = Array.isArray(conversationHistory) ? conversationHistory : [];
  for (const msg of history.slice(-10)) {
    if (msg && msg.role && msg.content) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: String(msg.content)
      });
    }
  }

  // 현재 사용자 메시지 추가
  if (imageBase64 && imageMimeType) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: userMessage || '이 이미지를 분석해주세요.' },
        {
          type: 'image_url',
          image_url: { url: `data:${imageMimeType};base64,${imageBase64}` }
        }
      ]
    });
  } else {
    messages.push({
      role: 'user',
      content: userMessage
    });
  }

  return messages;
}
