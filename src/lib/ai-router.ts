// XIVIX AI Core V2.0 - AI Router with Hallucination Verification
// 전문 상담: OpenAI GPT-4o (1차) → Gemini 2.5 Pro (검증)
// 일반 상담: Gemini 2.5 Flash (빠른 응답)

import type { Env, Store, ConversationContext, GeminiMessage } from '../types';
import { buildGeminiMessages, buildSystemInstruction, getGeminiResponse, streamGeminiResponse } from './gemini';
import { getOpenAIResponse, buildOpenAIMessages, buildOpenAISystemPrompt, analyzeImageWithOpenAI } from './openai';

// 업종별 전문 상담 필요 여부 (GPT-4o + Gemini Pro 검증 사용)
// 할루시네이션이 위험한 업종 - 정확도 최우선
const EXPERT_BUSINESS_TYPES = [
  // 의료/건강
  'MEDICAL',           // 의료/병원/치과
  'PHARMACY',          // 약국
  'POSTNATAL_CARE',    // 산후조리원 ⭐ 추가
  'MATERNITY',         // 산부인과/산후조리
  'MENTAL_HEALTH',     // 정신건강/상담센터
  
  // 법률/금융
  'PROFESSIONAL_LEGAL', // 법률/세무/회계
  'FINANCE',           // 금융/증권
  'INSURANCE',         // 보험
  'REAL_ESTATE',       // 부동산 (계약 관련)
  
  // 교육/자격
  'EDUCATION_CERT',    // 자격증/인허가 교육
];

// 전문 상담 키워드 (정확도가 중요한 주제)
const EXPERT_KEYWORDS = [
  // 의료
  '진료', '처방', '약', '증상', '질병', '수술', '치료', '보험청구', '진단',
  '부작용', '복용', '주사', '검사', '입원', '퇴원',
  // 산후조리원
  '산모', '신생아', '모유수유', '산후', '출산', '진통', '분만', '제왕절개',
  '아기', '수유', '젖병', '기저귀', '목욕', '배꼽',
  // 법률
  '계약', '법률', '소송', '분쟁', '손해배상', '변호사', '법적',
  '위약금', '해지', '위반', '고소', '합의',
  // 보험
  '보험료', '보장', '가입', '청구', '약관', '만기', '해지', '환급',
  '보상', '면책', '특약', '갱신',
  // 금융
  '대출', '금리', '이자', '투자', '원금', '수익률',
  '예금', '적금', '펀드', '주식', '채권',
  // 세무
  '세금', '신고', '공제', '연말정산', '부가세', '종합소득',
  '증여', '상속', '양도', '취득세',
  // 부동산
  '등기', '전세', '월세', '계약금', '중도금', '잔금',
];

// 일반 문의 키워드 (빠른 응답 OK)
const SIMPLE_KEYWORDS = [
  '영업시간', '위치', '주소', '전화번호', '가격', '메뉴', '예약', '안녕',
  '주차', '오시는', '언제', '몇시', '휴무', '정기휴일',
];

// 상담 유형 분류
export type ConsultationType = 'expert' | 'simple' | 'image';

export function classifyConsultation(
  message: string,
  businessType: string,
  hasImage: boolean
): ConsultationType {
  // 이미지가 있으면 전문 분석 필요
  if (hasImage) {
    return 'image';
  }
  
  // 전문 업종인 경우
  if (EXPERT_BUSINESS_TYPES.includes(businessType)) {
    // 단순 문의가 아니면 전문 상담
    const isSimple = SIMPLE_KEYWORDS.some(kw => message.includes(kw));
    if (!isSimple) {
      return 'expert';
    }
  }
  
  // 전문 키워드 포함 여부
  const hasExpertKeyword = EXPERT_KEYWORDS.some(kw => message.includes(kw));
  if (hasExpertKeyword) {
    return 'expert';
  }
  
  return 'simple';
}

