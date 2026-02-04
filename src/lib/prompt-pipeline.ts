// XIVIX AI Core V2.0 - 2단계 AI 프롬프트 파이프라인
// GPT-4o (1차 구조화) → Gemini 2.5 Pro (감정 자극형 검수)

import type { Env } from '../types';

interface PromptPipelineInput {
  rawText: string;           // 원장님이 붙여넣은 원본 텍스트
  storeName?: string;
  businessType?: string;
  existingPrompt?: string;   // 기존 프롬프트 (병합용)
}

interface StructuredData {
  storeName: string;
  businessType: string;
  menuItems: Array<{
    name: string;
    originalPrice?: string;
    discountPrice?: string;
    duration?: string;
    description?: string;
  }>;
  events: Array<{
    title: string;
    discount?: string;
    period?: string;
  }>;
  operatingHours: string;
  address?: string;
  phone?: string;
  additionalInfo?: string;
}

interface PipelineResult {
  success: boolean;
  // 1단계 결과
  structuredData?: StructuredData;
  rawPrompt?: string;
  // 2단계 결과 (최종)
  finalPrompt?: string;
  menuText?: string;
  eventsText?: string;
  operatingHours?: string;
  // 메타 정보
  stage1Model?: string;
  stage2Model?: string;
  error?: string;
}

// ============ GPT-4o 1단계: 데이터 구조화 ============
const GPT4O_STAGE1_SYSTEM = `당신은 매장 정보 구조화 전문가입니다.

## 역할
사용자가 붙여넣은 비정형 텍스트에서 매장 정보를 추출하고 구조화합니다.

## 추출 항목
1. **매장명**: 텍스트에서 매장 이름 추출
2. **메뉴/서비스**: 각 항목별 이름, 정가, 할인가, 소요시간
3. **이벤트**: 할인 이벤트, 기간
4. **영업시간**: 영업일, 시간, 휴무일
5. **주소/연락처**: 있으면 추출

## 응답 형식 (JSON)
{
  "storeName": "매장명",
  "menuItems": [
    {"name": "서비스명", "originalPrice": "정가", "discountPrice": "할인가", "duration": "소요시간", "description": "설명"}
  ],
  "events": [
    {"title": "이벤트명", "discount": "할인율/금액", "period": "기간"}
  ],
  "operatingHours": "영업시간 텍스트",
  "address": "주소",
  "phone": "전화번호",
  "additionalInfo": "기타 중요 정보"
}

## 규칙
- 없는 정보는 빈 문자열 또는 빈 배열로 처리
- 가격은 원 단위 숫자만 추출 (예: "50,000원" → "50000")
- 할인 정보가 있으면 originalPrice와 discountPrice 모두 기록
- JSON만 응답 (설명 없이)`;

// ============ Gemini 2.5 Pro 2단계: 감정 자극형 검수 ============
const GEMINI_STAGE2_SYSTEM = `당신은 **고객 구매 심리 전문가**이자 **감성 마케팅 전문가**입니다.

## 역할
1차 생성된 시스템 프롬프트를 검수하고, **감정 자극형 문구**로 업그레이드합니다.

## 핵심 원칙

### 1. 감정 자극 포인트
- **긴급성**: "오늘만", "딱 2자리", "마감 임박", "골든타임"
- **희소성**: "선착순 5명", "이번 주 한정", "단독 혜택"
- **공감**: "~하시죠?", "고민되시죠?", "저도 그랬어요"
- **전문성**: "20년 데이터", "박사급 분석", "전문가 소견"
- **신뢰**: "실패 없는", "검증된", "약속드립니다"

### 2. 문구 변환 예시
❌ "탄력이 저하된 상태입니다"
✅ "탄력이 눈에 띄게 떨어졌어요 😢 지금이 골든타임이에요!"

❌ "매직팟 고주파 추천합니다"  
✅ "20년 데이터상 이 상태엔 매직팟이 딱이에요! 지금 50% 할인 중 🎉"

❌ "예약하시겠습니까?"
✅ "오늘 딱 2자리 남았는데, 잡아드릴까요? ⏰"

### 3. 프롬프트 구조 검수
- 진단 → 해결책 → 즉시 액션 흐름 유지
- 3-4줄 간격으로 모바일 가독성 확보
- 이모지는 포인트에만 (과하지 않게)
- 마무리는 반드시 **질문형**으로

### 4. 할루시네이션 방지
- 가격/메뉴 정보는 원본 그대로 유지
- 없는 정보 추가 금지
- "정확한 가격은 매장에 문의" 유도 (정보 없을 때)

## 응답 형식
검수/업그레이드된 최종 시스템 프롬프트만 출력합니다.
JSON이 아닌 **일반 텍스트**로 응답합니다.`;

