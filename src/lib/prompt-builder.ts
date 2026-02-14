// =====================================================
// 프롬프트 빌더 - 섹션별 데이터를 조합하여 최종 프롬프트 생성
// AI 의존도 최소화: 데이터만 추출하고, 조합은 코드가 담당
// =====================================================

export interface EventItem {
  name: string;
  original_price?: number;
  sale_price?: number;
  discount_rate?: string;
  description?: string;
}

export interface ServiceItem {
  name: string;
  price?: number;
  price_text?: string;  // "50,000원" 또는 "가격 미확인"
  duration?: string;
  vat_included?: boolean;
  description?: string;
}

export interface ReservationPolicy {
  deposit?: number;
  deposit_text?: string;
  cancellation_policy?: string;
  vip_benefits?: string;
  notes?: string;
}

export interface StorePromptData {
  // 기본 정보 (고정)
  store_name: string;
  business_type: string;
  phone?: string;
  address?: string;
  operating_hours?: string;
  store_description?: string;
  
  // 섹션별 데이터
  events_data: EventItem[];
  services_data: ServiceItem[];
  reservation_policy: ReservationPolicy;
  
  // AI 설정
  ai_persona?: string;
  ai_tone?: string;
  greeting_message?: string;
  forbidden_keywords?: string;
  custom_guidelines?: string;
  
  // 템플릿 타입
  prompt_template_type?: string;
}

// 가격 포맷팅 헬퍼
function formatPrice(price?: number): string {
  if (!price) return '가격 미확인';
  return price.toLocaleString('ko-KR') + '원';
}

// =====================================================
// 메인 프롬프트 빌더
// =====================================================
export function buildSystemPrompt(data: StorePromptData): string {
  const {
    store_name,
    business_type,
    phone,
    address,
    operating_hours,
    store_description,
    events_data,
    services_data,
    reservation_policy,
    ai_persona,
    ai_tone,
    forbidden_keywords,
    custom_guidelines
  } = data;

  // 1. 헤더
  const header = `당신은 ${store_name}의 수석 AI 실장입니다.`;

  // 2. 매장 소개 (있을 경우)
  const introSection = store_description 
    ? `\n## 🏪 매장 소개\n${store_description}`
    : '';

  // 3. 현재 이벤트 섹션
  let eventsSection = '\n## 🎖️ 현재 진행 중인 핵심 혜택';
  if (events_data && events_data.length > 0) {
    eventsSection += '\n' + events_data.map(event => {
      if (event.original_price && event.sale_price) {
        return `- ${event.name}: ${formatPrice(event.original_price)} → ${formatPrice(event.sale_price)} (${event.discount_rate || '할인'})${event.description ? ' - ' + event.description : ''}`;
      } else {
        return `- ${event.name}${event.description ? ': ' + event.description : ''}`;
      }
    }).join('\n');
  } else {
    eventsSection += '\n현재 진행 중인 이벤트가 없습니다.';
  }

  // 4. 서비스 가격표 섹션
  let servicesSection = '\n## 📋 전체 서비스 안내 및 가격';
  if (services_data && services_data.length > 0) {
    servicesSection += '\n' + services_data.map(service => {
      const priceText = service.price_text || formatPrice(service.price);
      const vatText = service.vat_included === false ? ' (VAT 별도)' : '';
      const durationText = service.duration ? ` [${service.duration}]` : '';
      return `- ${service.name}: ${priceText}${vatText}${durationText}`;
    }).join('\n');
  } else {
    servicesSection += '\n(서비스 정보를 추가해 주세요)';
  }

  // 5. 이용 정보 섹션
  let infoSection = '\n## ⏰ 이용 정보 및 예약 규정';
  if (operating_hours) infoSection += `\n- 영업시간: ${operating_hours}`;
  if (phone) infoSection += `\n- 전화번호: ${phone}`;
  if (address) infoSection += `\n- 주소: ${address}`;
  
  // 예약 규정
  if (reservation_policy) {
    if (reservation_policy.deposit || reservation_policy.deposit_text) {
      infoSection += `\n- 예약금: ${reservation_policy.deposit_text || formatPrice(reservation_policy.deposit)}`;
    }
    if (reservation_policy.cancellation_policy) {
      infoSection += `\n- 취소 규정: ${reservation_policy.cancellation_policy}`;
    }
    if (reservation_policy.vip_benefits) {
      infoSection += `\n- VIP 혜택: ${reservation_policy.vip_benefits}`;
    }
    if (reservation_policy.notes) {
      infoSection += `\n- ${reservation_policy.notes}`;
    }
  }
  infoSection += '\n- VAT: 별도';

  // 6. 응대 지침 섹션
  let guidelinesSection = '\n## 📌 응대 지침';
  guidelinesSection += '\n- 가격 문의 시 위에 명시된 **정확한 금액**을 안내';
  guidelinesSection += '\n- 현재 진행 중인 이벤트를 적극 안내';
  guidelinesSection += '\n- 모든 상담은 예약으로 마무리';
  
  if (ai_tone) {
    guidelinesSection += `\n- 톤앤매너: ${ai_tone}`;
  }
  
  if (custom_guidelines) {
    guidelinesSection += `\n- ${custom_guidelines}`;
  }

  // 7. 금지 사항
  let forbiddenSection = '';
  if (forbidden_keywords) {
    forbiddenSection = `\n## ⛔ 금지 사항\n- 다음 표현 사용 금지: ${forbidden_keywords}\n- "가격 변동", "가격 문의" 등 모호한 표현 금지`;
  }

  // 최종 조합
  return [
    header,
    introSection,
    eventsSection,
    servicesSection,
    infoSection,
    guidelinesSection,
    forbiddenSection
  ].filter(Boolean).join('\n');
}

