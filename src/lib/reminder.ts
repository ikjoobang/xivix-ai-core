// XIVIX AI Core - 예약 알림 리마인더 시스템
// 예약 24시간 전, 2시간 전 자동 알림 발송

import type { Env } from '../types';
import { sendTalkTalkMessage, createTalkTalkClient, isTestMode } from './naver-talktalk';

// 리마인더 타입
export type ReminderType = '24h' | '2h' | '1h' | 'custom';

// 리마인더 스케줄 인터페이스
export interface ReminderSchedule {
  id: number;
  store_id: number;
  reservation_id: number;
  reminder_type: ReminderType;
  scheduled_at: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  error_message?: string;
}

// 예약 정보 인터페이스
export interface ReservationWithStore {
  id: number;
  store_id: number;
  store_name: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  service_name: string;
  reservation_date: string;
  reservation_time: string;
  status: string;
}

/**
 * 예약에 대한 리마인더 스케줄 생성
 */
export async function createReminderSchedules(
  db: D1Database,
  reservationId: number,
  storeId: number,
  reservationDate: string,
  reservationTime: string
): Promise<{ created: number; schedules: ReminderSchedule[] }> {
  const schedules: ReminderSchedule[] = [];
  
  // 예약 일시 파싱
  const [year, month, day] = reservationDate.split('-').map(Number);
  const [hour, minute] = reservationTime.split(':').map(Number);
  const reservationDateTime = new Date(year, month - 1, day, hour, minute);
  
  const now = new Date();
  
  // 24시간 전 알림
  const reminder24h = new Date(reservationDateTime.getTime() - 24 * 60 * 60 * 1000);
  if (reminder24h > now) {
    await db.prepare(`
      INSERT INTO xivix_reminder_schedules (store_id, reservation_id, reminder_type, scheduled_at, status)
      VALUES (?, ?, '24h', ?, 'pending')
    `).bind(storeId, reservationId, reminder24h.toISOString()).run();
    
    schedules.push({
      id: 0,
      store_id: storeId,
      reservation_id: reservationId,
      reminder_type: '24h',
      scheduled_at: reminder24h.toISOString(),
      status: 'pending'
    });
  }
  
  // 2시간 전 알림
  const reminder2h = new Date(reservationDateTime.getTime() - 2 * 60 * 60 * 1000);
  if (reminder2h > now) {
    await db.prepare(`
      INSERT INTO xivix_reminder_schedules (store_id, reservation_id, reminder_type, scheduled_at, status)
      VALUES (?, ?, '2h', ?, 'pending')
    `).bind(storeId, reservationId, reminder2h.toISOString()).run();
    
    schedules.push({
      id: 0,
      store_id: storeId,
      reservation_id: reservationId,
      reminder_type: '2h',
      scheduled_at: reminder2h.toISOString(),
      status: 'pending'
    });
  }
  
  // 1시간 전 알림 (옵션)
  const reminder1h = new Date(reservationDateTime.getTime() - 1 * 60 * 60 * 1000);
  if (reminder1h > now) {
    await db.prepare(`
      INSERT INTO xivix_reminder_schedules (store_id, reservation_id, reminder_type, scheduled_at, status)
      VALUES (?, ?, '1h', ?, 'pending')
    `).bind(storeId, reservationId, reminder1h.toISOString()).run();
    
    schedules.push({
      id: 0,
      store_id: storeId,
      reservation_id: reservationId,
      reminder_type: '1h',
      scheduled_at: reminder1h.toISOString(),
      status: 'pending'
    });
  }
  
  return { created: schedules.length, schedules };
}

/**
 * 발송 대기 중인 리마인더 조회
 */
export async function getPendingReminders(
  db: D1Database,
  limit: number = 50
): Promise<(ReminderSchedule & ReservationWithStore)[]> {
  const result = await db.prepare(`
    SELECT 
      rs.*,
      r.customer_id,
      r.customer_name,
      r.customer_phone,
      r.service_name,
      r.reservation_date,
      r.reservation_time,
      r.status as reservation_status,
      s.store_name
    FROM xivix_reminder_schedules rs
    JOIN xivix_reservations r ON rs.reservation_id = r.id
    JOIN xivix_stores s ON rs.store_id = s.id
    WHERE rs.status = 'pending'
      AND rs.scheduled_at <= datetime('now')
      AND r.status IN ('confirmed', 'pending_approval')
    ORDER BY rs.scheduled_at ASC
    LIMIT ?
  `).bind(limit).all<ReminderSchedule & ReservationWithStore>();
  
  return result.results || [];
}

/**
 * 리마인더 메시지 생성
 */