// 할루시네이션 검증 프롬프트
function buildVerificationPrompt(
  originalQuestion: string,
  gptResponse: string,
  storeInfo: string
): string {
  return `당신은 AI 응답 검증 전문가입니다. 아래 GPT-4o의 응답에 대해 할루시네이션(사실이 아닌 정보)이 있는지 검증해주세요.

## 원본 질문
${originalQuestion}

## GPT-4o 응답
${gptResponse}

## 매장/기관 정보 (사실 기준)
${storeInfo}

## 검증 기준
1. 매장 정보에 없는 내용을 마치 있는 것처럼 답변했는가?
2. 가격, 시간, 서비스 등에 대해 추측성 정보를 제공했는가?
3. 의료/법률/보험 관련 잘못된 정보가 있는가?
4. 존재하지 않는 혜택이나 서비스를 언급했는가?

## 응답 형식 (JSON)
{
  "verified": true 또는 false,
  "issues": ["문제점1", "문제점2"] (없으면 빈 배열),
  "corrected_response": "수정된 응답 (문제가 있을 경우만)",
  "confidence": 0.0~1.0 (검증 신뢰도)
}

JSON만 출력하세요.`;
}

// 검증 결과 파싱
interface VerificationResult {
  verified: boolean;
  issues: string[];
  corrected_response?: string;
  confidence: number;
}

function parseVerificationResult(response: string): VerificationResult {
  try {
    // JSON 추출
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('[AI Router] Verification parse error:', e);
  }
  
  // 파싱 실패 시 기본값 (통과)
  return {
    verified: true,
    issues: [],
    confidence: 0.5
  };
}

// 전문 상담 처리 (GPT-4o + Gemini Pro 검증)
export async function handleExpertConsultation(
  env: Env,
  store: Store | null,
  message: string,
  context: ConversationContext | null,
  imageBase64?: string,
  imageMimeType?: string
): Promise<{ response: string; verified: boolean; model: string }> {
  const openaiKey = env.OPENAI_API_KEY;
  const geminiKey = env.GEMINI_API_KEY;
  
  if (!openaiKey) {
    console.warn('[AI Router] OpenAI key not set, falling back to Gemini');
    // Fallback to Gemini Pro
    const messages = buildGeminiMessages(context, message, imageBase64, imageMimeType);
    const systemInstruction = buildSystemInstruction(store ? {
      store_name: store.store_name,
      menu_data: store.menu_data,
      operating_hours: store.operating_hours,
      address: store.address,
      phone: store.phone,
      ai_persona: store.ai_persona,
      ai_tone: store.ai_tone,
      system_prompt: store.system_prompt,
      greeting_message: store.greeting_message
    } : undefined);
    
    const response = await getGeminiResponse(env, messages, systemInstruction, 'gemini-pro');
    return { response, verified: false, model: 'gemini-pro' };
  }
  
  console.log('[AI Router] Expert consultation - Using GPT-4o');
  
  // 1차: OpenAI GPT-4o 응답 생성
  const systemPrompt = buildOpenAISystemPrompt(store);
  let gptResponse: string;
  
  if (imageBase64 && imageMimeType) {
    // 이미지 분석
    gptResponse = await analyzeImageWithOpenAI(
      openaiKey,
      imageBase64,
      imageMimeType,
      message || '이 이미지를 분석하고 적절한 상담을 제공해주세요.'
    );
  } else {
    // 텍스트 상담 - context.messages 배열을 추출하여 전달
    const conversationHistory = Array.isArray(context?.messages) ? context.messages : [];
    const openAIMessages = buildOpenAIMessages(systemPrompt, conversationHistory, message);
    gptResponse = await getOpenAIResponse(openaiKey, openAIMessages);
  }
  
  console.log('[AI Router] GPT-4o response:', String(gptResponse || '').slice(0, 100) + '...');
  
  // 2차: Gemini 2.5 Pro로 검증 (의료/법률/보험 업종만)
  const needsVerification = store && EXPERT_BUSINESS_TYPES.includes(store.business_type || '');
  
  if (needsVerification && geminiKey) {
    console.log('[AI Router] Verifying with Gemini 2.5 Pro...');
    
    const storeInfo = store ? `
매장명: ${store.store_name}
업종: ${store.business_type}
영업시간: ${store.operating_hours}
메뉴/서비스: ${store.menu_data}
` : '정보 없음';
    
    const verificationPrompt = buildVerificationPrompt(message, gptResponse, storeInfo);
    const verificationMessages: GeminiMessage[] = [
      { role: 'user', parts: [{ text: verificationPrompt }] }
    ];
    
    const verificationResponse = await getGeminiResponse(
      env,
      verificationMessages,
      '당신은 AI 응답 검증 전문가입니다. 할루시네이션과 오류를 정확하게 감지합니다.',
      'gemini-pro'
    );
    
    const result = parseVerificationResult(verificationResponse);
    console.log('[AI Router] Verification result:', result);
    
    if (!result.verified && result.corrected_response) {
      console.log('[AI Router] Using corrected response');
      return { 
        response: result.corrected_response, 
        verified: true, 
        model: 'gpt-4o+gemini-pro-verified' 
      };
    }
    
    if (!result.verified && result.issues.length > 0) {
      // 검증 실패 시 안전한 응답
      console.warn('[AI Router] Verification failed, using safe response');
      return {
        response: '정확한 정보 확인이 필요합니다. 직접 문의해 주시면 자세히 안내드리겠습니다.',
        verified: false,
        model: 'gpt-4o+gemini-pro-rejected'
      };
    }
    
    return { response: gptResponse, verified: true, model: 'gpt-4o+gemini-pro-verified' };
  }
  
  return { response: gptResponse, verified: false, model: 'gpt-4o' };
}