/**
 * GPT-4o로 1차 데이터 구조화
 */
async function stage1_GPT4o(
  env: Env,
  input: PromptPipelineInput
): Promise<{ success: boolean; data?: StructuredData; rawPrompt?: string; error?: string }> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'OpenAI API 키가 설정되지 않았습니다.' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: GPT4O_STAGE1_SYSTEM },
          { 
            role: 'user', 
            content: `다음 텍스트에서 매장 정보를 추출해주세요:\n\n매장명 힌트: ${input.storeName || '없음'}\n업종: ${input.businessType || '미용/에스테틱'}\n\n---\n${input.rawText}\n---`
          }
        ],
        temperature: 0.3,  // 정확도 우선
        max_tokens: 2048,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorData = await response.json() as any;
      return { success: false, error: errorData.error?.message || 'GPT-4o API 오류' };
    }

    const result = await response.json() as any;
    const content = result.choices?.[0]?.message?.content;
    
    if (!content) {
      return { success: false, error: 'GPT-4o 응답이 비어있습니다.' };
    }

    const structuredData = JSON.parse(content) as StructuredData;
    
    // 기본 프롬프트 생성
    const rawPrompt = buildRawPrompt(structuredData, input);

    return { success: true, data: structuredData, rawPrompt };
  } catch (err: any) {
    console.error('[Stage1 GPT-4o Error]', err);
    return { success: false, error: err.message };
  }
}

/**
 * 구조화된 데이터로 기본 프롬프트 생성
 */
function buildRawPrompt(data: StructuredData, input: PromptPipelineInput): string {
  const storeName = data.storeName || input.storeName || '매장';
  const businessType = input.businessType || 'BEAUTY_SKIN';
  
  let prompt = `시스템 역할: ${storeName} 수석 디렉터로서 20년 경력의 데이터/경영학 박사처럼 행동합니다.
모든 응대 흐름은 [전문 진단 → 해결책 제시 → 즉각 액션]으로 구성합니다.
모바일 가독성을 위해 3-4줄 간격으로 답변합니다.

핵심 임무: 데이터 기반 전문가 상담 및 즉시 예약 유도

`;

  // 메뉴/가격 정보
  if (data.menuItems && data.menuItems.length > 0) {
    prompt += `## 메뉴/가격 정보\n`;
    for (const item of data.menuItems) {
      let line = `- ${item.name}`;
      if (item.originalPrice && item.discountPrice) {
        line += `: 정가 ${formatPrice(item.originalPrice)} → 할인가 ${formatPrice(item.discountPrice)}`;
      } else if (item.discountPrice) {
        line += `: ${formatPrice(item.discountPrice)}`;
      } else if (item.originalPrice) {
        line += `: ${formatPrice(item.originalPrice)}`;
      }
      if (item.duration) {
        line += ` (${item.duration})`;
      }
      prompt += line + '\n';
    }
    prompt += '\n';
  }

  // 이벤트 정보
  if (data.events && data.events.length > 0) {
    prompt += `## 진행 중 이벤트\n`;
    for (const event of data.events) {
      let line = `- ${event.title}`;
      if (event.discount) line += ` (${event.discount})`;
      if (event.period) line += ` - ${event.period}`;
      prompt += line + '\n';
    }
    prompt += '\n';
  }

  // 영업시간
  if (data.operatingHours) {
    prompt += `## 영업시간\n${data.operatingHours}\n\n`;
  }

  // 상담 알고리즘
  prompt += `## 상담 알고리즘
1. 전문 분석: "보내주신 정보를 분석해 보니 현재 [OOO] 상태가 강하게 의심됩니다."
2. 맞춤 제안: "저희 매장에서는 이런 경우 [매칭 메뉴]로 케어 가능합니다. 현재 이벤트로 혜택가에 이용 가능합니다."
3. 즉각 액션: "더 정밀한 케어를 위해 원장님의 확정 스케줄을 확인하시겠어요?"

## 주의사항
- 모든 답변 끝은 질문형으로 마무리합니다.
- '시술' 대신 '관리/케어/프로그램' 표현을 사용합니다.
- 확실히, 100%, 보장 등의 표현은 사용하지 않습니다.
- 모르는 정보는 "정확한 확인 후 안내드리겠습니다"로 대응합니다.`;

  return prompt;
}

/**
 * 가격 포맷팅
 */
function formatPrice(price: string): string {
  const num = price.replace(/[^0-9]/g, '');
  if (!num) return price;
  
  const formatted = Number(num).toLocaleString();
  return formatted + '원';
}

/**
 * Gemini 2.5 Pro로 2차 감정 자극형 검수
 */