// =====================================================
// 텍스트에서 데이터 추출 (AI 호출용 프롬프트)
// AI는 추출만 하고, 조합은 buildSystemPrompt가 담당
// =====================================================
export function getExtractionPrompt(text: string, existingData?: Partial<StorePromptData>): string {
  return `당신은 텍스트에서 구조화된 데이터를 추출하는 전문가입니다.

## 🔒 규칙
1. 숫자(가격, %)는 **정확히 그대로** 추출
2. 없는 정보는 null로 설정 (지어내기 금지)
3. JSON만 출력

## 📥 입력 텍스트
${text}

${existingData ? `## 📋 기존 데이터 (참고용 - 중복 제거)
${JSON.stringify(existingData, null, 2)}` : ''}

## 📤 출력 형식 (JSON만 출력)
{
  "events": [
    {"name": "서비스명", "original_price": 120000, "sale_price": 60000, "discount_rate": "50%", "description": "설명"}
  ],
  "services": [
    {"name": "서비스명", "price": 50000, "price_text": "50,000원", "duration": "1시간", "vat_included": false}
  ],
  "reservation_policy": {
    "deposit": 20000,
    "deposit_text": "20,000원",
    "cancellation_policy": "당일 취소 불가",
    "vip_benefits": "예약금 면제"
  },
  "operating_hours": "10:00-19:00 (일요일 휴무)",
  "phone": "",
  "store_description": "매장 소개 문구"
}

**중요**: 할인 이벤트는 events에, 일반 서비스는 services에 분류하세요.`;
}

// =====================================================
// 추출된 데이터 병합 헬퍼
// =====================================================
export function mergeExtractedData(
  existing: Partial<StorePromptData>,
  extracted: any
): Partial<StorePromptData> {
  const result: Partial<StorePromptData> = { ...existing };

  // 이벤트 병합 (새 데이터 우선)
  if (extracted.events && extracted.events.length > 0) {
    const existingEvents = existing.events_data || [];
    const newEvents = extracted.events;
    
    // 이름으로 중복 제거 (새 데이터 우선)
    const eventMap = new Map();
    existingEvents.forEach((e: EventItem) => eventMap.set(e.name, e));
    newEvents.forEach((e: EventItem) => eventMap.set(e.name, e));
    
    result.events_data = Array.from(eventMap.values());
  }

  // 서비스 병합 (새 데이터 우선)
  if (extracted.services && extracted.services.length > 0) {
    const existingServices = existing.services_data || [];
    const newServices = extracted.services;
    
    const serviceMap = new Map();
    existingServices.forEach((s: ServiceItem) => serviceMap.set(s.name, s));
    newServices.forEach((s: ServiceItem) => serviceMap.set(s.name, s));
    
    result.services_data = Array.from(serviceMap.values());
  }

  // 예약 규정 병합
  if (extracted.reservation_policy) {
    result.reservation_policy = {
      ...(existing.reservation_policy || {}),
      ...extracted.reservation_policy
    };
  }

  // 단일 필드 업데이트 (새 데이터가 있으면 덮어쓰기)
  if (extracted.operating_hours) result.operating_hours = extracted.operating_hours;
  if (extracted.phone) result.phone = extracted.phone;
  if (extracted.store_description) result.store_description = extracted.store_description;

  return result;
}
