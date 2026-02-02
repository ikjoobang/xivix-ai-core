// XIVIX AI Core - 네이버 예약 연동 라이브러리
// 네이버 예약 API 및 예약 흐름 처리
// [XIVIX_TOTAL_AUTOMATION] Phase 04 - Naver Booking Integration

import type { Env, Store } from '../types';

// ============ 네이버 예약 관련 타입 정의 ============

// 예약 슬롯 정보
export interface BookingSlot {
  date: string;        // YYYY-MM-DD
  time: string;        // HH:mm
  available: boolean;
  staffId?: string;
  staffName?: string;
  serviceId?: string;
  serviceName?: string;
}

// 예약 정보
export interface BookingInfo {
  bookingId?: string;
  storeId: number;
  naverReservationId: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  date: string;
  time: string;
  serviceName?: string;
  staffName?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt?: string;
  updatedAt?: string;
}

// 영업시간 파싱 결과
export interface BusinessHours {
  dayOfWeek: number;  // 0 = Sunday, 1 = Monday, ...
  open: string;       // HH:mm
  close: string;      // HH:mm
  isOff: boolean;     // 휴무일
}

// 예약 응답 메시지
export interface BookingResponse {
  success: boolean;
  message: string;
  slots?: BookingSlot[];
  bookingUrl?: string;
  error?: string;
}

// ============ 영업시간 파싱 ============

/**
 * 영업시간 문자열을 파싱합니다.
 * 예: "월-금 10:00-21:00, 토 10:00-18:00, 일 휴무"
 */
export function parseOperatingHours(operatingHours: string | null): BusinessHours[] {
  if (!operatingHours) {
    // 기본 영업시간 (월-토 10:00-21:00, 일 휴무)
    return [
      { dayOfWeek: 0, open: '', close: '', isOff: true },      // 일
      { dayOfWeek: 1, open: '10:00', close: '21:00', isOff: false }, // 월
      { dayOfWeek: 2, open: '10:00', close: '21:00', isOff: false }, // 화
      { dayOfWeek: 3, open: '10:00', close: '21:00', isOff: false }, // 수
      { dayOfWeek: 4, open: '10:00', close: '21:00', isOff: false }, // 목
      { dayOfWeek: 5, open: '10:00', close: '21:00', isOff: false }, // 금
      { dayOfWeek: 6, open: '10:00', close: '18:00', isOff: false }, // 토
    ];
  }

  const dayMap: { [key: string]: number[] } = {
    '일': [0], '월': [1], '화': [2], '수': [3], '목': [4], '금': [5], '토': [6],
    '월-금': [1, 2, 3, 4, 5],
    '월-토': [1, 2, 3, 4, 5, 6],
    '월-일': [0, 1, 2, 3, 4, 5, 6],
    '평일': [1, 2, 3, 4, 5],
    '주말': [0, 6],
  };

  const result: BusinessHours[] = Array(7).fill(null).map((_, i) => ({
    dayOfWeek: i,
    open: '',
    close: '',
    isOff: true
  }));

  // 쉼표로 구분된 각 규칙 파싱
  const rules = operatingHours.split(/[,，]/).map(r => r.trim());
  
  for (const rule of rules) {
    // 휴무 체크
    if (rule.includes('휴무') || rule.includes('정기휴무')) {
      const dayMatch = rule.match(/(월|화|수|목|금|토|일)/);
      if (dayMatch) {
        const days = dayMap[dayMatch[1]] || [];
        days.forEach(d => {
          result[d].isOff = true;
        });
      }
      continue;
    }

    // 시간 파싱 (예: "월-금 10:00-21:00" 또는 "토 10:00~18:00")
    const timeMatch = rule.match(/(\d{1,2}:\d{2})\s*[-~]\s*(\d{1,2}:\d{2})/);
    if (timeMatch) {
      const open = timeMatch[1];
      const close = timeMatch[2];

      // 요일 범위 찾기
      for (const [dayKey, days] of Object.entries(dayMap)) {
        if (rule.includes(dayKey)) {
          days.forEach(d => {
            result[d] = { dayOfWeek: d, open, close, isOff: false };
          });
        }
      }
    }
  }

  return result;
}

// ============ 예약 가능 시간 계산 ============

/**
 * 특정 날짜의 예약 가능 시간대를 계산합니다.
 */