async function stage2_GeminiPro(
  env: Env,
  rawPrompt: string,
  structuredData: StructuredData
): Promise<{ success: boolean; finalPrompt?: string; error?: string }> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    // Gemini 키가 없으면 1차 결과 그대로 반환
    console.log('[Stage2] Gemini API 키 없음, 1차 결과 반환');
    return { success: true, finalPrompt: rawPrompt };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-05-06:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: GEMINI_STAGE2_SYSTEM }]
          },
          contents: [
            {
              role: 'user',
              parts: [{
                text: `다음 시스템 프롬프트를 검수하고 감정 자극형으로 업그레이드해주세요.

## 원본 프롬프트
${rawPrompt}

## 원본 데이터 (가격/메뉴는 그대로 유지)
${JSON.stringify(structuredData, null, 2)}

---
업그레이드된 최종 프롬프트만 출력하세요.`
              }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json() as any;
      console.error('[Stage2 Gemini Error]', errorData);
      // 오류 시 1차 결과 반환
      return { success: true, finalPrompt: rawPrompt };
    }

    const result = await response.json() as any;
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return { success: true, finalPrompt: rawPrompt };
    }

    return { success: true, finalPrompt: content };
  } catch (err: any) {
    console.error('[Stage2 Gemini Error]', err);
    // 오류 시 1차 결과 반환
    return { success: true, finalPrompt: rawPrompt };
  }
}

/**
 * 2단계 AI 파이프라인 실행
 * GPT-4o (구조화) → Gemini 2.5 Pro (감정 자극형 검수)
 */
export async function runPromptPipeline(
  env: Env,
  input: PromptPipelineInput
): Promise<PipelineResult> {
  console.log('[Pipeline] 시작 - 입력 텍스트 길이:', input.rawText.length);

  // 1단계: GPT-4o로 데이터 구조화
  console.log('[Pipeline] 1단계: GPT-4o 구조화 시작');
  const stage1Result = await stage1_GPT4o(env, input);
  
  if (!stage1Result.success || !stage1Result.data) {
    return {
      success: false,
      error: stage1Result.error || '1단계 GPT-4o 처리 실패',
      stage1Model: 'gpt-4o'
    };
  }

  console.log('[Pipeline] 1단계 완료 - 메뉴 아이템:', stage1Result.data.menuItems?.length || 0);

  // 2단계: Gemini 2.5 Pro로 감정 자극형 검수
  console.log('[Pipeline] 2단계: Gemini 2.5 Pro 검수 시작');
  const stage2Result = await stage2_GeminiPro(env, stage1Result.rawPrompt!, stage1Result.data);

  if (!stage2Result.success) {
    // 2단계 실패 시 1단계 결과 반환
    return {
      success: true,
      structuredData: stage1Result.data,
      rawPrompt: stage1Result.rawPrompt,
      finalPrompt: stage1Result.rawPrompt,
      menuText: buildMenuText(stage1Result.data),
      eventsText: buildEventsText(stage1Result.data),
      operatingHours: stage1Result.data.operatingHours,
      stage1Model: 'gpt-4o',
      stage2Model: 'skipped'
    };
  }

  console.log('[Pipeline] 2단계 완료 - 최종 프롬프트 생성됨');

  return {
    success: true,
    structuredData: stage1Result.data,
    rawPrompt: stage1Result.rawPrompt,
    finalPrompt: stage2Result.finalPrompt,
    menuText: buildMenuText(stage1Result.data),
    eventsText: buildEventsText(stage1Result.data),
    operatingHours: stage1Result.data.operatingHours,
    stage1Model: 'gpt-4o',
    stage2Model: 'gemini-2.5-pro'
  };
}

/**
 * 메뉴 텍스트 빌드
 */
function buildMenuText(data: StructuredData): string {
  if (!data.menuItems || data.menuItems.length === 0) return '';
  
  return data.menuItems.map(item => {
    let line = item.name;
    if (item.originalPrice && item.discountPrice) {
      line += ` - 정가 ${formatPrice(item.originalPrice)} → ${formatPrice(item.discountPrice)}`;
    } else if (item.discountPrice) {
      line += ` - ${formatPrice(item.discountPrice)}`;
    } else if (item.originalPrice) {
      line += ` - ${formatPrice(item.originalPrice)}`;
    }
    if (item.duration) {
      line += ` (${item.duration})`;
    }
    return line;
  }).join('\n');
}

/**
 * 이벤트 텍스트 빌드
 */
function buildEventsText(data: StructuredData): string {
  if (!data.events || data.events.length === 0) return '';
  
  return data.events.map(event => {
    let line = event.title;
    if (event.discount) line += ` (${event.discount})`;
    if (event.period) line += ` - ${event.period}`;
    return line;
  }).join('\n');
}

export type { PromptPipelineInput, PipelineResult, StructuredData };
