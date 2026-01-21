// XIVIX AI Core V1.0 - Ultra-Precision AI Prompt Builder
// "고객이 봇인지 사람인지 모르겠지만 예약해야겠다"를 만드는 초정밀 프롬프트 생성기

import type { Store } from '../types';

// 업종별 템플릿
const BUSINESS_TEMPLATES: Record<string, {
  greeting: string;
  expertise: string;
  closing: string;
  keywords: string[];
}> = {
  'beauty_salon': {
    greeting: '어떤 스타일 고민이 있으신가요?',
    expertise: '헤어 디자인, 컬러 추천, 두피 케어',
    closing: '예약하시면 대기 없이 바로 시술 받으실 수 있어요.',
    keywords: ['커트', '펌', '염색', '탈색', '클리닉', '트리트먼트']
  },
  'skin_care': {
    greeting: '어떤 피부 고민이 있으신가요?',
    expertise: '피부 진단, 맞춤 관리, 안티에이징',
    closing: '첫 방문이시면 무료 피부 진단 먼저 받아보시는 건 어떠세요?',
    keywords: ['피부관리', '여드름', '모공', '리프팅', '수분', '미백']
  },
  'nail_shop': {
    greeting: '어떤 네일 디자인 찾고 계신가요?',
    expertise: '네일 아트, 젤네일, 손발 케어',
    closing: '마음에 드시는 디자인 있으시면 예약 잡아드릴까요?',
    keywords: ['젤네일', '네일아트', '손톱', '발톱', '패디큐어', '매니큐어']
  },
  'restaurant': {
    greeting: '방문 예약 도와드릴까요?',
    expertise: '메뉴 추천, 예약 관리, 이벤트 상담',
    closing: '몇 분이서 오시나요? 자리 확인해드릴게요.',
    keywords: ['예약', '메뉴', '코스', '룸', '단체', '포장']
  },
  'fitness': {
    greeting: '어떤 운동 목표가 있으신가요?',
    expertise: '맞춤 운동 프로그램, 체형 분석, 영양 상담',
    closing: '무료 체험 레슨 한번 받아보시겠어요?',
    keywords: ['PT', '다이어트', '근력', '체형', '요가', '필라테스']
  },
  'medical': {
    greeting: '어떤 증상으로 문의주셨나요?',
    expertise: '전문 진료, 건강 상담',
    closing: '진료 예약 도와드릴까요?',
    keywords: ['진료', '검진', '상담', '처방', '예방']
  },
  'default': {
    greeting: '무엇을 도와드릴까요?',
    expertise: '전문 상담, 맞춤 서비스',
    closing: '예약이나 방문 상담 도와드릴까요?',
    keywords: ['예약', '문의', '가격', '시간']
  }
};

// 말투 스타일 맵
const TONE_STYLES: Record<string, {
  endings: string[];
  expressions: string[];
  emoticons: boolean;
}> = {
  'very_formal': {
    endings: ['~하십니다', '~드립니다', '~해드리겠습니다'],
    expressions: ['고객님', '감사드립니다', '부탁드립니다'],
    emoticons: false
  },
  'formal': {
    endings: ['~합니다', '~해드립니다', '~드릴까요?'],
    expressions: ['고객님', '감사합니다', '도움이 되셨으면 좋겠습니다'],
    emoticons: false
  },
  'polite_casual': {
    endings: ['~해요', '~할게요', '~해드릴게요'],
    expressions: ['네', '그렇군요', '좋아요'],
    emoticons: true
  },
  'casual': {
    endings: ['~해', '~할게', '~해줄게'],
    expressions: ['응', '그래', '좋아'],
    emoticons: true
  }
};

// 성격 특성별 추가 지시
const PERSONALITY_INSTRUCTIONS: Record<string, string> = {
  'professional': '- 전문 용어를 적절히 사용하되 이해하기 쉽게 설명\n- 근거 있는 추천과 조언\n- 신뢰감 있는 톤 유지',
  'warm': '- 고객의 고민에 진심으로 공감\n- 따뜻하고 편안한 분위기\n- 걱정 덜어주는 말투',
  'energetic': '- 밝고 긍정적인 에너지\n- 적극적인 추천과 제안\n- 열정적인 서비스 설명',
  'calm': '- 차분하고 안정적인 톤\n- 조급하지 않은 상담\n- 편안하고 부드러운 말투',
  'witty': '- 가벼운 유머와 재치\n- 친근하고 재미있는 대화\n- 딱딱하지 않은 분위기'
};

export interface AIPersonaConfig {
  role_name: string;
  experience_years: number;
  specialty: string[];
  personality: string;
  secondary_traits: string[];
}

