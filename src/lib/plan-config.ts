// XIVIX AI Core V3.0 - 요금제별 기능 제한 설정
// 단가표 v3 기반 — plan 타입별 기능 매핑

// ============ 요금제 타입 ============
export type PlanType = 'mini' | 'light' | 'standard' | 'premium' | 'enterprise';

// ============ 기능 키 정의 ============
export type FeatureKey =
  | 'aiAutoResponse'       // AI 자동응답 (톡톡)
  | 'multiLanguage'        // 8개국어 다국어 지원
  | 'reservationReminder'  // 예약 리마인더
  | 'menuPriceGuide'       // 메뉴/가격 자동 안내
  | 'locationHoursGuide'   // 위치/영업시간 안내
  | 'customerDataMgmt'     // 고객 데이터 관리 (CRM)
  | 'visitCycleAlert'      // 방문주기 자동 알림
  | 'revenueStats'         // 매출/예약 통계
  | 'manualMessageIndiv'   // 수동 메시지 발송(개별)
  | 'manualMessageBulk'    // 수동 메시지 발송(단체)
  | 'expertAI'             // 전문 상담 AI (GPT-4o)
  | 'verificationAI'       // 검증 AI
  | 'imageAnalysis'        // 이미지 분석
  | 'multiStore'           // 멀티매장 관리
  | 'dedicatedManager'     // 전담 매니저
  | 'noshowPrevention'     // 노쇼 방지 리마인드
  | 'monthlyReport'        // 월간 리포트
  | 'callbackRequest';     // 콜백 요청 → SMS 알림

// ============ 요금제별 제한 설정 ============
export interface PlanConfig {
  name: string;            // 표시 이름
  nameEn: string;          // 영문명
  monthlyFee: number;      // 월 이용료 (원)
  setupFee: number;        // 셋팅비 (원)
  aiLimit: number;         // AI 대화 월 한도
  smsLimit: number;        // SMS 포함 건수
  smsExtraPrice: number;   // SMS 초과 단가 (원/건)
  features: FeatureKey[];  // 활성 기능 목록
}

// ============ 플랜별 설정 데이터 ============
export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  mini: {
    name: '소상공인 미니',
    nameEn: 'Mini',
    monthlyFee: 29000,
    setupFee: 100000,
    aiLimit: 500,
    smsLimit: 50,
    smsExtraPrice: 25,
    features: [
      'aiAutoResponse',
      'menuPriceGuide',
      'locationHoursGuide',
      'callbackRequest',
    ],
  },
  light: {
    name: '라이트',
    nameEn: 'Light',
    monthlyFee: 49000,
    setupFee: 300000,
    aiLimit: 1000,
    smsLimit: 100,
    smsExtraPrice: 25,
    features: [
      'aiAutoResponse',
      'multiLanguage',
      'reservationReminder',
      'menuPriceGuide',
      'locationHoursGuide',
      'callbackRequest',
      'noshowPrevention',
    ],
  },
  standard: {
    name: '스탠다드',
    nameEn: 'Standard',
    monthlyFee: 99000,
    setupFee: 300000,
    aiLimit: 5000,
    smsLimit: 300,
    smsExtraPrice: 20,
    features: [
      'aiAutoResponse',
      'multiLanguage',
      'reservationReminder',
      'menuPriceGuide',
      'locationHoursGuide',
      'customerDataMgmt',
      'visitCycleAlert',
      'revenueStats',
      'manualMessageIndiv',
      'manualMessageBulk',
      'callbackRequest',
      'noshowPrevention',
      'monthlyReport',
    ],
  },
  premium: {
    name: '프리미엄',
    nameEn: 'Premium',
    monthlyFee: 149000,
    setupFee: 500000,
    aiLimit: 10000,
    smsLimit: 1000,
    smsExtraPrice: 15,
    features: [
      'aiAutoResponse',
      'multiLanguage',
      'reservationReminder',
      'menuPriceGuide',
      'locationHoursGuide',
      'customerDataMgmt',
      'visitCycleAlert',
      'revenueStats',
      'manualMessageIndiv',
      'manualMessageBulk',
      'expertAI',
      'verificationAI',
      'imageAnalysis',
      'callbackRequest',
      'noshowPrevention',
      'monthlyReport',
      'dedicatedManager',
    ],
  },
  enterprise: {
    name: '다점포 (본점)',
    nameEn: 'Enterprise',
    monthlyFee: 149000,  // 본점 기준, 지점별 79,000원
    setupFee: 500000,
    aiLimit: 20000,      // 본점+지점 합산
    smsLimit: 2000,
    smsExtraPrice: 15,
    features: [
      'aiAutoResponse',
      'multiLanguage',
      'reservationReminder',
      'menuPriceGuide',
      'locationHoursGuide',
      'customerDataMgmt',
      'visitCycleAlert',
      'revenueStats',
      'manualMessageIndiv',
      'manualMessageBulk',
      'expertAI',
      'verificationAI',
      'imageAnalysis',
      'multiStore',
      'callbackRequest',
      'noshowPrevention',
      'monthlyReport',
      'dedicatedManager',
    ],
  },
};