export function getAvailableSlots(
  date: Date,
  businessHours: BusinessHours[],
  existingBookings: { time: string; duration: number }[],
  slotDuration: number = 30 // 기본 30분 단위
): BookingSlot[] {
  const dayOfWeek = date.getDay();
  const hours = businessHours.find(h => h.dayOfWeek === dayOfWeek);

  if (!hours || hours.isOff) {
    return []; // 휴무일
  }

  const slots: BookingSlot[] = [];
  const dateStr = date.toISOString().split('T')[0];
  
  // 영업시간을 분 단위로 변환
  const [openHour, openMin] = hours.open.split(':').map(Number);
  const [closeHour, closeMin] = hours.close.split(':').map(Number);
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  // 기존 예약을 시간 기준으로 정렬
  const bookedTimes = new Set(existingBookings.map(b => b.time));

  // 현재 시간 체크 (오늘 날짜인 경우)
  const now = new Date();
  const isToday = dateStr === now.toISOString().split('T')[0];
  let currentMinutes = openMinutes;
  
  if (isToday) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    currentMinutes = Math.max(openMinutes, Math.ceil(nowMinutes / slotDuration) * slotDuration + slotDuration);
  }

  // 슬롯 생성
  while (currentMinutes + slotDuration <= closeMinutes) {
    const hour = Math.floor(currentMinutes / 60);
    const min = currentMinutes % 60;
    const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    
    const isAvailable = !bookedTimes.has(timeStr);
    
    slots.push({
      date: dateStr,
      time: timeStr,
      available: isAvailable
    });

    currentMinutes += slotDuration;
  }

  return slots;
}

/**
 * 다음 N일간의 예약 가능 시간을 조회합니다.
 */
export async function getAvailableSlotsForDays(
  db: D1Database,
  storeId: number,
  operatingHours: string | null,
  days: number = 7,
  slotDuration: number = 30
): Promise<Map<string, BookingSlot[]>> {
  const businessHours = parseOperatingHours(operatingHours);
  const result = new Map<string, BookingSlot[]>();
  
  // 기존 예약 조회
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  const bookings = await db.prepare(`
    SELECT reservation_date, reservation_time, service_name
    FROM xivix_reservations
    WHERE store_id = ?
      AND reservation_date >= ?
      AND reservation_date <= ?
      AND status NOT IN ('cancelled', 'no_show')
  `).bind(
    storeId,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  ).all<{ reservation_date: string; reservation_time: string; service_name: string }>();

  // 날짜별 예약 그룹화
  const bookingsByDate = new Map<string, { time: string; duration: number }[]>();
  for (const booking of bookings.results || []) {
    const dateStr = booking.reservation_date;
    if (!bookingsByDate.has(dateStr)) {
      bookingsByDate.set(dateStr, []);
    }
    bookingsByDate.get(dateStr)!.push({
      time: booking.reservation_time,
      duration: 60 // 기본 1시간 (서비스별 duration은 추후 추가)
    });
  }

  // 각 날짜별 슬롯 계산
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const existingBookings = bookingsByDate.get(dateStr) || [];
    const slots = getAvailableSlots(date, businessHours, existingBookings, slotDuration);
    
    if (slots.length > 0) {
      result.set(dateStr, slots);
    }
  }

  return result;
}

// ============ 예약 의도 감지 및 처리 ============

/**
 * 메시지에서 예약 의도를 감지합니다.
 */
export interface BookingIntent {
  hasBookingIntent: boolean;
  intentType: 'inquiry' | 'check_available' | 'make_booking' | 'cancel' | 'change' | 'none';
  extractedDate?: string;     // 추출된 날짜 (YYYY-MM-DD)
  extractedTime?: string;     // 추출된 시간 (HH:mm)
  extractedService?: string;  // 추출된 서비스명
  confidence: number;         // 0-1
}