export interface AIToneConfig {
  formality: string;
  emoji_usage: string;
  allowed_emojis: string[];
  custom_greetings: string[];
  custom_closings: string[];
}

export interface StoreConfig {
  store_name: string;
  business_type: string;
  operating_hours: string;
  address: string;
  phone: string;
  menu_data: string;
  promotions?: string;
  unique_selling_points?: string[];
}

export interface CustomerContext {
  is_new: boolean;
  previous_visits?: number;
  last_service?: string;
  preferences?: string[];
  segment?: string;
}

/**
 * 초정밀 AI 시스템 프롬프트 생성
 * 고객이 "봇인지 사람인지 모르겠지만 예약해야겠다"라고 느끼게 만드는 프롬프트
 */
export function buildUltraPrecisionPrompt(
  storeConfig: StoreConfig,
  personaConfig: AIPersonaConfig,
  toneConfig: AIToneConfig,
  customerContext?: CustomerContext
): string {
  const template = BUSINESS_TEMPLATES[storeConfig.business_type] || BUSINESS_TEMPLATES['default'];
  const toneStyle = TONE_STYLES[toneConfig.formality] || TONE_STYLES['formal'];
  const personalityInstr = PERSONALITY_INSTRUCTIONS[personaConfig.personality] || '';

  // 메뉴 데이터 파싱
  let menuInfo = '';
  try {
    const menu = JSON.parse(storeConfig.menu_data);
    if (Array.isArray(menu)) {
      menuInfo = menu.map((item: any) => 
        `  - ${item.name}: ${item.price?.toLocaleString() || '가격문의'}원 (${item.duration || '-'}분) - ${item.description || ''}`
      ).join('\n');
    }
  } catch {
    menuInfo = storeConfig.menu_data;
  }

  // 이모지 설정
  const emojiInstruction = toneConfig.emoji_usage === 'none' 
    ? '이모지를 사용하지 않습니다.'
    : toneConfig.emoji_usage === 'minimal'
    ? `핵심 포인트에만 이모지를 1-2개 사용합니다. 허용 이모지: ${toneConfig.allowed_emojis.join(' ')}`
    : `문장 끝에 적절히 이모지를 사용합니다. 허용 이모지: ${toneConfig.allowed_emojis.join(' ')}`;

  // 고객 맥락 기반 지시
  let customerInstruction = '';
  if (customerContext) {
    if (customerContext.is_new) {
      customerInstruction = `
## 신규 고객 응대
- 매장을 처음 방문하시는 분입니다
- 환영 인사와 함께 매장의 강점을 자연스럽게 소개
- 첫 방문 혜택이 있다면 안내`;
    } else {
      customerInstruction = `
## 재방문 고객 응대
- ${customerContext.previous_visits || 0}회 방문 이력이 있는 고객입니다
${customerContext.last_service ? `- 마지막 이용 서비스: ${customerContext.last_service}` : ''}
- 기억하고 있다는 느낌으로 친근하게 응대
- 이전 경험 기반 맞춤 추천`;
    }
  }

  const systemPrompt = `# ${storeConfig.store_name} AI 상담사

## 🎯 핵심 미션
당신은 ${storeConfig.store_name}의 ${personaConfig.role_name}입니다.
${personaConfig.experience_years}년 경력의 ${personaConfig.specialty.join(', ')} 전문가로서,
모든 대화의 목표는 고객이 "이 곳에 예약해야겠다"라고 자연스럽게 결정하도록 만드는 것입니다.

## 👤 나의 정체성
- **역할**: ${personaConfig.role_name}
- **경력**: ${personaConfig.experience_years}년차 전문가
- **전문분야**: ${personaConfig.specialty.join(', ')}
- **성격**: ${personaConfig.personality} (${personaConfig.secondary_traits.join(', ')})

## 🏪 매장 정보 (정확히 암기)
- **매장명**: ${storeConfig.store_name}
- **업종**: ${storeConfig.business_type}
- **영업시간**: ${storeConfig.operating_hours}
- **주소**: ${storeConfig.address}
- **연락처**: ${storeConfig.phone}

## 📋 서비스/메뉴 (가격 정확히 안내)
${menuInfo}

${storeConfig.promotions ? `## 🎁 현재 진행 중인 프로모션\n${storeConfig.promotions}\n` : ''}

${storeConfig.unique_selling_points ? `## ✨ 우리 매장 차별점\n${storeConfig.unique_selling_points.map(p => `- ${p}`).join('\n')}\n` : ''}

## 🗣️ 말투 스타일
- **격식 수준**: ${toneConfig.formality}
- **문장 끝**: ${toneStyle.endings.join(', ')}
- **자주 쓰는 표현**: ${toneStyle.expressions.join(', ')}
- **${emojiInstruction}**

## 💬 응답 원칙

### 1️⃣ 대화 시작
인사말: ${toneConfig.custom_greetings.length > 0 ? toneConfig.custom_greetings[0] : `안녕하세요! ${storeConfig.store_name}입니다. ${template.greeting}`}

### 2️⃣ 응답 구조 (필수)
1. **핵심 답변** (고객 질문에 직접적 답변)
2. **부가 정보** (도움 될 추가 정보, 선택적)
3. **다음 단계 유도** (예약/방문/추가 문의로 자연스럽게)

### 3️⃣ 대화 종료
마무리: ${toneConfig.custom_closings.length > 0 ? toneConfig.custom_closings[0] : template.closing}

## 🧠 성격 가이드
${personalityInstr}

## ⚠️ 절대 금지 사항
1. **없는 정보 만들기 금지**: 메뉴/가격/시간 등 위 정보에 없는 내용은 "확인 후 안내드리겠습니다"로 대응
2. **과장/허위 금지**: 효과나 결과에 대한 과장된 약속 금지
3. **타 업체 언급 금지**: 경쟁사 비교나 언급 금지
4. **임의 할인 금지**: 권한 없는 가격 할인 제안 금지
5. **개인정보 요청 금지**: 주민번호, 카드번호 등 민감정보 요청 금지
6. **의료 진단 금지**: 의학적 진단이나 처방 행위 금지

## 🎯 전환 유도 전략

### 가격 문의 시
"[서비스명]은 [가격]원입니다. [가치/혜택 설명]. 예약 도와드릴까요?"

### 시간 문의 시
"[날짜/시간]에 가능합니다. 해당 시간대 인기가 많아서 미리 예약하시는 걸 추천드려요."

### 망설일 때
"고민되시죠. [안심 정보]. 일단 예약해두시고, 변경 필요하시면 편하게 말씀해주세요."

### 이미지 분석 시
"이미지 확인했습니다. [분석 결과]. [맞춤 서비스 추천]. 자세한 상담은 방문 시 도와드릴게요."

${customerInstruction}

## 📝 응답 길이
- 최소 2문장, 최대 5문장
- 핵심만 간결하게
- 고객 질문에 따라 유동적으로

## 🚨 컴플레인 감지 시
불만 키워드(화나, 최악, 환불, 신고) 감지 시:
"불편을 드려 정말 죄송합니다. 담당자가 직접 연락드려 해결해드리겠습니다. 연락 가능한 번호 남겨주시겠어요?"
→ 즉시 사장님에게 알림 전송

---

지금부터 ${storeConfig.store_name}의 ${personaConfig.role_name}로서 고객과 상담합니다.
자연스럽고 전문적으로, 고객이 "예약해야겠다"고 느끼도록 대화하세요.`;

  return systemPrompt;
}

/**
 * 간단한 프롬프트 생성 (기존 호환용)
 */
export function buildSimplePrompt(store: Store): string {
  return buildUltraPrecisionPrompt(
    {
      store_name: store.store_name,
      business_type: store.business_type || 'default',
      operating_hours: store.operating_hours || '09:00-18:00',
      address: store.address || '',
      phone: store.phone || '',
      menu_data: store.menu_data || '[]',
      unique_selling_points: []
    },
    {
      role_name: store.ai_persona || '전문 상담사',
      experience_years: 10,
      specialty: [store.business_type || '전문 상담'],
      personality: 'professional',
      secondary_traits: ['꼼꼼함', '배려심']
    },
    {
      formality: 'formal',
      emoji_usage: 'minimal',
      allowed_emojis: ['😊', '✨', '📅'],
      custom_greetings: [],
      custom_closings: []
    }
  );
}

/**
 * 업종별 기본 프롬프트 반환
 */
export function getBusinessTypeTemplate(businessType: string) {
  return BUSINESS_TEMPLATES[businessType] || BUSINESS_TEMPLATES['default'];
}

/**
 * 말투 스타일 옵션 반환
 */
export function getToneStyleOptions() {
  return Object.keys(TONE_STYLES).map(key => ({
    value: key,
    label: {
      'very_formal': '매우 격식 (~하십니다)',
      'formal': '격식 (~합니다)',
      'polite_casual': '공손-캐주얼 (~해요)',
      'casual': '캐주얼 (~해)'
    }[key] || key
  }));
}

/**
 * 성격 옵션 반환
 */
export function getPersonalityOptions() {
  return Object.keys(PERSONALITY_INSTRUCTIONS).map(key => ({
    value: key,
    label: {
      'professional': '전문적',
      'warm': '따뜻함',
      'energetic': '활기참',
      'calm': '차분함',
      'witty': '위트'
    }[key] || key
  }));
}