// ============ 헬퍼 함수들 ============

/**
 * 해당 플랜에서 특정 기능 사용 가능 여부
 */
export function canUseFeature(plan: PlanType, feature: FeatureKey): boolean {
  const config = PLAN_CONFIGS[plan];
  if (!config) return false;
  return config.features.includes(feature);
}

/**
 * 플랜 설정 가져오기
 */
export function getPlanConfig(plan: PlanType): PlanConfig {
  return PLAN_CONFIGS[plan] || PLAN_CONFIGS.light;
}

/**
 * 매장의 플랜 타입을 안전하게 파싱
 */
export function parsePlan(planStr?: string | null): PlanType {
  const valid: PlanType[] = ['mini', 'light', 'standard', 'premium', 'enterprise'];
  if (planStr && valid.includes(planStr as PlanType)) {
    return planStr as PlanType;
  }
  return 'light'; // 기본값
}

/**
 * 기능 제한 시 사용자에게 보낼 안내 메시지
 */
export function getUpgradeMessage(feature: FeatureKey, currentPlan: PlanType): string {
  const featureNames: Record<FeatureKey, string> = {
    aiAutoResponse: 'AI 자동응답',
    multiLanguage: '다국어 지원',
    reservationReminder: '예약 리마인더',
    menuPriceGuide: '메뉴/가격 안내',
    locationHoursGuide: '위치/영업시간 안내',
    customerDataMgmt: '고객 관리(CRM)',
    visitCycleAlert: '방문주기 알림',
    revenueStats: '매출/예약 통계',
    manualMessageIndiv: '수동 메시지(개별)',
    manualMessageBulk: '수동 메시지(단체)',
    expertAI: '전문 상담 AI',
    verificationAI: '검증 AI',
    imageAnalysis: '이미지 분석',
    multiStore: '멀티매장 관리',
    dedicatedManager: '전담 매니저',
    noshowPrevention: '노쇼 방지 리마인드',
    monthlyReport: '월간 리포트',
    callbackRequest: '콜백 요청',
  };

  const currentName = PLAN_CONFIGS[currentPlan]?.name || currentPlan;
  const featureName = featureNames[feature] || feature;

  // 필요한 최소 플랜 찾기
  const plans: PlanType[] = ['mini', 'light', 'standard', 'premium', 'enterprise'];
  const requiredPlan = plans.find(p => PLAN_CONFIGS[p].features.includes(feature));
  const requiredName = requiredPlan ? PLAN_CONFIGS[requiredPlan].name : '상위';

  return `⚠️ [${featureName}] 기능은 현재 ${currentName} 요금제에서 제공되지 않습니다.\n` +
    `${requiredName} 요금제 이상으로 업그레이드하시면 이용 가능합니다.\n` +
    `📞 문의: 010-3988-0124`;
}

/**
 * AI 한도 초과 시 안내 메시지
 */
export function getAILimitMessage(plan: PlanType, used: number, limit: number): string {
  const config = PLAN_CONFIGS[plan];
  return `⚠️ 이번 달 AI 대화 건수가 한도에 도달했습니다.\n\n` +
    `📊 현재 요금제: ${config.name}\n` +
    `💬 사용량: ${used.toLocaleString()}건 / ${limit.toLocaleString()}건\n\n` +
    `상위 요금제로 업그레이드하시면 더 많은 AI 대화를 이용할 수 있습니다.\n` +
    `📞 문의: 010-3988-0124`;
}

/**
 * SMS 한도 초과 시 안내 메시지 (초과 과금 안내)
 */
export function getSMSLimitMessage(plan: PlanType, used: number, limit: number): string {
  const config = PLAN_CONFIGS[plan];
  return `📱 SMS 포함 건수를 초과했습니다.\n\n` +
    `📊 현재 요금제: ${config.name}\n` +
    `📨 사용량: ${used.toLocaleString()}건 / ${limit.toLocaleString()}건\n` +
    `💰 초과 단가: ${config.smsExtraPrice}원/건\n\n` +
    `초과 건수는 다음 청구서에 반영됩니다.`;
}

/**
 * 플랜 비교 정보 (업그레이드 안내용)
 */
export function getPlanComparisonSummary(): string {
  const plans: PlanType[] = ['mini', 'light', 'standard', 'premium'];
  return plans.map(p => {
    const c = PLAN_CONFIGS[p];
    return `📋 ${c.name} (${c.nameEn}) — 월 ${c.monthlyFee.toLocaleString()}원\n` +
      `  AI ${c.aiLimit.toLocaleString()}건 · SMS ${c.smsLimit}건 · 기능 ${c.features.length}개`;
  }).join('\n\n');
}