export function detectBookingIntent(message: string): BookingIntent {
  const lowerMsg = message.toLowerCase();
  
  // 예약 관련 키워드
  const bookingKeywords = ['예약', '예매', '부킹', '스케줄', '일정'];
  const timeKeywords = ['시간', '언제', '몇시', '오전', '오후', '저녁', '아침'];
  const availableKeywords = ['빈자리', '가능', '자리', '비어있', '남은'];
  const cancelKeywords = ['취소', '캔슬'];
  const changeKeywords = ['변경', '수정', '바꾸'];
  
  // 날짜 추출 (오늘, 내일, 모레, 이번주, 다음주, 특정 날짜)
  let extractedDate: string | undefined;
  const today = new Date();
  
  if (/오늘/.test(message)) {
    extractedDate = today.toISOString().split('T')[0];
  } else if (/내일/.test(message)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    extractedDate = tomorrow.toISOString().split('T')[0];
  } else if (/모레/.test(message)) {
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    extractedDate = dayAfter.toISOString().split('T')[0];
  } else if (/(\d{1,2})월\s*(\d{1,2})일/.test(message)) {
    const match = message.match(/(\d{1,2})월\s*(\d{1,2})일/);
    if (match) {
      const month = parseInt(match[1]) - 1;
      const day = parseInt(match[2]);
      const targetDate = new Date(today.getFullYear(), month, day);
      if (targetDate < today) {
        targetDate.setFullYear(today.getFullYear() + 1);
      }
      extractedDate = targetDate.toISOString().split('T')[0];
    }
  } else if (/이번\s*주\s*(월|화|수|목|금|토|일)/.test(message)) {
    const dayMap: { [key: string]: number } = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
    const match = message.match(/이번\s*주\s*(월|화|수|목|금|토|일)/);
    if (match) {
      const targetDay = dayMap[match[1]];
      const currentDay = today.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7;
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + diff);
      extractedDate = targetDate.toISOString().split('T')[0];
    }
  }

  // 시간 추출
  let extractedTime: string | undefined;
  const timeMatch = message.match(/(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분)?|(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1] || timeMatch[3]);
    const min = parseInt(timeMatch[2] || timeMatch[4] || '0');
    
    // 오후/저녁 표현이 있으면 12시간 추가
    if (/오후|저녁|pm/i.test(message) && hour < 12) {
      hour += 12;
    }
    
    extractedTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  }

  // 의도 분류
  let intentType: BookingIntent['intentType'] = 'none';
  let confidence = 0;

  const hasBookingKeyword = bookingKeywords.some(k => lowerMsg.includes(k));
  const hasTimeKeyword = timeKeywords.some(k => lowerMsg.includes(k));
  const hasAvailableKeyword = availableKeywords.some(k => lowerMsg.includes(k));
  const hasCancelKeyword = cancelKeywords.some(k => lowerMsg.includes(k));
  const hasChangeKeyword = changeKeywords.some(k => lowerMsg.includes(k));

  if (hasCancelKeyword && hasBookingKeyword) {
    intentType = 'cancel';
    confidence = 0.9;
  } else if (hasChangeKeyword && hasBookingKeyword) {
    intentType = 'change';
    confidence = 0.85;
  } else if (hasBookingKeyword && (extractedDate || extractedTime)) {
    intentType = 'make_booking';
    confidence = 0.9;
  } else if (hasAvailableKeyword || (hasTimeKeyword && hasBookingKeyword)) {
    intentType = 'check_available';
    confidence = 0.85;
  } else if (hasBookingKeyword) {
    intentType = 'inquiry';
    confidence = 0.7;
  }

  return {
    hasBookingIntent: intentType !== 'none',
    intentType,
    extractedDate,
    extractedTime,
    confidence
  };
}

// ============ 예약 응답 메시지 생성 ============

/**
 * 예약 가능 시간 안내 메시지를 생성합니다.
 */