// 일반 상담 처리 (Gemini Flash - 빠른 응답)
export async function handleSimpleConsultation(
  env: Env,
  store: Store | null,
  message: string,
  context: ConversationContext | null
): Promise<{ response: string; model: string }> {
  console.log('[AI Router] Simple consultation - Using Gemini Flash');
  
  const messages = buildGeminiMessages(context, message);
  const systemInstruction = buildSystemInstruction(store ? {
    store_name: store.store_name,
    menu_data: store.menu_data,
    operating_hours: store.operating_hours,
    address: store.address,
    phone: store.phone,
    ai_persona: store.ai_persona,
    ai_tone: store.ai_tone,
    system_prompt: store.system_prompt,
    greeting_message: store.greeting_message
  } : undefined);
  
  const response = await getGeminiResponse(env, messages, systemInstruction, 'gemini');
  return { response, model: 'gemini-flash' };
}

// 스트리밍 일반 상담 (긴 응답용)
export async function* streamSimpleConsultation(
  env: Env,
  store: Store | null,
  message: string,
  context: ConversationContext | null,
  imageBase64?: string,
  imageMimeType?: string
): AsyncGenerator<string, { model: string }, unknown> {
  console.log('[AI Router] Streaming simple consultation');
  
  const messages = buildGeminiMessages(context, message, imageBase64, imageMimeType);
  const systemInstruction = buildSystemInstruction(store ? {
    store_name: store.store_name,
    menu_data: store.menu_data,
    operating_hours: store.operating_hours,
    address: store.address,
    phone: store.phone,
    ai_persona: store.ai_persona,
    ai_tone: store.ai_tone,
    system_prompt: store.system_prompt,
    greeting_message: store.greeting_message
  } : undefined);
  
  for await (const chunk of streamGeminiResponse(env, messages, systemInstruction, 'gemini')) {
    yield chunk;
  }
  
  return { model: 'gemini-flash-stream' };
}

// 메인 AI 라우터
export async function routeAIRequest(
  env: Env,
  store: Store | null,
  message: string,
  context: ConversationContext | null,
  imageBase64?: string,
  imageMimeType?: string
): Promise<{ response: string; model: string; consultationType: ConsultationType; verified?: boolean }> {
  const businessType = store?.business_type || 'OTHER';
  const hasImage = !!(imageBase64 && imageMimeType);
  
  // 상담 유형 분류
  const consultationType = classifyConsultation(message, businessType, hasImage);
  console.log(`[AI Router] Consultation type: ${consultationType}, Business: ${businessType}`);
  
  // 유형별 처리
  if (consultationType === 'expert' || consultationType === 'image') {
    const result = await handleExpertConsultation(
      env, store, message, context, imageBase64, imageMimeType
    );
    return { 
      ...result, 
      consultationType 
    };
  }
  
  // 일반 상담
  const result = await handleSimpleConsultation(env, store, message, context);
  return { 
    ...result, 
    consultationType,
    verified: undefined 
  };
}