function generateReminderMessage(
  reminderType: ReminderType,
  storeName: string,
  reservationDate: string,
  reservationTime: string,
  serviceName?: string
): string {
  const dateObj = new Date(reservationDate);
  const formattedDate = dateObj.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
  
  let timeText = '';
  switch (reminderType) {
    case '24h':
      timeText = '내일';
      break;
    case '2h':
      timeText = '2시간 후';
      break;
    case '1h':
      timeText = '1시간 후';
      break;
    default:
      timeText = '곧';
  }
  
  return `⏰ 예약 알림

안녕하세요! ${storeName}입니다.
${timeText} 예약이 있으신 것 잊지 않으셨죠?

📅 ${formattedDate} ${reservationTime}
${serviceName ? `💇 ${serviceName}` : ''}

방문을 기다리고 있겠습니다! 😊

※ 변경/취소가 필요하시면 미리 연락 부탁드립니다.`;
}

/**
 * 단일 리마인더 발송
 */
export async function sendReminder(
  db: D1Database,
  env: Env,
  reminder: ReminderSchedule & ReservationWithStore
): Promise<{ success: boolean; error?: string }> {
  try {
    // 메시지 생성
    const message = generateReminderMessage(
      reminder.reminder_type,
      reminder.store_name,
      reminder.reservation_date,
      reminder.reservation_time,
      reminder.service_name
    );
    
    // 톡톡 메시지 발송
    const result = await sendTalkTalkMessage(
      db,
      env,
      reminder.store_id,
      reminder.customer_id,
      message
    );
    
    if (result.success) {
      // 발송 성공 - 상태 업데이트
      await db.prepare(`
        UPDATE xivix_reminder_schedules 
        SET status = 'sent', sent_at = datetime('now')
        WHERE id = ?
      `).bind(reminder.id).run();
      
      // 알림 로그 기록
      await db.prepare(`
        INSERT INTO xivix_notification_logs (store_id, notification_type, recipient_phone, recipient_type, content, status, sent_at)
        VALUES (?, 'reminder', ?, 'customer', ?, 'sent', datetime('now'))
      `).bind(reminder.store_id, reminder.customer_phone || 'unknown', message.substring(0, 200)).run();
      
      return { success: true };
    } else {
      // 발송 실패 - 에러 기록
      await db.prepare(`
        UPDATE xivix_reminder_schedules 
        SET status = 'failed', error_message = ?
        WHERE id = ?
      `).bind(result.resultMessage || 'Unknown error', reminder.id).run();
      
      return { success: false, error: result.resultMessage };
    }
  } catch (error: any) {
    // 예외 발생 - 에러 기록
    await db.prepare(`
      UPDATE xivix_reminder_schedules 
      SET status = 'failed', error_message = ?
      WHERE id = ?
    `).bind(error.message || 'Exception', reminder.id).run();
    
    return { success: false, error: error.message };
  }
}

/**
 * 모든 대기 중인 리마인더 처리 (Cron Job용)
 */
export async function processAllPendingReminders(
  db: D1Database,
  env: Env
): Promise<{ processed: number; success: number; failed: number; errors: string[] }> {
  const reminders = await getPendingReminders(db, 100);
  
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (const reminder of reminders) {
    const result = await sendReminder(db, env, reminder);
    
    if (result.success) {
      success++;
    } else {
      failed++;
      if (result.error) {
        errors.push(`Reservation #${reminder.reservation_id}: ${result.error}`);
      }
    }
    
    // Rate limiting - 50ms 간격
    await new Promise(r => setTimeout(r, 50));
  }
  
  console.log(`[Reminder] Processed ${reminders.length} reminders: ${success} sent, ${failed} failed`);
  
  return {
    processed: reminders.length,
    success,
    failed,
    errors
  };
}

/**
 * 예약 취소 시 리마인더 취소
 */
export async function cancelReminders(
  db: D1Database,
  reservationId: number
): Promise<number> {
  const result = await db.prepare(`
    UPDATE xivix_reminder_schedules 
    SET status = 'cancelled'
    WHERE reservation_id = ? AND status = 'pending'
  `).bind(reservationId).run();
  
  return result.meta.changes || 0;
}

/**
 * 매장별 리마인더 통계 조회
 */
export async function getReminderStats(
  db: D1Database,
  storeId: number
): Promise<{
  total: number;
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
}> {
  const result = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
    FROM xivix_reminder_schedules
    WHERE store_id = ?
  `).bind(storeId).first<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
    cancelled: number;
  }>();
  
  return {
    total: result?.total || 0,
    pending: result?.pending || 0,
    sent: result?.sent || 0,
    failed: result?.failed || 0,
    cancelled: result?.cancelled || 0
  };
}