export function generateAvailableSlotsMessage(
  storeName: string,
  slots: Map<string, BookingSlot[]>,
  targetDate?: string
): string {
  if (slots.size === 0) {
    return `죄송합니다. 현재 예약 가능한 시간이 없습니다. 😢\n다른 날짜를 확인해 보시겠어요?`;
  }

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  let message = `📅 ${storeName} 예약 가능 시간\n\n`;

  // 특정 날짜가 지정된 경우
  if (targetDate && slots.has(targetDate)) {
    const daySlots = slots.get(targetDate)!;
    const availableSlots = daySlots.filter(s => s.available);
    const date = new Date(targetDate);
    const dayName = dayNames[date.getDay()];
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}(${dayName})`;

    if (availableSlots.length === 0) {
      message += `${dateStr}: 예약 마감\n`;
      message += `\n다른 날짜를 확인해 보시겠어요?`;
    } else {
      message += `📆 ${dateStr}\n`;
      message += availableSlots.slice(0, 8).map(s => `  ✅ ${s.time}`).join('\n');
      if (availableSlots.length > 8) {
        message += `\n  ...외 ${availableSlots.length - 8}개 시간대`;
      }
    }
  } else {
    // 전체 날짜 표시 (최대 5일)
    let count = 0;
    for (const [dateStr, daySlots] of slots) {
      if (count >= 5) break;
      
      const availableSlots = daySlots.filter(s => s.available);
      if (availableSlots.length === 0) continue;

      const date = new Date(dateStr);
      const dayName = dayNames[date.getDay()];
      const displayDate = `${date.getMonth() + 1}/${date.getDate()}(${dayName})`;

      message += `📆 ${displayDate}\n`;
      message += availableSlots.slice(0, 4).map(s => `  ✅ ${s.time}`).join('\n');
      if (availableSlots.length > 4) {
        message += `\n  ...외 ${availableSlots.length - 4}개`;
      }
      message += '\n\n';
      count++;
    }
  }

  message += '\n원하시는 날짜와 시간을 말씀해 주시면 예약 도와드릴게요! 😊';
  
  return message;
}

/**
 * 예약 확인 요청 메시지를 생성합니다.
 */
export function generateBookingConfirmMessage(
  storeName: string,
  date: string,
  time: string,
  serviceName?: string
): string {
  const dateObj = new Date(date);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const formattedDate = `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 (${dayNames[dateObj.getDay()]})`;
  
  let message = `📋 예약 확인\n\n`;
  message += `📍 ${storeName}\n`;
  message += `📅 ${formattedDate}\n`;
  message += `⏰ ${time}\n`;
  if (serviceName) {
    message += `💇 ${serviceName}\n`;
  }
  message += `\n이대로 예약을 진행할까요?`;
  
  return message;
}

/**
 * 예약 완료 메시지를 생성합니다.
 */
export function generateBookingCompleteMessage(
  storeName: string,
  date: string,
  time: string,
  bookingId?: string,
  serviceName?: string
): string {
  const dateObj = new Date(date);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const formattedDate = `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 (${dayNames[dateObj.getDay()]})`;
  
  let message = `🎉 예약이 완료되었습니다!\n\n`;
  message += `📍 ${storeName}\n`;
  message += `📅 ${formattedDate} ${time}\n`;
  if (serviceName) {
    message += `💇 ${serviceName}\n`;
  }
  if (bookingId) {
    message += `🔖 예약번호: ${bookingId}\n`;
  }
  message += `\n방문 전 변경사항이 있으시면 미리 말씀해주세요.\n감사합니다! 😊`;
  
  return message;
}

// ============ 예약 생성/관리 함수 ============

/**
 * 새 예약을 생성합니다.
 */
export async function createBooking(
  db: D1Database,
  booking: Omit<BookingInfo, 'bookingId' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  try {
    // 예약 가능 여부 확인 (중복 체크)
    const existing = await db.prepare(`
      SELECT id FROM xivix_reservations
      WHERE store_id = ?
        AND reservation_date = ?
        AND reservation_time = ?
        AND status NOT IN ('cancelled', 'no_show')
    `).bind(
      booking.storeId,
      booking.date,
      booking.time
    ).first();

    if (existing) {
      return { success: false, error: '해당 시간에 이미 예약이 있습니다.' };
    }

    // 예약 생성 (실제 테이블 스키마에 맞춤)
    const result = await db.prepare(`
      INSERT INTO xivix_reservations (
        store_id, customer_id, customer_name, customer_phone,
        reservation_date, reservation_time, service_name, status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', 'ai')
    `).bind(
      booking.storeId,
      booking.customerId,
      booking.customerName || null,
      booking.customerPhone || null,
      booking.date,
      booking.time,
      booking.serviceName || '일반 서비스',
      booking.status || 'confirmed'
    ).run();

    const bookingId = `BK${Date.now().toString(36).toUpperCase()}`;
    
    return { success: true, bookingId };
  } catch (error: any) {
    console.error('[Booking] Create error:', error);
    return { success: false, error: error.message || '예약 생성 중 오류가 발생했습니다.' };
  }
}

/**
 * 예약을 취소합니다.
 */
export async function cancelBooking(
  db: D1Database,
  storeId: number,
  customerId: string,
  date?: string
): Promise<{ success: boolean; cancelledCount: number; error?: string }> {
  try {
    let query = `
      UPDATE xivix_reservations
      SET status = 'cancelled', updated_at = datetime('now')
      WHERE store_id = ? AND customer_id = ? AND status NOT IN ('cancelled', 'completed')
    `;
    const params: any[] = [storeId, customerId];

    if (date) {
      query += ' AND reservation_date = ?';
      params.push(date);
    }

    const result = await db.prepare(query).bind(...params).run();
    
    return { 
      success: true, 
      cancelledCount: result.meta.changes || 0 
    };
  } catch (error: any) {
    console.error('[Booking] Cancel error:', error);
    return { success: false, cancelledCount: 0, error: error.message || '예약 취소 중 오류가 발생했습니다.' };
  }
}

/**
 * 고객의 예약 목록을 조회합니다.
 */
export async function getCustomerBookings(
  db: D1Database,
  storeId: number,
  customerId: string,
  includeHistory: boolean = false
): Promise<BookingInfo[]> {
  try {
    let statusFilter = includeHistory 
      ? ''
      : "AND status NOT IN ('cancelled', 'completed', 'no_show')";
    
    const bookings = await db.prepare(`
      SELECT * FROM xivix_reservations
      WHERE store_id = ? AND customer_id = ? ${statusFilter}
      ORDER BY reservation_date ASC, reservation_time ASC
      LIMIT 10
    `).bind(storeId, customerId).all<any>();

    return (bookings.results || []).map(b => ({
      bookingId: `BK${b.id}`,
      storeId: b.store_id,
      naverReservationId: b.naver_reservation_id,
      customerId: b.customer_id,
      customerName: b.customer_name,
      customerPhone: b.customer_phone,
      date: b.reservation_date,
      time: b.reservation_time,
      serviceName: b.service_name,
      staffName: b.staff_name,
      status: b.status,
      createdAt: b.created_at,
      updatedAt: b.updated_at
    }));
  } catch (error) {
    console.error('[Booking] Get customer bookings error:', error);
    return [];
  }
}

// ============ 네이버 예약 페이지 URL 생성 ============

/**
 * 네이버 예약 페이지 URL을 생성합니다.
 */
export function getNaverBookingUrl(naverReservationId: string | number): string {
  return `https://booking.naver.com/booking/12/bizes/${naverReservationId}`;
}

/**
 * 네이버 플레이스 URL을 생성합니다.
 */
export function getNaverPlaceUrl(naverReservationId: string | number): string {
  return `https://place.naver.com/place/${naverReservationId}`;
}

// ============ 예약 관련 상태 관리 (KV 활용) ============

export interface BookingConversationState {
  isBookingFlow: boolean;
  step: 'idle' | 'checking_date' | 'checking_time' | 'confirming' | 'completed';
  targetDate?: string;
  targetTime?: string;
  targetService?: string;
  lastUpdated: number;
}

/**
 * 예약 대화 상태를 조회합니다.
 */
export async function getBookingState(
  kv: KVNamespace,
  storeId: number,
  customerId: string
): Promise<BookingConversationState> {
  const key = `booking_state:${storeId}:${customerId}`;
  const state = await kv.get(key, 'json') as BookingConversationState | null;
  
  if (!state || Date.now() - state.lastUpdated > 10 * 60 * 1000) { // 10분 만료
    return {
      isBookingFlow: false,
      step: 'idle',
      lastUpdated: Date.now()
    };
  }
  
  return state;
}

/**
 * 예약 대화 상태를 저장합니다.
 */
export async function setBookingState(
  kv: KVNamespace,
  storeId: number,
  customerId: string,
  state: Partial<BookingConversationState>
): Promise<void> {
  const key = `booking_state:${storeId}:${customerId}`;
  const currentState = await getBookingState(kv, storeId, customerId);
  
  const newState: BookingConversationState = {
    ...currentState,
    ...state,
    lastUpdated: Date.now()
  };
  
  await kv.put(key, JSON.stringify(newState), { expirationTtl: 600 }); // 10분 TTL
}

/**
 * 예약 대화 상태를 초기화합니다.
 */
export async function clearBookingState(
  kv: KVNamespace,
  storeId: number,
  customerId: string
): Promise<void> {
  const key = `booking_state:${storeId}:${customerId}`;
  await kv.delete(key);
}
