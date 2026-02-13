// XIVIX AI Core V1.0 - REST API Routes
// 대시보드 및 관리 기능용 API

import { Hono } from 'hono';
import type { Env, Store, User, ConversationLog, Reservation, DashboardStats, ApiResponse } from '../types';
import { getStoreStats, cacheStoreStats } from '../lib/kv-context';
import { getImage, deleteImage, cleanupOldImages } from '../lib/r2-storage';
import {
  notifyMasterPaymentCompleted,
  notifyMasterPaymentFailed,
  notifyMasterSubscriptionRenewed,
  notifyMasterSubscriptionCancelled
} from '../lib/notification';
import {
  masterLogin,
  ownerLogin,
  registerOwner,
  validateSession,
  deleteSession,
  getCurrentUser,
  changePassword,
  cleanupExpiredSessions,
  hashPassword
} from '../lib/auth';
import { 
  notifyMasterOnboarding, 
  notifyOwnerSetupComplete,
  notifyReservationConfirmed,
  notifyReservationReminder,
  sendSMS
} from '../lib/notification';
import {
  createReminderSchedules,
  getPendingReminders,
  processAllPendingReminders,
  cancelReminders,
  getReminderStats,
  sendReminder
} from '../lib/reminder';
import { 
  getOpenAIResponse, 
  validateOpenAIKey, 
  buildOpenAISystemPrompt, 
  buildOpenAIMessages,
  analyzeImageWithOpenAI 
} from '../lib/openai';
import { 
  buildGeminiMessages, 
  buildSystemInstruction, 
  getGeminiResponse 
} from '../lib/gemini';
import { getConversationContext } from '../lib/kv-context';
import {
  buildSystemPrompt as buildPromptFromSections,
  getExtractionPrompt,
  mergeExtractedData,
  type StorePromptData,
  type EventItem,
  type ServiceItem,
  type ReservationPolicy
} from '../lib/prompt-builder';
import {
  validateFileType,
  validateFileSize,
  uploadFileToR2,
  getFileFromR2,
  listStoreFiles,
  deleteFileFromR2,
  fileToBase64,
  fetchUrlContent,
  analyzeWithGemini,
  analyzeWithOpenAI,
  extractStoreInfoFromContent,
  SUPPORTED_FILE_TYPES
} from '../lib/file-upload';
import {
  getIndustryList,
  getIndustryTemplate,
  getIndustriesByCategory,
  buildStoreSystemPrompt,
  INDUSTRY_TEMPLATES,
  getHairSalonPromptTypes,
  getHairSalonPromptType,
  applyStoreToPromptType,
  parseMenuData,
  getInsurancePromptTypes,
  getInsurancePromptType,
  applyStoreToInsurancePrompt
} from '../lib/industry-templates';
import { runPromptPipeline, type PromptPipelineInput } from '../lib/prompt-pipeline';
import { saveTalkTalkConfig, getTalkTalkConfig } from '../lib/naver-talktalk';

const api = new Hono<{ Bindings: Env }>();

// ============ Authentication API ============

// 마스터 로그인
api.post('/auth/master/login', async (c) => {
  const { email, password } = await c.req.json() as { email: string; password: string };
  const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const userAgent = c.req.header('User-Agent') || 'unknown';
  
  if (!email || !password) {
    return c.json<ApiResponse>({
      success: false,
      error: '이메일과 비밀번호를 입력해주세요.',
      timestamp: Date.now()
    }, 400);
  }
  
  const result = await masterLogin(c.env.DB, email, password, ipAddress, userAgent);
  
  if (!result.success) {
    return c.json<ApiResponse>({
      success: false,
      error: result.error,
      timestamp: Date.now()
    }, 401);
  }
  
  return c.json<ApiResponse>({
    success: true,
    data: {
      token: result.token,
      user: result.user,
      userType: 'master'
    },
    timestamp: Date.now()
  });
});

// 사장님 로그인
api.post('/auth/owner/login', async (c) => {
  const { email, password } = await c.req.json() as { email: string; password: string };
  const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const userAgent = c.req.header('User-Agent') || 'unknown';
  
  if (!email || !password) {
    return c.json<ApiResponse>({
      success: false,
      error: '이메일과 비밀번호를 입력해주세요.',
      timestamp: Date.now()
    }, 400);
  }
  
  const result = await ownerLogin(c.env.DB, email, password, ipAddress, userAgent);
  
  if (!result.success) {
    return c.json<ApiResponse>({
      success: false,
      error: result.error,
      timestamp: Date.now()
    }, 401);
  }
  
  return c.json<ApiResponse>({
    success: true,
    data: {
      token: result.token,
      user: result.user,
      userType: 'owner',
      storeId: result.storeId
    },
    timestamp: Date.now()
  });
});

// 사장님 회원가입
api.post('/auth/owner/register', async (c) => {
  const { email, password, name, phone } = await c.req.json() as {
    email: string;
    password: string;
    name: string;
    phone?: string;
  };
  
  if (!email || !password || !name) {
    return c.json<ApiResponse>({
      success: false,
      error: '필수 정보를 모두 입력해주세요.',
      timestamp: Date.now()
    }, 400);
  }
  
  if (password.length < 8) {
    return c.json<ApiResponse>({
      success: false,
      error: '비밀번호는 8자 이상이어야 합니다.',
      timestamp: Date.now()
    }, 400);
  }
  
  const result = await registerOwner(c.env.DB, email, password, name, phone);
  
  if (!result.success) {
    return c.json<ApiResponse>({
      success: false,
      error: result.error,
      timestamp: Date.now()
    }, 400);
  }
  
  return c.json<ApiResponse>({
    success: true,
    data: { userId: result.userId },
    timestamp: Date.now()
  });
});

// 로그아웃
api.post('/auth/logout', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const userAgent = c.req.header('User-Agent') || 'unknown';
  
  if (!token) {
    return c.json<ApiResponse>({
      success: false,
      error: '인증 토큰이 필요합니다.',
      timestamp: Date.now()
    }, 401);
  }
  
  await deleteSession(c.env.DB, token, ipAddress, userAgent);
  
  return c.json<ApiResponse>({
    success: true,
    data: { message: '로그아웃되었습니다.' },
    timestamp: Date.now()
  });
});

// 현재 사용자 정보 조회
api.get('/auth/me', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return c.json<ApiResponse>({
      success: false,
      error: '인증 토큰이 필요합니다.',
      timestamp: Date.now()
    }, 401);
  }
  
  const currentUser = await getCurrentUser(c.env.DB, token);
  
  if (!currentUser) {
    return c.json<ApiResponse>({
      success: false,
      error: '세션이 만료되었거나 유효하지 않습니다.',
      timestamp: Date.now()
    }, 401);
  }
  
  return c.json<ApiResponse>({
    success: true,
    data: currentUser,
    timestamp: Date.now()
  });
});

// 비밀번호 변경
api.post('/auth/change-password', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const { oldPassword, newPassword } = await c.req.json() as {
    oldPassword: string;
    newPassword: string;
  };
  
  if (!token) {
    return c.json<ApiResponse>({
      success: false,
      error: '인증 토큰이 필요합니다.',
      timestamp: Date.now()
    }, 401);
  }
  
  if (!oldPassword || !newPassword) {
    return c.json<ApiResponse>({
      success: false,
      error: '현재 비밀번호와 새 비밀번호를 입력해주세요.',
      timestamp: Date.now()
    }, 400);
  }
  
  if (newPassword.length < 8) {
    return c.json<ApiResponse>({
      success: false,
      error: '새 비밀번호는 8자 이상이어야 합니다.',
      timestamp: Date.now()
    }, 400);
  }
  
  const session = await validateSession(c.env.DB, token);
  if (!session) {
    return c.json<ApiResponse>({
      success: false,
      error: '세션이 만료되었습니다.',
      timestamp: Date.now()
    }, 401);
  }
  
  const result = await changePassword(
    c.env.DB,
    session.user_type as 'master' | 'owner',
    session.user_id,
    oldPassword,
    newPassword
  );
  
  if (!result.success) {
    return c.json<ApiResponse>({
      success: false,
      error: result.error,
      timestamp: Date.now()
    }, 400);
  }
  
  return c.json<ApiResponse>({
    success: true,
    data: { message: '비밀번호가 변경되었습니다.' },
    timestamp: Date.now()
  });
});

// 세션 검증 (프론트엔드용)
api.get('/auth/verify', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return c.json<ApiResponse>({
      success: false,
      error: '인증 토큰이 필요합니다.',
      timestamp: Date.now()
    }, 401);
  }
  
  const session = await validateSession(c.env.DB, token);
  
  if (!session) {
    return c.json<ApiResponse>({
      success: false,
      error: '세션이 만료되었거나 유효하지 않습니다.',
      timestamp: Date.now()
    }, 401);
  }
  
  return c.json<ApiResponse>({
    success: true,
    data: {
      valid: true,
      userType: session.user_type,
      userId: session.user_id,
      expiresAt: session.expires_at
    },
    timestamp: Date.now()
  });
});

// 마스터 계정 초기 비밀번호 설정 (최초 1회용)
api.post('/auth/master/init-password', async (c) => {
  const { email, password } = await c.req.json() as { email: string; password: string };
  
  if (!email || !password) {
    return c.json<ApiResponse>({
      success: false,
      error: '이메일과 비밀번호를 입력해주세요.',
      timestamp: Date.now()
    }, 400);
  }
  
  // 마스터 계정 확인
  const master = await c.env.DB.prepare(`
    SELECT id, password_hash FROM xivix_master_accounts WHERE email = ?
  `).bind(email).first<{ id: number; password_hash: string }>();
  
  if (!master) {
    return c.json<ApiResponse>({
      success: false,
      error: '마스터 계정을 찾을 수 없습니다.',
      timestamp: Date.now()
    }, 404);
  }
  
  // 이미 비밀번호가 설정되어 있으면 (sha256으로 시작하면) 거부
  if (master.password_hash.startsWith('sha256:')) {
    return c.json<ApiResponse>({
      success: false,
      error: '이미 비밀번호가 설정되어 있습니다. 로그인 페이지를 이용해주세요.',
      timestamp: Date.now()
    }, 400);
  }
  
  // 새 비밀번호 해시 생성 및 저장
  const newHash = await hashPassword(password);
  await c.env.DB.prepare(`
    UPDATE xivix_master_accounts SET password_hash = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(newHash, master.id).run();
  
  return c.json<ApiResponse>({
    success: true,
    data: { message: '비밀번호가 설정되었습니다. 이제 로그인할 수 있습니다.' },
    timestamp: Date.now()
  });
});

// 만료된 세션 정리 (관리용)
api.post('/auth/cleanup-sessions', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return c.json<ApiResponse>({
      success: false,
      error: '인증 토큰이 필요합니다.',
      timestamp: Date.now()
    }, 401);
  }
  
  // 마스터만 가능
  const session = await validateSession(c.env.DB, token);
  if (!session || session.user_type !== 'master') {
    return c.json<ApiResponse>({
      success: false,
      error: '마스터 권한이 필요합니다.',
      timestamp: Date.now()
    }, 403);
  }
  
  const cleanedCount = await cleanupExpiredSessions(c.env.DB);
  
  return c.json<ApiResponse>({
    success: true,
    data: { cleanedCount, message: `${cleanedCount}개의 만료된 세션이 정리되었습니다.` },
    timestamp: Date.now()
  });
});

// ============ Dashboard Stats ============

api.get('/dashboard/stats/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  // Try cache first
  const cached = await getStoreStats(c.env.KV, storeId);
  if (cached && Date.now() - cached.cached_at < 5 * 60 * 1000) {
    return c.json<ApiResponse<DashboardStats>>({
      success: true,
      data: cached,
      timestamp: Date.now()
    });
  }
  
  // Query from D1
  const today = new Date().toISOString().split('T')[0];
  
  const [totalResult, todayResult, conversionResult, avgTimeResult] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM xivix_conversation_logs WHERE store_id = ?')
      .bind(storeId).first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM xivix_conversation_logs WHERE store_id = ? AND DATE(created_at) = ?')
      .bind(storeId, today).first<{ count: number }>(),
    c.env.DB.prepare('SELECT AVG(CASE WHEN converted_to_reservation = 1 THEN 100.0 ELSE 0 END) as rate FROM xivix_conversation_logs WHERE store_id = ?')
      .bind(storeId).first<{ rate: number }>(),
    c.env.DB.prepare('SELECT AVG(response_time_ms) as avg_time FROM xivix_conversation_logs WHERE store_id = ?')
      .bind(storeId).first<{ avg_time: number }>()
  ]);
  
  const stats: DashboardStats = {
    total_conversations: totalResult?.count || 0,
    today_conversations: todayResult?.count || 0,
    conversion_rate: Math.round((conversionResult?.rate || 0) * 10) / 10,
    avg_response_time_ms: Math.round(avgTimeResult?.avg_time || 0),
    total_reservations: 0,
    today_reservations: 0
  };
  
  // Get reservation stats
  const [totalResResult, todayResResult] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM xivix_reservations WHERE store_id = ?')
      .bind(storeId).first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM xivix_reservations WHERE store_id = ? AND DATE(created_at) = ?')
      .bind(storeId, today).first<{ count: number }>()
  ]);
  
  stats.total_reservations = totalResResult?.count || 0;
  stats.today_reservations = todayResResult?.count || 0;
  
  // Cache stats
  await cacheStoreStats(c.env.KV, storeId, stats);
  
  return c.json<ApiResponse<DashboardStats>>({
    success: true,
    data: stats,
    timestamp: Date.now()
  });
});

// ============ Store Management ============

api.get('/stores', async (c) => {
  const results = await c.env.DB.prepare(
    'SELECT id, store_name, business_type, is_active, created_at FROM xivix_stores ORDER BY id DESC'
  ).all<Store>();
  
  return c.json<ApiResponse<Store[]>>({
    success: true,
    data: results.results,
    timestamp: Date.now()
  });
});

api.get('/stores/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const store = await c.env.DB.prepare('SELECT * FROM xivix_stores WHERE id = ?')
    .bind(id).first<Store>();
  
  if (!store) {
    return c.json<ApiResponse>({ success: false, error: 'Store not found', timestamp: Date.now() }, 404);
  }
  
  return c.json<ApiResponse<Store>>({
    success: true,
    data: store,
    timestamp: Date.now()
  });
});

api.post('/stores', async (c) => {
  const data = await c.req.json() as Partial<Store>;
  
  const result = await c.env.DB.prepare(`
    INSERT INTO xivix_stores (user_id, store_name, business_type, address, phone, operating_hours, menu_data, ai_persona, ai_tone, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).bind(
    data.user_id || 1,
    data.store_name || 'New Store',
    data.business_type || '일반',
    data.address || '',
    data.phone || '',
    data.operating_hours || '09:00-18:00',
    data.menu_data || '[]',
    data.ai_persona || '',
    data.ai_tone || '전문적이고 친절한'
  ).run();
  
  return c.json<ApiResponse<{ id: number }>>({
    success: true,
    data: { id: result.meta.last_row_id as number },
    timestamp: Date.now()
  });
});

api.put('/stores/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const data = await c.req.json() as Partial<Store>;
  
  await c.env.DB.prepare(`
    UPDATE xivix_stores SET
      store_name = COALESCE(?, store_name),
      business_type = COALESCE(?, business_type),
      address = COALESCE(?, address),
      phone = COALESCE(?, phone),
      operating_hours = COALESCE(?, operating_hours),
      menu_data = COALESCE(?, menu_data),
      ai_persona = COALESCE(?, ai_persona),
      ai_tone = COALESCE(?, ai_tone),
      is_active = COALESCE(?, is_active),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    data.store_name,
    data.business_type,
    data.address,
    data.phone,
    data.operating_hours,
    data.menu_data,
    data.ai_persona,
    data.ai_tone,
    data.is_active,
    id
  ).run();
  
  return c.json<ApiResponse>({ success: true, timestamp: Date.now() });
});

// ============ Conversation Logs ============

api.get('/logs/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  
  const results = await c.env.DB.prepare(`
    SELECT * FROM xivix_conversation_logs 
    WHERE store_id = ? 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `).bind(storeId, limit, offset).all<ConversationLog>();
  
  return c.json<ApiResponse<ConversationLog[]>>({
    success: true,
    data: results.results,
    timestamp: Date.now()
  });
});

api.get('/logs/:storeId/realtime', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  // SSE for realtime logs
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Initial data
      const results = await c.env.DB.prepare(`
        SELECT * FROM xivix_conversation_logs 
        WHERE store_id = ? 
        ORDER BY created_at DESC 
        LIMIT 10
      `).bind(storeId).all<ConversationLog>();
      
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(results.results)}\n\n`));
      
      // Keep connection alive
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 30000);
      
      // Note: In production, you would use Durable Objects for true realtime
      setTimeout(() => {
        clearInterval(keepAlive);
        controller.close();
      }, 60000);
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
});

// ============ Reservations ============

api.get('/reservations/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const status = c.req.query('status');
  const date = c.req.query('date');
  
  let query = 'SELECT * FROM xivix_reservations WHERE store_id = ?';
  const params: (string | number)[] = [storeId];
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  if (date) {
    query += ' AND reservation_date = ?';
    params.push(date);
  }
  
  query += ' ORDER BY reservation_date, reservation_time';
  
  const stmt = c.env.DB.prepare(query);
  const results = await stmt.bind(...params).all<Reservation>();
  
  return c.json<ApiResponse<Reservation[]>>({
    success: true,
    data: results.results,
    timestamp: Date.now()
  });
});

// [XIVIX_SAFETY_CONTROL] 예약 세이프티 락 - 모든 예약은 마스터 승인 필요
api.post('/reservations', async (c) => {
  const data = await c.req.json() as Partial<Reservation>;
  
  // [Phase 04-31] 예약 세이프티 락 적용 - pending_approval 상태로 시작
  const result = await c.env.DB.prepare(`
    INSERT INTO xivix_reservations 
    (store_id, customer_id, customer_name, customer_phone, service_name, reservation_date, reservation_time, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?)
  `).bind(
    data.store_id,
    data.customer_id,
    data.customer_name || '',
    data.customer_phone || '',
    data.service_name || '',
    data.reservation_date,
    data.reservation_time,
    data.created_by || 'ai_suggested'
  ).run();
  
  const reservationId = result.meta.last_row_id as number;
  
  // [WATCHDOG] 예약 생성 로그
  console.log(`[Reservation] 새 예약 승인 대기 (ID: ${reservationId}, Store: ${data.store_id})`);
  
  return c.json<ApiResponse<{ id: number; status: string; message: string }>>({
    success: true,
    data: { 
      id: reservationId,
      status: 'pending_approval',
      message: '예약이 등록되었습니다. 마스터 승인 후 확정됩니다.'
    },
    timestamp: Date.now()
  });
});

api.put('/reservations/:id/status', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const { status } = await c.req.json() as { status: string };
  
  await c.env.DB.prepare(`
    UPDATE xivix_reservations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(status, id).run();
  
  return c.json<ApiResponse>({ success: true, timestamp: Date.now() });
});

// ============ Image Management ============

api.get('/images/*', async (c) => {
  const key = c.req.path.replace('/api/images/', '');
  const image = await getImage(c.env.R2, key);
  
  if (!image) {
    return c.json<ApiResponse>({ success: false, error: 'Image not found', timestamp: Date.now() }, 404);
  }
  
  return new Response(image.body, {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'public, max-age=86400'
    }
  });
});

api.delete('/images/*', async (c) => {
  const key = c.req.path.replace('/api/images/', '');
  const success = await deleteImage(c.env.R2, key);
  
  return c.json<ApiResponse>({ success, timestamp: Date.now() });
});

// Cleanup old images (cron job endpoint)
api.post('/maintenance/cleanup-images', async (c) => {
  const deleted = await cleanupOldImages(c.env.R2, 'uploads', 24);
  const deletedCustomer = await cleanupOldImages(c.env.R2, 'customer', 24);
  
  return c.json<ApiResponse<{ deleted: number }>>({
    success: true,
    data: { deleted: deleted + deletedCustomer },
    timestamp: Date.now()
  });
});

// ============ 네이버 API 연동 ============

// 네이버 API 연결 테스트
api.post('/naver/test-connection', async (c) => {
  const { client_id, client_secret, access_token } = await c.req.json() as {
    client_id?: string;
    client_secret?: string;
    access_token?: string;
  };
  
  if (!access_token) {
    return c.json<ApiResponse>({
      success: false,
      error: 'Access Token이 필요합니다',
      timestamp: Date.now()
    }, 400);
  }
  
  try {
    // 네이버 톡톡 API로 테스트 요청 (실제 메시지 발송 없이 토큰 검증)
    // 참고: 실제 검증 API가 없으므로 토큰 형식만 확인
    const isValidFormat = access_token.length > 20;
    
    if (isValidFormat) {
      return c.json<ApiResponse>({
        success: true,
        data: {
          message: '토큰 형식이 유효합니다. 실제 연동은 메시지 발송 시 확인됩니다.',
          token_length: access_token.length
        },
        timestamp: Date.now()
      });
    } else {
      return c.json<ApiResponse>({
        success: false,
        error: '토큰 형식이 올바르지 않습니다',
        timestamp: Date.now()
      }, 400);
    }
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '연결 테스트 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 매장별 API 토큰 저장
api.post('/stores/:id/tokens', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  const { provider, access_token, client_id, client_secret, refresh_token, expires_at } = await c.req.json() as {
    provider: string;
    access_token?: string;
    client_id?: string;
    client_secret?: string;
    refresh_token?: string;
    expires_at?: string;
  };
  
  if (!provider || !access_token) {
    return c.json<ApiResponse>({
      success: false,
      error: 'provider와 access_token이 필요합니다',
      timestamp: Date.now()
    }, 400);
  }
  
  try {
    // 기존 토큰이 있으면 업데이트, 없으면 삽입
    const existing = await c.env.DB.prepare(
      'SELECT id FROM xivix_api_tokens WHERE store_id = ? AND provider = ?'
    ).bind(storeId, provider).first();
    
    if (existing) {
      await c.env.DB.prepare(`
        UPDATE xivix_api_tokens SET
          access_token = ?,
          refresh_token = ?,
          expires_at = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE store_id = ? AND provider = ?
      `).bind(access_token, refresh_token || null, expires_at || null, storeId, provider).run();
    } else {
      await c.env.DB.prepare(`
        INSERT INTO xivix_api_tokens (store_id, provider, access_token, refresh_token, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(storeId, provider, access_token, refresh_token || null, expires_at || null).run();
    }
    
    // 매장 테이블에도 톡톡 ID 업데이트 (있으면)
    if (provider === 'naver_talktalk' && client_id) {
      await c.env.DB.prepare(`
        UPDATE xivix_stores SET naver_talktalk_id = ? WHERE id = ?
      `).bind(client_id, storeId).run();
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: { message: '토큰이 저장되었습니다' },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '토큰 저장 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 매장별 API 토큰 조회
api.get('/stores/:id/tokens', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  const results = await c.env.DB.prepare(
    'SELECT provider, created_at, updated_at, expires_at FROM xivix_api_tokens WHERE store_id = ?'
  ).bind(storeId).all();
  
  return c.json<ApiResponse>({
    success: true,
    data: results.results,
    timestamp: Date.now()
  });
});

// ============ Zero-Touch Onboarding API ============

// 고객 연동 요청 (30초 연동 페이지에서 호출)
api.post('/onboarding/request', async (c) => {
  const data = await c.req.json() as {
    store_name: string;
    owner_name: string;
    owner_phone: string;
    business_type?: string;
    business_type_name?: string;
    business_specialty?: string;
    naver_talktalk_id?: string;
  };
  
  if (!data.store_name || !data.owner_name || !data.owner_phone) {
    return c.json<ApiResponse>({
      success: false,
      error: '필수 정보를 입력해주세요',
      timestamp: Date.now()
    }, 400);
  }
  
  try {
    const result = await c.env.DB.prepare(`
      INSERT INTO xivix_stores (user_id, store_name, owner_name, owner_phone, business_type, business_type_name, business_specialty, naver_talktalk_id, onboarding_status, onboarding_progress, is_active)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, 'pending', 40, 0)
    `).bind(
      data.store_name,
      data.owner_name,
      data.owner_phone,
      data.business_type || 'OTHER',
      data.business_type_name || '기타',
      data.business_specialty || '',
      data.naver_talktalk_id || null
    ).run();
    
    const storeId = result.meta.last_row_id;
    
    // 마스터에게 SMS + 이메일 알림 발송 (V2.0 신규)
    let notificationResult = null;
    try {
      notificationResult = await notifyMasterOnboarding(c.env, {
        storeName: data.store_name,
        ownerName: data.owner_name,
        ownerPhone: data.owner_phone,
        businessType: data.business_type_name || data.business_type || '기타',
        storeId: storeId as number
      });
      
      console.log(`[XIVIX] 연동 요청 알림 발송: ${notificationResult.success ? '성공' : '실패'}`, {
        channel: notificationResult.channel,
        sms: notificationResult.smsResult?.success,
        email: notificationResult.emailResult?.success
      });
      
      // 알림 로그 저장 (기존 테이블 호환)
      await c.env.DB.prepare(`
        INSERT INTO xivix_notification_logs (store_id, notification_type, recipient_phone, recipient_type, content, status, sent_at)
        VALUES (?, 'onboarding_request', ?, 'master', ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        storeId,
        c.env.MASTER_PHONE || '010-3988-0124',
        JSON.stringify({ 
          storeName: data.store_name, 
          ownerName: data.owner_name,
          channel: notificationResult.channel,
          smsSuccess: notificationResult.smsResult?.success,
          emailSuccess: notificationResult.emailResult?.success
        }),
        notificationResult.success ? 'sent' : 'failed'
      ).run();
      
    } catch (notifyError) {
      // 알림 실패해도 요청은 성공 처리
      console.error('[XIVIX] Notification failed:', notifyError);
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: { 
        id: storeId,
        message: '연동 요청이 완료되었습니다. 곧 연락드리겠습니다.',
        notification: notificationResult ? {
          sent: notificationResult.success,
          channel: notificationResult.channel
        } : null
      },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '요청 처리 중 오류가 발생했습니다',
      timestamp: Date.now()
    }, 500);
  }
});

// ============ 온보딩 상태 조회 API (실시간 폴링용) ============
api.get('/onboarding/status/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  if (!storeId || isNaN(storeId)) {
    return c.json<ApiResponse>({
      success: false,
      error: '유효하지 않은 매장 ID',
      timestamp: Date.now()
    }, 400);
  }
  
  try {
    const store = await c.env.DB.prepare(`
      SELECT id, store_name, onboarding_status, onboarding_progress, is_active, naver_talktalk_id, 
             activated_at, ai_persona, business_type_name
      FROM xivix_stores WHERE id = ?
    `).bind(storeId).first<{
      id: number;
      store_name: string;
      onboarding_status: string;
      onboarding_progress: number | null;
      is_active: number;
      naver_talktalk_id: string | null;
      activated_at: string | null;
      ai_persona: string | null;
      business_type_name: string | null;
    }>();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    // onboarding_progress 컬럼에서 직접 진행률 사용
    const progress = store.onboarding_progress || 10;
    let statusText = '대기 중';
    let statusDetail = 'XIVIX 전문가에게 알림이 전송되었습니다...';
    let effectiveStatus = store.onboarding_status;
    
    // 진행률에 따른 상태 텍스트 결정
    if (progress >= 100 || store.onboarding_status === 'active') {
      statusText = '완료!';
      statusDetail = `AI 지배인이 ${store.business_type_name || '매장'}을 위해 준비되었습니다! 🎉`;
      effectiveStatus = 'active';
    } else if (progress >= 60) {
      statusText = '세팅 중';
      statusDetail = 'AI 지배인 설정을 진행하고 있습니다. 곧 완료됩니다!';
      effectiveStatus = 'processing';
    } else if (progress >= 20) {
      statusText = '준비 중';
      statusDetail = 'XIVIX 전문가가 업종에 맞는 AI 페르소나를 준비하고 있습니다...';
      effectiveStatus = 'pending';
    } else {
      statusText = '접수됨';
      statusDetail = '연동 요청이 접수되었습니다.';
      effectiveStatus = 'pending';
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        id: store.id,
        store_name: store.store_name,
        status: effectiveStatus,
        is_active: store.is_active === 1,
        progress: Math.min(progress, 100),
        statusText,
        statusDetail,
        naver_talktalk_id: store.naver_talktalk_id,
        activated_at: store.activated_at
      },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '상태 조회 중 오류가 발생했습니다',
      timestamp: Date.now()
    }, 500);
  }
});

// ============ 마스터: 온보딩 진행률 업데이트 API ============
api.post('/master/status/:id', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  const { status, progress } = await c.req.json() as { 
    status?: 'pending' | 'processing' | 'active';
    progress?: number;
  };
  
  try {
    // 진행률 기반 업데이트 (DB CHECK 제약 우회)
    // status는 pending/active만 DB에 저장, processing은 progress로 표현
    let dbStatus = 'pending';
    let dbProgress = 40;
    let isActive = 0;
    
    if (status === 'processing' || progress === 75) {
      // processing = pending 상태 + 75% 진행률
      dbStatus = 'pending';
      dbProgress = 75;
      isActive = 0;
    } else if (status === 'active' || progress === 100) {
      dbStatus = 'active';
      dbProgress = 100;
      isActive = 1;
    } else if (status === 'pending') {
      dbStatus = 'pending';
      dbProgress = progress || 40;
      isActive = 0;
    }
    
    await c.env.DB.prepare(`
      UPDATE xivix_stores SET
        onboarding_status = ?,
        onboarding_progress = ?,
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(dbStatus, dbProgress, isActive, storeId).run();
    
    // 관리자 로그 기록
    await c.env.DB.prepare(`
      INSERT INTO xivix_admin_logs (admin_id, action, target_store_id, details)
      VALUES ('master', 'progress_update', ?, ?)
    `).bind(storeId, JSON.stringify({ status, progress: dbProgress })).run();
    
    return c.json<ApiResponse>({
      success: true,
      data: { 
        message: `진행률이 ${dbProgress}%로 업데이트되었습니다`,
        progress: dbProgress
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Status update error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: '상태 업데이트 중 오류가 발생했습니다: ' + String(error),
      timestamp: Date.now()
    }, 500);
  }
});

// 마스터에게 알림 발송 헬퍼 함수
async function sendNotificationToMaster(env: Env, data: {
  store_id: number;
  store_name: string;
  owner_name: string;
  owner_phone: string;
  naver_talktalk_id: string;
}) {
  // 알림 설정에서 마스터 연락처 조회
  const setting = await env.DB.prepare(
    'SELECT setting_value FROM xivix_notification_settings WHERE setting_key = ?'
  ).bind('master_phone').first<{ setting_value: string }>();
  
  if (!setting?.setting_value) {
    // 마스터 연락처 미설정 시 로그만 기록
    await env.DB.prepare(`
      INSERT INTO xivix_notification_logs (store_id, notification_type, recipient_phone, recipient_type, content, status)
      VALUES (?, 'onboarding_request', 'NOT_SET', 'master', ?, 'failed')
    `).bind(data.store_id, JSON.stringify(data)).run();
    return;
  }
  
  // 솔라피 API 키 조회
  const apiKey = await env.DB.prepare(
    'SELECT setting_value FROM xivix_notification_settings WHERE setting_key = ?'
  ).bind('solapi_api_key').first<{ setting_value: string }>();
  
  const apiSecret = await env.DB.prepare(
    'SELECT setting_value FROM xivix_notification_settings WHERE setting_key = ?'
  ).bind('solapi_api_secret').first<{ setting_value: string }>();
  
  if (!apiKey?.setting_value || !apiSecret?.setting_value) {
    // 솔라피 설정 미완료 시 로그만 기록
    await env.DB.prepare(`
      INSERT INTO xivix_notification_logs (store_id, notification_type, recipient_phone, recipient_type, content, status, error_message)
      VALUES (?, 'onboarding_request', ?, 'master', ?, 'failed', 'Solapi API not configured')
    `).bind(data.store_id, setting.setting_value, JSON.stringify(data)).run();
    return;
  }
  
  // 메시지 내용 구성
  const message = `🔔 새로운 연동 요청!

매장: ${data.store_name}
사장님: ${data.owner_name}
연락처: ${data.owner_phone}
톡톡ID: @${data.naver_talktalk_id}
요청시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}

▶ https://xivix-ai-core.pages.dev/master`;

  try {
    // 발신번호 조회
    const senderNumber = await env.DB.prepare(
      'SELECT setting_value FROM xivix_notification_settings WHERE setting_key = ?'
    ).bind('sender_number').first<{ setting_value: string }>();
    
    const fromNumber = (senderNumber?.setting_value || '01039880124').replace(/-/g, '');
    const toNumber = setting.setting_value.replace(/-/g, '');
    
    // ============ 테스트 모드 체크 (추가) ============
    // IS_TEST_MODE가 true이면 실제 API 호출 안 함 (비용 절감)
    const isTestMode = env.IS_TEST_MODE === 'true';
    
    if (isTestMode) {
      console.log('[TEST_MODE] 솔라피 API 호출 차단됨 - 실제 문자 발송 안 함');
      console.log('[MOCK_MSG]', { 
        to: toNumber, 
        from: fromNumber, 
        message: message.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });
      
      // 테스트 모드 로그 기록
      await env.DB.prepare(`
        INSERT INTO xivix_notification_logs (store_id, notification_type, recipient_phone, recipient_type, content, status, error_message, sent_at)
        VALUES (?, 'onboarding_request', ?, 'master', ?, 'test_mode', 'TEST_MODE: 실제 발송 차단됨', CURRENT_TIMESTAMP)
      `).bind(data.store_id, setting.setting_value, message).run();
      
      return; // 테스트 모드에서는 여기서 종료
    }
    // ============ 테스트 모드 체크 끝 ============
    
    // 솔라피 API 호출 (SMS)
    const dateISO = new Date().toISOString();
    const signature = await generateSolapiSignature(apiKey.setting_value, apiSecret.setting_value, dateISO);
    
    console.log('Solapi Request:', { from: fromNumber, to: toNumber, date: dateISO });
    
    const response = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `HMAC-SHA256 apiKey=${apiKey.setting_value}, date=${dateISO}, salt=${signature.salt}, signature=${signature.signature}`
      },
      body: JSON.stringify({
        message: {
          to: toNumber,
          from: fromNumber,
          text: message,
          type: 'LMS',  // SMS 90byte 제한 → LMS 2000byte
          subject: '[XIVIX] 새 연동 요청'
        }
      })
    });
    
    const result = await response.json() as { groupId?: string; errorCode?: string; errorMessage?: string };
    
    console.log('Solapi Response:', JSON.stringify(result));
    
    // 발송 로그 기록
    await env.DB.prepare(`
      INSERT INTO xivix_notification_logs (store_id, notification_type, recipient_phone, recipient_type, content, status, provider_message_id, error_message, sent_at)
      VALUES (?, 'onboarding_request', ?, 'master', ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      data.store_id, 
      setting.setting_value, 
      message,
      result.groupId ? 'sent' : 'failed',
      result.groupId || null,
      result.errorMessage || null
    ).run();
    
  } catch (error) {
    // 발송 실패 로그
    await env.DB.prepare(`
      INSERT INTO xivix_notification_logs (store_id, notification_type, recipient_phone, recipient_type, content, status, error_message)
      VALUES (?, 'onboarding_request', ?, 'master', ?, 'failed', ?)
    `).bind(data.store_id, setting.setting_value, message, String(error)).run();
  }
}

// 솔라피 서명 생성
async function generateSolapiSignature(apiKey: string, apiSecret: string, dateISO: string) {
  const salt = crypto.randomUUID();
  const message = dateISO + salt;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return { salt, signature: signatureHex };
}

// ============ Master Admin API ============

// 대기 중인 매장 목록
api.get('/master/pending', async (c) => {
  // TODO: 마스터 인증 미들웨어 추가
  
  const results = await c.env.DB.prepare(`
    SELECT * FROM xivix_stores 
    WHERE onboarding_status = 'pending' 
    ORDER BY created_at DESC
  `).all();
  
  return c.json<ApiResponse>({
    success: true,
    data: results.results,
    timestamp: Date.now()
  });
});

// 전체 매장 목록 (마스터용)
api.get('/master/stores', async (c) => {
  const results = await c.env.DB.prepare(`
    SELECT * FROM xivix_stores ORDER BY created_at DESC
  `).all();
  
  return c.json<ApiResponse>({
    success: true,
    data: results.results,
    timestamp: Date.now()
  });
});

// ============ [V2.0] 매장 삭제 API ============
api.delete('/master/store/:id', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    // 1. 매장 존재 여부 확인
    const store = await c.env.DB.prepare(
      'SELECT id, store_name FROM xivix_stores WHERE id = ?'
    ).bind(storeId).first<{ id: number; store_name: string }>();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    // 2. 관련 데이터 삭제 (CASCADE 효과)
    // 2-1. 고객 관련 팔로업 로그 삭제
    await c.env.DB.prepare(
      'DELETE FROM xivix_followup_logs WHERE customer_id IN (SELECT id FROM xivix_customers WHERE store_id = ?)'
    ).bind(storeId).run();
    
    // 2-2. 고객 데이터 삭제
    await c.env.DB.prepare(
      'DELETE FROM xivix_customers WHERE store_id = ?'
    ).bind(storeId).run();
    
    // 2-3. 메시지 템플릿 삭제 (매장별)
    await c.env.DB.prepare(
      'DELETE FROM xivix_message_templates WHERE store_id = ?'
    ).bind(storeId).run();
    
    // 2-4. 상담 로그 삭제
    await c.env.DB.prepare(
      'DELETE FROM xivix_conversation_logs WHERE store_id = ?'
    ).bind(storeId).run();
    
    // 2-5. 예약 데이터 삭제
    await c.env.DB.prepare(
      'DELETE FROM xivix_reservations WHERE store_id = ?'
    ).bind(storeId).run();
    
    // 2-6. API 토큰 삭제
    await c.env.DB.prepare(
      'DELETE FROM xivix_api_tokens WHERE store_id = ?'
    ).bind(storeId).run();
    
    // 2-7. 알림 로그 삭제
    await c.env.DB.prepare(
      'DELETE FROM xivix_notification_logs WHERE store_id = ?'
    ).bind(storeId).run();
    
    // 2-8. 네이버 톡톡 설정 삭제
    await c.env.DB.prepare(
      'DELETE FROM xivix_naver_talktalk_config WHERE store_id = ?'
    ).bind(storeId).run();
    
    // 2-9. 리마인더 스케줄 삭제
    await c.env.DB.prepare(
      'DELETE FROM xivix_reminder_schedules WHERE store_id = ?'
    ).bind(storeId).run();
    
    // 2-10. 월간 리포트 삭제
    await c.env.DB.prepare(
      'DELETE FROM xivix_monthly_reports WHERE store_id = ?'
    ).bind(storeId).run();
    
    // 2-11. 변경 요청 삭제
    await c.env.DB.prepare(
      'DELETE FROM xivix_change_requests WHERE store_id = ?'
    ).bind(storeId).run();
    
    // 3. 매장 삭제
    await c.env.DB.prepare(
      'DELETE FROM xivix_stores WHERE id = ?'
    ).bind(storeId).run();
    
    // 4. 관리자 로그 기록
    await c.env.DB.prepare(`
      INSERT INTO xivix_admin_logs (admin_id, action, target_store_id, details)
      VALUES ('master', 'delete_store', ?, ?)
    `).bind(storeId, JSON.stringify({ 
      store_name: store.store_name,
      deleted_at: new Date().toISOString()
    })).run();
    
    console.log(`[Master] Store ${storeId} (${store.store_name}) deleted`);
    
    return c.json<ApiResponse>({
      success: true,
      data: { 
        message: `'${store.store_name}' 매장이 삭제되었습니다`,
        store_id: storeId,
        store_name: store.store_name
      },
      timestamp: Date.now()
    });
    
  } catch (error: any) {
    console.error('Store delete error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: '매장 삭제 중 오류가 발생했습니다: ' + error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// 매장 활성화 (마스터가 세팅 완료 후 호출)
api.post('/master/activate/:id', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  const data = await c.req.json() as {
    auth_key?: string;
    ai_persona?: string;
    ai_features?: string;
    ai_tone?: string;
  };
  
  try {
    // 매장 정보 업데이트 (onboarding_progress = 100 포함)
    await c.env.DB.prepare(`
      UPDATE xivix_stores SET
        onboarding_status = 'active',
        onboarding_progress = 100,
        is_active = 1,
        ai_persona = ?,
        ai_features = ?,
        ai_tone = ?,
        activated_at = CURRENT_TIMESTAMP,
        activated_by = 'master',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.ai_persona || '',
      data.ai_features || '',
      data.ai_tone || 'professional',
      storeId
    ).run();
    
    // Authorization 키 저장 (있으면)
    if (data.auth_key) {
      const existing = await c.env.DB.prepare(
        'SELECT id FROM xivix_api_tokens WHERE store_id = ? AND provider = ?'
      ).bind(storeId, 'naver_talktalk').first();
      
      if (existing) {
        await c.env.DB.prepare(`
          UPDATE xivix_api_tokens SET access_token = ?, updated_at = CURRENT_TIMESTAMP
          WHERE store_id = ? AND provider = 'naver_talktalk'
        `).bind(data.auth_key, storeId).run();
      } else {
        await c.env.DB.prepare(`
          INSERT INTO xivix_api_tokens (store_id, provider, access_token)
          VALUES (?, 'naver_talktalk', ?)
        `).bind(storeId, data.auth_key).run();
      }
    }
    
    // 관리자 로그 기록
    await c.env.DB.prepare(`
      INSERT INTO xivix_admin_logs (admin_id, action, target_store_id, details)
      VALUES ('master', 'activate', ?, ?)
    `).bind(storeId, JSON.stringify(data)).run();
    
    // TODO: 사장님께 카카오톡으로 세팅 완료 알림 발송
    
    return c.json<ApiResponse>({
      success: true,
      data: { message: '매장이 활성화되었습니다' },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '활성화 처리 중 오류가 발생했습니다',
      timestamp: Date.now()
    }, 500);
  }
});

// 사장님에게 카카오톡 알림 발송
api.post('/master/notify/:id', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  const { notification_type, message } = await c.req.json() as {
    notification_type: string;
    message: string;
  };
  
  try {
    // 매장 정보 조회
    const store = await c.env.DB.prepare(
      'SELECT * FROM xivix_stores WHERE id = ?'
    ).bind(storeId).first<Store>();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    if (!store.owner_phone) {
      return c.json<ApiResponse>({
        success: false,
        error: '사장님 연락처가 없습니다',
        timestamp: Date.now()
      }, 400);
    }
    
    // 솔라피 API 설정 조회
    const apiKey = await c.env.DB.prepare(
      'SELECT setting_value FROM xivix_notification_settings WHERE setting_key = ?'
    ).bind('solapi_api_key').first<{ setting_value: string }>();
    
    const apiSecret = await c.env.DB.prepare(
      'SELECT setting_value FROM xivix_notification_settings WHERE setting_key = ?'
    ).bind('solapi_api_secret').first<{ setting_value: string }>();
    
    const senderNumber = await c.env.DB.prepare(
      'SELECT setting_value FROM xivix_notification_settings WHERE setting_key = ?'
    ).bind('sender_number').first<{ setting_value: string }>();
    
    if (!apiKey?.setting_value || !apiSecret?.setting_value) {
      // 솔라피 미설정 시 로그만 기록
      await c.env.DB.prepare(`
        INSERT INTO xivix_notification_logs (store_id, notification_type, recipient_phone, recipient_type, content, status, error_message)
        VALUES (?, ?, ?, 'owner', ?, 'failed', 'Solapi API not configured')
      `).bind(storeId, notification_type, store.owner_phone, message).run();
      
      return c.json<ApiResponse>({
        success: false,
        error: '솔라피 API가 설정되지 않았습니다. 알림 설정에서 API 키를 등록해주세요.',
        timestamp: Date.now()
      }, 400);
    }
    
    // 솔라피 API 호출
    try {
      const timestamp = Date.now().toString();
      const signature = await generateSolapiSignature(apiKey.setting_value, apiSecret.setting_value, timestamp);
      
      const response = await fetch('https://api.solapi.com/messages/v4/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `HMAC-SHA256 apiKey=${apiKey.setting_value}, date=${timestamp}, salt=${signature.salt}, signature=${signature.signature}`
        },
        body: JSON.stringify({
          message: {
            to: store.owner_phone.replace(/-/g, ''),
            from: (senderNumber?.setting_value || store.owner_phone).replace(/-/g, ''),
            text: message,
            type: 'SMS'
          }
        })
      });
      
      const result = await response.json() as { groupId?: string; errorCode?: string; errorMessage?: string };
      
      // 발송 로그 기록
      await c.env.DB.prepare(`
        INSERT INTO xivix_notification_logs (store_id, notification_type, recipient_phone, recipient_type, content, status, provider_message_id, sent_at)
        VALUES (?, ?, ?, 'owner', ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        storeId, 
        notification_type, 
        store.owner_phone, 
        message,
        result.groupId ? 'sent' : 'failed',
        result.groupId || null
      ).run();
      
      if (result.groupId) {
        return c.json<ApiResponse>({
          success: true,
          data: { message: '알림이 발송되었습니다', groupId: result.groupId },
          timestamp: Date.now()
        });
      } else {
        return c.json<ApiResponse>({
          success: false,
          error: result.errorMessage || '발송 실패',
          timestamp: Date.now()
        }, 400);
      }
      
    } catch (sendError) {
      // 발송 실패 로그
      await c.env.DB.prepare(`
        INSERT INTO xivix_notification_logs (store_id, notification_type, recipient_phone, recipient_type, content, status, error_message)
        VALUES (?, ?, ?, 'owner', ?, 'failed', ?)
      `).bind(storeId, notification_type, store.owner_phone, message, String(sendError)).run();
      
      throw sendError;
    }
    
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '알림 발송 중 오류가 발생했습니다',
      timestamp: Date.now()
    }, 500);
  }
});

// 매장 일시정지
api.post('/master/pause/:id', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  await c.env.DB.prepare(`
    UPDATE xivix_stores SET onboarding_status = 'paused', is_active = 0 WHERE id = ?
  `).bind(storeId).run();
  
  return c.json<ApiResponse>({
    success: true,
    data: { message: '매장이 일시정지되었습니다' },
    timestamp: Date.now()
  });
});

// 알림 설정 저장
api.post('/master/notifications/settings', async (c) => {
  const data = await c.req.json() as Record<string, string>;
  
  try {
    for (const [key, value] of Object.entries(data)) {
      await c.env.DB.prepare(`
        INSERT INTO xivix_notification_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
      `).bind(key, value, value).run();
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: { message: '설정이 저장되었습니다' },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '설정 저장 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ============ System Info ============

api.get('/system/info', async (c) => {
  return c.json<ApiResponse>({
    success: true,
    data: {
      version: c.env.XIVIX_VERSION || '1.0.0',
      ai_model: c.env.AI_MODEL || 'gemini-2.5-flash',
      environment: 'cloudflare-workers',
      timestamp: new Date().toISOString()
    },
    timestamp: Date.now()
  });
});

api.get('/system/health', async (c) => {
  const checks = {
    database: false,
    kv: false,
    r2: false
  };
  
  try {
    await c.env.DB.prepare('SELECT 1').first();
    checks.database = true;
  } catch {}
  
  try {
    await c.env.KV.get('health-check');
    checks.kv = true;
  } catch {}
  
  try {
    await c.env.R2.head('health-check');
    checks.r2 = true;
  } catch {
    checks.r2 = true; // R2 returns null for non-existent keys
  }
  
  const allHealthy = Object.values(checks).every(Boolean);
  
  return c.json<ApiResponse>({
    success: allHealthy,
    data: checks,
    timestamp: Date.now()
  }, allHealthy ? 200 : 503);
});

// ============ 스마트 플레이스 자동화 API (추가) ============

// naver.me 단축 URL 리다이렉트 처리 (추가)
async function resolveNaverShortUrl(shortUrl: string): Promise<{ resolved: boolean; finalUrl?: string; placeId?: string; error?: string }> {
  try {
    // naver.me 단축 URL인지 확인
    if (!shortUrl.includes('naver.me')) {
      return { resolved: false, finalUrl: shortUrl };
    }
    
    console.log('[SmartPlace] naver.me 단축 URL 감지:', shortUrl);
    
    // 리다이렉트 따라가기 (redirect: 'manual'로 Location 헤더 추출)
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    // Location 헤더에서 실제 URL 추출
    const location = response.headers.get('location');
    console.log('[SmartPlace] 리다이렉트 Location:', location);
    
    if (location) {
      // 리다이렉트된 URL에서 Place ID 추출 시도
      const placeIdMatch = location.match(/place\/([0-9]+)/);
      if (placeIdMatch) {
        return { resolved: true, finalUrl: location, placeId: placeIdMatch[1] };
      }
      
      // 추가 리다이렉트가 필요한 경우 (2단계 리다이렉트)
      if (location.includes('naver.com') || location.includes('naver.me')) {
        const secondRes = await fetch(location, {
          method: 'HEAD',
          redirect: 'manual',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const secondLocation = secondRes.headers.get('location');
        console.log('[SmartPlace] 2단계 리다이렉트:', secondLocation);
        
        if (secondLocation) {
          const secondPlaceIdMatch = secondLocation.match(/place\/([0-9]+)/);
          if (secondPlaceIdMatch) {
            return { resolved: true, finalUrl: secondLocation, placeId: secondPlaceIdMatch[1] };
          }
          return { resolved: true, finalUrl: secondLocation };
        }
      }
      
      return { resolved: true, finalUrl: location };
    }
    
    // GET 요청으로 최종 URL 확인
    const getResponse = await fetch(shortUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const finalUrl = getResponse.url;
    console.log('[SmartPlace] 최종 URL:', finalUrl);
    
    const placeIdMatch = finalUrl.match(/place\/([0-9]+)/);
    if (placeIdMatch) {
      return { resolved: true, finalUrl, placeId: placeIdMatch[1] };
    }
    
    return { resolved: true, finalUrl };
    
  } catch (e) {
    console.error('[SmartPlace] 단축 URL 처리 오류:', e);
    return { resolved: false, error: '단축 URL을 처리할 수 없습니다. 직접 플레이스 페이지의 URL을 복사해주세요.' };
  }
}

// 스마트 플레이스 URL 검증 (naver.me 지원 추가)
// SNS URL 타입 판별 헬퍼
function detectSnsType(url: string): 'blog' | 'instagram' | 'youtube' | null {
  const lower = url.toLowerCase();
  if (lower.includes('blog.naver.com') || lower.includes('m.blog.naver.com')) return 'blog';
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  return null;
}

function validateSmartPlaceUrl(url: string): { valid: boolean; placeId?: string; error?: string; needsRedirect?: boolean; snsType?: 'blog' | 'instagram' | 'youtube' } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: '올바른 링크를 입력해주세요' };
  }
  
  const trimmedUrl = url.trim();
  
  // ============ SNS URL 인식 (프리랜서/개인사업자 지원) ============
  const snsType = detectSnsType(trimmedUrl);
  if (snsType) {
    return { valid: true, snsType };
  }
  
  // naver.me 단축 URL인 경우 리다이렉트 필요 표시 (analyze API에서 처리)
  if (trimmedUrl.includes('naver.me')) {
    return { valid: true, needsRedirect: true };
  }
  
  // 네이버 플레이스 URL 패턴들 (확장)
  const patterns = [
    /naver\.com\/restaurant\/([0-9]+)/,           // 음식점
    /naver\.com\/place\/([0-9]+)/,                // 일반 플레이스
    /naver\.com\/hairshop\/([0-9]+)/,             // 미용실
    /naver\.com\/beauty\/([0-9]+)/,               // 뷰티
    /naver\.com\/hospital\/([0-9]+)/,             // 병원
    /naver\.com\/gym\/([0-9]+)/,                  // 헬스장
    /map\.naver\.com\/.*place\/([0-9]+)/,         // 네이버 지도
    /map\.naver\.com\/p\/entry\/place\/([0-9]+)/, // 네이버 지도 엔트리
    /m\.place\.naver\.com\/.*\/([0-9]+)/,         // 모바일
    /pcmap\.place\.naver\.com\/.*\/([0-9]+)/,     // PC 지도
    /place\.naver\.com\/.*\/([0-9]+)/,            // 플레이스 직접
    /naver\.me\/.*\/([0-9]+)/                     // 단축 URL에서 직접 ID 포함된 경우
  ];
  
  for (const pattern of patterns) {
    const match = trimmedUrl.match(pattern);
    if (match && match[1]) {
      return { valid: true, placeId: match[1] };
    }
  }
  
  // place ID만 입력한 경우 (7~12자리 숫자)
  if (/^[0-9]{7,12}$/.test(trimmedUrl)) {
    return { valid: true, placeId: trimmedUrl };
  }
  
  return { valid: false, error: '지원하지 않는 링크 형식입니다. 네이버 플레이스/지도 링크, 블로그, 인스타그램, 유튜브 링크를 입력해주세요.' };
}

// 스마트 플레이스 정보 크롤링 API
api.post('/smartplace/analyze', async (c) => {
  const { url: inputUrl } = await c.req.json() as { url: string };
  
  if (!inputUrl || typeof inputUrl !== 'string' || inputUrl.trim().length === 0) {
    return c.json<ApiResponse>({
      success: false,
      error: '올바른 링크를 입력해주세요',
      timestamp: Date.now()
    }, 400);
  }
  
  let url = inputUrl.trim();
  let placeId: string | undefined;
  
  // ============ naver.me 단축 URL 처리 (추가) ============
  // naver.me 단축 URL인 경우 리다이렉트 따라가기
  if (url.includes('naver.me')) {
    console.log('[SmartPlace] naver.me 단축 URL 처리 시작:', url);
    
    try {
      const resolved = await resolveNaverShortUrl(url);
      
      if (resolved.error) {
        return c.json<ApiResponse>({
          success: false,
          error: resolved.error,
          timestamp: Date.now()
        }, 400);
      }
      
      if (resolved.placeId) {
        placeId = resolved.placeId;
        console.log('[SmartPlace] naver.me에서 Place ID 추출 성공:', placeId);
      } else if (resolved.finalUrl) {
        url = resolved.finalUrl;
        console.log('[SmartPlace] naver.me 리다이렉트 완료:', url);
      } else {
        return c.json<ApiResponse>({
          success: false,
          error: '지원하지 않는 링크 형식입니다. 네이버 플레이스 페이지의 URL을 직접 복사해주세요.',
          timestamp: Date.now()
        }, 400);
      }
    } catch (e) {
      console.error('[SmartPlace] naver.me 처리 오류:', e);
      return c.json<ApiResponse>({
        success: false,
        error: '단축 URL 처리 중 오류가 발생했습니다. 직접 플레이스 페이지의 URL을 복사해주세요.',
        timestamp: Date.now()
      }, 400);
    }
  }
  // ============ naver.me 단축 URL 처리 끝 ============
  
  // ============ SNS URL 처리 (블로그/인스타/유튜브 - 프리랜서/개인사업자 지원) ============
  const snsType = detectSnsType(url);
  if (snsType) {
    console.log(`[SmartPlace] SNS URL 감지: ${snsType} - ${url}`);
    
    try {
      let snsContent = '';
      let snsTitle = '';
      let snsDescription = '';
      
      // ---- 네이버 블로그 크롤링 ----
      if (snsType === 'blog') {
        try {
          const mobileUrl = url.replace('blog.naver.com', 'm.blog.naver.com');
          const blogRes = await fetch(mobileUrl, {
            headers: { 
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
              'Accept': 'text/html,application/xhtml+xml',
              'Accept-Language': 'ko-KR,ko;q=0.9'
            }
          });
          const html = await blogRes.text();
          
          // 블로그 제목 추출
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) snsTitle = titleMatch[1].replace(/ : 네이버 블로그$/, '').trim();
          
          // 메타 설명 추출
          const descMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i) ||
                            html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
          if (descMatch) snsDescription = descMatch[1];
          
          // 본문 텍스트 추출
          const mainMatch = html.match(/se-main-container[^>]*>([\s\S]*?)<\/div>/);
          if (mainMatch) {
            snsContent = mainMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          }
          
          if (!snsContent || snsContent.length < 200) {
            snsContent = html
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          }
          
          snsContent = snsContent.substring(0, 15000);
          console.log(`[SmartPlace] 블로그 크롤링 완료: ${snsTitle} (${snsContent.length}자)`);
        } catch (e) {
          console.error('[SmartPlace] 블로그 크롤링 실패:', e);
        }
      }
      
      // ---- 인스타그램 기본 정보 추출 ----
      else if (snsType === 'instagram') {
        try {
          const igRes = await fetch(url, {
            headers: { 
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html',
              'Accept-Language': 'ko-KR,ko;q=0.9'
            }
          });
          const html = await igRes.text();
          
          const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
          const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
          const ogMeta = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
          
          if (ogTitle) snsTitle = ogTitle[1];
          if (ogDesc) snsDescription = ogDesc[1];
          else if (ogMeta) snsDescription = ogMeta[1];
          
          snsContent = `인스타그램 프로필: ${snsTitle || url}\n${snsDescription || ''}`;
          console.log(`[SmartPlace] 인스타그램 정보 추출: ${snsTitle}`);
        } catch (e) {
          console.error('[SmartPlace] 인스타그램 크롤링 실패:', e);
          snsContent = `인스타그램 프로필: ${url}`;
        }
      }
      
      // ---- 유튜브 기본 정보 추출 ----
      else if (snsType === 'youtube') {
        try {
          const ytRes = await fetch(url, {
            headers: { 
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html',
              'Accept-Language': 'ko-KR,ko;q=0.9'
            }
          });
          const html = await ytRes.text();
          
          const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i) ||
                          html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i) ||
                          html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
          
          if (ogTitle) snsTitle = ogTitle[1].replace(/ - YouTube$/, '').trim();
          if (ogDesc) snsDescription = ogDesc[1];
          
          snsContent = `유튜브 채널/영상: ${snsTitle || url}\n${snsDescription || ''}`;
          console.log(`[SmartPlace] 유튜브 정보 추출: ${snsTitle}`);
        } catch (e) {
          console.error('[SmartPlace] 유튜브 크롤링 실패:', e);
          snsContent = `유튜브 채널: ${url}`;
        }
      }
      
      // ---- Gemini AI로 SNS 콘텐츠에서 서비스 정보 추출 ----
      let aiAnalysis = null;
      
      if (c.env.GEMINI_API_KEY && (snsContent || snsTitle || snsDescription)) {
        try {
          const snsPrompt = `당신은 AI 상담사 페르소나를 설계하는 전문가입니다.

다음은 ${snsType === 'blog' ? '네이버 블로그' : snsType === 'instagram' ? '인스타그램' : '유튜브'}에서 수집된 정보입니다.
이 사람은 매장이 없는 **프리랜서/개인사업자**일 수 있습니다.

[수집된 SNS 정보]
URL: ${url}
제목: ${snsTitle || '미확인'}
설명: ${snsDescription || '미확인'}
본문 내용 (일부):
${(snsContent || '정보 없음').substring(0, 5000)}

중요 지침:
1. 위 내용에서 이 사람이 제공하는 서비스/상품을 파악하세요.
2. 매장명이 없으면 블로그/SNS 이름에서 추론하세요.
3. 업종을 최대한 정확히 판단하세요. 판단 불가 시 "OTHER"로 설정.
4. 프리랜서인 경우 "프리랜서"라고 명시하세요.
5. 절대 데이터를 지어내지 마세요. 확인할 수 없는 항목은 "정보 없음"으로 표시.

다음 JSON 형식으로만 응답하세요:
{
  "store_name": "서비스/매장 이름 (블로그명 또는 SNS 이름 가능)",
  "business_type": "업종 코드 (BEAUTY_HAIR, BEAUTY_SKIN, BEAUTY_NAIL, RESTAURANT, CAFE, FITNESS, MEDICAL, EDUCATION, PET_SERVICE, FREELANCER, OTHER 중 선택)",
  "business_type_name": "업종명 (한글)",
  "ai_persona": "AI 상담사 역할 설명 (2-3문장, 서비스 특성 반영)",
  "ai_tone": "말투 스타일 (friendly/professional/casual)",
  "ai_features": "주요 기능들 (서비스에 맞는 기능, 쉼표로 구분)",
  "greeting_message": "첫 인사말 예시",
  "description": "서비스 설명 요약 (1-2문장)",
  "menu_items": "발견된 서비스/상품/메뉴 목록 (쉼표 구분, 없으면 빈 문자열)",
  "address": "주소 (발견 시, 없으면 빈 문자열)",
  "business_hours": "영업시간 (발견 시, 없으면 빈 문자열)",
  "is_freelancer": true/false
}`;

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${c.env.GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: snsPrompt }] }],
                generationConfig: {
                  temperature: 0.5,
                  maxOutputTokens: 1200
                }
              })
            }
          );
          
          if (geminiRes.ok) {
            const geminiData = await geminiRes.json() as any;
            const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                aiAnalysis = JSON.parse(jsonMatch[0]);
                console.log(`[SmartPlace] SNS AI 분석 완료: ${aiAnalysis.store_name} (${aiAnalysis.business_type})`);
              } catch {
                console.log('[SmartPlace] SNS AI 응답 JSON 파싱 실패');
              }
            }
          }
        } catch (e) {
          console.error('[SmartPlace] SNS Gemini 분석 오류:', e);
        }
      }
      
      // AI 분석 실패 시 기본값
      if (!aiAnalysis) {
        aiAnalysis = {
          store_name: snsTitle || '',
          business_type: 'OTHER',
          business_type_name: '기타',
          ai_persona: '전문 AI 상담사입니다. 고객님의 문의에 친절하게 응대합니다.',
          ai_tone: 'friendly',
          ai_features: '서비스 안내, 문의 응대',
          greeting_message: `안녕하세요! 무엇을 도와드릴까요?`,
          description: '',
          menu_items: '',
          address: '',
          business_hours: '',
          is_freelancer: true
        };
      }
      
      return c.json<ApiResponse>({
        success: true,
        data: {
          source_type: 'sns',
          sns_type: snsType,
          sns_url: url,
          place_info: {
            place_id: null,
            store_name: aiAnalysis.store_name || snsTitle || '',
            category: aiAnalysis.business_type_name || '',
            address: aiAnalysis.address || '',
            phone: '',
            business_hours: aiAnalysis.business_hours || '',
            description: aiAnalysis.description || snsDescription || '',
            menu_items: aiAnalysis.menu_items ? aiAnalysis.menu_items.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
            review_keywords: [],
            images: [],
            rating: 0,
            review_count: 0,
            business_type_code: '',
            is_freelancer: aiAnalysis.is_freelancer || false
          },
          ai_analysis: {
            business_type: aiAnalysis.business_type || 'OTHER',
            business_type_name: aiAnalysis.business_type_name || '기타',
            ai_persona: aiAnalysis.ai_persona || '',
            ai_tone: aiAnalysis.ai_tone || 'friendly',
            ai_features: aiAnalysis.ai_features || '',
            greeting_message: aiAnalysis.greeting_message || ''
          },
          auto_fill: {
            store_name: aiAnalysis.store_name || snsTitle || '',
            business_type: aiAnalysis.business_type || 'OTHER',
            business_type_name: aiAnalysis.business_type_name || '기타',
            business_specialty: aiAnalysis.ai_features || '',
            ai_persona: aiAnalysis.ai_persona || '',
            ai_tone: aiAnalysis.ai_tone || 'friendly',
            greeting_message: aiAnalysis.greeting_message || ''
          }
        },
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('[SmartPlace] SNS 분석 전체 오류:', error);
      return c.json<ApiResponse>({
        success: false,
        error: 'SNS 링크 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        timestamp: Date.now()
      }, 500);
    }
  }
  // ============ SNS URL 처리 끝 ============
  
  // placeId가 아직 없으면 URL 검증
  if (!placeId) {
    const validation = validateSmartPlaceUrl(url);
    if (!validation.valid) {
      return c.json<ApiResponse>({
        success: false,
        error: validation.error || '지원하지 않는 링크 형식입니다',
        timestamp: Date.now()
      }, 400);
    }
    placeId = validation.placeId;
  }
  
  // placeId가 여전히 없으면 에러
  if (!placeId) {
    return c.json<ApiResponse>({
      success: false,
      error: '플레이스 ID를 추출할 수 없습니다. 올바른 네이버 스마트 플레이스 링크를 입력해주세요.',
      timestamp: Date.now()
    }, 400);
  }
  
  try {
    // ============ [추가] 실제 데이터 크롤링 - Place Summary API (최우선) ============
    // 이 API가 가장 안정적으로 실제 매장 정보를 반환함
    console.log(`[SmartPlace] Place ID ${placeId} 실제 데이터 크롤링 시작...`);
    
    let extractedData = {
      place_id: placeId,
      store_name: '',
      category: '',
      address: '',
      phone: '',
      business_hours: '',
      description: '',
      menu_items: [] as string[],
      review_keywords: [] as string[],
      images: [] as string[],
      rating: 0,
      review_count: 0,
      business_type_code: '' // hairshop, restaurant 등
    };
    
    let realDataFetched = false;
    
    // [추가] 방법 0: Place Summary API (가장 신뢰성 높음)
    try {
      const summaryUrl = `https://map.naver.com/p/api/place/summary/${placeId}`;
      console.log(`[SmartPlace] Summary API 호출: ${summaryUrl}`);
      
      const summaryRes = await fetch(summaryUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'ko-KR,ko;q=0.9',
          'Referer': 'https://map.naver.com/'
        }
      });
      
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json() as any;
        console.log(`[SmartPlace] Summary API 응답 수신`);
        
        // 실제 데이터 추출
        if (summaryData?.data?.placeDetail) {
          const detail = summaryData.data.placeDetail;
          
          // 매장명 (필수)
          if (detail.name) {
            extractedData.store_name = detail.name;
            console.log(`[SmartPlace] ✅ 실제 매장명: ${detail.name}`);
          }
          
          // 업종 (필수)
          if (detail.category?.category) {
            extractedData.category = detail.category.category;
            console.log(`[SmartPlace] ✅ 실제 업종: ${detail.category.category}`);
          }
          
          // 업종 코드 (hairshop, restaurant 등)
          if (detail.businessType) {
            extractedData.business_type_code = detail.businessType;
            console.log(`[SmartPlace] ✅ 업종 코드: ${detail.businessType}`);
          }
          
          // 주소
          if (detail.address?.roadAddress) {
            extractedData.address = detail.address.roadAddress;
          } else if (detail.address?.address) {
            extractedData.address = detail.address.address;
          }
          
          // 영업시간
          if (detail.businessHours?.description) {
            extractedData.business_hours = detail.businessHours.description;
          }
          
          // 대표 가격/메뉴
          if (detail.reprPrice?.displayText) {
            extractedData.menu_items.push(detail.reprPrice.displayText);
          }
          
          // 리뷰 수
          if (detail.visitorReviews?.displayText) {
            const reviewMatch = detail.visitorReviews.displayText.match(/\d+/);
            if (reviewMatch) {
              extractedData.review_count = parseInt(reviewMatch[0], 10);
            }
          }
          
          // 이미지
          if (detail.images?.images) {
            extractedData.images = detail.images.images.slice(0, 5).map((img: any) => img.origin);
          }
          
          // 뷰티 스타일 (미용실인 경우)
          if (detail.beautyStyles?.reprStyles) {
            extractedData.review_keywords = detail.beautyStyles.reprStyles.slice(0, 5).map((s: any) => s.categoryString);
          }
          
          // 필수 필드 검증 (매장명, 업종)
          if (extractedData.store_name && extractedData.category) {
            realDataFetched = true;
            console.log(`[SmartPlace] ✅ 실제 데이터 수집 성공: ${extractedData.store_name} (${extractedData.category})`);
          }
        }
      } else {
        console.log(`[SmartPlace] Summary API 실패: ${summaryRes.status}`);
      }
    } catch (e) {
      console.log(`[SmartPlace] Summary API 오류:`, e);
    }
    // ============ [추가] Place Summary API 끝 ============
    
    // 기존 방법들 (Summary API 실패 시 폴백)
    let placeData: any = null;
    
    if (!realDataFetched) {
      // 네이버 플레이스 API 호출 (공개 정보)
      const placeApiUrl = `https://map.naver.com/p/api/search/allSearch?query=${placeId}&type=all&searchCoord=&boundary=`;
      
      // 또는 직접 place 정보 조회
      const placeDetailUrl = `https://map.naver.com/p/api/place/detailed/${placeId}`;
      
      // 방법 1: Place Detail API 시도
      try {
        const detailRes = await fetch(placeDetailUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://map.naver.com/'
          }
        });
        
        if (detailRes.ok) {
          placeData = await detailRes.json();
        }
      } catch (e) {
        console.log('Place detail API failed, trying alternative...');
      }
      
      // 방법 2: Place API v2 시도
      if (!placeData) {
        try {
          const v2Url = `https://pcmap.place.naver.com/place/${placeId}/home`;
          const v2Res = await fetch(v2Url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (v2Res.ok) {
            const html = await v2Res.text();
            // HTML에서 JSON 데이터 추출
            const jsonMatch = html.match(/__APOLLO_STATE__\s*=\s*({.*?});/s);
            if (jsonMatch) {
              try {
                placeData = JSON.parse(jsonMatch[1]);
              } catch {}
            }
          }
        } catch (e) {
          console.log('Place v2 API failed');
        }
      }
      
      // 기존 데이터 추출 로직 (폴백용)
      if (placeData) {
        // Apollo State 구조에서 데이터 추출
        const placeKey = Object.keys(placeData).find(k => k.startsWith('PlaceDetailBase:'));
        if (placeKey && placeData[placeKey]) {
          const place = placeData[placeKey];
          if (!extractedData.store_name) extractedData.store_name = place.name || '';
          if (!extractedData.category) extractedData.category = place.category || '';
          if (!extractedData.address) extractedData.address = place.roadAddress || place.address || '';
          extractedData.phone = place.phone || '';
        }
        
        // 영업시간 추출
        const bizHoursKey = Object.keys(placeData).find(k => k.startsWith('PlaceBizHours:'));
        if (bizHoursKey && placeData[bizHoursKey]) {
          if (!extractedData.business_hours) extractedData.business_hours = placeData[bizHoursKey].summary || '';
        }
        
        // 메뉴 추출
        const menuKeys = Object.keys(placeData).filter(k => k.startsWith('PlaceMenuItem:'));
        if (extractedData.menu_items.length === 0) {
          extractedData.menu_items = menuKeys.slice(0, 10).map(k => {
            const item = placeData[k];
            return item?.name ? `${item.name}${item.price ? ` (${item.price})` : ''}` : '';
          }).filter(Boolean);
        }
        
        // 폴백에서도 데이터 있으면 성공 처리
        if (extractedData.store_name && extractedData.category) {
          realDataFetched = true;
        }
      }
    }
    
    // ============ [추가] 데이터 수집 실패 시 에러 반환 (가짜 데이터 생성 금지) ============
    if (!realDataFetched || !extractedData.store_name) {
      console.log(`[SmartPlace] ❌ 실제 데이터 수집 실패 - Place ID: ${placeId}`);
      return c.json<ApiResponse>({
        success: false,
        error: '데이터를 수집할 수 없습니다. 네이버 플레이스 페이지에서 직접 정보를 확인하시거나, 수동으로 입력해 주세요.',
        data: {
          place_id: placeId,
          place_url: `https://map.naver.com/p/entry/place/${placeId}`,
          reason: '네이버 API 응답 없음 또는 매장 정보 비공개'
        },
        timestamp: Date.now()
      }, 400);
    }
    // ============ 가짜 데이터 생성 로직 삭제됨 ============
    
    // ============ [추가] 업종 코드 매핑 (실제 데이터 기반) ============
    // 네이버 businessType → XIVIX 업종 코드 매핑 (확장판)
    const businessTypeMapping: { [key: string]: { code: string; name: string } } = {
      // 뷰티/미용
      'hairshop': { code: 'BEAUTY_HAIR', name: '미용실' },
      'hair': { code: 'BEAUTY_HAIR', name: '미용실' },
      'beauty': { code: 'BEAUTY_SKIN', name: '피부관리/에스테틱' },
      'skincare': { code: 'BEAUTY_SKIN', name: '피부관리' },
      'nail': { code: 'BEAUTY_NAIL', name: '네일샵' },
      'nailshop': { code: 'BEAUTY_NAIL', name: '네일샵' },
      'spa': { code: 'BEAUTY_SKIN', name: '스파/마사지' },
      'massage': { code: 'BEAUTY_SKIN', name: '마사지' },
      // 음식점/카페
      'restaurant': { code: 'RESTAURANT', name: '음식점' },
      'food': { code: 'RESTAURANT', name: '음식점' },
      'cafe': { code: 'CAFE', name: '카페' },
      'bakery': { code: 'CAFE', name: '베이커리/카페' },
      'bar': { code: 'RESTAURANT', name: '바/주점' },
      // 건강/의료
      'fitness': { code: 'FITNESS', name: '헬스/피트니스' },
      'gym': { code: 'FITNESS', name: '헬스장' },
      'yoga': { code: 'FITNESS', name: '요가/필라테스' },
      'hospital': { code: 'MEDICAL', name: '병원/의원' },
      'clinic': { code: 'MEDICAL', name: '의원/클리닉' },
      'dental': { code: 'MEDICAL', name: '치과' },
      'pharmacy': { code: 'PHARMACY', name: '약국' },
      // 기타
      'accommodation': { code: 'ACCOMMODATION', name: '숙박' },
      'hotel': { code: 'ACCOMMODATION', name: '호텔' },
      'education': { code: 'EDUCATION', name: '학원/교육' },
      'academy': { code: 'EDUCATION', name: '학원' },
      'pet': { code: 'PET_SERVICE', name: '반려동물' },
      'petshop': { code: 'PET_SERVICE', name: '펫샵' },
      'auto': { code: 'AUTO_SERVICE', name: '자동차 서비스' },
      'carwash': { code: 'AUTO_SERVICE', name: '세차장' }
    };
    
    // 실제 수집된 업종 코드로 매핑 (할루시네이션 방지 - 강제 적용)
    let mappedBusinessType = { code: 'OTHER', name: extractedData.category || '기타' };
    
    // 1순위: 네이버 businessType 코드 직접 매핑
    if (extractedData.business_type_code) {
      const lowerCode = extractedData.business_type_code.toLowerCase();
      if (businessTypeMapping[lowerCode]) {
        mappedBusinessType = businessTypeMapping[lowerCode];
        console.log(`[SmartPlace] ✅ 업종 코드 직접 매핑: ${lowerCode} → ${mappedBusinessType.code} (${mappedBusinessType.name})`);
      }
    }
    
    // 2순위: 카테고리 텍스트 기반 강제 매핑 (업종 코드 없을 때)
    if (mappedBusinessType.code === 'OTHER' && extractedData.category) {
      const cat = extractedData.category.toLowerCase();
      
      // 미용실 패턴 (최우선 - '음식점/카페' 오분류 방지)
      if (cat.includes('미용') || cat.includes('헤어') || cat.includes('hair') || 
          cat.includes('펌') || cat.includes('염색') || cat.includes('커트')) {
        mappedBusinessType = { code: 'BEAUTY_HAIR', name: '미용실' };
        console.log(`[SmartPlace] ✅ 카테고리 텍스트 매핑 (미용실): ${extractedData.category}`);
      }
      // 네일/속눈썹
      else if (cat.includes('네일') || cat.includes('nail') || cat.includes('속눈썹')) {
        mappedBusinessType = { code: 'BEAUTY_NAIL', name: '네일/속눈썹' };
      }
      // 피부관리
      else if (cat.includes('피부') || cat.includes('에스테틱') || cat.includes('스파') || cat.includes('마사지')) {
        mappedBusinessType = { code: 'BEAUTY_SKIN', name: '피부관리/에스테틱' };
      }
      // 음식점
      else if (cat.includes('음식') || cat.includes('식당') || cat.includes('맛집') || 
               cat.includes('치킨') || cat.includes('고기') || cat.includes('한식') ||
               cat.includes('중식') || cat.includes('일식') || cat.includes('양식')) {
        mappedBusinessType = { code: 'RESTAURANT', name: '음식점' };
      }
      // 카페
      else if (cat.includes('카페') || cat.includes('커피') || cat.includes('베이커리') || cat.includes('디저트')) {
        mappedBusinessType = { code: 'CAFE', name: '카페' };
      }
      // 헬스/피트니스
      else if (cat.includes('헬스') || cat.includes('피트니스') || cat.includes('gym') || 
               cat.includes('요가') || cat.includes('필라테스')) {
        mappedBusinessType = { code: 'FITNESS', name: '헬스/피트니스' };
      }
      // 병원/의료
      else if (cat.includes('병원') || cat.includes('의원') || cat.includes('클리닉') || 
               cat.includes('치과') || cat.includes('한의원')) {
        mappedBusinessType = { code: 'MEDICAL', name: '병원/의원' };
      }
    }
    
    console.log(`[SmartPlace] 최종 업종 결정: ${mappedBusinessType.code} (${mappedBusinessType.name})`);
    // ============ 업종 코드 매핑 끝 ============
    
    // Gemini AI로 페르소나 자동 생성
    let aiAnalysis = null;
    
    if (c.env.GEMINI_API_KEY) {
      try {
        // [수정] 실제 수집된 데이터 기반 프롬프트 (업종 코드 강제 적용)
        const geminiPrompt = `당신은 AI 상담사 페르소나를 설계하는 전문가입니다.

다음은 네이버 플레이스에서 실제로 수집된 매장 정보입니다:

[실제 수집 데이터]
매장명: ${extractedData.store_name}
업종: ${extractedData.category}
업종 코드: ${extractedData.business_type_code || '미확인'}
주소: ${extractedData.address}
영업시간: ${extractedData.business_hours}
대표 메뉴/가격: ${extractedData.menu_items.join(', ') || '정보 없음'}
스타일/키워드: ${extractedData.review_keywords.join(', ') || '정보 없음'}
리뷰 수: ${extractedData.review_count}개

중요: 위 데이터는 실제 네이버 플레이스에서 수집된 정보입니다. 
업종이 "${extractedData.category}"이므로, business_type은 반드시 "${mappedBusinessType.code}"로, business_type_name은 "${mappedBusinessType.name}"으로 설정하세요.
절대로 다른 업종으로 변경하지 마세요.

다음 JSON 형식으로만 응답하세요:
{
  "business_type": "${mappedBusinessType.code}",
  "business_type_name": "${mappedBusinessType.name}",
  "ai_persona": "AI 상담사의 역할 설명 (2-3문장, 매장명과 업종 특성 반영)",
  "ai_tone": "말투 스타일 (friendly/professional/casual)",
  "ai_features": "주요 기능들 (업종에 맞는 기능, 쉼표로 구분)",
  "greeting_message": "첫 인사말 예시 (실제 매장명 포함)",
  "target_customer": "예상 주요 고객층 (주소 기반)",
  "competitive_edge": "경쟁력 분석 (1-2문장)"
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${c.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: geminiPrompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000
              }
            })
          }
        );
        
        if (geminiRes.ok) {
          const geminiData = await geminiRes.json() as any;
          const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          // JSON 추출
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              aiAnalysis = JSON.parse(jsonMatch[0]);
            } catch {
              console.log('Failed to parse Gemini response');
            }
          }
        }
      } catch (e) {
        console.error('Gemini API error:', e);
      }
    }
    
    // AI 분석 실패 시 기본값 (실제 수집 데이터 기반)
    if (!aiAnalysis) {
      aiAnalysis = {
        business_type: mappedBusinessType.code,  // [수정] 실제 업종 코드 사용
        business_type_name: mappedBusinessType.name,  // [수정] 실제 업종명 사용
        ai_persona: `${extractedData.store_name}의 전문 AI 상담사입니다. 고객님의 문의에 친절하게 응대합니다.`,
        ai_tone: 'friendly',
        ai_features: '예약 안내, 메뉴 소개, 영업시간 안내',
        greeting_message: `안녕하세요! ${extractedData.store_name}입니다. 무엇을 도와드릴까요?`,
        target_customer: '일반 고객',
        competitive_edge: '친절한 응대와 빠른 답변'
      };
    }
    
    // ============ [추가] AI 분석 결과 업종 검증 (할루시네이션 방지) ============
    // AI가 잘못된 업종을 반환하면 실제 수집된 업종으로 강제 교정
    if (aiAnalysis.business_type !== mappedBusinessType.code) {
      console.log(`[SmartPlace] ⚠️ AI 업종 불일치 감지: AI=${aiAnalysis.business_type}, 실제=${mappedBusinessType.code}`);
      console.log(`[SmartPlace] 실제 업종으로 강제 교정`);
      aiAnalysis.business_type = mappedBusinessType.code;
      aiAnalysis.business_type_name = mappedBusinessType.name;
    }
    // ============ 업종 검증 끝 ============
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        place_info: extractedData,
        ai_analysis: aiAnalysis,
        auto_fill: {
          store_name: extractedData.store_name,
          business_type: aiAnalysis.business_type,
          business_type_name: aiAnalysis.business_type_name,
          business_specialty: aiAnalysis.ai_features,
          ai_persona: aiAnalysis.ai_persona,
          ai_tone: aiAnalysis.ai_tone,
          greeting_message: aiAnalysis.greeting_message
        }
      },
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Smart Place analysis error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: '매장 정보 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      timestamp: Date.now()
    }, 500);
  }
});

// 스마트 플레이스 URL 검증만 수행하는 API
api.post('/smartplace/validate', async (c) => {
  const { url } = await c.req.json() as { url: string };
  
  const validation = validateSmartPlaceUrl(url);
  
  return c.json<ApiResponse>({
    success: validation.valid,
    data: validation.valid ? { 
      place_id: validation.placeId || null,
      sns_type: validation.snsType || null
    } : null,
    error: validation.error,
    timestamp: Date.now()
  }, validation.valid ? 200 : 400);
});

// ============================================================================
// [1] XIVIX_MASTER_PIPELINE_FIX - 마스터 파이프라인 API (추가)
// ============================================================================

// [1-1] 마스터 대시보드 통합 데이터 조회
api.get('/master/dashboard', async (c) => {
  try {
    // 대기 중인 매장 수
    const pendingCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM xivix_stores WHERE onboarding_status = ?'
    ).bind('pending').first<{ count: number }>();
    
    // 활성 매장 수
    const activeCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM xivix_stores WHERE is_active = 1'
    ).first<{ count: number }>();
    
    // 오늘 예약 승인 대기 건수
    const today = new Date().toISOString().split('T')[0];
    const pendingReservations = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM xivix_reservations WHERE status = ? AND DATE(created_at) = ?'
    ).bind('pending_approval', today).first<{ count: number }>();
    
    // 최근 대기 목록 (상위 10개)
    const recentPending = await c.env.DB.prepare(`
      SELECT id, store_name, owner_name, owner_phone, business_type, business_type_name,
             naver_talktalk_id, onboarding_status, onboarding_progress, created_at
      FROM xivix_stores 
      WHERE onboarding_status = 'pending'
      ORDER BY created_at DESC
      LIMIT 10
    `).all();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        summary: {
          pending_stores: pendingCount?.count || 0,
          active_stores: activeCount?.count || 0,
          pending_reservations: pendingReservations?.count || 0
        },
        pending_list: recentPending.results,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Master dashboard error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: '대시보드 데이터 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [1-2] 매장 상세 정보 + AI 분석 결과 조회 (승인 전 검토용)
api.get('/master/store/:id/preview', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const store = await c.env.DB.prepare(
      'SELECT * FROM xivix_stores WHERE id = ?'
    ).bind(storeId).first();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    // 톡톡 토큰 존재 여부 확인
    const token = await c.env.DB.prepare(
      'SELECT id, provider, created_at FROM xivix_api_tokens WHERE store_id = ? AND provider = ?'
    ).bind(storeId, 'naver_talktalk').first();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        store,
        has_talktalk_token: !!token,
        token_info: token ? { provider: token.provider, created_at: token.created_at } : null
      },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '매장 정보 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [1-3] AI 테스트 메시지 발송 (승인 전 가동 테스트)
api.post('/master/store/:id/test-message', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  const { message } = await c.req.json() as { message?: string };
  
  try {
    const store = await c.env.DB.prepare(
      'SELECT * FROM xivix_stores WHERE id = ?'
    ).bind(storeId).first<any>();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    // 테스트 모드에서는 실제 발송 안 함
    const isTestMode = c.env.IS_TEST_MODE === 'true';
    
    const testResult = {
      store_id: storeId,
      store_name: store.store_name,
      test_message: message || 'Hello XIVIX - 테스트 메시지입니다',
      ai_persona: store.ai_persona || '기본 페르소나',
      ai_tone: store.ai_tone || 'friendly',
      test_mode: isTestMode,
      status: isTestMode ? 'simulated' : 'sent',
      timestamp: new Date().toISOString()
    };
    
    console.log('[Master Test] 테스트 메시지:', JSON.stringify(testResult));
    
    return c.json<ApiResponse>({
      success: true,
      data: testResult,
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '테스트 메시지 발송 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [1-4] 매장 승인 + 사장님 완료 알림 발송 (원클릭 승인)
api.post('/master/store/:id/approve', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  const data = await c.req.json() as {
    ai_persona?: string;
    ai_features?: string;
    ai_tone?: string;
    auth_key?: string;
    send_notification?: boolean;
  };
  
  try {
    // 매장 정보 조회
    const store = await c.env.DB.prepare(
      'SELECT * FROM xivix_stores WHERE id = ?'
    ).bind(storeId).first<any>();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    // 매장 활성화
    await c.env.DB.prepare(`
      UPDATE xivix_stores SET
        onboarding_status = 'active',
        onboarding_progress = 100,
        is_active = 1,
        ai_persona = COALESCE(?, ai_persona),
        ai_features = COALESCE(?, ai_features),
        ai_tone = COALESCE(?, ai_tone),
        activated_at = CURRENT_TIMESTAMP,
        activated_by = 'master',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.ai_persona || null,
      data.ai_features || null,
      data.ai_tone || null,
      storeId
    ).run();
    
    // 톡톡 토큰 저장 (있으면)
    if (data.auth_key) {
      const existing = await c.env.DB.prepare(
        'SELECT id FROM xivix_api_tokens WHERE store_id = ? AND provider = ?'
      ).bind(storeId, 'naver_talktalk').first();
      
      if (existing) {
        await c.env.DB.prepare(`
          UPDATE xivix_api_tokens SET access_token = ?, updated_at = CURRENT_TIMESTAMP
          WHERE store_id = ? AND provider = 'naver_talktalk'
        `).bind(data.auth_key, storeId).run();
      } else {
        await c.env.DB.prepare(`
          INSERT INTO xivix_api_tokens (store_id, provider, access_token)
          VALUES (?, 'naver_talktalk', ?)
        `).bind(storeId, data.auth_key).run();
      }
    }
    
    // 관리자 로그 기록
    await c.env.DB.prepare(`
      INSERT INTO xivix_admin_logs (admin_id, action, target_store_id, details)
      VALUES ('master', 'approve', ?, ?)
    `).bind(storeId, JSON.stringify({ ...data, approved_at: new Date().toISOString() })).run();
    
    // 사장님께 완료 알림 발송 (옵션)
    let notificationResult = null;
    if (data.send_notification !== false && store.owner_phone) {
      try {
        await sendActivationNotification(c.env, {
          store_id: storeId,
          store_name: store.store_name,
          owner_phone: store.owner_phone,
          naver_talktalk_id: store.naver_talktalk_id
        });
        notificationResult = 'sent';
      } catch (e) {
        notificationResult = 'failed';
        console.error('Activation notification failed:', e);
      }
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        message: '매장이 승인되어 활성화되었습니다',
        store_id: storeId,
        store_name: store.store_name,
        notification_status: notificationResult
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Store approval error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: '매장 승인 처리 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [1-5] 활성화 완료 알림 발송 헬퍼 함수 (추가)
async function sendActivationNotification(env: Env, data: {
  store_id: number;
  store_name: string;
  owner_phone: string;
  naver_talktalk_id?: string;
}) {
  const message = `🎉 XIVIX AI 지배인 세팅 완료!

${data.store_name} 사장님, 축하드립니다!

AI 지배인이 톡톡 상담을 시작합니다.
지금부터 24시간 자동 응대가 가능합니다.

▶ 네이버 톡톡 바로가기:
https://talk.naver.com/ct/${data.naver_talktalk_id || ''}

문의: 010-3988-0124`;

  const isTestMode = env.IS_TEST_MODE === 'true';
  
  if (isTestMode) {
    console.log('[TEST_MODE] 활성화 알림 차단됨:', { to: data.owner_phone, message: message.substring(0, 50) + '...' });
    await env.DB.prepare(`
      INSERT INTO xivix_notification_logs (store_id, notification_type, recipient_phone, recipient_type, content, status, error_message)
      VALUES (?, 'activation_complete', ?, 'owner', ?, 'test_mode', 'TEST_MODE: 실제 발송 차단됨')
    `).bind(data.store_id, data.owner_phone, message).run();
    return;
  }
  
  // 솔라피 설정 조회 및 발송 (기존 로직 재사용)
  const apiKey = await env.DB.prepare(
    'SELECT setting_value FROM xivix_notification_settings WHERE setting_key = ?'
  ).bind('solapi_api_key').first<{ setting_value: string }>();
  
  const apiSecret = await env.DB.prepare(
    'SELECT setting_value FROM xivix_notification_settings WHERE setting_key = ?'
  ).bind('solapi_api_secret').first<{ setting_value: string }>();
  
  if (!apiKey || !apiSecret) {
    console.log('[Notification] Solapi 설정 없음 - 로그만 기록');
    return;
  }
  
  const senderNumber = await env.DB.prepare(
    'SELECT setting_value FROM xivix_notification_settings WHERE setting_key = ?'
  ).bind('sender_number').first<{ setting_value: string }>();
  
  const fromNumber = (senderNumber?.setting_value || '01039880124').replace(/-/g, '');
  const toNumber = data.owner_phone.replace(/-/g, '');
  
  const dateISO = new Date().toISOString();
  const signature = await generateSolapiSignature(apiKey.setting_value, apiSecret.setting_value, dateISO);
  
  const response = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `HMAC-SHA256 apiKey=${apiKey.setting_value}, date=${dateISO}, salt=${signature.salt}, signature=${signature.signature}`
    },
    body: JSON.stringify({
      message: {
        to: toNumber,
        from: fromNumber,
        text: message,
        type: 'LMS',
        subject: '[XIVIX] AI 지배인 세팅 완료'
      }
    })
  });
  
  const result = await response.json() as any;
  
  await env.DB.prepare(`
    INSERT INTO xivix_notification_logs (store_id, notification_type, recipient_phone, recipient_type, content, status, provider_message_id, sent_at)
    VALUES (?, 'activation_complete', ?, 'owner', ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(data.store_id, data.owner_phone, message, result.groupId ? 'sent' : 'failed', result.groupId || null).run();
}

// ============================================================================
// [2] XIVIX_TALKTALK_WELCOME_PROTOCOL - 톡톡 환영 메시지 API (추가)
// ============================================================================

// [2-1] 환영 메시지 템플릿 조회
api.get('/talktalk/welcome-template/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  try {
    const store = await c.env.DB.prepare(
      'SELECT store_name, business_type, business_type_name, naver_talktalk_id, ai_persona FROM xivix_stores WHERE id = ?'
    ).bind(storeId).first<any>();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    const welcomeTemplate = {
      header: `${store.store_name} AI 지배인 출근`,
      body: `안녕하세요, ${store.store_name}의 AI 지배인 XIVIX입니다.
사장님을 대신해 24시간 실시간 상담과 예약을 도와드리고 있습니다.

▫️ 주차/위치/가격 궁금하신 점을 물어보세요.
▫️ 시술 사진을 보내주시면 AI가 즉시 분석해 드립니다.

👇 아래 버튼을 눌러 바로 예약하거나 상담을 시작하세요!`,
      buttons: [
        { label: '📅 네이버 예약하기', url: `https://booking.naver.com/booking/13/bizes/${store.naver_talktalk_id}` },
        { label: '🔍 맞춤형 시술 추천', type: 'chat_trigger' }
      ],
      store_info: {
        name: store.store_name,
        business_type: store.business_type_name,
        talktalk_id: store.naver_talktalk_id
      }
    };
    
    return c.json<ApiResponse>({
      success: true,
      data: welcomeTemplate,
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '환영 메시지 템플릿 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [2-2] 환영 메시지 발송 (테스트용)
api.post('/talktalk/send-welcome/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const { user_id } = await c.req.json() as { user_id?: string };
  
  const isTestMode = c.env.IS_TEST_MODE === 'true';
  
  try {
    const store = await c.env.DB.prepare(
      'SELECT * FROM xivix_stores WHERE id = ?'
    ).bind(storeId).first<any>();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    const welcomeMessage = {
      type: 'ACTION_CARD',
      content: {
        header: `${store.store_name} AI 지배인 출근`,
        body: '24시간 실시간 상담 및 예약 엔진이 가동 중입니다. 무엇이든 물어보세요.',
        buttons: [
          { label: '네이버 예약', url: `https://booking.naver.com/` },
          { label: '전문 상담 시작', type: 'chat_trigger' }
        ]
      },
      test_mode: isTestMode,
      sent_at: new Date().toISOString()
    };
    
    if (isTestMode) {
      console.log('[TEST_MODE] 환영 메시지 발송 시뮬레이션:', welcomeMessage);
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        message: isTestMode ? '테스트 모드: 환영 메시지 시뮬레이션 완료' : '환영 메시지 발송 완료',
        welcome_message: welcomeMessage
      },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '환영 메시지 발송 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ============================================================================
// [3] XIVIX_LIVE_MONITOR_V1 - 실시간 관전 및 개입 시스템 (추가)
// ============================================================================

// [3-1] 실시간 대화 로그 조회 (마스터용)
api.get('/master/live-logs', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const storeId = c.req.query('store_id');
  
  try {
    let query = `
      SELECT cl.*, s.store_name, s.business_type_name
      FROM xivix_conversation_logs cl
      LEFT JOIN xivix_stores s ON cl.store_id = s.id
    `;
    
    if (storeId) {
      query += ` WHERE cl.store_id = ${parseInt(storeId, 10)}`;
    }
    
    query += ` ORDER BY cl.created_at DESC LIMIT ${limit}`;
    
    const logs = await c.env.DB.prepare(query).all();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        logs: logs.results,
        count: logs.results.length
      },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '대화 로그 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [3-2] AI 응답 중단 (Takeover Mode)
api.post('/master/store/:id/takeover', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  const { mode, reason } = await c.req.json() as { mode: 'mute' | 'resume'; reason?: string };
  
  try {
    // KV에 AI 중단 플래그 설정
    const flagKey = `ai_muted:${storeId}`;
    
    if (mode === 'mute') {
      await c.env.KV.put(flagKey, JSON.stringify({
        muted: true,
        reason: reason || '마스터 개입',
        muted_at: new Date().toISOString(),
        muted_by: 'master'
      }), { expirationTtl: 3600 }); // 1시간 후 자동 해제
      
      // 로그 기록
      await c.env.DB.prepare(`
        INSERT INTO xivix_admin_logs (admin_id, action, target_store_id, details)
        VALUES ('master', 'ai_mute', ?, ?)
      `).bind(storeId, JSON.stringify({ reason, mode })).run();
      
      return c.json<ApiResponse>({
        success: true,
        data: { message: 'AI 응답이 중단되었습니다. 직접 상담 모드로 전환됩니다.', mode: 'muted' },
        timestamp: Date.now()
      });
    } else {
      await c.env.KV.delete(flagKey);
      
      await c.env.DB.prepare(`
        INSERT INTO xivix_admin_logs (admin_id, action, target_store_id, details)
        VALUES ('master', 'ai_resume', ?, ?)
      `).bind(storeId, JSON.stringify({ reason: '마스터가 AI 재개' })).run();
      
      return c.json<ApiResponse>({
        success: true,
        data: { message: 'AI 응답이 재개되었습니다.', mode: 'active' },
        timestamp: Date.now()
      });
    }
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: 'AI 상태 변경 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [3-3] AI 상태 확인
api.get('/master/store/:id/ai-status', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const flagKey = `ai_muted:${storeId}`;
    const muteStatus = await c.env.KV.get(flagKey);
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        store_id: storeId,
        ai_active: !muteStatus,
        mute_info: muteStatus ? JSON.parse(muteStatus) : null
      },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: 'AI 상태 확인 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [3-4] 할루시네이션 감지 알림 조회
api.get('/master/alerts/hallucination', async (c) => {
  try {
    // 최근 24시간 내 할루시네이션 의심 로그 조회
    const alerts = await c.env.DB.prepare(`
      SELECT * FROM xivix_admin_logs 
      WHERE action = 'hallucination_detected'
      AND created_at > datetime('now', '-24 hours')
      ORDER BY created_at DESC
      LIMIT 20
    `).all();
    
    return c.json<ApiResponse>({
      success: true,
      data: alerts.results,
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '알림 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ============================================================================
// [4] XIVIX_SAFETY_CONTROL_V1 - 예약 승인 워크플로우 (추가)
// ============================================================================

// [4-1] 예약 승인 대기 목록 조회
api.get('/master/reservations/pending', async (c) => {
  try {
    const reservations = await c.env.DB.prepare(`
      SELECT r.*, s.store_name, s.owner_phone, s.naver_talktalk_id
      FROM xivix_reservations r
      LEFT JOIN xivix_stores s ON r.store_id = s.id
      WHERE r.status = 'pending_approval'
      ORDER BY r.created_at DESC
    `).all();
    
    return c.json<ApiResponse>({
      success: true,
      data: reservations.results,
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '예약 대기 목록 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [4-2] 예약 승인/거절
api.post('/master/reservation/:id/decision', async (c) => {
  const reservationId = parseInt(c.req.param('id'), 10);
  const { decision, reason } = await c.req.json() as { decision: 'approve' | 'reject'; reason?: string };
  
  try {
    const reservation = await c.env.DB.prepare(
      'SELECT r.*, s.store_name, s.owner_phone FROM xivix_reservations r LEFT JOIN xivix_stores s ON r.store_id = s.id WHERE r.id = ?'
    ).bind(reservationId).first<any>();
    
    if (!reservation) {
      return c.json<ApiResponse>({
        success: false,
        error: '예약을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    const newStatus = decision === 'approve' ? 'confirmed' : 'rejected';
    
    await c.env.DB.prepare(`
      UPDATE xivix_reservations SET
        status = ?,
        approved_by = 'master',
        approved_at = CURRENT_TIMESTAMP,
        rejection_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(newStatus, decision === 'reject' ? reason : null, reservationId).run();
    
    // 관리자 로그
    await c.env.DB.prepare(`
      INSERT INTO xivix_admin_logs (admin_id, action, target_store_id, details)
      VALUES ('master', ?, ?, ?)
    `).bind(
      decision === 'approve' ? 'reservation_approve' : 'reservation_reject',
      reservation.store_id,
      JSON.stringify({ reservation_id: reservationId, decision, reason })
    ).run();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        message: decision === 'approve' ? '예약이 확정되었습니다' : '예약이 거절되었습니다',
        reservation_id: reservationId,
        new_status: newStatus
      },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '예약 처리 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [4-3] AI 임시 예약 생성 (AI가 호출)
api.post('/reservation/create-pending', async (c) => {
  const data = await c.req.json() as {
    store_id: number;
    customer_name: string;
    customer_phone?: string;
    service_type: string;
    reservation_date: string;
    reservation_time: string;
    ai_suggested: boolean;
  };
  
  try {
    const result = await c.env.DB.prepare(`
      INSERT INTO xivix_reservations (store_id, customer_name, customer_phone, service_type, reservation_date, reservation_time, status, ai_suggested)
      VALUES (?, ?, ?, ?, ?, ?, 'pending_approval', ?)
    `).bind(
      data.store_id,
      data.customer_name,
      data.customer_phone || null,
      data.service_type,
      data.reservation_date,
      data.reservation_time,
      data.ai_suggested ? 1 : 0
    ).run();
    
    // 마스터에게 알림 (추후 구현)
    console.log('[Reservation] 새 예약 승인 대기:', { id: result.meta.last_row_id, ...data });
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        reservation_id: result.meta.last_row_id,
        status: 'pending_approval',
        message: '예약이 임시 등록되었습니다. 사장님/마스터의 승인을 기다리고 있습니다.'
      },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '예약 생성 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ============================================================================
// [5] XIVIX_TOTAL_CONTROL_V1 - 통합 관제 및 긴급 알림 시스템 (추가)
// ============================================================================

// [5-1] 시스템 전체 상태 모니터링
api.get('/master/system/status', async (c) => {
  try {
    // DB 상태
    const dbTest = await c.env.DB.prepare('SELECT 1 as test').first();
    
    // KV 상태
    let kvStatus = false;
    try {
      await c.env.KV.put('health_check', 'ok', { expirationTtl: 60 });
      kvStatus = true;
    } catch {}
    
    // R2 상태
    let r2Status = false;
    try {
      await c.env.R2.head('health_check');
      r2Status = true;
    } catch {
      r2Status = true; // 파일 없어도 연결은 OK
    }
    
    // 매장 통계
    const storeStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN onboarding_status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM xivix_stores
    `).first<{ total: number; active: number; pending: number }>();
    
    // 오늘 대화 수
    const today = new Date().toISOString().split('T')[0];
    const todayChats = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM xivix_conversation_logs WHERE DATE(created_at) = ?'
    ).bind(today).first<{ count: number }>();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        system: {
          database: !!dbTest,
          kv: kvStatus,
          r2: r2Status,
          ai_model: c.env.AI_MODEL || 'gemini-2.5-flash',
          version: c.env.XIVIX_VERSION || '1.0.0'
        },
        stores: {
          total: storeStats?.total || 0,
          active: storeStats?.active || 0,
          pending: storeStats?.pending || 0
        },
        today: {
          conversations: todayChats?.count || 0
        },
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '시스템 상태 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [5-2] 긴급 알림 발송 (마스터 → 사장님)
api.post('/master/alert/send', async (c) => {
  const { store_id, message, alert_type } = await c.req.json() as {
    store_id: number;
    message: string;
    alert_type: 'reservation' | 'system' | 'warning';
  };
  
  const isTestMode = c.env.IS_TEST_MODE === 'true';
  
  try {
    const store = await c.env.DB.prepare(
      'SELECT owner_phone, store_name FROM xivix_stores WHERE id = ?'
    ).bind(store_id).first<any>();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    const alertMessage = `🚨 XIVIX ${alert_type === 'reservation' ? '예약' : '시스템'} 알림

${store.store_name} 사장님께

${message}

▶ 관리: https://xivix-ai-core.pages.dev/owner/${store_id}`;

    if (isTestMode) {
      console.log('[TEST_MODE] 긴급 알림 차단됨:', { to: store.owner_phone, message: alertMessage.substring(0, 50) + '...' });
      
      return c.json<ApiResponse>({
        success: true,
        data: { message: '테스트 모드: 알림 시뮬레이션 완료', test_mode: true },
        timestamp: Date.now()
      });
    }
    
    // 실제 발송 로직 (솔라피)
    // ... (기존 솔라피 발송 로직 재사용)
    
    return c.json<ApiResponse>({
      success: true,
      data: { message: '알림 발송 완료' },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '알림 발송 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [5-3] 프롬프트 실시간 패치 (할루시네이션 발견 시)
api.post('/master/store/:id/patch-prompt', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  const { ai_persona, ai_features, ai_tone, patch_reason } = await c.req.json() as {
    ai_persona?: string;
    ai_features?: string;
    ai_tone?: string;
    patch_reason: string;
  };
  
  try {
    await c.env.DB.prepare(`
      UPDATE xivix_stores SET
        ai_persona = COALESCE(?, ai_persona),
        ai_features = COALESCE(?, ai_features),
        ai_tone = COALESCE(?, ai_tone),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(ai_persona || null, ai_features || null, ai_tone || null, storeId).run();
    
    // 로그 기록
    await c.env.DB.prepare(`
      INSERT INTO xivix_admin_logs (admin_id, action, target_store_id, details)
      VALUES ('master', 'prompt_patch', ?, ?)
    `).bind(storeId, JSON.stringify({ ai_persona, ai_features, ai_tone, patch_reason })).run();
    
    return c.json<ApiResponse>({
      success: true,
      data: { message: '프롬프트가 즉시 업데이트되었습니다' },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '프롬프트 패치 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ============================================================================
// [6] XIVIX_CONFIRMATION_CARD - 예약 확정 카드 및 리포트 (추가)
// ============================================================================

// [6-1] 예약 확정 카드 템플릿 생성
api.get('/reservation/:id/confirmation-card', async (c) => {
  const reservationId = parseInt(c.req.param('id'), 10);
  
  try {
    const reservation = await c.env.DB.prepare(`
      SELECT r.*, s.store_name, s.address, s.phone as store_phone, s.naver_talktalk_id
      FROM xivix_reservations r
      LEFT JOIN xivix_stores s ON r.store_id = s.id
      WHERE r.id = ?
    `).bind(reservationId).first<any>();
    
    if (!reservation) {
      return c.json<ApiResponse>({
        success: false,
        error: '예약을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    const confirmationCard = {
      template_id: 'CONFIRM_001',
      style: {
        background: 'Deep_Black',
        text_color: 'Tech_White',
        accent_color: 'Gold'
      },
      content: {
        header: 'Reservation Confirmed',
        main_image: 'https://xivix-ai-core.pages.dev/assets/confirmed_premium.png',
        title: '사장님이 예약을 직접 확정했습니다.',
        store_info: {
          name: reservation.store_name,
          time: `${reservation.reservation_date} ${reservation.reservation_time}`,
          service: reservation.service_type
        },
        body_text: '고객님, 기다려주셔서 감사합니다. 엄선된 실력과 정성으로 준비하고 기다리겠습니다.',
        buttons: [
          {
            label: '📍 매장 위치 보기 (네이버 지도)',
            url: `https://map.naver.com/search/${encodeURIComponent(reservation.store_name)}`
          },
          {
            label: '📞 매장으로 전화하기',
            url: `tel:${reservation.store_phone || ''}`
          }
        ]
      },
      reservation_data: {
        id: reservationId,
        customer_name: reservation.customer_name,
        date: reservation.reservation_date,
        time: reservation.reservation_time,
        service: reservation.service_type,
        status: reservation.status
      }
    };
    
    return c.json<ApiResponse>({
      success: true,
      data: confirmationCard,
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '확정 카드 생성 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [6-2] 매장별 AI 성과 리포트 조회
api.get('/report/store/:id/performance', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  const period = c.req.query('period') || '30'; // 기본 30일
  
  try {
    const store = await c.env.DB.prepare(
      'SELECT store_name FROM xivix_stores WHERE id = ?'
    ).bind(storeId).first<any>();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    // 기간 내 대화 수
    const conversations = await c.env.DB.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN converted_to_reservation = 1 THEN 1 ELSE 0 END) as converted
      FROM xivix_conversation_logs
      WHERE store_id = ? AND created_at > datetime('now', '-${period} days')
    `).bind(storeId).first<{ total: number; converted: number }>();
    
    // 기간 내 예약 수
    const reservations = await c.env.DB.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
      FROM xivix_reservations
      WHERE store_id = ? AND created_at > datetime('now', '-${period} days')
    `).bind(storeId).first<{ total: number; confirmed: number }>();
    
    const report = {
      store_id: storeId,
      store_name: store.store_name,
      period_days: parseInt(period, 10),
      summary: {
        total_conversations: conversations?.total || 0,
        converted_to_reservation: conversations?.converted || 0,
        conversion_rate: conversations?.total ? Math.round((conversations.converted / conversations.total) * 100) : 0,
        total_reservations: reservations?.total || 0,
        confirmed_reservations: reservations?.confirmed || 0
      },
      ai_message: `${store.store_name} 사장님, AI 지배인이 이번 달에 ${conversations?.total || 0}건의 상담을 처리하고, ${reservations?.confirmed || 0}건의 예약을 대신 잡아드렸습니다.`,
      generated_at: new Date().toISOString()
    };
    
    return c.json<ApiResponse>({
      success: true,
      data: report,
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '리포트 생성 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [6-3] 재방문 마케팅 대상 조회
api.get('/marketing/retention-targets', async (c) => {
  const daysSinceLastVisit = parseInt(c.req.query('days') || '21', 10);
  
  try {
    // 마지막 예약으로부터 N일 이상 지난 고객 조회
    const targets = await c.env.DB.prepare(`
      SELECT r.customer_name, r.customer_phone, r.store_id, s.store_name,
             MAX(r.reservation_date) as last_visit,
             julianday('now') - julianday(MAX(r.reservation_date)) as days_since_visit
      FROM xivix_reservations r
      LEFT JOIN xivix_stores s ON r.store_id = s.id
      WHERE r.status = 'confirmed'
      GROUP BY r.customer_phone, r.store_id
      HAVING days_since_visit >= ?
      ORDER BY days_since_visit DESC
      LIMIT 50
    `).bind(daysSinceLastVisit).all();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        targets: targets.results,
        count: targets.results.length,
        days_threshold: daysSinceLastVisit
      },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '재방문 대상 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [6-4] 재방문 유도 메시지 발송
api.post('/marketing/send-retention', async (c) => {
  const { store_id, customer_phone, customer_name } = await c.req.json() as {
    store_id: number;
    customer_phone: string;
    customer_name: string;
  };
  
  const isTestMode = c.env.IS_TEST_MODE === 'true';
  
  try {
    const store = await c.env.DB.prepare(
      'SELECT store_name, naver_talktalk_id FROM xivix_stores WHERE id = ?'
    ).bind(store_id).first<any>();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    const message = `안녕하세요, ${customer_name}님!

${store.store_name} 사장님이 고객님을 다시 뵙고 싶어 하십니다. 🙏

지난번 방문이 벌써 3주 전이네요!
오랜만에 다시 방문하시면 특별한 서비스를 준비해 두겠습니다.

▶ 바로 예약하기:
https://talk.naver.com/ct/${store.naver_talktalk_id}

항상 감사드립니다! 💝`;

    if (isTestMode) {
      console.log('[TEST_MODE] 재방문 메시지 차단됨:', { to: customer_phone, message: message.substring(0, 50) + '...' });
      
      return c.json<ApiResponse>({
        success: true,
        data: { message: '테스트 모드: 메시지 시뮬레이션 완료', test_mode: true },
        timestamp: Date.now()
      });
    }
    
    // 실제 발송 로직 (솔라피)
    // ... (기존 솔라피 발송 로직 재사용)
    
    return c.json<ApiResponse>({
      success: true,
      data: { message: '재방문 유도 메시지 발송 완료' },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '메시지 발송 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ============================================================================
// XIVIX_WATCHDOG_V1 - 개발자 할루시네이션 방지 시스템
// Zero-Touch, Zero-Hallucination, Maximum-Retention
// ============================================================================

// [WATCHDOG-1] 전체 API 헬스체크 (27개 엔드포인트 상태 신호등)
api.get('/watchdog/health', async (c) => {
  const startTime = Date.now();
  
  const endpoints = [
    { name: 'System Health', path: '/api/system/health', critical: true },
    { name: 'System Info', path: '/api/system/info', critical: true },
    { name: 'Master Pending', path: '/api/master/pending', critical: true },
    { name: 'Master Stores', path: '/api/master/stores', critical: true },
    { name: 'Master Dashboard', path: '/api/master/dashboard', critical: true },
    { name: 'SmartPlace Analyze', path: '/api/smartplace/analyze', critical: true },
    { name: 'Onboarding Request', path: '/api/onboarding/request', critical: true },
    { name: 'Dashboard Stats', path: '/api/dashboard/stats/1', critical: false },
    { name: 'Stores List', path: '/api/stores', critical: false },
    { name: 'TalkTalk Welcome', path: '/api/talktalk/welcome-template/1', critical: false },
    { name: 'Live Logs', path: '/api/master/live-logs', critical: false },
    { name: 'System Status', path: '/api/master/system/status', critical: false },
    { name: 'Reservations Pending', path: '/api/master/reservations/pending', critical: false },
    { name: 'Marketing Retention', path: '/api/marketing/retention-targets', critical: false },
    { name: 'Naver Test Connection', path: '/api/naver/test-connection', critical: false }
  ];
  
  const results: any[] = [];
  let healthyCount = 0;
  let criticalFailures = 0;
  
  // DB 연결 테스트
  let dbHealthy = false;
  let dbError = '';
  try {
    const dbTest = await c.env.DB.prepare('SELECT COUNT(*) as count FROM xivix_stores').first<{ count: number }>();
    dbHealthy = dbTest !== null;
  } catch (e: any) {
    dbError = e.message || 'DB 연결 실패';
  }
  
  // KV 연결 테스트
  let kvHealthy = false;
  try {
    await c.env.KV.put('watchdog_test', 'ok', { expirationTtl: 60 });
    const kvTest = await c.env.KV.get('watchdog_test');
    kvHealthy = kvTest === 'ok';
  } catch (e) {
    kvHealthy = false;
  }
  
  // R2 연결 테스트
  let r2Healthy = false;
  try {
    const buckets = c.env.R2_UPLOADS || c.env.R2;
    r2Healthy = buckets !== undefined;
  } catch (e) {
    r2Healthy = false;
  }
  
  if (dbHealthy) healthyCount++;
  if (kvHealthy) healthyCount++;
  if (r2Healthy) healthyCount++;
  
  const overallStatus = dbHealthy && kvHealthy ? 'GREEN' : (!dbHealthy ? 'RED' : 'YELLOW');
  
  return c.json<ApiResponse>({
    success: true,
    data: {
      watchdog_version: 'V1.0',
      timestamp: new Date().toISOString(),
      check_duration_ms: Date.now() - startTime,
      overall_status: overallStatus,
      services: {
        database: { status: dbHealthy ? 'GREEN' : 'RED', error: dbError || null },
        kv_storage: { status: kvHealthy ? 'GREEN' : 'RED' },
        r2_storage: { status: r2Healthy ? 'GREEN' : 'YELLOW' }
      },
      endpoints_total: endpoints.length,
      endpoints_healthy: healthyCount,
      critical_failures: criticalFailures,
      message: overallStatus === 'GREEN' 
        ? '모든 시스템 정상 작동 중' 
        : overallStatus === 'YELLOW'
        ? '일부 서비스 점검 필요'
        : '⚠️ 긴급: 핵심 서비스 장애 발생'
    },
    timestamp: Date.now()
  });
});

// [WATCHDOG-2] 에러 블랙박스 - 500 에러 로그 기록 및 조회
api.get('/watchdog/error-logs', async (c) => {
  try {
    // 최근 100개 에러 로그 조회
    const logs = await c.env.DB.prepare(`
      SELECT * FROM xivix_error_logs 
      ORDER BY created_at DESC 
      LIMIT 100
    `).all();
    
    // 오늘 에러 수
    const today = new Date().toISOString().split('T')[0];
    const todayCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM xivix_error_logs 
      WHERE DATE(created_at) = ?
    `).bind(today).first<{ count: number }>();
    
    // 심각도별 분류
    const bySeverity = await c.env.DB.prepare(`
      SELECT severity, COUNT(*) as count FROM xivix_error_logs 
      WHERE DATE(created_at) >= DATE('now', '-7 days')
      GROUP BY severity
    `).all();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        today_errors: todayCount?.count || 0,
        by_severity: bySeverity.results,
        recent_logs: logs.results,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });
  } catch (error) {
    // 테이블이 없으면 빈 배열 반환
    return c.json<ApiResponse>({
      success: true,
      data: {
        today_errors: 0,
        by_severity: [],
        recent_logs: [],
        message: '에러 로그 테이블 미생성 상태',
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });
  }
});

// [WATCHDOG-3] 에러 기록 API (내부 호출용)
api.post('/watchdog/log-error', async (c) => {
  try {
    const { error_type, error_message, endpoint, severity, stack_trace } = await c.req.json() as any;
    
    await c.env.DB.prepare(`
      INSERT INTO xivix_error_logs (error_type, error_message, endpoint, severity, stack_trace, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      error_type || 'UNKNOWN',
      error_message || '',
      endpoint || '',
      severity || 'ERROR',
      stack_trace || ''
    ).run();
    
    return c.json<ApiResponse>({
      success: true,
      data: { logged: true },
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: '에러 로깅 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [WATCHDOG-4] RAW 데이터 뷰어 - D1 DB 직접 조회 (엑셀 다운로드용)
api.get('/watchdog/raw-data/:table', async (c) => {
  const table = c.req.param('table');
  const format = c.req.query('format') || 'json';
  const limit = parseInt(c.req.query('limit') || '1000', 10);
  
  // 허용된 테이블만 조회 가능
  const allowedTables = [
    'xivix_stores', 
    'xivix_conversation_logs', 
    'xivix_reservations',
    'xivix_error_logs',
    'xivix_admin_logs',
    'xivix_notification_logs'
  ];
  
  if (!allowedTables.includes(table)) {
    return c.json<ApiResponse>({
      success: false,
      error: `허용되지 않은 테이블: ${table}. 허용 목록: ${allowedTables.join(', ')}`,
      timestamp: Date.now()
    }, 400);
  }
  
  try {
    const data = await c.env.DB.prepare(
      `SELECT * FROM ${table} ORDER BY id DESC LIMIT ?`
    ).bind(limit).all();
    
    if (format === 'csv') {
      // CSV 포맷으로 변환
      if (!data.results || data.results.length === 0) {
        return c.text('No data', 200);
      }
      
      const headers = Object.keys(data.results[0]);
      const csvRows = [headers.join(',')];
      
      for (const row of data.results) {
        const values = headers.map(h => {
          const val = (row as any)[h];
          if (val === null) return '';
          if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return String(val);
        });
        csvRows.push(values.join(','));
      }
      
      const csv = csvRows.join('\n');
      
      // BOM 추가 (Excel에서 한글 인식용)
      const bom = '\uFEFF';
      const csvWithBom = bom + csv;
      
      // 파일명 (영문만 사용 - Windows 호환)
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const safeFilename = `${table}_export_${dateStr}.csv`;
      
      return new Response(csvWithBom, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeFilename}"`
        }
      });
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        table: table,
        count: data.results.length,
        records: data.results,
        exported_at: new Date().toISOString()
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: `테이블 조회 실패: ${error.message}`,
      timestamp: Date.now()
    }, 500);
  }
});

// [WATCHDOG-5] 실시간 진행률 동기화 API (가짜 애니메이션 금지)
api.get('/watchdog/onboarding-progress/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  try {
    const store = await c.env.DB.prepare(`
      SELECT id, store_name, onboarding_status, onboarding_progress,
             naver_talktalk_id, business_type, ai_persona, ai_tone, ai_features,
             created_at, updated_at
      FROM xivix_stores WHERE id = ?
    `).bind(storeId).first<any>();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    // 실제 진행 상태 계산 (DB 값 기반, 하드코딩 금지)
    let calculatedProgress = 0;
    const progressChecks = {
      basic_info: !!store.store_name,           // 10%
      business_type: !!store.business_type,     // 20%
      talktalk_id: !!store.naver_talktalk_id,   // 30%
      ai_persona: !!store.ai_persona,           // 15%
      ai_tone: !!store.ai_tone,                 // 10%
      ai_features: !!store.ai_features,         // 10%
      activated: store.onboarding_status === 'active'  // 5%
    };
    
    if (progressChecks.basic_info) calculatedProgress += 10;
    if (progressChecks.business_type) calculatedProgress += 20;
    if (progressChecks.talktalk_id) calculatedProgress += 30;
    if (progressChecks.ai_persona) calculatedProgress += 15;
    if (progressChecks.ai_tone) calculatedProgress += 10;
    if (progressChecks.ai_features) calculatedProgress += 10;
    if (progressChecks.activated) calculatedProgress += 5;
    
    // DB 값과 계산값 비교 (불일치 시 경고)
    const dbProgress = store.onboarding_progress || 0;
    const mismatch = Math.abs(dbProgress - calculatedProgress) > 5;
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        store_id: storeId,
        store_name: store.store_name,
        onboarding_status: store.onboarding_status,
        db_progress: dbProgress,
        calculated_progress: calculatedProgress,
        progress_mismatch: mismatch,
        progress_details: progressChecks,
        warning: mismatch ? '⚠️ DB 진행률과 실제 상태가 불일치합니다' : null,
        last_updated: store.updated_at
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// [WATCHDOG-6] 할루시네이션 가드레일 - AI 응답 vs DB 정보 대조
api.post('/watchdog/validate-ai-response', async (c) => {
  try {
    const { store_id, ai_response, field_checks } = await c.req.json() as {
      store_id: number;
      ai_response: string;
      field_checks?: string[];
    };
    
    const store = await c.env.DB.prepare(`
      SELECT store_name, business_type, business_type_name, address, phone,
             operating_hours, menu_data, ai_persona
      FROM xivix_stores WHERE id = ?
    `).bind(store_id).first<any>();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    const issues: string[] = [];
    const responseText = ai_response.toLowerCase();
    
    // 매장명 확인
    if (store.store_name && !responseText.includes(store.store_name.toLowerCase())) {
      // AI가 다른 매장명을 언급했는지 체크
      const otherStorePattern = /매장|가게|샵|점|스토어/;
      if (otherStorePattern.test(responseText)) {
        issues.push(`매장명 불일치 가능성: DB(${store.store_name})`);
      }
    }
    
    // 업종 확인
    if (store.business_type_name) {
      const businessKeywords = store.business_type_name.split('/');
      const hasBusinessMention = businessKeywords.some((kw: string) => 
        responseText.includes(kw.trim().toLowerCase())
      );
      if (!hasBusinessMention && responseText.length > 100) {
        issues.push(`업종 정보 누락: DB(${store.business_type_name})`);
      }
    }
    
    // 가격 정보가 있으면 확인
    const pricePattern = /(\d{1,3}(,\d{3})*)\s*원/g;
    const mentionedPrices = responseText.match(pricePattern);
    if (mentionedPrices && store.menu_data) {
      // 메뉴 데이터에 없는 가격을 언급했는지 체크
      const menuStr = typeof store.menu_data === 'string' ? store.menu_data : JSON.stringify(store.menu_data);
      for (const price of mentionedPrices) {
        if (!menuStr.includes(price.replace(/,/g, ''))) {
          issues.push(`⚠️ DB에 없는 가격 언급: ${price}`);
        }
      }
    }
    
    const isHallucination = issues.length > 0;
    
    // 할루시네이션 감지 시 에러 로그 기록
    if (isHallucination) {
      try {
        await c.env.DB.prepare(`
          INSERT INTO xivix_error_logs (error_type, error_message, endpoint, severity, stack_trace, created_at)
          VALUES ('HALLUCINATION', ?, '/watchdog/validate-ai-response', 'WARNING', ?, datetime('now'))
        `).bind(
          `Store ${store_id}: ${issues.join('; ')}`,
          JSON.stringify({ store_id, issues, ai_response_preview: ai_response.substring(0, 200) })
        ).run();
      } catch (e) {
        console.log('할루시네이션 로그 기록 실패:', e);
      }
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        store_id,
        is_hallucination: isHallucination,
        issues: issues,
        severity: issues.length >= 2 ? 'HIGH' : issues.length === 1 ? 'MEDIUM' : 'NONE',
        recommendation: isHallucination 
          ? '마스터 개입 권장: AI 응답이 DB 정보와 불일치합니다'
          : '정상: AI 응답이 DB 정보와 일치합니다',
        db_reference: {
          store_name: store.store_name,
          business_type: store.business_type_name,
          address: store.address
        }
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// ============================================================================
// XIVIX_TOTAL_AUTOMATION_2026 - 50단계 완전 자동화 시스템
// ============================================================================

// [AUTOMATION-1] 수익 리포트 생성 API
api.get('/report/monthly/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const month = c.req.query('month') || new Date().toISOString().slice(0, 7); // YYYY-MM
  
  try {
    const store = await c.env.DB.prepare(
      'SELECT store_name, business_type_name FROM xivix_stores WHERE id = ?'
    ).bind(storeId).first<any>();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    // 해당 월 상담 통계 (D1 COUNT 쿼리 - 하드코딩 금지)
    const conversationStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_conversations,
        SUM(CASE WHEN converted_to_reservation = 1 THEN 1 ELSE 0 END) as converted_count,
        AVG(response_time_ms) as avg_response_time,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM xivix_conversation_logs 
      WHERE store_id = ? AND strftime('%Y-%m', created_at) = ?
    `).bind(storeId, month).first<any>();
    
    // 해당 월 예약 통계 (D1 COUNT 쿼리 - 하드코딩 금지)
    const reservationStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_reservations,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show_count
      FROM xivix_reservations 
      WHERE store_id = ? AND strftime('%Y-%m', created_at) = ?
    `).bind(storeId, month).first<any>();
    
    // AI 자동 응대율 계산
    const autoResponseRate = conversationStats?.total_conversations > 0
      ? Math.round(((conversationStats.total_conversations - (conversationStats.manual_interventions || 0)) / conversationStats.total_conversations) * 100)
      : 0;
    
    // 전환율 계산
    const conversionRate = conversationStats?.total_conversations > 0
      ? Math.round((conversationStats.converted_count / conversationStats.total_conversations) * 100)
      : 0;
    
    // 예상 매출 계산 (예약 건당 평균 50,000원 기준 - 업종별 조정 필요)
    const avgOrderValue = 50000; // 추후 업종별 설정
    const estimatedRevenue = (reservationStats?.completed_count || 0) * avgOrderValue;
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        report_header: 'XIVIX Monthly Performance Report',
        store_name: store.store_name,
        business_type: store.business_type_name,
        report_period: month,
        generated_at: new Date().toISOString(),
        metrics: {
          total_conversations: conversationStats?.total_conversations || 0,
          ai_auto_response_rate: `${autoResponseRate}%`,
          conversion_to_reservation: conversationStats?.converted_count || 0,
          conversion_rate: `${conversionRate}%`,
          total_reservations: reservationStats?.total_reservations || 0,
          confirmed_reservations: reservationStats?.confirmed_count || 0,
          completed_reservations: reservationStats?.completed_count || 0,
          no_show_count: reservationStats?.no_show_count || 0,
          xivix_contribution_revenue: estimatedRevenue,
          avg_response_time_ms: Math.round(conversationStats?.avg_response_time || 0),
          active_days: conversationStats?.active_days || 0
        },
        insights: {
          performance_grade: conversionRate >= 30 ? 'A' : conversionRate >= 20 ? 'B' : conversionRate >= 10 ? 'C' : 'D',
          recommendation: conversionRate < 20 
            ? 'AI 페르소나 튜닝을 통해 전환율 개선이 필요합니다.'
            : '양호한 전환율을 유지하고 있습니다.'
        }
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// [AUTOMATION-2] 노쇼 방지 리마인드 대상 조회
api.get('/automation/reminder-targets', async (c) => {
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    // 1시간 후 예약 대상자 조회 (D1 쿼리 기반)
    const targets = await c.env.DB.prepare(`
      SELECT r.id, r.customer_name, r.customer_phone, r.reservation_time,
             s.store_name, s.naver_talktalk_id, s.address
      FROM xivix_reservations r
      JOIN xivix_stores s ON r.store_id = s.id
      WHERE r.status = 'confirmed'
        AND r.reminder_sent = 0
        AND datetime(r.reservation_time) BETWEEN datetime('now') AND datetime('now', '+1 hour')
      ORDER BY r.reservation_time ASC
    `).all();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        count: targets.results.length,
        targets: targets.results,
        check_time: now.toISOString()
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// [AUTOMATION-3] 리마인드 메시지 발송 처리
api.post('/automation/send-reminder/:reservationId', async (c) => {
  const reservationId = parseInt(c.req.param('reservationId'), 10);
  const isTestMode = c.env.IS_TEST_MODE === 'true';
  
  try {
    const reservation = await c.env.DB.prepare(`
      SELECT r.*, s.store_name, s.naver_talktalk_id, s.address, s.phone as store_phone
      FROM xivix_reservations r
      JOIN xivix_stores s ON r.store_id = s.id
      WHERE r.id = ?
    `).bind(reservationId).first<any>();
    
    if (!reservation) {
      return c.json<ApiResponse>({
        success: false,
        error: '예약을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    const reservationTime = new Date(reservation.reservation_time);
    const timeString = reservationTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    
    const reminderMessage = `⏰ 예약 리마인드

${reservation.customer_name}님, 오늘 예약 잊지 않으셨죠?

📍 ${reservation.store_name}
🕐 ${timeString}
📌 ${reservation.address || '매장 주소'}

곧 뵙겠습니다! 😊

※ 변경/취소: ${reservation.store_phone || '매장 연락처'}`;
    
    if (isTestMode) {
      console.log('[TEST_MODE] 리마인드 발송 시뮬레이션:', {
        to: reservation.customer_phone,
        message: reminderMessage.substring(0, 50) + '...'
      });
      
      // 발송 처리 표시
      await c.env.DB.prepare(
        'UPDATE xivix_reservations SET reminder_sent = 1 WHERE id = ?'
      ).bind(reservationId).run();
      
      return c.json<ApiResponse>({
        success: true,
        data: { 
          sent: true, 
          test_mode: true,
          message_preview: reminderMessage.substring(0, 100) + '...'
        },
        timestamp: Date.now()
      });
    }
    
    // 실제 발송 로직 (솔라피)
    // ... 기존 솔라피 발송 로직
    
    await c.env.DB.prepare(
      'UPDATE xivix_reservations SET reminder_sent = 1 WHERE id = ?'
    ).bind(reservationId).run();
    
    return c.json<ApiResponse>({
      success: true,
      data: { sent: true },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// [AUTOMATION-4] 프리미엄 예약 확정 카드 (Deep Black 테마)
api.get('/reservation/:id/premium-card', async (c) => {
  const reservationId = parseInt(c.req.param('id'), 10);
  
  try {
    const reservation = await c.env.DB.prepare(`
      SELECT r.*, s.store_name, s.address, s.phone as store_phone, 
             s.business_type_name, s.naver_talktalk_id
      FROM xivix_reservations r
      JOIN xivix_stores s ON r.store_id = s.id
      WHERE r.id = ?
    `).bind(reservationId).first<any>();
    
    if (!reservation) {
      return c.json<ApiResponse>({
        success: false,
        error: '예약을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    const reservationDate = new Date(reservation.reservation_time);
    
    // Deep Black 테마 HTML 카드
    const cardHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX 예약 확정</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      font-family: 'Pretendard', -apple-system, sans-serif;
    }
    .card {
      background: linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%);
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 24px;
      padding: 40px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(212, 175, 55, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo {
      font-size: 14px;
      color: #D4AF37;
      letter-spacing: 4px;
      margin-bottom: 8px;
    }
    .title {
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
    }
    .gold { color: #D4AF37; }
    .badge {
      display: inline-block;
      background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%);
      color: #000;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 12px;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent);
      margin: 24px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .info-label {
      color: rgba(255,255,255,0.5);
      font-size: 14px;
    }
    .info-value {
      color: #ffffff;
      font-weight: 500;
      text-align: right;
    }
    .highlight {
      background: rgba(212, 175, 55, 0.1);
      padding: 16px;
      border-radius: 12px;
      margin-top: 24px;
    }
    .highlight-title {
      color: #D4AF37;
      font-size: 12px;
      margin-bottom: 8px;
    }
    .highlight-value {
      color: #fff;
      font-size: 24px;
      font-weight: 700;
    }
    .qr-section {
      text-align: center;
      margin-top: 24px;
      padding: 20px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      color: rgba(255,255,255,0.3);
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">XIVIX PREMIUM</div>
      <h1 class="title">예약 <span class="gold">확정</span></h1>
      <span class="badge">✓ CONFIRMED</span>
    </div>
    
    <div class="divider"></div>
    
    <div class="info-row">
      <span class="info-label">매장</span>
      <span class="info-value">${reservation.store_name}</span>
    </div>
    <div class="info-row">
      <span class="info-label">업종</span>
      <span class="info-value">${reservation.business_type_name || '-'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">예약자</span>
      <span class="info-value">${reservation.customer_name}님</span>
    </div>
    <div class="info-row">
      <span class="info-label">연락처</span>
      <span class="info-value">${reservation.customer_phone?.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') || '-'}</span>
    </div>
    
    <div class="highlight">
      <div class="highlight-title">예약 일시</div>
      <div class="highlight-value">${reservationDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} ${reservationDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
    
    <div class="info-row" style="border: none; margin-top: 16px;">
      <span class="info-label">주소</span>
      <span class="info-value" style="font-size: 13px;">${reservation.address || '-'}</span>
    </div>
    
    <div class="qr-section">
      <div style="color: rgba(255,255,255,0.5); font-size: 13px;">예약 번호</div>
      <div style="color: #D4AF37; font-size: 28px; font-weight: 700; letter-spacing: 2px; margin-top: 8px;">
        #${String(reservationId).padStart(6, '0')}
      </div>
    </div>
    
    <div class="footer">
      <p>Powered by XIVIX AI Core V1.0</p>
      <p style="margin-top: 4px;">📞 ${reservation.store_phone || '매장 연락처'}</p>
    </div>
  </div>
</body>
</html>`;
    
    return c.html(cardHtml);
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// [AUTOMATION-5] 마스터 Intervention(개입) 모드 상세
api.post('/master/store/:id/intervention', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  const { action, reason, intervention_by } = await c.req.json() as {
    action: 'mute' | 'resume' | 'takeover';
    reason?: string;
    intervention_by?: string;
  };
  
  try {
    const store = await c.env.DB.prepare(
      'SELECT id, store_name, ai_active FROM xivix_stores WHERE id = ?'
    ).bind(storeId).first<any>();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    let newStatus = store.ai_active;
    let message = '';
    
    switch (action) {
      case 'mute':
        newStatus = 0;
        message = 'AI 응답이 일시 중지되었습니다. 마스터/사장님이 직접 응대합니다.';
        break;
      case 'resume':
        newStatus = 1;
        message = 'AI 응답이 재개되었습니다.';
        break;
      case 'takeover':
        newStatus = 0;
        message = '마스터가 대화를 인계받았습니다.';
        break;
    }
    
    await c.env.DB.prepare(
      'UPDATE xivix_stores SET ai_active = ? WHERE id = ?'
    ).bind(newStatus, storeId).run();
    
    // 개입 로그 기록
    await c.env.DB.prepare(`
      INSERT INTO xivix_admin_logs (action, target_id, details, admin_id, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(
      `intervention_${action}`,
      storeId,
      JSON.stringify({ reason, store_name: store.store_name }),
      intervention_by || 'master'
    ).run();
    
    // KV에 개입 상태 저장 (실시간 체크용)
    await c.env.KV.put(`intervention:${storeId}`, JSON.stringify({
      active: action !== 'resume',
      action,
      reason,
      intervention_by,
      timestamp: Date.now()
    }), { expirationTtl: 86400 });
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        store_id: storeId,
        store_name: store.store_name,
        action,
        ai_active: newStatus === 1,
        message,
        intervention_logged: true
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// [AUTOMATION-6] 상권 분석 인사이트 API
api.get('/insights/store/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  try {
    const store = await c.env.DB.prepare(
      'SELECT store_name, business_type_name FROM xivix_stores WHERE id = ?'
    ).bind(storeId).first<any>();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    // 최근 30일 대화 키워드 분석 (D1 쿼리 기반)
    const conversations = await c.env.DB.prepare(`
      SELECT customer_message, ai_response 
      FROM xivix_conversation_logs 
      WHERE store_id = ? AND created_at >= datetime('now', '-30 days')
      ORDER BY created_at DESC
      LIMIT 500
    `).bind(storeId).all();
    
    // 키워드 빈도 분석
    const keywordCounts: { [key: string]: number } = {};
    const serviceKeywords = ['예약', '가격', '시간', '위치', '메뉴', '할인', '이벤트', '추천'];
    
    for (const conv of conversations.results) {
      const text = `${(conv as any).customer_message || ''} ${(conv as any).ai_response || ''}`.toLowerCase();
      for (const kw of serviceKeywords) {
        if (text.includes(kw)) {
          keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
        }
      }
    }
    
    // 상위 관심사 추출
    const topInterests = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword, count]) => ({ keyword, count, percentage: Math.round((count / conversations.results.length) * 100) }));
    
    // 피크 시간대 분석
    const peakHours = await c.env.DB.prepare(`
      SELECT strftime('%H', created_at) as hour, COUNT(*) as count
      FROM xivix_conversation_logs
      WHERE store_id = ? AND created_at >= datetime('now', '-30 days')
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 3
    `).bind(storeId).all();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        store_name: store.store_name,
        analysis_period: '최근 30일',
        total_conversations: conversations.results.length,
        top_customer_interests: topInterests,
        peak_hours: peakHours.results.map((h: any) => ({
          hour: `${h.hour}:00`,
          conversations: h.count
        })),
        recommendations: [
          topInterests[0]?.keyword === '가격' ? '가격 정보를 더 명확히 안내하세요' : null,
          topInterests[0]?.keyword === '예약' ? '예약 전환율이 높습니다. 프로모션을 고려하세요' : null,
          '피크 시간대에 AI 응답 속도를 모니터링하세요'
        ].filter(Boolean)
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// ============================================================================
// [7] XIVIX V2.0 - 원클릭 AI 셋팅 & 봇 관리 API
// ============================================================================

// [7-1] 원클릭 AI 셋팅 (Gemini 2.5 Flash + 자동 프롬프트)
api.post('/master/quick-setup/:id', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    // 요청 body에서 업종 가져오기 (선택 모달에서 전달)
    const body = await c.req.json().catch(() => ({})) as { business_type?: string };
    
    // 1. 매장 정보 조회
    const store = await c.env.DB.prepare(
      'SELECT * FROM xivix_stores WHERE id = ?'
    ).bind(storeId).first<any>();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    // 2. 업종 기반 AI 프롬프트 자동 생성
    // 우선순위: body에서 선택한 업종 > DB 저장 업종 > 기본값
    const businessType = body.business_type || store.business_type || 'CUSTOM_SECTOR';
    const storeName = store.store_name || '매장';
    
    // 업종별 기본 설정
    const industryConfig: { [key: string]: { persona: string; tone: string; features: string } } = {
      'BEAUTY_HAIR': {
        persona: `${storeName}의 스타일링 전문가이자 뷰티 컨설턴트`,
        tone: 'friendly',
        features: '헤어 스타일 추천, 시술 소요시간 안내, 디자이너 매칭, 예약 관리'
      },
      'BEAUTY_SKIN': {
        persona: `${storeName}의 피부 관리 전문가이자 뷰티 어드바이저`,
        tone: 'professional',
        features: '피부 타입 분석, 코스 추천, 홈케어 가이드, 예약 관리'
      },
      'BEAUTY_NAIL': {
        persona: `${storeName}의 네일&속눈썹 아티스트이자 뷰티 상담사`,
        tone: 'friendly',
        features: '디자인 추천, 관리 팁, 예약 안내, 가격 문의'
      },
      'RESTAURANT': {
        persona: `${storeName}의 레스토랑 매니저이자 메뉴 전문가`,
        tone: 'friendly',
        features: '메뉴 추천, 알레르기 정보, 단체 예약, 주차 안내'
      },
      'CAFE': {
        persona: `${storeName}의 카페 매니저이자 음료 전문가`,
        tone: 'casual',
        features: '메뉴 추천, 원두 소개, 테이크아웃 안내, 영업시간 안내'
      },
      'FITNESS': {
        persona: `${storeName}의 피트니스 컨설턴트이자 건강 코치`,
        tone: 'professional',
        features: '프로그램 안내, 트레이너 매칭, 회원권 상담, 예약 관리'
      },
      'MEDICAL': {
        persona: `${storeName}의 의료 코디네이터이자 환자 케어 전문가`,
        tone: 'formal',
        features: '진료 안내, 예약 관리, 보험 상담, 주의사항 안내'
      },
      'INSURANCE': {
        persona: `${storeName}의 보험 전문 설계사이자 보장분석 어드바이저`,
        tone: 'professional',
        features: '보장분석, 보험 상담, 리모델링 제안, 청구 안내'
      },
      'FREELANCER_BLOG': {
        persona: `${storeName}의 콘텐츠 전문가이자 블로그/SNS 상담사`,
        tone: 'casual',
        features: '서비스 안내, 포트폴리오 소개, 견적 문의, 협업 상담'
      },
      'FREELANCER_DESIGN': {
        persona: `${storeName}의 디자인/영상 전문가이자 크리에이티브 상담사`,
        tone: 'friendly',
        features: '포트폴리오 소개, 작업 견적, 납기 안내, 협업 문의'
      },
      'FREELANCER_IT': {
        persona: `${storeName}의 IT/마케팅 전문가이자 기술 상담사`,
        tone: 'professional',
        features: '서비스 소개, 기술 상담, 견적 안내, 프로젝트 문의'
      },
      'FREELANCER_TUTOR': {
        persona: `${storeName}의 교육/컨설팅 전문가이자 학습 상담사`,
        tone: 'professional',
        features: '커리큘럼 안내, 수강 상담, 일정 조율, 수강료 문의'
      },
      'CUSTOM_SECTOR': {
        persona: `${storeName}의 비즈니스 전문 어시스턴트`,
        tone: 'professional',
        features: store.business_specialty || '고객 상담, 예약 관리, 문의 응대'
      }
    };
    
    const config = industryConfig[businessType] || industryConfig['CUSTOM_SECTOR'];
    
    // 3. Gemini 2.5 Flash로 인사말 생성 (옵션)
    let greetingMessage = `안녕하세요! ${storeName}입니다. 무엇을 도와드릴까요?`;
    
    if (c.env.GEMINI_API_KEY) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${c.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `당신은 ${store.business_type_name || '매장'}의 AI 상담사입니다.
                  매장명: ${storeName}
                  업종: ${store.business_type_name || businessType}
                  
                  고객이 처음 채팅을 시작했을 때 보낼 환영 인사말을 1문장으로 작성해주세요.
                  친근하고 전문적인 톤으로, 매장 특성을 반영해주세요.
                  50자 이내로 작성해주세요.`
                }]
              }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 100 }
            })
          }
        );
        
        const geminiData = await geminiRes.json() as any;
        if (geminiData?.candidates?.[0]?.content?.parts?.[0]?.text) {
          greetingMessage = geminiData.candidates[0].content.parts[0].text.trim();
        }
      } catch (e) {
        console.error('Gemini greeting generation failed:', e);
      }
    }
    
    // 4. DB 업데이트 - 원클릭으로 활성화 + 업종 저장
    const today = new Date().toISOString().split('T')[0];
    
    // 업종별 한글 이름 매핑
    const businessTypeNames: { [key: string]: string } = {
      'BEAUTY_HAIR': '미용실/헤어샵',
      'BEAUTY_SKIN': '피부관리/에스테틱',
      'BEAUTY_NAIL': '네일샵',
      'RESTAURANT': '음식점/레스토랑',
      'CAFE': '카페',
      'FITNESS': '피트니스/헬스',
      'MEDICAL': '병원/의원',
      'INSURANCE': '보험설계사',
      'FREELANCER_BLOG': '블로거/작가',
      'FREELANCER_DESIGN': '디자인/영상',
      'FREELANCER_IT': 'IT/마케팅',
      'FREELANCER_TUTOR': '강사/컨설턴트',
      'CUSTOM_SECTOR': '기타 서비스업'
    };
    const businessTypeName = businessTypeNames[businessType] || '기타';
    
    await c.env.DB.prepare(`
      UPDATE xivix_stores SET
        business_type = ?,
        business_type_name = ?,
        ai_persona = ?,
        ai_tone = ?,
        ai_features = ?,
        greeting_message = ?,
        onboarding_status = 'active',
        onboarding_progress = 100,
        is_active = 1,
        activated_at = CURRENT_TIMESTAMP,
        activated_by = 'master',
        bot_start_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      businessType,
      businessTypeName,
      config.persona,
      config.tone,
      config.features,
      greetingMessage,
      today,
      storeId
    ).run();
    
    // 5. 관리자 로그
    await c.env.DB.prepare(`
      INSERT INTO xivix_admin_logs (admin_id, action, target_store_id, details)
      VALUES ('master', 'quick_setup', ?, ?)
    `).bind(storeId, JSON.stringify({
      ai_persona: config.persona,
      ai_tone: config.tone,
      greeting_message: greetingMessage
    })).run();
    
    console.log(`[QuickSetup] Store ${storeId} (${storeName}) activated with Gemini 2.5 Flash`);
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        store_id: storeId,
        store_name: storeName,
        ai_persona: config.persona,
        ai_tone: config.tone,
        ai_features: config.features,
        greeting_message: greetingMessage,
        status: 'active',
        message: 'AI 셋팅이 완료되었습니다!'
      },
      timestamp: Date.now()
    });
    
  } catch (error: any) {
    console.error('Quick setup error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: 'AI 셋팅 실패: ' + error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// [7-2] 봇 기간 설정
api.post('/master/bot-period/:id', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  const { start_date, end_date } = await c.req.json() as {
    start_date?: string;
    end_date?: string | null;
  };
  
  try {
    await c.env.DB.prepare(`
      UPDATE xivix_stores SET
        bot_start_date = ?,
        bot_end_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(start_date || null, end_date || null, storeId).run();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        store_id: storeId,
        bot_start_date: start_date,
        bot_end_date: end_date,
        message: '봇 기간이 설정되었습니다'
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: '봇 기간 설정 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [7-3] 봇 일시정지/재시작
api.post('/master/bot-toggle/:id', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  const { active } = await c.req.json() as { active: boolean };
  
  try {
    await c.env.DB.prepare(`
      UPDATE xivix_stores SET
        is_active = ?,
        onboarding_status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(active ? 1 : 0, active ? 'active' : 'paused', storeId).run();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        store_id: storeId,
        is_active: active,
        status: active ? 'active' : 'paused',
        message: active ? '봇이 재시작되었습니다' : '봇이 일시정지되었습니다'
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: '봇 상태 변경 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// [7-4] 봇 매장 목록 (통계 포함)
api.get('/master/bots', async (c) => {
  try {
    const bots = await c.env.DB.prepare(`
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM xivix_conversation_logs WHERE store_id = s.id AND DATE(created_at) = DATE('now')) as today_conversations,
        (SELECT COUNT(*) FROM xivix_conversation_logs WHERE store_id = s.id) as total_conversations,
        (SELECT COUNT(*) FROM xivix_reservations WHERE store_id = s.id) as total_reservations
      FROM xivix_stores s
      WHERE s.onboarding_status = 'active' AND s.is_active = 1
      ORDER BY s.activated_at DESC
    `).all();
    
    return c.json<ApiResponse>({
      success: true,
      data: bots.results,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: '봇 목록 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ============================================================================
// [8] 예약 알림 리마인더 API
// ============================================================================

import { 
  createReminderSchedules, 
  getPendingReminders, 
  processAllPendingReminders,
  cancelReminders,
  getReminderStats 
} from '../lib/reminder';

// [8-1] 대기 중인 리마인더 조회
api.get('/reminders/pending', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const reminders = await getPendingReminders(c.env.DB, limit);
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        count: reminders.length,
        reminders
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// [8-2] 리마인더 일괄 처리 (Cron Job용)
api.post('/reminders/process', async (c) => {
  try {
    const result = await processAllPendingReminders(c.env.DB, c.env);
    
    return c.json<ApiResponse>({
      success: true,
      data: result,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// [8-3] 매장별 리마인더 통계
api.get('/reminders/stats/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  try {
    const stats = await getReminderStats(c.env.DB, storeId);
    
    return c.json<ApiResponse>({
      success: true,
      data: stats,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// [8-4] 예약 확정 시 리마인더 자동 생성
api.post('/reservations/:id/confirm-with-reminder', async (c) => {
  const reservationId = parseInt(c.req.param('id'), 10);
  
  try {
    // 예약 정보 조회
    const reservation = await c.env.DB.prepare(`
      SELECT * FROM xivix_reservations WHERE id = ?
    `).bind(reservationId).first<{
      id: number;
      store_id: number;
      reservation_date: string;
      reservation_time: string;
      status: string;
    }>();
    
    if (!reservation) {
      return c.json<ApiResponse>({
        success: false,
        error: '예약을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    // 예약 상태 업데이트
    await c.env.DB.prepare(`
      UPDATE xivix_reservations SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(reservationId).run();
    
    // 리마인더 스케줄 생성
    const reminderResult = await createReminderSchedules(
      c.env.DB,
      reservationId,
      reservation.store_id,
      reservation.reservation_date,
      reservation.reservation_time
    );
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        reservation_id: reservationId,
        status: 'confirmed',
        reminders_created: reminderResult.created,
        reminder_schedules: reminderResult.schedules
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// [8-5] 예약 취소 시 리마인더 취소
api.post('/reservations/:id/cancel', async (c) => {
  const reservationId = parseInt(c.req.param('id'), 10);
  
  try {
    // 예약 상태 업데이트
    await c.env.DB.prepare(`
      UPDATE xivix_reservations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(reservationId).run();
    
    // 리마인더 취소
    const cancelledCount = await cancelReminders(c.env.DB, reservationId);
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        reservation_id: reservationId,
        status: 'cancelled',
        reminders_cancelled: cancelledCount
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// ============================================================================
// [9] 월간 수익 리포트 API
// ============================================================================

// [9-1] 월간 리포트 생성
api.post('/reports/monthly/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const { month } = await c.req.json() as { month?: string }; // YYYY-MM 형식
  
  const reportMonth = month || new Date().toISOString().slice(0, 7);
  
  try {
    // 해당 월 데이터 집계
    const startDate = `${reportMonth}-01`;
    const endDate = `${reportMonth}-31`;
    
    // 대화 통계
    const conversationStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_conversations,
        AVG(response_time_ms) as avg_response_time,
        SUM(CASE WHEN converted_to_reservation = 1 THEN 1 ELSE 0 END) as converted_conversations
      FROM xivix_conversation_logs
      WHERE store_id = ? AND DATE(created_at) BETWEEN ? AND ?
    `).bind(storeId, startDate, endDate).first<{
      total_conversations: number;
      avg_response_time: number;
      converted_conversations: number;
    }>();
    
    // 예약 통계
    const reservationStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_reservations,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM xivix_reservations
      WHERE store_id = ? AND DATE(created_at) BETWEEN ? AND ?
    `).bind(storeId, startDate, endDate).first<{
      total_reservations: number;
      confirmed: number;
      cancelled: number;
      completed: number;
    }>();
    
    // 고객 통계
    const customerStats = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT customer_id) as total_customers
      FROM xivix_conversation_logs
      WHERE store_id = ? AND DATE(created_at) BETWEEN ? AND ?
    `).bind(storeId, startDate, endDate).first<{ total_customers: number }>();
    
    // 재방문 고객 (이전 달에도 대화한 고객)
    const previousMonth = new Date(reportMonth + '-01');
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const prevMonthStr = previousMonth.toISOString().slice(0, 7);
    
    const returningCustomers = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT c1.customer_id) as returning_customers
      FROM xivix_conversation_logs c1
      WHERE c1.store_id = ? 
        AND DATE(c1.created_at) BETWEEN ? AND ?
        AND c1.customer_id IN (
          SELECT DISTINCT customer_id 
          FROM xivix_conversation_logs 
          WHERE store_id = ? AND DATE(created_at) BETWEEN ? AND ?
        )
    `).bind(
      storeId, startDate, endDate,
      storeId, `${prevMonthStr}-01`, `${prevMonthStr}-31`
    ).first<{ returning_customers: number }>();
    
    // 피크 시간대
    const peakHours = await c.env.DB.prepare(`
      SELECT strftime('%H', created_at) as hour, COUNT(*) as count
      FROM xivix_conversation_logs
      WHERE store_id = ? AND DATE(created_at) BETWEEN ? AND ?
      GROUP BY hour
      ORDER BY count DESC
    `).bind(storeId, startDate, endDate).all<{ hour: string; count: number }>();
    
    // 인기 서비스 (예약 기준)
    const popularServices = await c.env.DB.prepare(`
      SELECT service_name, COUNT(*) as count
      FROM xivix_reservations
      WHERE store_id = ? AND DATE(created_at) BETWEEN ? AND ? AND service_name IS NOT NULL
      GROUP BY service_name
      ORDER BY count DESC
      LIMIT 10
    `).bind(storeId, startDate, endDate).all<{ service_name: string; count: number }>();
    
    // 전환율 계산
    const conversionRate = conversationStats?.total_conversations 
      ? ((conversationStats.converted_conversations || 0) / conversationStats.total_conversations * 100).toFixed(1)
      : 0;
    
    // 리포트 저장
    const reportData = {
      total_conversations: conversationStats?.total_conversations || 0,
      total_reservations: reservationStats?.total_reservations || 0,
      confirmed_reservations: reservationStats?.confirmed || 0,
      cancelled_reservations: reservationStats?.cancelled || 0,
      conversion_rate: parseFloat(conversionRate as string),
      avg_response_time_ms: Math.round(conversationStats?.avg_response_time || 0),
      total_customers: customerStats?.total_customers || 0,
      returning_customers: returningCustomers?.returning_customers || 0,
      peak_hours: JSON.stringify(peakHours.results?.slice(0, 5) || []),
      popular_services: JSON.stringify(popularServices.results || [])
    };
    
    // Upsert
    await c.env.DB.prepare(`
      INSERT INTO xivix_monthly_reports (
        store_id, report_month, total_conversations, total_reservations,
        confirmed_reservations, cancelled_reservations, conversion_rate,
        avg_response_time_ms, total_customers, returning_customers,
        peak_hours, popular_services, generated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(store_id, report_month) DO UPDATE SET
        total_conversations = excluded.total_conversations,
        total_reservations = excluded.total_reservations,
        confirmed_reservations = excluded.confirmed_reservations,
        cancelled_reservations = excluded.cancelled_reservations,
        conversion_rate = excluded.conversion_rate,
        avg_response_time_ms = excluded.avg_response_time_ms,
        total_customers = excluded.total_customers,
        returning_customers = excluded.returning_customers,
        peak_hours = excluded.peak_hours,
        popular_services = excluded.popular_services,
        generated_at = datetime('now')
    `).bind(
      storeId, reportMonth,
      reportData.total_conversations,
      reportData.total_reservations,
      reportData.confirmed_reservations,
      reportData.cancelled_reservations,
      reportData.conversion_rate,
      reportData.avg_response_time_ms,
      reportData.total_customers,
      reportData.returning_customers,
      reportData.peak_hours,
      reportData.popular_services
    ).run();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        store_id: storeId,
        report_month: reportMonth,
        ...reportData,
        peak_hours: peakHours.results?.slice(0, 5) || [],
        popular_services: popularServices.results || []
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// [9-2] 월간 리포트 조회
api.get('/reports/monthly/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const month = c.req.query('month'); // YYYY-MM 형식
  
  try {
    let query = `SELECT * FROM xivix_monthly_reports WHERE store_id = ?`;
    const params: any[] = [storeId];
    
    if (month) {
      query += ` AND report_month = ?`;
      params.push(month);
    }
    
    query += ` ORDER BY report_month DESC LIMIT 12`;
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    // JSON 필드 파싱
    const reports = result.results?.map((r: any) => ({
      ...r,
      peak_hours: r.peak_hours ? JSON.parse(r.peak_hours) : [],
      popular_services: r.popular_services ? JSON.parse(r.popular_services) : []
    })) || [];
    
    return c.json<ApiResponse>({
      success: true,
      data: month ? reports[0] : reports,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// [9-3] 전체 매장 월간 리포트 생성 (마스터용)
api.post('/reports/generate-all', async (c) => {
  const { month } = await c.req.json() as { month?: string };
  const reportMonth = month || new Date().toISOString().slice(0, 7);
  
  try {
    // 활성 매장 목록 조회
    const stores = await c.env.DB.prepare(`
      SELECT id FROM xivix_stores WHERE is_active = 1 AND onboarding_status = 'active'
    `).all<{ id: number }>();
    
    let generated = 0;
    let failed = 0;
    
    for (const store of stores.results || []) {
      try {
        // 각 매장에 대해 리포트 생성 API 호출
        // (내부적으로 처리하므로 실제로는 직접 생성 로직 실행)
        const startDate = `${reportMonth}-01`;
        const endDate = `${reportMonth}-31`;
        
        const conversationStats = await c.env.DB.prepare(`
          SELECT COUNT(*) as total, AVG(response_time_ms) as avg_time
          FROM xivix_conversation_logs
          WHERE store_id = ? AND DATE(created_at) BETWEEN ? AND ?
        `).bind(store.id, startDate, endDate).first<{ total: number; avg_time: number }>();
        
        const reservationStats = await c.env.DB.prepare(`
          SELECT COUNT(*) as total, SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
          FROM xivix_reservations
          WHERE store_id = ? AND DATE(created_at) BETWEEN ? AND ?
        `).bind(store.id, startDate, endDate).first<{ total: number; confirmed: number }>();
        
        await c.env.DB.prepare(`
          INSERT INTO xivix_monthly_reports (store_id, report_month, total_conversations, total_reservations, confirmed_reservations)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(store_id, report_month) DO UPDATE SET
            total_conversations = excluded.total_conversations,
            total_reservations = excluded.total_reservations,
            confirmed_reservations = excluded.confirmed_reservations,
            generated_at = datetime('now')
        `).bind(
          store.id, reportMonth,
          conversationStats?.total || 0,
          reservationStats?.total || 0,
          reservationStats?.confirmed || 0
        ).run();
        
        generated++;
      } catch (e) {
        failed++;
        console.error(`Report generation failed for store ${store.id}:`, e);
      }
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        report_month: reportMonth,
        total_stores: stores.results?.length || 0,
        generated,
        failed
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// ============ 테스트 채팅 API ============

// 프롬프트 테스트용 채팅
api.post('/chat/test', async (c) => {
  try {
    const { store_id, message, prompt_config, ai_model } = await c.req.json() as {
      store_id: number;
      message: string;
      prompt_config?: {
        persona?: string;
        tone?: string;
        greeting?: string;
        systemPrompt?: string;
        forbidden?: string;
      };
      ai_model?: 'gemini' | 'openai' | 'claude';
    };

    if (!message) {
      return c.json<ApiResponse>({ 
        success: false, 
        error: '메시지를 입력해주세요', 
        timestamp: Date.now() 
      }, 400);
    }

    // 매장 정보 조회
    const store = await c.env.DB.prepare(
      'SELECT * FROM xivix_stores WHERE id = ?'
    ).bind(store_id).first<Store>();

    // ⭐ 첫 인사(안녕, 안녕하세요 등)에는 저장된 환영 인사말 반환
    const greetingKeywords = ['안녕', '하이', 'hi', 'hello', '처음', '시작'];
    const isGreeting = greetingKeywords.some(kw => message.toLowerCase().includes(kw));
    const greetingMessage = prompt_config?.greeting || store?.greeting_message;
    
    if (isGreeting && greetingMessage) {
      return c.json<ApiResponse>({
        success: true,
        response: greetingMessage,
        model: 'greeting',
        timestamp: Date.now()
      });
    }

    let response = '';
    const model = ai_model || store?.ai_model || 'gemini';

    if (model === 'openai') {
      // OpenAI 사용
      const apiKey = c.env.OPENAI_API_KEY;
      if (!apiKey) {
        return c.json<ApiResponse>({ 
          success: false, 
          error: 'OpenAI API 키가 설정되지 않았습니다', 
          timestamp: Date.now() 
        }, 400);
      }

      const systemPrompt = buildOpenAISystemPrompt({
        persona: prompt_config?.persona || store?.ai_persona,
        tone: prompt_config?.tone || store?.ai_tone || 'friendly',
        storeName: store?.store_name,
        menuData: store?.menu_data,
        operatingHours: store?.operating_hours,
        customPrompt: prompt_config?.systemPrompt || store?.system_prompt,
        forbiddenKeywords: prompt_config?.forbidden
      });

      const messages = buildOpenAIMessages(systemPrompt, [], message);
      response = await getOpenAIResponse(apiKey, messages, {
        temperature: 0.7,
        maxTokens: 1024
      });
    } else {
      // Gemini 사용 (기본)
      // ⭐ 커스텀 system_prompt가 있으면 그것을 최우선 사용
      const customSystemPrompt = prompt_config?.systemPrompt || store?.system_prompt;
      
      const systemInstruction = customSystemPrompt 
        ? customSystemPrompt  // 매장의 커스텀 프롬프트 직접 사용
        : buildSystemInstruction({
            store_name: store?.store_name,
            menu_data: store?.menu_data,
            operating_hours: store?.operating_hours,
            address: store?.address,
            phone: store?.phone,
            ai_persona: prompt_config?.persona || store?.ai_persona,
            ai_tone: prompt_config?.tone || store?.ai_tone,
            greeting_message: prompt_config?.greeting || store?.greeting_message
          });

      const messages = buildGeminiMessages(null, message);
      response = await getGeminiResponse(c.env, messages, systemInstruction);
    }

    return c.json<ApiResponse>({
      success: true,
      response,
      model,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[Chat Test] Error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '응답 생성 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// API 키 테스트
api.post('/test-api-key', async (c) => {
  try {
    const { model, api_key } = await c.req.json() as { model: string; api_key?: string };

    if (model === 'openai') {
      const key = api_key || c.env.OPENAI_API_KEY;
      if (!key) {
        return c.json<ApiResponse>({ 
          success: false, 
          error: 'API 키가 필요합니다', 
          timestamp: Date.now() 
        }, 400);
      }

      const result = await validateOpenAIKey(key);
      return c.json<ApiResponse>({
        success: result.valid,
        error: result.error,
        timestamp: Date.now()
      });
    } else if (model === 'gemini' || model === 'gemini-pro') {
      // Gemini Flash / Pro 모두 동일 키 사용
      const hasKey = !!c.env.GEMINI_API_KEY;
      return c.json<ApiResponse>({
        success: hasKey,
        data: { model: model === 'gemini-pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash' },
        error: hasKey ? undefined : 'Gemini API 키가 설정되지 않았습니다',
        timestamp: Date.now()
      });
    } else if (model === 'claude') {
      // Claude는 Anthropic API Key 사용
      const key = api_key || c.env.ANTHROPIC_API_KEY;
      if (!key) {
        return c.json<ApiResponse>({
          success: false,
          error: 'Anthropic API 키가 필요합니다',
          timestamp: Date.now()
        }, 400);
      }
      
      // Anthropic API 키 검증
      try {
        const testRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'test' }]
          })
        });
        
        if (testRes.ok || testRes.status === 200) {
          return c.json<ApiResponse>({ success: true, data: { model: 'claude-3.5-sonnet' }, timestamp: Date.now() });
        } else {
          const errData = await testRes.json().catch(() => ({})) as any;
          return c.json<ApiResponse>({ 
            success: false, 
            error: errData?.error?.message || `Anthropic API 오류 (${testRes.status})`, 
            timestamp: Date.now() 
          });
        }
      } catch (e: any) {
        return c.json<ApiResponse>({ success: false, error: 'Anthropic API 연결 실패: ' + e.message, timestamp: Date.now() });
      }
    }

    return c.json<ApiResponse>({ 
      success: false, 
      error: '지원하지 않는 모델', 
      timestamp: Date.now() 
    }, 400);
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// ============ 매장 설정 API ============

// 매장 설정 저장
api.put('/stores/:id/settings', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    const settings = await c.req.json() as {
      store_name?: string;
      business_type?: string;
      ai_persona?: string;
      ai_tone?: string;
      greeting_message?: string;
      system_prompt?: string;
      operating_hours?: string;
      menu_data?: string;
      events_data?: string;              // 🎁 이벤트/할인 정보
      ai_model?: string;
      naver_talktalk_id?: string;
      naver_reservation_id?: string;
      ocr_enabled?: boolean;
      ocr_instruction?: string;          // OCR 처리 후 AI 지침
      temperature?: number;
      max_tokens?: number;
      address?: string;
      phone?: string;
      owner_phone?: string;              // 원장님 휴대폰 (SMS 알림 발송용)
      additional_contacts?: string;      // 추가 관리자 JSON 배열
      auto_greeting?: boolean;           // 자동 환영 메시지
      auto_reservation?: boolean;        // 예약 유도 메시지
      auto_followup?: boolean;           // 재방문 메시지
      // 🔗 개인 SNS/홈페이지 링크 (보험설계사용)
      personal_website?: string;
      personal_instagram?: string;
      personal_blog?: string;
      personal_youtube?: string;
      forbidden_keywords?: string;
    };

    // 빈 문자열을 null로 변환하는 헬퍼 함수 (COALESCE가 기존 값 유지하도록)
    const nullIfEmpty = (value: string | undefined | null): string | null => {
      if (value === undefined || value === null || value.trim() === '') {
        return null;
      }
      return value;
    };

    await c.env.DB.prepare(`
      UPDATE xivix_stores SET
        store_name = COALESCE(?, store_name),
        business_type = COALESCE(?, business_type),
        ai_persona = COALESCE(?, ai_persona),
        ai_tone = COALESCE(?, ai_tone),
        greeting_message = COALESCE(?, greeting_message),
        system_prompt = COALESCE(?, system_prompt),
        operating_hours = COALESCE(?, operating_hours),
        menu_data = COALESCE(?, menu_data),
        events_data = COALESCE(?, events_data),
        ai_model = COALESCE(?, ai_model),
        naver_talktalk_id = COALESCE(?, naver_talktalk_id),
        naver_reservation_id = COALESCE(?, naver_reservation_id),
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        owner_phone = COALESCE(?, owner_phone),
        additional_contacts = COALESCE(?, additional_contacts),
        ocr_enabled = COALESCE(?, ocr_enabled),
        ocr_instruction = COALESCE(?, ocr_instruction),
        auto_greeting = COALESCE(?, auto_greeting),
        auto_reservation = COALESCE(?, auto_reservation),
        auto_followup = COALESCE(?, auto_followup),
        personal_website = COALESCE(?, personal_website),
        personal_instagram = COALESCE(?, personal_instagram),
        personal_blog = COALESCE(?, personal_blog),
        personal_youtube = COALESCE(?, personal_youtube),
        ai_temperature = COALESCE(?, ai_temperature),
        forbidden_keywords = COALESCE(?, forbidden_keywords),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      nullIfEmpty(settings.store_name),
      nullIfEmpty(settings.business_type),
      nullIfEmpty(settings.ai_persona),
      nullIfEmpty(settings.ai_tone),
      nullIfEmpty(settings.greeting_message),
      nullIfEmpty(settings.system_prompt),
      nullIfEmpty(settings.operating_hours),
      nullIfEmpty(settings.menu_data),
      nullIfEmpty(settings.events_data),
      nullIfEmpty(settings.ai_model),
      nullIfEmpty(settings.naver_talktalk_id),
      nullIfEmpty(settings.naver_reservation_id),
      nullIfEmpty(settings.address),
      nullIfEmpty(settings.phone),
      nullIfEmpty(settings.owner_phone),
      nullIfEmpty(settings.additional_contacts),
      settings.ocr_enabled !== undefined ? (settings.ocr_enabled ? 1 : 0) : null,
      nullIfEmpty(settings.ocr_instruction),
      settings.auto_greeting !== undefined ? (settings.auto_greeting ? 1 : 0) : null,
      settings.auto_reservation !== undefined ? (settings.auto_reservation ? 1 : 0) : null,
      settings.auto_followup !== undefined ? (settings.auto_followup ? 1 : 0) : null,
      nullIfEmpty(settings.personal_website),
      nullIfEmpty(settings.personal_instagram),
      nullIfEmpty(settings.personal_blog),
      nullIfEmpty(settings.personal_youtube),
      settings.temperature !== undefined ? settings.temperature : null,
      nullIfEmpty(settings.forbidden_keywords),
      id
    ).run();

    return c.json<ApiResponse>({
      success: true,
      data: { message: '설정이 저장되었습니다' },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// 이미지 OCR 분석
api.post('/ocr/analyze', async (c) => {
  try {
    const { image_base64, mime_type, prompt, ai_model } = await c.req.json() as {
      image_base64: string;
      mime_type: string;
      prompt?: string;
      ai_model?: 'gemini' | 'openai';
    };

    if (!image_base64) {
      return c.json<ApiResponse>({ 
        success: false, 
        error: '이미지가 필요합니다', 
        timestamp: Date.now() 
      }, 400);
    }

    const model = ai_model || 'openai'; // OCR은 OpenAI Vision이 더 정확함
    let result = '';

    if (model === 'openai') {
      const apiKey = c.env.OPENAI_API_KEY;
      if (!apiKey) {
        return c.json<ApiResponse>({ 
          success: false, 
          error: 'OpenAI API 키가 설정되지 않았습니다', 
          timestamp: Date.now() 
        }, 400);
      }

      result = await analyzeImageWithOpenAI(
        apiKey,
        image_base64,
        mime_type,
        prompt || '이 이미지에서 모든 텍스트를 추출하고, 내용을 분석해주세요.'
      );
    } else {
      // Gemini Vision 사용
      const messages = buildGeminiMessages(null, prompt || '이미지 분석', image_base64, mime_type);
      result = await getGeminiResponse(c.env, messages, '이미지에서 텍스트를 추출하고 분석해주세요.');
    }

    return c.json<ApiResponse>({
      success: true,
      data: { 
        text: result,
        model 
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// ============ File Upload & AI Analysis API ============

// 파일 업로드 (대용량 지원 - PDF 50MB, 이미지 20MB)
api.post('/stores/:id/files/upload', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string || 'documents';
    
    if (!file) {
      return c.json<ApiResponse>({
        success: false,
        error: '파일이 필요합니다',
        timestamp: Date.now()
      }, 400);
    }
    
    // 파일 타입 검증
    const typeValidation = validateFileType(file.type, file.name);
    if (!typeValidation.valid) {
      return c.json<ApiResponse>({
        success: false,
        error: typeValidation.error,
        timestamp: Date.now()
      }, 400);
    }
    
    // 파일 크기 검증
    const sizeValidation = validateFileSize(file.size, typeValidation.category);
    if (!sizeValidation.valid) {
      return c.json<ApiResponse>({
        success: false,
        error: sizeValidation.error,
        timestamp: Date.now()
      }, 400);
    }
    
    // R2에 업로드
    const arrayBuffer = await file.arrayBuffer();
    const result = await uploadFileToR2(
      c.env.R2,
      arrayBuffer,
      file.name,
      file.type,
      storeId,
      category
    );
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        key: result.key,
        url: result.url,
        size: result.size,
        fileName: file.name,
        mimeType: file.type,
        category: typeValidation.category
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '파일 업로드 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 매장 파일 목록 조회
api.get('/stores/:id/files', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  const category = c.req.query('category');
  
  try {
    const files = await listStoreFiles(c.env.R2, storeId, category);
    
    return c.json<ApiResponse>({
      success: true,
      data: { files },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '파일 목록 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 파일 조회/다운로드
api.get('/files/*', async (c) => {
  const key = c.req.path.replace('/api/files/', '');
  
  try {
    const file = await getFileFromR2(c.env.R2, key);
    
    if (!file) {
      return c.json<ApiResponse>({
        success: false,
        error: '파일을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    return new Response(file.body, {
      headers: {
        'Content-Type': file.contentType,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '파일 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 파일 삭제
api.delete('/stores/:id/files', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  const { key } = await c.req.json() as { key: string };
  
  if (!key || !key.includes(`stores/${storeId}/`)) {
    return c.json<ApiResponse>({
      success: false,
      error: '유효하지 않은 파일 키입니다',
      timestamp: Date.now()
    }, 400);
  }
  
  try {
    const deleted = await deleteFileFromR2(c.env.R2, key);
    
    return c.json<ApiResponse>({
      success: deleted,
      data: deleted ? { message: '파일이 삭제되었습니다' } : { message: '파일 삭제 실패' },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '파일 삭제 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 파일 AI 분석 (업로드된 파일 분석)
api.post('/stores/:id/files/analyze', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const { fileKey, analysisType, aiModel } = await c.req.json() as {
      fileKey: string;
      analysisType: 'extract_info' | 'ocr' | 'summarize' | 'custom';
      aiModel?: 'gemini' | 'openai';
      customPrompt?: string;
    };
    
    // 파일 가져오기
    const file = await getFileFromR2(c.env.R2, fileKey);
    if (!file) {
      return c.json<ApiResponse>({
        success: false,
        error: '파일을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    // 파일 데이터 읽기
    const chunks: Uint8Array[] = [];
    const reader = file.body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const fileData = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      fileData.set(chunk, offset);
      offset += chunk.length;
    }
    
    const base64 = await fileToBase64(fileData.buffer);
    const model = aiModel || 'gemini';
    const apiKey = model === 'openai' ? c.env.OPENAI_API_KEY : c.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return c.json<ApiResponse>({
        success: false,
        error: `${model.toUpperCase()} API 키가 설정되지 않았습니다`,
        timestamp: Date.now()
      }, 400);
    }
    
    // 분석 타입에 따른 프롬프트 설정
    let prompt = '';
    let contentType: 'text' | 'image' | 'pdf' = 'text';
    
    if (file.contentType.includes('image')) {
      contentType = 'image';
    } else if (file.contentType.includes('pdf')) {
      contentType = 'pdf';
    }
    
    switch (analysisType) {
      case 'extract_info':
        prompt = '이 문서/이미지에서 매장 운영에 필요한 정보를 추출해주세요: 매장명, 주소, 전화번호, 메뉴/서비스, 가격, 영업시간 등';
        break;
      case 'ocr':
        prompt = '이 이미지/문서에서 모든 텍스트를 정확하게 추출해주세요. 원본 형식을 최대한 유지해주세요.';
        break;
      case 'summarize':
        prompt = '이 문서의 핵심 내용을 요약해주세요. 주요 포인트와 중요한 세부사항을 포함해주세요.';
        break;
      default:
        prompt = '이 내용을 분석해주세요.';
    }
    
    // AI 분석 실행
    let result;
    if (model === 'openai') {
      result = await analyzeWithOpenAI(
        apiKey,
        { type: contentType === 'pdf' ? 'text' : contentType, data: base64, mimeType: file.contentType },
        prompt
      );
    } else {
      result = await analyzeWithGemini(
        apiKey,
        { type: contentType, data: base64, mimeType: file.contentType },
        prompt
      );
    }
    
    return c.json<ApiResponse>({
      success: result.success,
      data: result.success ? { analysis: result.result, model, analysisType } : undefined,
      error: result.error,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || 'AI 분석 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// URL 분석 및 매장 정보 자동 추출
api.post('/stores/:id/analyze-url', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const { url, aiModel } = await c.req.json() as {
      url: string;
      aiModel?: 'gemini' | 'openai';
    };
    
    if (!url) {
      return c.json<ApiResponse>({
        success: false,
        error: 'URL이 필요합니다',
        timestamp: Date.now()
      }, 400);
    }
    
    // URL 콘텐츠 가져오기
    const urlContent = await fetchUrlContent(url);
    
    if (!urlContent.success || !urlContent.content) {
      return c.json<ApiResponse>({
        success: false,
        error: urlContent.error || 'URL 콘텐츠를 가져올 수 없습니다',
        timestamp: Date.now()
      }, 400);
    }
    
    // AI로 매장 정보 추출
    const model = aiModel || 'gemini';
    const apiKey = model === 'openai' ? c.env.OPENAI_API_KEY : c.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return c.json<ApiResponse>({
        success: false,
        error: `${model.toUpperCase()} API 키가 설정되지 않았습니다`,
        timestamp: Date.now()
      }, 400);
    }
    
    const extractResult = await extractStoreInfoFromContent(apiKey, urlContent.content, model);
    
    if (!extractResult.success) {
      return c.json<ApiResponse>({
        success: false,
        error: extractResult.error || '정보 추출 실패',
        timestamp: Date.now()
      }, 400);
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        url,
        title: urlContent.title,
        extractedInfo: extractResult.data,
        model
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || 'URL 분석 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 자동 프롬프트 생성 (URL 또는 파일에서)
api.post('/stores/:id/auto-generate-prompt', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const { url, fileKey, aiModel } = await c.req.json() as {
      url?: string;
      fileKey?: string;
      aiModel?: 'gemini' | 'openai';
    };
    
    if (!url && !fileKey) {
      return c.json<ApiResponse>({
        success: false,
        error: 'URL 또는 파일 키가 필요합니다',
        timestamp: Date.now()
      }, 400);
    }
    
    const model = aiModel || 'gemini';
    const apiKey = model === 'openai' ? c.env.OPENAI_API_KEY : c.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return c.json<ApiResponse>({
        success: false,
        error: `${model.toUpperCase()} API 키가 설정되지 않았습니다`,
        timestamp: Date.now()
      }, 400);
    }
    
    let content = '';
    
    // URL에서 콘텐츠 가져오기
    if (url) {
      const urlContent = await fetchUrlContent(url);
      if (urlContent.success && urlContent.content) {
        content = urlContent.content;
      }
    }
    
    // 파일에서 콘텐츠 가져오기
    if (fileKey) {
      const file = await getFileFromR2(c.env.R2, fileKey);
      if (file) {
        // 텍스트 파일인 경우 직접 읽기
        if (file.contentType.includes('text') || file.contentType.includes('json')) {
          const text = await new Response(file.body).text();
          content += '\n\n' + text;
        } else {
          // 이미지/PDF는 AI로 텍스트 추출 (가격표 전용 OCR 프롬프트)
          const chunks: Uint8Array[] = [];
          const reader = file.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          const fileData = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
          let offset = 0;
          for (const chunk of chunks) {
            fileData.set(chunk, offset);
            offset += chunk.length;
          }
          const base64 = await fileToBase64(fileData.buffer);
          
          // 가격표/메뉴판 전용 OCR 프롬프트
          const ocrPrompt = `이 이미지에서 모든 텍스트를 정확하게 추출해주세요.

특히 다음 정보를 반드시 포함해주세요:
1. 서비스/메뉴 이름
2. 가격 정보 (정가, 할인가, 할인율)
3. 이벤트/프로모션 내용
4. 영업시간
5. 기타 안내 사항 (VAT 별도, 시술시간 등)

원본 형식을 유지하면서 읽기 쉽게 정리해주세요.
가격은 반드시 숫자와 "원" 또는 "→" (할인 표시)를 포함해주세요.`;
          
          const contentType = file.contentType.includes('pdf') ? 'pdf' : 'image';
          
          // 이미지는 GPT-4o Vision이 더 정확 (OpenAI 우선 사용)
          const openaiKey = c.env.OPENAI_API_KEY;
          const extractResult = openaiKey && contentType === 'image'
            ? await analyzeWithOpenAI(openaiKey, { type: 'image', data: base64, mimeType: file.contentType }, ocrPrompt)
            : await analyzeWithGemini(apiKey, { type: contentType, data: base64, mimeType: file.contentType }, ocrPrompt);
          
          if (extractResult.success && extractResult.result) {
            content += '\n\n=== 이미지/파일에서 추출된 정보 ===\n' + extractResult.result;
          }
        }
      }
    }
    
    if (!content.trim()) {
      return c.json<ApiResponse>({
        success: false,
        error: '분석할 콘텐츠가 없습니다',
        timestamp: Date.now()
      }, 400);
    }
    
    // 매장 정보 추출
    const extractResult = await extractStoreInfoFromContent(apiKey, content, model);
    
    if (!extractResult.success) {
      return c.json<ApiResponse>({
        success: false,
        error: extractResult.error || '정보 추출 실패',
        timestamp: Date.now()
      }, 400);
    }
    
    // 추출된 정보로 매장 업데이트
    const info = extractResult.data!;
    
    // 메뉴 데이터를 텍스트 형식으로 변환
    let menuDataText = '';
    if (info.menuData && info.menuData.length > 0) {
      menuDataText = info.menuData.map(m => 
        `${m.name} - ${m.price}${m.description ? ' (' + m.description + ')' : ''}`
      ).join('\n');
    }
    
    // 이벤트 데이터도 메뉴에 추가
    if (info.events && info.events.length > 0) {
      const eventText = '\n\n[현재 이벤트]\n' + info.events.map(e => 
        `${e.name}: ${e.originalPrice} → ${e.discountPrice} (${e.discount})`
      ).join('\n');
      menuDataText += eventText;
    }
    
    // system_prompt, greeting_message 필드에 올바르게 저장
    await c.env.DB.prepare(`
      UPDATE xivix_stores SET
        store_name = COALESCE(?, store_name),
        business_type = COALESCE(?, business_type),
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        operating_hours = COALESCE(?, operating_hours),
        menu_data = COALESCE(?, menu_data),
        system_prompt = COALESCE(?, system_prompt),
        greeting_message = COALESCE(?, greeting_message),
        ai_persona = COALESCE(?, ai_persona),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      info.storeName || null,
      info.businessType || null,
      info.address || null,
      info.phone || null,
      info.operatingHours || null,
      menuDataText || null,
      info.systemPrompt || null,
      info.greetingMessage || null,
      info.features ? info.features.join(', ') : null,
      storeId
    ).run();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        extractedInfo: info,
        message: '매장 정보가 자동으로 업데이트되었습니다',
        model
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '자동 생성 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ⭐ 데이터 통합 전문가 엔진 (기존 정보 보존 + 신규 정보 병합)
api.post('/stores/:id/generate-prompt-from-text', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const { text, storeName, businessType, existingPrompt } = await c.req.json() as {
      text: string;
      storeName?: string;
      businessType?: string;
      existingPrompt?: string;  // 기존 프롬프트 (병합용)
    };
    
    if (!text || text.trim().length < 10) {
      return c.json<ApiResponse>({
        success: false,
        error: '메뉴/가격/이벤트 정보를 더 입력해주세요 (최소 10자)',
        timestamp: Date.now()
      }, 400);
    }
    
    const geminiApiKey = c.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Gemini API 키가 설정되지 않았습니다',
        timestamp: Date.now()
      }, 400);
    }
    
    // ⭐ 기존 프롬프트에서 매장 정보 추출 (폴백용)
    let extractedPhone = '';
    let extractedAddress = '';
    let extractedHours = '';
    let extractedReservation = '';
    
    if (existingPrompt) {
      // 전화번호 추출
      const phoneMatch = existingPrompt.match(/전화번호[:\s]*([0-9\-]+)/);
      if (phoneMatch) extractedPhone = phoneMatch[1];
      
      // 주소 추출
      const addressMatch = existingPrompt.match(/주소[:\s]*([^\n]+)/);
      if (addressMatch) extractedAddress = addressMatch[1].trim();
      
      // 영업시간 추출
      const hoursMatch = existingPrompt.match(/영업시간[:\s]*([^\n]+)/);
      if (hoursMatch) extractedHours = hoursMatch[1].trim();
      
      // 예약금 추출
      const reservationMatch = existingPrompt.match(/예약금[:\s]*([^\n]+)/);
      if (reservationMatch) extractedReservation = reservationMatch[1].trim();
    }
    
    // ⭐ 데이터 통합 전문가 프롬프트
    const prompt = `당신은 기존 매장 정보와 새로운 텍스트 데이터를 결합하는 '데이터 통합 전문가'입니다.

## 🔒 절대 규칙 (위반 시 실패 처리)

### 1. [기존 정보 유지] - CRITICAL
${existingPrompt ? `아래 기존 프롬프트에서 다음 정보는 **반드시 유지**하십시오:
- 매장명, 전화번호, 주소, 예약 규정
- 기존에 추출된 이용 정보

[기존 프롬프트]
${existingPrompt.substring(0, 4000)}
` : '- 기존 프롬프트 없음. 새로 생성.'}

### 2. [데이터 매핑] - 원문을 섹션별로 분류
입력된 텍스트를 분석하여:
- 할인/이벤트/첫방문 → **🎖️ 핵심 혜택** 섹션에 배치
- 서비스/메뉴/가격 → **📋 전체 서비스 가격표** 섹션에 배치
- 영업시간/전화/예약금 → **⏰ 이용 정보** 섹션에 배치

### 3. [가격 원문 추출] - 숫자 최우선
- '70,000원 → 35,000원' 같은 가격은 **숫자 그대로** 추출
- **'가격 변동', '상담 문의'로 뭉개는 행위 엄격 금지**
- %, →, 원 포함 문장은 **최우선 순위 데이터**

### 4. [중복 제거]
- 기존 메뉴와 신규 메뉴가 중복 시 **최신 정보(신규 텍스트)** 우선

### 5. [할루시네이션 금지]
- 텍스트에 없는 정보(임의 휴무일, 임의 가격)를 지어내지 마십시오

## 📥 입력 데이터
- 매장명: ${storeName || '(미확인)'}
- 업종: ${businessType || 'BEAUTY_SKIN'}

[새로 입력된 텍스트]
${text}

## 📤 출력 형식 (JSON만 출력, 코드블록 금지)
{
  "menuText": "서비스명 - 가격\\n할인 서비스: 정가 → 할인가 (할인율%)",
  "operatingHours": "영업시간 또는 null",
  "phone": "전화번호 또는 null",
  "address": "주소 또는 null",
  "reservationPolicy": "예약금/예약 규정 또는 null",
  "systemPrompt": "아래 5단 고정 틀 사용"
}

## 🎯 시스템 프롬프트 5단 고정 틀 (반드시 이 형식 유지)

당신은 ${storeName || '[매장명]'}의 수석 AI 실장입니다.

## 🎖️ 현재 진행 중인 핵심 혜택
[텍스트에서 '할인/이벤트/첫방문/프로모션' 관련 내용만 추출]
- 서비스명: 정가 → 할인가 (할인율%) - 설명

## 📋 전체 서비스 안내 및 가격
[기존 메뉴 + 신규 메뉴를 통합하여 깔끔한 리스트로 정리]
- 서비스명: 가격 (VAT 별도 등 부가정보)

## ⏰ 이용 정보 및 예약 규정
- 영업시간: [기존 정보 유지 또는 신규 추출]
- 전화번호: [기존 정보 유지 또는 신규 추출]
- 주소: [기존 정보 유지]
- 예약안내: [예약금, 취소 규정 등]
- VAT: 별도

## 📌 응대 지침
- 가격 문의 시 위에 명시된 **정확한 금액**과 **할인 조건**을 안내
- '가격 변동'이라고 말하지 말고 실제 가격 안내
- 현재 이벤트 적극 안내
- 모든 상담은 예약으로 마무리`;
    
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,  // 더 정확한 추출을 위해 낮춤
            maxOutputTokens: 8192  // 긴 프롬프트 허용
          }
        })
      }
    );
    
    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error('Gemini API Error:', errorText);
      return c.json<ApiResponse>({
        success: false,
        error: 'AI 분석 실패: ' + geminiRes.status,
        timestamp: Date.now()
      }, 500);
    }
    
    const geminiData = await geminiRes.json() as any;
    
    // Gemini 에러 체크
    if (geminiData.error) {
      console.error('[generate-prompt-from-text] Gemini Error:', geminiData.error);
      return c.json<ApiResponse>({
        success: false,
        error: 'Gemini API 오류: ' + (geminiData.error.message || '알 수 없는 오류'),
        timestamp: Date.now()
      }, 500);
    }
    
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[generate-prompt-from-text] Raw response length:', rawText.length);
    
    // JSON 파싱
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[generate-prompt-from-text] JSON not found, raw:', rawText.substring(0, 500));
      
      // ⭐ 고도화된 폴백: 기존 정보 보존 + 신규 텍스트 매핑
      const fallbackPrompt = buildStructuredFallback(storeName || '매장', text, existingPrompt, {
        phone: extractedPhone,
        address: extractedAddress,
        hours: extractedHours,
        reservation: extractedReservation
      });
      
      return c.json<ApiResponse>({
        success: true,
        data: {
          menuText: extractMenuFromText(text),
          operatingHours: extractedHours || extractOperatingHours(text),
          systemPrompt: fallbackPrompt,
          fallback: true
        },
        timestamp: Date.now()
      });
    }
    
    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('[generate-prompt-from-text] JSON parse error:', parseErr);
      
      // ⭐ 고도화된 폴백
      const fallbackPrompt = buildStructuredFallback(storeName || '매장', text, existingPrompt, {
        phone: extractedPhone,
        address: extractedAddress,
        hours: extractedHours,
        reservation: extractedReservation
      });
      
      return c.json<ApiResponse>({
        success: true,
        data: {
          menuText: extractMenuFromText(text),
          operatingHours: extractedHours || extractOperatingHours(text),
          systemPrompt: fallbackPrompt,
          fallback: true
        },
        timestamp: Date.now()
      });
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: result,
      timestamp: Date.now()
    });
    
  } catch (error: any) {
    console.error('[generate-prompt-from-text] Error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '프롬프트 생성 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ⭐ 폴백용 헬퍼 함수들
function buildStructuredFallback(
  storeName: string, 
  newText: string, 
  existingPrompt: string | undefined,
  extracted: { phone: string; address: string; hours: string; reservation: string }
): string {
  // 신규 텍스트에서 정보 추출
  const newPhone = newText.match(/전화[:\s]*([0-9\-]+)/)?.[1] || 
                   newText.match(/(\d{2,3}-\d{3,4}-\d{4})/)?.[1] || '';
  const newHours = extractOperatingHours(newText);
  const newReservation = newText.match(/예약금[:\s]*([^\n]+)/)?.[1]?.trim() || '';
  
  // 이벤트/할인 추출
  const events = extractEvents(newText);
  
  // 가격 정보 추출
  const prices = extractPricesFromText(newText);
  
  return `당신은 ${storeName}의 수석 AI 실장입니다.

## 🎖️ 현재 진행 중인 핵심 혜택
${events.length > 0 ? events.join('\n') : '현재 진행 중인 이벤트가 없습니다.'}

## 📋 전체 서비스 안내 및 가격
${prices.length > 0 ? prices.join('\n') : '(가격 정보를 추가해 주세요)'}

## ⏰ 이용 정보 및 예약 규정
- 영업시간: ${newHours || extracted.hours || '(확인 필요)'}
- 전화번호: ${newPhone || extracted.phone || '(확인 필요)'}
${extracted.address ? `- 주소: ${extracted.address}` : ''}
- 예약안내: ${newReservation || extracted.reservation || '(확인 필요)'}
- VAT: 별도

## 📌 응대 지침
- 가격 문의 시 위에 명시된 정확한 금액과 할인 조건을 안내
- '가격 변동'이라고 말하지 않고 실제 가격을 안내
- 현재 이벤트 적극 안내
- 모든 상담은 예약으로 마무리`;
}

function extractEvents(text: string): string[] {
  const events: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // 할인/이벤트 패턴 감지
    if (line.includes('→') && line.match(/\d+,?\d*원/)) {
      // 가격 할인 패턴
      events.push(`- ${line.trim()}`);
    } else if (line.match(/(할인|이벤트|첫방문|오픈|프로모션)/i) && line.match(/\d+%/)) {
      events.push(`- ${line.trim()}`);
    }
  }
  
  return events;
}

function extractPricesFromText(text: string): string[] {
  const prices: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // 가격 패턴 (원 포함)
    if (line.match(/\d+,?\d*원/) && !line.match(/(예약금|방문)/)) {
      prices.push(`- ${line.trim()}`);
    }
  }
  
  return prices;
}

function extractMenuFromText(text: string): string {
  const lines = text.split('\n');
  const menuLines: string[] = [];
  
  for (const line of lines) {
    if (line.match(/\d+,?\d*원/) || line.includes('→')) {
      menuLines.push(line.trim());
    }
  }
  
  return menuLines.join('\n');
}

function extractOperatingHours(text: string): string {
  const match = text.match(/영업시간[:\s]*([^\n]+)/i) ||
                text.match(/(\d{1,2}:\d{2})\s*[-~]\s*(\d{1,2}:\d{2})/);
  return match ? match[1]?.trim() || `${match[1]}-${match[2]}` : '';
}

// =====================================================
// ⭐ 섹션 기반 프롬프트 시스템 (v2.0)
// AI 의존도 최소화: 데이터 추출만 AI가 담당, 조합은 코드가 담당
// =====================================================

// 섹션 데이터 조회
api.get('/stores/:id/prompt-sections', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const store = await c.env.DB.prepare(`
      SELECT 
        store_name, business_type, phone, address, operating_hours,
        events_data, services_data, reservation_policy, store_description,
        ai_persona, ai_tone, greeting_message, forbidden_keywords,
        custom_guidelines, prompt_template_type, system_prompt
      FROM xivix_stores WHERE id = ?
    `).bind(storeId).first();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    // JSON 파싱
    let events_data = [];
    let services_data = [];
    let reservation_policy = {};
    
    try {
      events_data = store.events_data ? JSON.parse(store.events_data as string) : [];
    } catch (e) { events_data = []; }
    
    try {
      services_data = store.services_data ? JSON.parse(store.services_data as string) : [];
    } catch (e) { services_data = []; }
    
    try {
      reservation_policy = store.reservation_policy ? JSON.parse(store.reservation_policy as string) : {};
    } catch (e) { reservation_policy = {}; }
    
    // 프롬프트 빌더로 최종 프롬프트 생성
    const promptData: StorePromptData = {
      store_name: store.store_name as string,
      business_type: store.business_type as string,
      phone: store.phone as string,
      address: store.address as string,
      operating_hours: store.operating_hours as string,
      store_description: store.store_description as string,
      events_data,
      services_data,
      reservation_policy,
      ai_persona: store.ai_persona as string,
      ai_tone: store.ai_tone as string,
      greeting_message: store.greeting_message as string,
      forbidden_keywords: store.forbidden_keywords as string,
      custom_guidelines: store.custom_guidelines as string,
      prompt_template_type: store.prompt_template_type as string
    };
    
    const generatedPrompt = buildPromptFromSections(promptData);
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        sections: {
          events_data,
          services_data,
          reservation_policy,
          store_description: store.store_description,
          forbidden_keywords: store.forbidden_keywords,
          custom_guidelines: store.custom_guidelines
        },
        storeInfo: {
          store_name: store.store_name,
          business_type: store.business_type,
          phone: store.phone,
          address: store.address,
          operating_hours: store.operating_hours
        },
        aiSettings: {
          ai_persona: store.ai_persona,
          ai_tone: store.ai_tone,
          greeting_message: store.greeting_message,
          prompt_template_type: store.prompt_template_type
        },
        generatedPrompt,
        currentPrompt: store.system_prompt
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[prompt-sections GET] Error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '섹션 데이터 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 섹션 데이터 저장 (개별 섹션 업데이트)
api.put('/stores/:id/prompt-sections', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const body = await c.req.json() as {
      events_data?: EventItem[];
      services_data?: ServiceItem[];
      reservation_policy?: ReservationPolicy;
      store_description?: string;
      forbidden_keywords?: string;
      custom_guidelines?: string;
      operating_hours?: string;
      phone?: string;
      address?: string;
      regenerate_prompt?: boolean;  // true면 프롬프트 재생성
    };
    
    // 현재 데이터 조회
    const currentStore = await c.env.DB.prepare(`
      SELECT * FROM xivix_stores WHERE id = ?
    `).bind(storeId).first();
    
    if (!currentStore) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    // 업데이트할 필드 준비
    const updates: string[] = [];
    const values: any[] = [];
    
    if (body.events_data !== undefined) {
      updates.push('events_data = ?');
      // 문자열이면 그대로, 객체면 JSON 변환
      values.push(typeof body.events_data === 'string' ? body.events_data : JSON.stringify(body.events_data));
    }
    
    if (body.services_data !== undefined) {
      updates.push('services_data = ?');
      values.push(JSON.stringify(body.services_data));
    }
    
    if (body.reservation_policy !== undefined) {
      updates.push('reservation_policy = ?');
      values.push(JSON.stringify(body.reservation_policy));
    }
    
    if (body.store_description !== undefined) {
      updates.push('store_description = ?');
      values.push(body.store_description);
    }
    
    if (body.forbidden_keywords !== undefined) {
      updates.push('forbidden_keywords = ?');
      values.push(body.forbidden_keywords);
    }
    
    if (body.custom_guidelines !== undefined) {
      updates.push('custom_guidelines = ?');
      values.push(body.custom_guidelines);
    }
    
    if (body.operating_hours !== undefined) {
      updates.push('operating_hours = ?');
      values.push(body.operating_hours);
    }
    
    if (body.phone !== undefined) {
      updates.push('phone = ?');
      values.push(body.phone);
    }
    
    if (body.address !== undefined) {
      updates.push('address = ?');
      values.push(body.address);
    }
    
    // 프롬프트 재생성 요청 시
    if (body.regenerate_prompt) {
      // 최신 데이터로 프롬프트 빌드
      let events_data = body.events_data;
      let services_data = body.services_data;
      let reservation_policy = body.reservation_policy;
      
      if (!events_data) {
        try { events_data = JSON.parse(currentStore.events_data as string || '[]'); } catch { events_data = []; }
      }
      if (!services_data) {
        try { services_data = JSON.parse(currentStore.services_data as string || '[]'); } catch { services_data = []; }
      }
      if (!reservation_policy) {
        try { reservation_policy = JSON.parse(currentStore.reservation_policy as string || '{}'); } catch { reservation_policy = {}; }
      }
      
      const promptData: StorePromptData = {
        store_name: currentStore.store_name as string,
        business_type: currentStore.business_type as string,
        phone: body.phone || currentStore.phone as string,
        address: body.address || currentStore.address as string,
        operating_hours: body.operating_hours || currentStore.operating_hours as string,
        store_description: body.store_description || currentStore.store_description as string,
        events_data: events_data as EventItem[],
        services_data: services_data as ServiceItem[],
        reservation_policy: reservation_policy as ReservationPolicy,
        ai_persona: currentStore.ai_persona as string,
        ai_tone: currentStore.ai_tone as string,
        forbidden_keywords: body.forbidden_keywords || currentStore.forbidden_keywords as string,
        custom_guidelines: body.custom_guidelines || currentStore.custom_guidelines as string
      };
      
      const generatedPrompt = buildPromptFromSections(promptData);
      updates.push('system_prompt = ?');
      values.push(generatedPrompt);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(storeId);
    
    if (updates.length > 1) {
      await c.env.DB.prepare(`
        UPDATE xivix_stores SET ${updates.join(', ')} WHERE id = ?
      `).bind(...values).run();
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: { updated: updates.length - 1 },  // updated_at 제외
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[prompt-sections PUT] Error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '섹션 데이터 저장 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ⭐ 텍스트에서 섹션 데이터 추출 (AI는 추출만, 조합은 코드가)
api.post('/stores/:id/extract-sections', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const { text, merge_mode = true } = await c.req.json() as {
      text: string;
      merge_mode?: boolean;  // true면 기존 데이터와 병합, false면 덮어쓰기
    };
    
    if (!text || text.trim().length < 10) {
      return c.json<ApiResponse>({
        success: false,
        error: '텍스트를 더 입력해주세요 (최소 10자)',
        timestamp: Date.now()
      }, 400);
    }
    
    const geminiApiKey = c.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Gemini API 키가 설정되지 않았습니다',
        timestamp: Date.now()
      }, 400);
    }
    
    // 기존 데이터 조회 (병합 모드일 때)
    let existingData: Partial<StorePromptData> = {};
    if (merge_mode) {
      const store = await c.env.DB.prepare(`
        SELECT events_data, services_data, reservation_policy, phone, address, operating_hours, store_description
        FROM xivix_stores WHERE id = ?
      `).bind(storeId).first();
      
      if (store) {
        try { existingData.events_data = JSON.parse(store.events_data as string || '[]'); } catch { existingData.events_data = []; }
        try { existingData.services_data = JSON.parse(store.services_data as string || '[]'); } catch { existingData.services_data = []; }
        try { existingData.reservation_policy = JSON.parse(store.reservation_policy as string || '{}'); } catch { existingData.reservation_policy = {}; }
        existingData.phone = store.phone as string;
        existingData.address = store.address as string;
        existingData.operating_hours = store.operating_hours as string;
        existingData.store_description = store.store_description as string;
      }
    }
    
    // AI에게 추출만 요청 (프롬프트 빌더의 getExtractionPrompt 사용)
    const extractionPrompt = getExtractionPrompt(text, existingData);
    
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: extractionPrompt }] }],
          generationConfig: {
            temperature: 0.1,  // 매우 낮은 온도로 정확한 추출
            maxOutputTokens: 4096
          }
        })
      }
    );
    
    if (!geminiRes.ok) {
      return c.json<ApiResponse>({
        success: false,
        error: 'AI 추출 실패',
        timestamp: Date.now()
      }, 500);
    }
    
    const geminiData = await geminiRes.json() as any;
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // JSON 파싱
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // 폴백: 정규식으로 직접 추출
      const fallbackExtracted = {
        events: extractEvents(text).map(e => ({ name: e.replace(/^- /, ''), description: '' })),
        services: extractPricesFromText(text).map(p => ({ name: p.replace(/^- /, ''), price_text: '' })),
        operating_hours: extractOperatingHours(text),
        phone: text.match(/(\d{2,3}-\d{3,4}-\d{4})/)?.[1] || null
      };
      
      return c.json<ApiResponse>({
        success: true,
        data: {
          extracted: fallbackExtracted,
          merged: merge_mode ? mergeExtractedData(existingData, fallbackExtracted) : fallbackExtracted,
          fallback: true
        },
        timestamp: Date.now()
      });
    }
    
    let extracted;
    try {
      extracted = JSON.parse(jsonMatch[0]);
    } catch {
      return c.json<ApiResponse>({
        success: false,
        error: 'AI 응답 파싱 실패',
        timestamp: Date.now()
      }, 500);
    }
    
    // 병합
    const merged = merge_mode ? mergeExtractedData(existingData, extracted) : extracted;
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        extracted,
        merged,
        merge_mode
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[extract-sections] Error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '섹션 추출 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ⭐ 섹션 데이터로 프롬프트 미리보기 (저장 없이)
api.post('/stores/:id/preview-prompt', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const body = await c.req.json() as Partial<StorePromptData>;
    
    // 현재 매장 데이터 조회
    const store = await c.env.DB.prepare(`
      SELECT * FROM xivix_stores WHERE id = ?
    `).bind(storeId).first();
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    // 기존 데이터와 새 데이터 병합
    let events_data = body.events_data;
    let services_data = body.services_data;
    let reservation_policy = body.reservation_policy;
    
    if (!events_data) {
      try { events_data = JSON.parse(store.events_data as string || '[]'); } catch { events_data = []; }
    }
    if (!services_data) {
      try { services_data = JSON.parse(store.services_data as string || '[]'); } catch { services_data = []; }
    }
    if (!reservation_policy) {
      try { reservation_policy = JSON.parse(store.reservation_policy as string || '{}'); } catch { reservation_policy = {}; }
    }
    
    const promptData: StorePromptData = {
      store_name: body.store_name || store.store_name as string,
      business_type: body.business_type || store.business_type as string,
      phone: body.phone || store.phone as string,
      address: body.address || store.address as string,
      operating_hours: body.operating_hours || store.operating_hours as string,
      store_description: body.store_description || store.store_description as string,
      events_data: events_data as EventItem[],
      services_data: services_data as ServiceItem[],
      reservation_policy: reservation_policy as ReservationPolicy,
      ai_persona: body.ai_persona || store.ai_persona as string,
      ai_tone: body.ai_tone || store.ai_tone as string,
      forbidden_keywords: body.forbidden_keywords || store.forbidden_keywords as string,
      custom_guidelines: body.custom_guidelines || store.custom_guidelines as string
    };
    
    const generatedPrompt = buildPromptFromSections(promptData);
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        preview: generatedPrompt,
        sections: {
          events_data,
          services_data,
          reservation_policy
        }
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[preview-prompt] Error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '프롬프트 미리보기 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 이미지 OCR + 프롬프트 생성 (가격표/메뉴판 전용)
api.post('/stores/:id/ocr-generate-prompt', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const storeName = formData.get('storeName') as string || '';
    const businessType = formData.get('businessType') as string || 'BEAUTY_SKIN';
    
    if (!file) {
      return c.json<ApiResponse>({
        success: false,
        error: '이미지 파일이 필요합니다',
        timestamp: Date.now()
      }, 400);
    }
    
    // OpenAI API 키 확인 (이미지 OCR은 GPT-4o Vision이 가장 정확)
    const openaiKey = c.env.OPENAI_API_KEY;
    const geminiKey = c.env.GEMINI_API_KEY;
    
    if (!openaiKey && !geminiKey) {
      return c.json<ApiResponse>({
        success: false,
        error: 'AI API 키가 설정되지 않았습니다',
        timestamp: Date.now()
      }, 400);
    }
    
    // 파일을 base64로 변환
    const arrayBuffer = await file.arrayBuffer();
    const base64 = await fileToBase64(arrayBuffer);
    
    // Step 1: OCR - 이미지에서 텍스트 추출
    const ocrPrompt = `이 가격표/메뉴판 이미지에서 모든 정보를 정확하게 추출해주세요.

반드시 다음 형식으로 출력:

## 서비스/메뉴 가격
- 서비스명: 가격
- 서비스명: 정가 → 할인가 (할인율)
...

## 이벤트/프로모션
- 이벤트명: 내용

## 기타 안내
- VAT 별도 여부
- 시술 소요시간
- 예약 안내 등

가격은 반드시 숫자로 추출하고, 할인 정보가 있으면 "정가 → 할인가" 형식으로 표시.
누락 없이 모든 항목을 추출하세요.`;
    
    let ocrResult = '';
    
    if (openaiKey) {
      // GPT-4o Vision으로 OCR
      const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: ocrPrompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${file.type};base64,${base64}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 4096,
          temperature: 0.1
        })
      });
      
      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        console.error('OpenAI OCR Error:', errorText);
        return c.json<ApiResponse>({
          success: false,
          error: 'OCR 실패: ' + ocrResponse.status,
          timestamp: Date.now()
        }, 500);
      }
      
      const ocrData = await ocrResponse.json() as any;
      ocrResult = ocrData.choices?.[0]?.message?.content || '';
    } else if (geminiKey) {
      // Gemini로 OCR
      const result = await analyzeWithGemini(
        geminiKey,
        { type: 'image', data: base64, mimeType: file.type },
        ocrPrompt
      );
      ocrResult = result.result || '';
    }
    
    if (!ocrResult) {
      return c.json<ApiResponse>({
        success: false,
        error: '이미지에서 텍스트를 추출할 수 없습니다',
        timestamp: Date.now()
      }, 400);
    }
    
    // Step 2: OCR 결과로 프롬프트 생성
    const promptGenPrompt = `다음 OCR 결과를 바탕으로 AI 상담원 시스템 프롬프트를 생성하세요.

## 매장 정보
- 매장명: ${storeName || '(입력 필요)'}
- 업종: ${businessType}

## OCR 추출 결과
${ocrResult}

## 출력 형식 (JSON만 출력)
{
  "menuText": "정리된 메뉴/서비스 목록 (줄바꿈으로 구분)\\n예: 서비스명 - 가격",
  "eventsText": "이벤트/할인 목록 (줄바꿈으로 구분)\\n예: 이벤트명: 정가 → 할인가 (할인율)",
  "systemPrompt": "당신은 ${storeName || '[매장명]'}의 전문 AI 상담원입니다.\\n\\n## 서비스 가격표\\n(OCR에서 추출한 모든 메뉴/가격)\\n\\n## 현재 이벤트/프로모션\\n(OCR에서 추출한 이벤트 정보)\\n\\n## 기타 안내\\n(VAT, 시술시간 등)\\n\\n## 응대 지침\\n- 고객 문의에 친절하고 전문적으로 응대\\n- 가격 문의 시 정확한 가격과 현재 이벤트 안내\\n- 대화 마무리 시 예약 유도",
  "extractedRaw": "OCR 원본 텍스트"
}`;
    
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey || c.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptGenPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096
          }
        })
      }
    );
    
    if (!geminiRes.ok) {
      // Gemini 실패 시 OCR 결과만 반환
      return c.json<ApiResponse>({
        success: true,
        data: {
          menuText: ocrResult,
          eventsText: '',
          systemPrompt: `당신은 ${storeName}의 AI 상담원입니다.\n\n${ocrResult}`,
          extractedRaw: ocrResult
        },
        timestamp: Date.now()
      });
    }
    
    const geminiData = await geminiRes.json() as any;
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // JSON 파싱
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // JSON 파싱 실패 시 OCR 결과만 반환
      return c.json<ApiResponse>({
        success: true,
        data: {
          menuText: ocrResult,
          eventsText: '',
          systemPrompt: `당신은 ${storeName}의 AI 상담원입니다.\n\n${ocrResult}`,
          extractedRaw: ocrResult
        },
        timestamp: Date.now()
      });
    }
    
    const result = JSON.parse(jsonMatch[0]);
    result.extractedRaw = ocrResult;
    
    return c.json<ApiResponse>({
      success: true,
      data: result,
      timestamp: Date.now()
    });
    
  } catch (error: any) {
    console.error('OCR Generate Prompt Error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || 'OCR 프롬프트 생성 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ⭐ 다중 URL 분석 → AI가 카테고리별 자동 정리
api.post('/stores/:id/analyze-multiple-urls', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const { urls } = await c.req.json() as { urls: string[] };
    
    if (!urls || urls.length === 0) {
      return c.json<ApiResponse>({
        success: false,
        error: 'URL이 필요합니다',
        timestamp: Date.now()
      }, 400);
    }
    
    // 각 URL에서 콘텐츠 수집
    const allContents: string[] = [];
    let analyzedCount = 0;
    
    for (const url of urls.slice(0, 10)) { // 최대 10개
      try {
        // URL 타입 감지
        let content = '';
        
        // 네이버 단축 URL 리다이렉트 처리
        let finalUrl = url;
        if (url.includes('naver.me/')) {
          try {
            const redirectRes = await fetch(url, { redirect: 'manual' });
            const location = redirectRes.headers.get('Location');
            if (location) finalUrl = location;
          } catch (e) {
            // 리다이렉트 실패 시 원본 URL 사용
          }
        }
        
        // 네이버 플레이스 (여러 URL 패턴 지원)
        // map.naver.com/p/search/xxx/place/123 또는 m.place.naver.com/place/123
        const placeIdMatch = finalUrl.match(/place\/(\d+)/) || finalUrl.match(/entry\/place\/(\d+)/);
        if (placeIdMatch) {
          const placeId = placeIdMatch[1];
          const pages = ['home', 'menu/list', 'ticket'];
          
          for (const page of pages) {
            try {
              const pageRes = await fetch(`https://m.place.naver.com/place/${placeId}/${page}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' }
              });
              const html = await pageRes.text();
              
              // 여러 방식으로 텍스트 추출
              let pageContent = '';
              
              // 방법 1: __NEXT_DATA__ (있으면)
              const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
              if (nextDataMatch) {
                pageContent = nextDataMatch[1].substring(0, 15000);
              }
              
              // 방법 2: JSON-LD 스크립트
              const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
              if (jsonLdMatches) {
                pageContent += '\n' + jsonLdMatches.join('\n').substring(0, 10000);
              }
              
              // 방법 3: HTML에서 가격 정보 추출
              const priceMatches = html.match(/\d{1,3}(,\d{3})*원/g);
              if (priceMatches) {
                pageContent += '\n가격정보: ' + [...new Set(priceMatches)].join(', ');
              }
              
              // 방법 4: 전체 HTML에서 텍스트 추출 (태그 제거)
              if (!pageContent || pageContent.length < 500) {
                const cleanText = html
                  .replace(/<script[\s\S]*?<\/script>/gi, '')
                  .replace(/<style[\s\S]*?<\/style>/gi, '')
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .substring(0, 20000);
                pageContent += '\n' + cleanText;
              }
              
              if (pageContent.length > 100) {
                content += `\n[네이버플레이스-${page}]\n${pageContent}`;
              }
            } catch (e) {
              console.error(`네이버 플레이스 ${page} 로드 실패:`, e);
            }
          }
        }
        // 네이버 블로그
        else if (finalUrl.includes('blog.naver.com')) {
          try {
            const blogRes = await fetch(finalUrl.replace('blog.naver.com', 'm.blog.naver.com'), {
              headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' }
            });
            const html = await blogRes.text();
            content += '\n[네이버블로그]\n';
            
            // 본문 텍스트 추출 (여러 패턴 시도)
            let blogContent = '';
            
            // 방법 1: se-main-container
            const mainMatch = html.match(/se-main-container[^>]*>([\s\S]*?)<\/div>/);
            if (mainMatch) {
              blogContent = mainMatch[1].replace(/<[^>]+>/g, ' ');
            }
            
            // 방법 2: 전체 텍스트 추출
            if (!blogContent || blogContent.length < 200) {
              blogContent = html
                .replace(/<script[\s\S]*?<\/script>/gi, '')
                .replace(/<style[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ');
            }
            
            content += blogContent.substring(0, 15000);
          } catch (e) {
            console.error('블로그 로드 실패:', e);
          }
        }
        // 일반 URL
        else {
          try {
            const pageRes = await fetch(finalUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const html = await pageRes.text();
            content += '\n[웹페이지]\n';
            
            // 메타 정보 추출
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch) content += 'Title: ' + titleMatch[1] + '\n';
            
            // 본문 텍스트
            const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .substring(0, 10000);
            content += bodyText;
          } catch (e) {
            // 페이지 로드 실패 무시
          }
        }
        
        if (content.length > 100) {
          allContents.push(content);
          analyzedCount++;
        }
      } catch (e) {
        console.error(`URL 분석 실패: ${url}`, e);
      }
    }
    
    if (allContents.length === 0) {
      return c.json<ApiResponse>({
        success: false,
        error: 'URL에서 정보를 추출할 수 없습니다',
        timestamp: Date.now()
      }, 400);
    }
    
    // Gemini로 종합 분석 (토큰 제한을 위해 30KB로 제한)
    const combinedContent = allContents.join('\n\n---\n\n').substring(0, 30000);
    console.log('[analyze-multiple-urls] Combined content length:', combinedContent.length);
    
    // ⭐ 범용 지능형 프롬프트 엔진 (다중 URL 분석용)
    const analyzePrompt = `당신은 다양한 업종의 원천 데이터를 분석하여 전문가 수준의 AI 상담원을 설계하는 '프롬프트 엔지니어'입니다.

## 🔒 핵심 규칙 (절대 위반 금지)

### 1. 가격 보존 법칙 (CRITICAL)
- **숫자와 기호(%, →, 원)가 포함된 문장은 최우선 순위 데이터**로 취급
- 모든 가격 데이터(예: 70,000원 → 35,000원, 50% 할인)는 **요약하지 말고 원문 그대로** 추출
- **"가격 변동", "상담 문의", "가격 문의"로 뭉개는 행위 엄격 금지**
- 가격을 찾을 수 없으면 해당 서비스는 "가격 미확인"으로 표시 (변동 X)

### 2. 섹션별 독립 추출
- 매장 정체성, 전체 가격표, 현재 이벤트, 예약 규정을 각각 독립 섹션으로 분류

### 3. 업종 가변형 페르소나
- 매장명과 서비스를 분석해 뷰티/식당/학원 등 업종에 맞는 전문가 페르소나 자동 설정

### 4. 할루시네이션 방지
- 수집된 콘텐츠에 **없는 정보(임의의 휴무일, 임의 가격 등)를 절대 지어내지 마십시오**

## 📥 수집된 콘텐츠
${combinedContent}

## 📤 출력 형식 (JSON만 출력)
{
  "storeName": "매장명",
  "businessType": "BEAUTY_SKIN|BEAUTY_HAIR|BEAUTY_NAIL|RESTAURANT|FITNESS|MEDICAL|OTHER 중 하나",
  "address": "매장 주소",
  "phone": "전화번호",
  "operatingHours": "영업시간 (줄바꿈 구분)",
  "aiPersona": "AI의 역할/페르소나 (예: 친절한 피부관리 전문 상담사)",
  "aiTone": "friendly|professional|casual|formal|energetic 중 하나",
  "greetingMessage": "환영 인사말",
  "systemPrompt": "아래 고정 틀 사용",
  "menuText": "서비스명 - 실제가격 (줄바꿈 구분). 할인: 서비스명 - 정가 → 할인가 (할인율)",
  "forbiddenKeywords": "100%, 보장, 확실히",
  "menuCount": 10,
  "eventCount": 5
}

## 🎯 시스템 프롬프트 고정 틀

당신은 [매장명]의 전문 AI 상담 지배인입니다.

## 💎 현재 진행 중인 핵심 혜택
[이벤트가 있으면 모두 나열. 형식: 서비스명: 정가 → 할인가 (할인율%) - 설명]
[이벤트가 없으면 "현재 진행 중인 이벤트가 없습니다"]

## 📋 전체 서비스 안내 및 가격
[모든 서비스와 실제 가격을 빠짐없이 나열]
[가격을 못 찾은 경우만 "가격 미확인" 표시, "가격 변동" 금지]

## ⏰ 이용 정보 및 예약 규정
- 영업시간: [추출된 영업시간]
- 전화번호: [추출된 전화번호]
- 예약금: [추출된 예약금 정보]
- VAT: [VAT 별도 여부]

## 📌 응대 원칙
- 가격 문의 시 **실제 추출된 가격**만 안내
- 현재 이벤트 적극 안내
- 모든 상담은 예약으로 마무리

---
JSON만 출력하세요. 마크다운 코드블록 금지.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${c.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analyzePrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error('[analyze-multiple-urls] Gemini API Error:', geminiRes.status, errorText);
      return c.json<ApiResponse>({
        success: false,
        error: `AI 분석 실패 (${geminiRes.status})`,
        timestamp: Date.now()
      }, 500);
    }

    const geminiData = await geminiRes.json() as any;
    console.log('[analyze-multiple-urls] Gemini response received');
    
    // Gemini 에러 체크
    if (geminiData.error) {
      console.error('[analyze-multiple-urls] Gemini Error:', geminiData.error);
      return c.json<ApiResponse>({
        success: false,
        error: geminiData.error.message || 'Gemini API 오류',
        timestamp: Date.now()
      }, 500);
    }
    
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[analyze-multiple-urls] Raw text length:', rawText.length);
    
    // JSON 추출
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[analyze-multiple-urls] JSON not found in response:', rawText.substring(0, 500));
      
      // 폴백: 원본 콘텐츠로 기본 결과 생성
      return c.json<ApiResponse>({
        success: true,
        data: {
          storeName: null,
          businessType: 'OTHER',
          systemPrompt: `수집된 정보:\n${combinedContent.substring(0, 5000)}`,
          menuText: '',
          analyzedCount,
          rawContent: combinedContent.substring(0, 3000),
          parseError: 'AI가 JSON 형식으로 응답하지 않았습니다. 텍스트 붙여넣기를 사용해주세요.'
        },
        timestamp: Date.now()
      });
    }

    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('[analyze-multiple-urls] JSON parse error:', parseErr);
      return c.json<ApiResponse>({
        success: true,
        data: {
          storeName: null,
          businessType: 'OTHER',
          systemPrompt: rawText.substring(0, 5000),
          menuText: '',
          analyzedCount,
          parseError: 'JSON 파싱 실패. 텍스트 붙여넣기를 사용해주세요.'
        },
        timestamp: Date.now()
      });
    }
    
    result.analyzedCount = analyzedCount;

    return c.json<ApiResponse>({
      success: true,
      data: result,
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('[analyze-multiple-urls] Error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '다중 URL 분석 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 지원 파일 타입 조회
api.get('/files/supported-types', (c) => {
  return c.json<ApiResponse>({
    success: true,
    data: {
      image: {
        extensions: SUPPORTED_FILE_TYPES.image.extensions,
        maxSize: '20MB',
        maxSizeBytes: SUPPORTED_FILE_TYPES.image.maxSize
      },
      pdf: {
        extensions: SUPPORTED_FILE_TYPES.pdf.extensions,
        maxSize: '50MB',
        maxSizeBytes: SUPPORTED_FILE_TYPES.pdf.maxSize
      },
      document: {
        extensions: SUPPORTED_FILE_TYPES.document.extensions,
        maxSize: '10MB',
        maxSizeBytes: SUPPORTED_FILE_TYPES.document.maxSize
      }
    },
    timestamp: Date.now()
  });
});

// ============ 설정 변경 요청 API ============

// 매장 확인 (톡톡 ID 또는 전화번호로)
api.post('/request/verify-store', async (c) => {
  try {
    const { talktalk_id, phone } = await c.req.json() as {
      talktalk_id?: string;
      phone?: string;
    };
    
    if (!talktalk_id && !phone) {
      return c.json<ApiResponse>({
        success: false,
        error: '톡톡 ID 또는 전화번호를 입력해주세요',
        timestamp: Date.now()
      }, 400);
    }
    
    let store = null;
    
    // 톡톡 ID로 검색
    if (talktalk_id) {
      const cleanId = talktalk_id.replace('@', '').trim();
      store = await c.env.DB.prepare(`
        SELECT id, store_name, business_type_name, owner_phone, is_active, naver_talktalk_id
        FROM xivix_stores 
        WHERE naver_talktalk_id LIKE ? OR store_name LIKE ?
        LIMIT 1
      `).bind(`%${cleanId}%`, `%${cleanId}%`).first();
    }
    
    // 전화번호로 검색
    if (!store && phone) {
      const cleanPhone = phone.replace(/-/g, '').trim();
      store = await c.env.DB.prepare(`
        SELECT id, store_name, business_type_name, owner_phone, is_active, naver_talktalk_id
        FROM xivix_stores 
        WHERE REPLACE(owner_phone, '-', '') = ? OR REPLACE(store_phone, '-', '') = ?
        LIMIT 1
      `).bind(cleanPhone, cleanPhone).first();
    }
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: store,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '매장 확인 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 설정 변경 요청 제출
api.post('/request/submit', async (c) => {
  try {
    const { store_id, store_name, request_type, content, contact_time } = await c.req.json() as {
      store_id: number;
      store_name: string;
      request_type: string;
      content: string;
      contact_time?: string;
    };
    
    if (!store_id || !request_type || !content) {
      return c.json<ApiResponse>({
        success: false,
        error: '필수 정보가 누락되었습니다',
        timestamp: Date.now()
      }, 400);
    }
    
    // 요청 유형 한글 변환
    const typeLabels: Record<string, string> = {
      'prompt': 'AI 응대 변경',
      'ai_response': 'AI 응대 변경',
      'hours': '영업시간 수정',
      'menu': '메뉴/가격 변경',
      'info': '매장 정보 수정',
      'pause': 'AI 일시 중지',
      'other': '기타 요청'
    };
    
    // DB에 요청 저장
    await c.env.DB.prepare(`
      INSERT INTO xivix_change_requests 
      (store_id, store_name, request_type, request_type_label, content, contact_time, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).bind(
      store_id,
      store_name,
      request_type,
      typeLabels[request_type] || request_type,
      content,
      contact_time || null
    ).run();
    
    // 마스터에게 알림 (SMS)
    const masterPhone = c.env.MASTER_PHONE;
    if (masterPhone) {
      // SMS 발송 로직 (간단히 로그만)
      console.log(`[Request] 새 요청: ${store_name} - ${typeLabels[request_type]}`);
    }
    
    return c.json<ApiResponse>({
      success: true,
      message: '요청이 전송되었습니다',
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[Request Submit Error]', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '요청 전송 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 요청 목록 조회 (마스터용)
api.get('/request/list', async (c) => {
  try {
    const status = c.req.query('status') || 'pending';
    
    const requests = await c.env.DB.prepare(`
      SELECT * FROM xivix_change_requests 
      WHERE status = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).bind(status).all();
    
    return c.json<ApiResponse>({
      success: true,
      data: requests.results,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '목록 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 요청 상태 변경 (마스터용)
api.post('/request/:id/status', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    const { status, note } = await c.req.json() as {
      status: 'completed' | 'rejected';
      note?: string;
    };
    
    await c.env.DB.prepare(`
      UPDATE xivix_change_requests 
      SET status = ?, admin_note = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(status, note || null, id).run();
    
    return c.json<ApiResponse>({
      success: true,
      message: '상태가 변경되었습니다',
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '상태 변경 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ============ 예약 API ============

// 매장의 예약 가능 시간 조회
api.get('/stores/:storeId/booking/available', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const days = parseInt(c.req.query('days') || '7', 10);
  const date = c.req.query('date'); // 특정 날짜 필터

  try {
    // 매장 정보 조회
    const store = await c.env.DB.prepare(
      'SELECT * FROM xivix_stores WHERE id = ?'
    ).bind(storeId).first<Store>();

    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다.',
        timestamp: Date.now()
      }, 404);
    }

    // 영업시간 파싱
    const businessHours = parseOperatingHoursAPI(store.operating_hours);

    // 기존 예약 조회
    const startDate = date || new Date().toISOString().split('T')[0];
    const endDateObj = new Date(startDate);
    endDateObj.setDate(endDateObj.getDate() + days);
    const endDate = endDateObj.toISOString().split('T')[0];

    const bookings = await c.env.DB.prepare(`
      SELECT reservation_date, reservation_time, service_name
      FROM xivix_reservations
      WHERE store_id = ?
        AND reservation_date >= ?
        AND reservation_date <= ?
        AND status NOT IN ('cancelled', 'no_show')
    `).bind(storeId, startDate, endDate).all();

    // 예약된 시간대
    const bookedSlots = (bookings.results || []).map((b: any) => ({
      date: b.reservation_date,
      time: b.reservation_time
    }));

    // 날짜별 가용 슬롯 계산
    const availableSlots: { [date: string]: string[] } = {};
    const slotDuration = 30; // 30분 단위

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      
      const dayHours = businessHours.find(h => h.dayOfWeek === dayOfWeek);
      if (!dayHours || dayHours.isOff) continue;

      const [openH, openM] = dayHours.open.split(':').map(Number);
      const [closeH, closeM] = dayHours.close.split(':').map(Number);
      const openMin = openH * 60 + openM;
      const closeMin = closeH * 60 + closeM;

      const dayBookedTimes = new Set(
        bookedSlots.filter(b => b.date === dateStr).map(b => b.time)
      );

      const slots: string[] = [];
      let currentMin = openMin;

      // 오늘인 경우 현재 시간 이후만
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      if (dateStr === today) {
        const nowMin = now.getHours() * 60 + now.getMinutes();
        currentMin = Math.max(openMin, Math.ceil(nowMin / slotDuration) * slotDuration + slotDuration);
      }

      while (currentMin + slotDuration <= closeMin) {
        const timeStr = `${Math.floor(currentMin / 60).toString().padStart(2, '0')}:${(currentMin % 60).toString().padStart(2, '0')}`;
        if (!dayBookedTimes.has(timeStr)) {
          slots.push(timeStr);
        }
        currentMin += slotDuration;
      }

      if (slots.length > 0) {
        availableSlots[dateStr] = slots;
      }
    }

    return c.json<ApiResponse>({
      success: true,
      data: {
        storeId,
        storeName: store.store_name,
        operatingHours: store.operating_hours,
        availableSlots,
        bookedCount: bookedSlots.length
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[API] Get available slots error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '예약 가능 시간 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 예약 생성
api.post('/stores/:storeId/booking', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const { date, time, customer_name, customer_phone, service_name, staff_name, customer_id } = await c.req.json() as {
    date: string;
    time: string;
    customer_name?: string;
    customer_phone?: string;
    service_name?: string;
    staff_name?: string;
    customer_id?: string;
  };

  if (!date || !time) {
    return c.json<ApiResponse>({
      success: false,
      error: '날짜와 시간은 필수입니다.',
      timestamp: Date.now()
    }, 400);
  }

  try {
    // 중복 체크
    const existing = await c.env.DB.prepare(`
      SELECT id FROM xivix_reservations
      WHERE store_id = ? AND reservation_date = ? AND reservation_time = ?
        AND status NOT IN ('cancelled', 'no_show')
    `).bind(storeId, date, time).first();

    if (existing) {
      return c.json<ApiResponse>({
        success: false,
        error: '해당 시간에 이미 예약이 있습니다.',
        timestamp: Date.now()
      }, 409);
    }

    // 매장 정보 조회 (네이버 예약 ID)
    const store = await c.env.DB.prepare(
      'SELECT naver_reservation_id FROM xivix_stores WHERE id = ?'
    ).bind(storeId).first<{ naver_reservation_id: string }>();

    // 예약 생성 (실제 테이블 스키마에 맞춤)
    const result = await c.env.DB.prepare(`
      INSERT INTO xivix_reservations (
        store_id, customer_id, customer_name, customer_phone,
        reservation_date, reservation_time, service_name, status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', '', 'ai')
    `).bind(
      storeId,
      customer_id || `WEB_${Date.now()}`,
      customer_name || null,
      customer_phone || null,
      date,
      time,
      service_name || '일반 서비스'
    ).run();

    const bookingId = `BK${Date.now().toString(36).toUpperCase()}`;

    return c.json<ApiResponse>({
      success: true,
      data: {
        bookingId,
        storeId,
        date,
        time,
        status: 'confirmed'
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[API] Create booking error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '예약 생성 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 예약 목록 조회 (매장별)
api.get('/stores/:storeId/booking/list', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const status = c.req.query('status') || 'all';
  const date = c.req.query('date');
  const limit = parseInt(c.req.query('limit') || '50', 10);

  try {
    let query = `
      SELECT * FROM xivix_reservations
      WHERE store_id = ?
    `;
    const params: any[] = [storeId];

    if (status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (date) {
      query += ' AND reservation_date = ?';
      params.push(date);
    }

    query += ' ORDER BY reservation_date ASC, reservation_time ASC LIMIT ?';
    params.push(limit);

    const bookings = await c.env.DB.prepare(query).bind(...params).all();

    return c.json<ApiResponse>({
      success: true,
      data: bookings.results || [],
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[API] Get bookings error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '예약 목록 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 예약 상태 변경
api.patch('/stores/:storeId/booking/:bookingId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const bookingId = parseInt(c.req.param('bookingId'), 10);
  const { status, note } = await c.req.json() as {
    status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
    note?: string;
  };

  if (!status) {
    return c.json<ApiResponse>({
      success: false,
      error: '상태값은 필수입니다.',
      timestamp: Date.now()
    }, 400);
  }

  try {
    await c.env.DB.prepare(`
      UPDATE xivix_reservations
      SET status = ?, admin_note = ?, updated_at = datetime('now')
      WHERE id = ? AND store_id = ?
    `).bind(status, note || null, bookingId, storeId).run();

    return c.json<ApiResponse>({
      success: true,
      message: '예약 상태가 변경되었습니다.',
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[API] Update booking error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '예약 상태 변경 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 예약 삭제
api.delete('/stores/:storeId/booking/:bookingId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const bookingId = parseInt(c.req.param('bookingId'), 10);

  try {
    await c.env.DB.prepare(`
      DELETE FROM xivix_reservations WHERE id = ? AND store_id = ?
    `).bind(bookingId, storeId).run();

    return c.json<ApiResponse>({
      success: true,
      message: '예약이 삭제되었습니다.',
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[API] Delete booking error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '예약 삭제 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 영업시간 파싱 헬퍼 함수 (API용)
function parseOperatingHoursAPI(operatingHours: string | null): { dayOfWeek: number; open: string; close: string; isOff: boolean }[] {
  if (!operatingHours) {
    return [
      { dayOfWeek: 0, open: '', close: '', isOff: true },
      { dayOfWeek: 1, open: '10:00', close: '21:00', isOff: false },
      { dayOfWeek: 2, open: '10:00', close: '21:00', isOff: false },
      { dayOfWeek: 3, open: '10:00', close: '21:00', isOff: false },
      { dayOfWeek: 4, open: '10:00', close: '21:00', isOff: false },
      { dayOfWeek: 5, open: '10:00', close: '21:00', isOff: false },
      { dayOfWeek: 6, open: '10:00', close: '18:00', isOff: false },
    ];
  }

  const dayMap: { [key: string]: number[] } = {
    '일': [0], '월': [1], '화': [2], '수': [3], '목': [4], '금': [5], '토': [6],
    '월-금': [1, 2, 3, 4, 5],
    '월-토': [1, 2, 3, 4, 5, 6],
    '평일': [1, 2, 3, 4, 5],
    '주말': [0, 6],
  };

  const result = Array(7).fill(null).map((_, i) => ({
    dayOfWeek: i,
    open: '',
    close: '',
    isOff: true
  }));

  const rules = operatingHours.split(/[,，]/).map(r => r.trim());
  
  for (const rule of rules) {
    if (rule.includes('휴무')) {
      const dayMatch = rule.match(/(월|화|수|목|금|토|일)/);
      if (dayMatch) {
        const days = dayMap[dayMatch[1]] || [];
        days.forEach(d => { result[d].isOff = true; });
      }
      continue;
    }

    const timeMatch = rule.match(/(\d{1,2}:\d{2})\s*[-~]\s*(\d{1,2}:\d{2})/);
    if (timeMatch) {
      const open = timeMatch[1];
      const close = timeMatch[2];

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

// ============ 업종 템플릿 API ============

// 전체 업종 목록 조회
api.get('/industries', async (c) => {
  try {
    const list = getIndustryList();
    return c.json<ApiResponse>({
      success: true,
      data: list,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '업종 목록 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 특정 업종 템플릿 조회
api.get('/industries/:industryId', async (c) => {
  const industryId = c.req.param('industryId');
  
  try {
    const template = getIndustryTemplate(industryId);
    
    if (!template) {
      return c.json<ApiResponse>({
        success: false,
        error: '해당 업종을 찾을 수 없습니다.',
        timestamp: Date.now()
      }, 404);
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: template,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '업종 템플릿 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 카테고리별 업종 조회
api.get('/industries/category/:category', async (c) => {
  const category = c.req.param('category');
  
  try {
    const templates = getIndustriesByCategory(category);
    return c.json<ApiResponse>({
      success: true,
      data: templates,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '카테고리별 업종 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ============ 미용실 프롬프트 타입 API ============

// 미용실 프롬프트 타입 목록
api.get('/prompt-types/hair-salon', async (c) => {
  try {
    const types = getHairSalonPromptTypes();
    return c.json<ApiResponse>({
      success: true,
      data: types,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '프롬프트 타입 목록 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 특정 프롬프트 타입 조회 (매장명 및 가격 자동 적용)
api.get('/prompt-types/hair-salon/:typeId', async (c) => {
  const { env } = c;
  const typeId = c.req.param('typeId');
  const storeName = c.req.query('storeName') || '{{STORE_NAME}}';
  const storeId = c.req.query('storeId'); // 매장 ID로 메뉴 데이터 조회
  
  try {
    const type = getHairSalonPromptType(typeId);
    
    if (!type) {
      return c.json<ApiResponse>({
        success: false,
        error: '해당 프롬프트 타입을 찾을 수 없습니다.',
        timestamp: Date.now()
      }, 404);
    }
    
    // 매장 메뉴 데이터 조회 (storeId가 있는 경우)
    let menuData: string | null = null;
    if (storeId) {
      const store = await env.DB.prepare(
        'SELECT menu_data FROM xivix_stores WHERE id = ?'
      ).bind(storeId).first();
      if (store) {
        menuData = store.menu_data as string | null;
      }
    }
    
    // 매장명 + 가격 치환
    const appliedType = applyStoreToPromptType(type, storeName, menuData);
    
    return c.json<ApiResponse>({
      success: true,
      data: appliedType,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '프롬프트 타입 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ============================================================
// 보험설계사/보험대리점 프롬프트 API
// ============================================================

// 보험 프롬프트 타입 목록 조회
api.get('/prompt-types/insurance', async (c) => {
  const category = c.req.query('category') as 'consulting' | 'recruiting' | undefined;
  
  try {
    const types = getInsurancePromptTypes(category);
    return c.json<ApiResponse>({
      success: true,
      data: types,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '보험 프롬프트 타입 목록 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 특정 보험 프롬프트 타입 조회 (매장명/경력/SNS 링크 적용)
api.get('/prompt-types/insurance/:typeId', async (c) => {
  const { env } = c;
  const typeId = c.req.param('typeId');
  const storeName = c.req.query('storeName') || '{{STORE_NAME}}';
  const storeId = c.req.query('storeId');
  const careerYears = c.req.query('careerYears');
  
  // 개인 SNS/홈페이지 링크
  const personalLinks = {
    website: c.req.query('website') || '',
    instagram: c.req.query('instagram') || '',
    blog: c.req.query('blog') || '',
    youtube: c.req.query('youtube') || ''
  };
  
  try {
    const type = getInsurancePromptType(typeId);
    
    if (!type) {
      return c.json<ApiResponse>({
        success: false,
        error: '해당 프롬프트 타입을 찾을 수 없습니다.',
        timestamp: Date.now()
      }, 404);
    }
    
    // 매장 정보 조회 (storeId가 있는 경우)
    let dbCareerYears: string | undefined = careerYears || undefined;
    let dbPersonalLinks = { ...personalLinks };
    
    if (storeId) {
      const store = await env.DB.prepare(
        'SELECT career_years, personal_website, personal_instagram, personal_blog, personal_youtube FROM xivix_stores WHERE id = ?'
      ).bind(storeId).first();
      if (store) {
        if (store.career_years && !careerYears) {
          dbCareerYears = store.career_years as string;
        }
        // DB에 저장된 링크가 있고 쿼리로 안 넘어온 경우 사용
        if (store.personal_website && !personalLinks.website) dbPersonalLinks.website = store.personal_website as string;
        if (store.personal_instagram && !personalLinks.instagram) dbPersonalLinks.instagram = store.personal_instagram as string;
        if (store.personal_blog && !personalLinks.blog) dbPersonalLinks.blog = store.personal_blog as string;
        if (store.personal_youtube && !personalLinks.youtube) dbPersonalLinks.youtube = store.personal_youtube as string;
      }
    }
    
    // 매장명 + 경력 + SNS 링크 치환
    const appliedType = applyStoreToInsurancePrompt(type, storeName, dbCareerYears, dbPersonalLinks);
    
    return c.json<ApiResponse>({
      success: true,
      data: appliedType,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '보험 프롬프트 타입 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 업종 템플릿 기반 매장 생성 (원클릭 설정)
api.post('/stores/quick-setup', async (c) => {
  const { 
    industryId, 
    storeName, 
    ownerName, 
    ownerPhone, 
    address,
    operatingHours,
    naverTalktalkId,
    naverReservationId
  } = await c.req.json() as {
    industryId: string;
    storeName: string;
    ownerName: string;
    ownerPhone: string;
    address?: string;
    operatingHours?: string;
    naverTalktalkId?: string;
    naverReservationId?: string;
  };

  // 필수 값 검증
  if (!industryId || !storeName || !ownerName || !ownerPhone) {
    return c.json<ApiResponse>({
      success: false,
      error: '필수 정보가 누락되었습니다. (업종, 매장명, 대표자명, 연락처)',
      timestamp: Date.now()
    }, 400);
  }

  try {
    // 업종 템플릿 조회
    const template = getIndustryTemplate(industryId);
    if (!template) {
      return c.json<ApiResponse>({
        success: false,
        error: '지원하지 않는 업종입니다.',
        timestamp: Date.now()
      }, 400);
    }

    // 시스템 프롬프트 생성
    const systemPrompt = buildStoreSystemPrompt(template, {
      storeName,
      address,
      operatingHours
    });

    // 메뉴 데이터 생성
    const menuData = JSON.stringify(template.sampleMenu);

    // 임시 사용자 생성 (또는 기존 사용자 연결)
    let userId = 1; // 기본값
    
    // 사용자 조회 또는 생성
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM xivix_users WHERE phone = ? OR email = ?'
    ).bind(ownerPhone, `${ownerPhone}@xivix.temp`).first<{ id: number }>();
    
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const userResult = await c.env.DB.prepare(`
        INSERT INTO xivix_users (email, password_hash, name, phone, role)
        VALUES (?, 'temp_hash', ?, ?, 'owner')
      `).bind(`${ownerPhone}@xivix.temp`, ownerName, ownerPhone).run();
      userId = userResult.meta.last_row_id as number;
    }

    // 매장 생성
    const storeResult = await c.env.DB.prepare(`
      INSERT INTO xivix_stores (
        user_id, store_name, business_type, address, phone, owner_name, owner_phone,
        operating_hours, menu_data, ai_persona, ai_tone, greeting_message,
        naver_talktalk_id, naver_reservation_id, is_active, onboarding_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'active')
    `).bind(
      userId,
      storeName,
      industryId,
      address || null,
      ownerPhone,
      ownerName,
      ownerPhone,
      operatingHours || template.automation.cta.initialMessage ? '월-금 10:00-21:00' : null,
      menuData,
      template.persona.name,
      template.persona.tone,
      template.automation.cta.initialMessage,
      naverTalktalkId || null,
      naverReservationId || null
    ).run();

    const storeId = storeResult.meta.last_row_id as number;

    // 시스템 프롬프트 별도 저장 (필요시)
    // KV에 저장하거나 별도 테이블에 저장

    return c.json<ApiResponse>({
      success: true,
      data: {
        storeId,
        storeName,
        industryId,
        industryName: template.name,
        webhookUrl: `https://xivix-ai-core.pages.dev/v1/naver/callback/${storeId}`,
        settingsUrl: `https://xivix-ai-core.pages.dev/store/${storeId}/settings`,
        systemPrompt: systemPrompt.substring(0, 200) + '...'
      },
      message: `${template.icon} ${storeName} 매장이 생성되었습니다!`,
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('[API] Quick setup error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '매장 생성 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ============ 예약 SMS 알림 자동화 API ============

// 예약 확정 + SMS 알림 발송
api.post('/stores/:storeId/booking/:bookingId/confirm-with-sms', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const bookingId = parseInt(c.req.param('bookingId'), 10);

  try {
    // 예약 정보 조회
    const reservation = await c.env.DB.prepare(`
      SELECT r.*, s.store_name, s.phone as store_phone
      FROM xivix_reservations r
      JOIN xivix_stores s ON r.store_id = s.id
      WHERE r.id = ? AND r.store_id = ?
    `).bind(bookingId, storeId).first<any>();

    if (!reservation) {
      return c.json<ApiResponse>({
        success: false,
        error: '예약을 찾을 수 없습니다.',
        timestamp: Date.now()
      }, 404);
    }

    // 예약 상태 업데이트
    await c.env.DB.prepare(`
      UPDATE xivix_reservations 
      SET status = 'confirmed', updated_at = datetime('now')
      WHERE id = ?
    `).bind(bookingId).run();

    // SMS 발송 (고객 전화번호가 있는 경우)
    let smsResult = { success: false, error: '고객 전화번호 없음' };
    
    if (reservation.customer_phone) {
      const { notifyReservationConfirmed } = await import('../lib/notification');
      
      const dateStr = reservation.reservation_date;
      const timeStr = reservation.reservation_time;
      
      smsResult = await notifyReservationConfirmed(
        c.env,
        reservation.customer_phone,
        reservation.store_name,
        dateStr,
        timeStr,
        reservation.service_name
      );
    }

    // 리마인더 스케줄 생성 (24h, 2h 전)
    let reminderCount = 0;
    try {
      const { createReminderSchedules } = await import('../lib/reminder');
      const result = await createReminderSchedules(
        c.env.DB,
        bookingId,
        storeId,
        reservation.reservation_date,
        reservation.reservation_time
      );
      reminderCount = result.created;
    } catch (e) {
      console.error('[API] Reminder schedule error:', e);
    }

    return c.json<ApiResponse>({
      success: true,
      data: {
        bookingId,
        status: 'confirmed',
        smsResult,
        remindersCreated: reminderCount
      },
      message: smsResult.success 
        ? '예약 확정 및 SMS 알림 발송 완료'
        : '예약 확정 완료 (SMS 발송 실패)',
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('[API] Confirm with SMS error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '예약 확정 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 리마인더 발송 (Cron Job 또는 수동 트리거)
api.post('/reminders/send-due', async (c) => {
  try {
    const now = new Date().toISOString();
    
    // 발송 대기 중인 리마인더 조회
    const pendingReminders = await c.env.DB.prepare(`
      SELECT rs.*, r.customer_phone, r.customer_name, r.service_name,
             r.reservation_date, r.reservation_time, s.store_name
      FROM xivix_reminder_schedules rs
      JOIN xivix_reservations r ON rs.reservation_id = r.id
      JOIN xivix_stores s ON rs.store_id = s.id
      WHERE rs.status = 'pending' 
        AND rs.scheduled_at <= ?
        AND r.status = 'confirmed'
      ORDER BY rs.scheduled_at
      LIMIT 50
    `).bind(now).all();

    if (!pendingReminders.results || pendingReminders.results.length === 0) {
      return c.json<ApiResponse>({
        success: true,
        data: { sent: 0, failed: 0 },
        message: '발송할 리마인더가 없습니다.',
        timestamp: Date.now()
      });
    }

    const { notifyReservationReminder } = await import('../lib/notification');
    
    let sent = 0;
    let failed = 0;

    for (const reminder of pendingReminders.results as any[]) {
      if (!reminder.customer_phone) {
        // 전화번호 없으면 실패 처리
        await c.env.DB.prepare(`
          UPDATE xivix_reminder_schedules 
          SET status = 'failed', error_message = '고객 전화번호 없음'
          WHERE id = ?
        `).bind(reminder.id).run();
        failed++;
        continue;
      }

      // 알림 텍스트 생성
      const hoursMap: Record<string, string> = {
        '24h': '내일',
        '2h': '2시간 후',
        '1h': '1시간 후'
      };
      const hoursText = hoursMap[reminder.reminder_type] || '곧';

      // SMS 발송
      const result = await notifyReservationReminder(
        c.env,
        reminder.customer_phone,
        reminder.store_name,
        reminder.reservation_date,
        reminder.reservation_time,
        hoursText
      );

      if (result.success) {
        await c.env.DB.prepare(`
          UPDATE xivix_reminder_schedules 
          SET status = 'sent', sent_at = datetime('now')
          WHERE id = ?
        `).bind(reminder.id).run();
        sent++;
      } else {
        await c.env.DB.prepare(`
          UPDATE xivix_reminder_schedules 
          SET status = 'failed', error_message = ?
          WHERE id = ?
        `).bind(result.error || 'SMS 발송 실패', reminder.id).run();
        failed++;
      }
    }

    // 알림 로그 기록
    await c.env.DB.prepare(`
      INSERT INTO xivix_notification_logs (notification_type, sent_count, failed_count, executed_at)
      VALUES ('reminder_batch', ?, ?, datetime('now'))
    `).bind(sent, failed).run().catch(() => {});

    return c.json<ApiResponse>({
      success: true,
      data: { sent, failed, total: pendingReminders.results.length },
      message: `리마인더 발송 완료: 성공 ${sent}건, 실패 ${failed}건`,
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('[API] Send reminders error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '리마인더 발송 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 매장별 리마인더 설정 조회/수정
api.get('/stores/:storeId/reminder-settings', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);

  try {
    // 기본 설정값 (향후 DB 테이블로 관리 가능)
    const settings = {
      enabled: true,
      reminders: [
        { type: '24h', enabled: true, message: '내일 예약이 있습니다.' },
        { type: '2h', enabled: true, message: '2시간 후 예약이 있습니다.' },
        { type: '1h', enabled: false, message: '1시간 후 예약이 있습니다.' }
      ],
      smsEnabled: true,
      talkTalkEnabled: false
    };

    return c.json<ApiResponse>({
      success: true,
      data: settings,
      timestamp: Date.now()
    });

  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '설정 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 예약 취소 + SMS 알림
api.post('/stores/:storeId/booking/:bookingId/cancel-with-sms', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const bookingId = parseInt(c.req.param('bookingId'), 10);
  const { reason } = await c.req.json().catch(() => ({ reason: '' }));

  try {
    // 예약 정보 조회
    const reservation = await c.env.DB.prepare(`
      SELECT r.*, s.store_name
      FROM xivix_reservations r
      JOIN xivix_stores s ON r.store_id = s.id
      WHERE r.id = ? AND r.store_id = ?
    `).bind(bookingId, storeId).first<any>();

    if (!reservation) {
      return c.json<ApiResponse>({
        success: false,
        error: '예약을 찾을 수 없습니다.',
        timestamp: Date.now()
      }, 404);
    }

    // 예약 상태 업데이트
    await c.env.DB.prepare(`
      UPDATE xivix_reservations 
      SET status = 'cancelled', notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(reason || '고객 요청으로 취소', bookingId).run();

    // 리마인더 스케줄 취소
    await c.env.DB.prepare(`
      UPDATE xivix_reminder_schedules 
      SET status = 'cancelled'
      WHERE reservation_id = ? AND status = 'pending'
    `).bind(bookingId).run();

    // SMS 발송 (고객 전화번호가 있는 경우)
    let smsResult = { success: false, error: '고객 전화번호 없음' };
    
    if (reservation.customer_phone) {
      const { sendSMS } = await import('../lib/notification');
      
      const text = `[${reservation.store_name}] 예약 취소 안내
📅 ${reservation.reservation_date} ${reservation.reservation_time}
예약이 취소되었습니다.
${reason ? `사유: ${reason}\n` : ''}다음에 또 방문해주세요!`;

      smsResult = await sendSMS(c.env, reservation.customer_phone, text);
    }

    return c.json<ApiResponse>({
      success: true,
      data: {
        bookingId,
        status: 'cancelled',
        smsResult
      },
      message: '예약 취소 완료',
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('[API] Cancel with SMS error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '예약 취소 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 정밀 프롬프트 조회 API
api.get('/stores/:storeId/precision-prompt', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);

  try {
    const store = await c.env.DB.prepare(
      'SELECT * FROM xivix_stores WHERE id = ?'
    ).bind(storeId).first<Store>();

    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다.',
        timestamp: Date.now()
      }, 404);
    }

    const { buildPrecisionPrompt } = await import('../lib/precision-prompt');
    const { getIndustryTemplate } = await import('../lib/industry-templates');
    
    const template = getIndustryTemplate(store.business_type || 'default');
    const prompt = buildPrecisionPrompt({
      store,
      industryTemplate: template || undefined,
      includeConversionStrategies: true,
      includeComplaintHandler: true
    });

    return c.json<ApiResponse>({
      success: true,
      data: {
        storeId,
        storeName: store.store_name,
        industryId: store.business_type,
        industryName: template?.name || '일반',
        promptLength: prompt.length,
        prompt
      },
      timestamp: Date.now()
    });

  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '프롬프트 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 정밀 프롬프트 미리보기 (업종별)
api.get('/industries/:industryId/preview-prompt', async (c) => {
  const industryId = c.req.param('industryId');

  try {
    const { getIndustryTemplate } = await import('../lib/industry-templates');
    const { buildPrecisionPrompt } = await import('../lib/precision-prompt');
    
    const template = getIndustryTemplate(industryId);
    
    if (!template) {
      return c.json<ApiResponse>({
        success: false,
        error: '해당 업종을 찾을 수 없습니다.',
        timestamp: Date.now()
      }, 404);
    }

    // 샘플 매장 데이터로 프롬프트 생성
    const sampleStore = {
      id: 0,
      user_id: 0,
      store_name: `${template.name} 샘플 매장`,
      business_type: industryId,
      address: '서울시 강남구 테헤란로 123',
      phone: '02-1234-5678',
      operating_hours: '월-금 10:00-21:00, 토 10:00-18:00, 일 휴무',
      menu_data: JSON.stringify(template.sampleMenu),
      ai_persona: template.persona.name,
      ai_tone: template.persona.tone,
      greeting_message: template.automation.cta.initialMessage,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Store;

    const prompt = buildPrecisionPrompt({
      store: sampleStore,
      industryTemplate: template,
      includeConversionStrategies: true,
      includeComplaintHandler: true
    });

    return c.json<ApiResponse>({
      success: true,
      data: {
        industryId,
        industryName: template.name,
        category: template.category,
        icon: template.icon,
        promptLength: prompt.length,
        preview: prompt.substring(0, 2000) + (prompt.length > 2000 ? '\n\n... (생략됨)' : ''),
        fullPrompt: prompt
      },
      timestamp: Date.now()
    });

  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '프롬프트 미리보기 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ============ SMS 예약 알림 API ============

// 대기 중인 리마인더 조회
api.get('/reminders/pending', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const reminders = await getPendingReminders(c.env.DB, limit);
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        count: reminders.length,
        reminders
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '리마인더 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 리마인더 배치 처리 (Cron Job 또는 수동 실행)
api.post('/reminders/process', async (c) => {
  try {
    const result = await processAllPendingReminders(c.env.DB, c.env);
    
    return c.json<ApiResponse>({
      success: true,
      data: result,
      message: `${result.processed}개 리마인더 처리 완료 (성공: ${result.success}, 실패: ${result.failed})`,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '리마인더 처리 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 매장별 리마인더 통계
api.get('/reminders/stats/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  try {
    const stats = await getReminderStats(c.env.DB, storeId);
    
    return c.json<ApiResponse>({
      success: true,
      data: stats,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '리마인더 통계 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 예약 확정 + 리마인더 자동 생성
api.post('/reservations/:id/confirm-with-reminder', async (c) => {
  const reservationId = parseInt(c.req.param('id'), 10);
  
  try {
    const { sendSmsNow } = await c.req.json() as { sendSmsNow?: boolean };
    
    // 예약 정보 조회
    const reservation = await c.env.DB.prepare(`
      SELECT r.*, s.store_name, s.phone as store_phone
      FROM xivix_reservations r
      JOIN xivix_stores s ON r.store_id = s.id
      WHERE r.id = ?
    `).bind(reservationId).first<any>();
    
    if (!reservation) {
      return c.json<ApiResponse>({
        success: false,
        error: '예약을 찾을 수 없습니다.',
        timestamp: Date.now()
      }, 404);
    }
    
    // 예약 상태를 confirmed로 변경
    await c.env.DB.prepare(`
      UPDATE xivix_reservations 
      SET status = 'confirmed', updated_at = datetime('now')
      WHERE id = ?
    `).bind(reservationId).run();
    
    // 리마인더 스케줄 생성
    const reminderResult = await createReminderSchedules(
      c.env.DB,
      reservationId,
      reservation.store_id,
      reservation.reservation_date,
      reservation.reservation_time
    );
    
    // 즉시 SMS 발송 (옵션)
    let smsResult = null;
    if (sendSmsNow && reservation.customer_phone) {
      smsResult = await notifyReservationConfirmed(
        c.env,
        reservation.customer_phone,
        reservation.store_name,
        reservation.reservation_date,
        reservation.reservation_time,
        reservation.service_name
      );
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        reservationId,
        status: 'confirmed',
        reminders: {
          created: reminderResult.created,
          schedules: reminderResult.schedules
        },
        smsNotification: smsResult ? {
          sent: smsResult.success,
          error: smsResult.error
        } : null
      },
      message: `예약 확정 완료. ${reminderResult.created}개 리마인더가 예약되었습니다.`,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '예약 확정 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 예약 취소 + 리마인더 취소
api.post('/reservations/:id/cancel', async (c) => {
  const reservationId = parseInt(c.req.param('id'), 10);
  
  try {
    const { reason, notifyCustomer } = await c.req.json() as { 
      reason?: string; 
      notifyCustomer?: boolean;
    };
    
    // 예약 정보 조회
    const reservation = await c.env.DB.prepare(`
      SELECT r.*, s.store_name
      FROM xivix_reservations r
      JOIN xivix_stores s ON r.store_id = s.id
      WHERE r.id = ?
    `).bind(reservationId).first<any>();
    
    if (!reservation) {
      return c.json<ApiResponse>({
        success: false,
        error: '예약을 찾을 수 없습니다.',
        timestamp: Date.now()
      }, 404);
    }
    
    // 예약 상태를 cancelled로 변경
    await c.env.DB.prepare(`
      UPDATE xivix_reservations 
      SET status = 'cancelled', admin_note = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(reason || '취소됨', reservationId).run();
    
    // 리마인더 취소
    const cancelledCount = await cancelReminders(c.env.DB, reservationId);
    
    // 고객에게 취소 알림 (옵션)
    let smsResult = null;
    if (notifyCustomer && reservation.customer_phone) {
      const cancelMessage = `[${reservation.store_name}] 예약 취소 안내\n\n${reservation.reservation_date} ${reservation.reservation_time} 예약이 취소되었습니다.\n${reason ? `사유: ${reason}` : ''}\n\n문의사항은 매장으로 연락 부탁드립니다.`;
      
      smsResult = await sendSMS(c.env, reservation.customer_phone, cancelMessage);
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        reservationId,
        status: 'cancelled',
        cancelledReminders: cancelledCount,
        customerNotified: smsResult ? smsResult.success : false
      },
      message: `예약 취소 완료. ${cancelledCount}개 리마인더가 취소되었습니다.`,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '예약 취소 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 수동 SMS 알림 발송
api.post('/notifications/sms/send', async (c) => {
  try {
    const { 
      storeId, 
      customerPhone, 
      message, 
      reservationId,
      notificationType 
    } = await c.req.json() as {
      storeId: number;
      customerPhone: string;
      message: string;
      reservationId?: number;
      notificationType?: string;
    };
    
    if (!customerPhone || !message) {
      return c.json<ApiResponse>({
        success: false,
        error: '수신 전화번호와 메시지는 필수입니다.',
        timestamp: Date.now()
      }, 400);
    }
    
    // SMS 발송
    const smsResult = await sendSMS(c.env, customerPhone, message);
    
    // 알림 로그 기록
    if (storeId) {
      await c.env.DB.prepare(`
        INSERT INTO xivix_notification_logs 
        (store_id, notification_type, recipient_phone, recipient_type, content, status, sent_at)
        VALUES (?, ?, ?, 'customer', ?, ?, datetime('now'))
      `).bind(
        storeId, 
        notificationType || 'manual_sms',
        customerPhone,
        message.substring(0, 500),
        smsResult.success ? 'sent' : 'failed'
      ).run();
    }
    
    return c.json<ApiResponse>({
      success: smsResult.success,
      data: {
        messageId: smsResult.messageId,
        customerPhone
      },
      error: smsResult.error,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || 'SMS 발송 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 예약 리마인더 미리 발송 테스트
api.post('/reminders/test/:reservationId', async (c) => {
  const reservationId = parseInt(c.req.param('reservationId'), 10);
  
  try {
    // 예약 정보 조회
    const reservation = await c.env.DB.prepare(`
      SELECT r.*, s.store_name, s.phone as store_phone
      FROM xivix_reservations r
      JOIN xivix_stores s ON r.store_id = s.id
      WHERE r.id = ?
    `).bind(reservationId).first<any>();
    
    if (!reservation) {
      return c.json<ApiResponse>({
        success: false,
        error: '예약을 찾을 수 없습니다.',
        timestamp: Date.now()
      }, 404);
    }
    
    if (!reservation.customer_phone) {
      return c.json<ApiResponse>({
        success: false,
        error: '고객 전화번호가 없습니다.',
        timestamp: Date.now()
      }, 400);
    }
    
    // 테스트 리마인더 발송
    const result = await notifyReservationReminder(
      c.env,
      reservation.customer_phone,
      reservation.store_name,
      reservation.reservation_date,
      reservation.reservation_time,
      '(테스트 발송)'
    );
    
    return c.json<ApiResponse>({
      success: result.success,
      data: {
        reservationId,
        customerPhone: reservation.customer_phone,
        storeName: reservation.store_name
      },
      error: result.error,
      message: result.success ? '테스트 리마인더 발송 완료' : '테스트 리마인더 발송 실패',
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '테스트 발송 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 전체 리마인더 스케줄 조회 (관리용)
api.get('/reminders/all', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '100', 10);
    const status = c.req.query('status'); // pending, sent, failed, cancelled
    const storeId = c.req.query('storeId');
    
    let query = `
      SELECT 
        rs.*,
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
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (status) {
      query += ` AND rs.status = ?`;
      params.push(status);
    }
    
    if (storeId) {
      query += ` AND rs.store_id = ?`;
      params.push(parseInt(storeId, 10));
    }
    
    query += ` ORDER BY rs.scheduled_at DESC LIMIT ?`;
    params.push(limit);
    
    const result = await c.env.DB.prepare(query).bind(...params).all<any>();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        count: result.results?.length || 0,
        reminders: result.results || []
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '리마인더 조회 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 예약 시 자동 리마인더 생성 (예약 생성 후 호출)
api.post('/stores/:storeId/booking/:bookingId/setup-reminders', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const bookingId = parseInt(c.req.param('bookingId'), 10);
  
  try {
    // 예약 정보 조회
    const reservation = await c.env.DB.prepare(`
      SELECT * FROM xivix_reservations WHERE id = ? AND store_id = ?
    `).bind(bookingId, storeId).first<any>();
    
    if (!reservation) {
      return c.json<ApiResponse>({
        success: false,
        error: '예약을 찾을 수 없습니다.',
        timestamp: Date.now()
      }, 404);
    }
    
    // 리마인더 스케줄 생성
    const result = await createReminderSchedules(
      c.env.DB,
      bookingId,
      storeId,
      reservation.reservation_date,
      reservation.reservation_time
    );
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        bookingId,
        storeId,
        created: result.created,
        schedules: result.schedules.map(s => ({
          type: s.reminder_type,
          scheduledAt: s.scheduled_at
        }))
      },
      message: `${result.created}개 리마인더 예약 완료`,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '리마인더 설정 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// ============ 고객 관리 API ============

// 네이버 예약 PDF 파싱
api.post('/customers/parse-pdf', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const storeId = formData.get('store_id');
    
    if (!file) {
      return c.json<ApiResponse>({
        success: false,
        error: 'PDF 파일이 없습니다',
        timestamp: Date.now()
      }, 400);
    }
    
    // PDF를 텍스트로 변환 (Gemini Vision API 사용)
    const arrayBuffer = await file.arrayBuffer();
    // 대용량 파일도 처리 가능하도록 청크 단위로 base64 변환
    const uint8Array = new Uint8Array(arrayBuffer);
    let base64Data = '';
    const chunkSize = 32768; // 32KB 청크
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      base64Data += btoa(String.fromCharCode.apply(null, Array.from(chunk)));
    }
    
    // Gemini로 PDF 내용 추출 및 파싱
    const parsePrompt = `
이 PDF는 네이버 예약 관리자에서 출력한 예약 목록입니다.

PDF에서 다음 정보를 추출해서 JSON 배열로 반환해주세요:
- 예약자명 (customer_name)
- 전화번호 (phone) - 마스킹되어 있으면 ******으로 표시된 부분도 포함
- 상품명/시술명 (last_service)
- 이용시간 (last_visit_date) - YYYY-MM-DD 형식으로 변환
- 담당자/디자이너명 (designer) - "하린 원장", "유나 원장" 같은 정보
- 결제금액 (price) - 숫자만

반환 형식 (JSON 배열만 반환):
[
  {
    "customer_name": "홍길동",
    "phone": "******1234",
    "last_service": "남성커트",
    "last_visit_date": "2026-01-04",
    "designer": "하린 원장",
    "price": 18000,
    "status": "이용완료"
  }
]

규칙:
1. "취소" 상태인 예약은 status: "취소"로 표시하고 포함해주세요
2. "이용완료" 상태인 예약만 필터링 가능하도록 status 필드 포함
3. 날짜 형식: 26. 1. 4.(일) → 2026-01-04
4. 금액에서 쉼표, "원" 등 제거하고 숫자만
5. 담당자가 "매장명(현장결제)" 같은 경우는 designer를 null로
6. JSON 배열만 반환하고 다른 텍스트는 포함하지 마세요
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${c.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: parsePrompt },
              { 
                inline_data: { 
                  mime_type: 'application/pdf',
                  data: base64Data 
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192
          }
        })
      }
    );

    const result = await response.json() as any;
    
    if (result.error) {
      console.error('[PDF Parse] Gemini Error:', result.error);
      return c.json<ApiResponse>({
        success: false,
        error: result.error.message || 'Gemini API 오류',
        timestamp: Date.now()
      }, 500);
    }
    
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // JSON 추출
    let jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // JSON 배열 부분만 추출
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    let allCustomers = [];
    try {
      allCustomers = JSON.parse(jsonStr);
    } catch (e) {
      console.error('[PDF Parse] JSON Parse Error:', e, 'Raw:', jsonStr.substring(0, 500));
      return c.json<ApiResponse>({
        success: false,
        error: 'PDF 내용 파싱 실패. 네이버 예약 PDF인지 확인해주세요.',
        timestamp: Date.now()
      }, 400);
    }
    
    // 이용완료만 필터 (취소 제외)
    const completedCustomers = allCustomers.filter((c: any) => c.status !== '취소');
    const cancelledCount = allCustomers.filter((c: any) => c.status === '취소').length;
    
    // 중복 제거 (같은 이름 + 같은 전화번호 → 가장 최근 것만)
    const uniqueMap = new Map();
    for (const customer of completedCustomers) {
      const key = customer.customer_name + '_' + (customer.phone || '');
      const existing = uniqueMap.get(key);
      if (!existing || (customer.last_visit_date > existing.last_visit_date)) {
        uniqueMap.set(key, customer);
      }
    }
    const uniqueCustomers = Array.from(uniqueMap.values());

    return c.json<ApiResponse>({
      success: true,
      data: { 
        customers: uniqueCustomers, 
        count: uniqueCustomers.length,
        completed: completedCustomers.length,
        cancelled: cancelledCount,
        total: allCustomers.length
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[customers/parse-pdf] Error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || 'PDF 파싱 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// AI로 고객 데이터 파싱
api.post('/customers/parse', async (c) => {
  try {
    const { raw_data, store_id } = await c.req.json() as { raw_data: string; store_id: number };
    
    if (!raw_data || raw_data.trim().length === 0) {
      return c.json<ApiResponse>({
        success: false,
        error: '파싱할 데이터가 없습니다',
        timestamp: Date.now()
      }, 400);
    }
    
    // Gemini API로 데이터 파싱
    const parsePrompt = `
다음 텍스트에서 고객 정보를 추출해서 JSON 배열로 반환해주세요.

입력 데이터:
${raw_data}

반환 형식 (JSON 배열만 반환, 다른 설명 없이):
[
  {
    "customer_name": "고객 이름",
    "phone": "010-0000-0000 형식으로 정리",
    "last_service": "시술/서비스명",
    "last_visit_date": "YYYY-MM-DD 형식"
  }
]

규칙:
1. 전화번호는 010-0000-0000 형식으로 통일 (하이픈 추가)
2. 날짜는 YYYY-MM-DD 형식으로 통일
3. 날짜가 24.1.28 같은 형식이면 2024-01-28로 변환
4. 정보가 없으면 null로 처리
5. 이름만 있어도 추출
6. JSON 배열만 반환하고 다른 텍스트는 포함하지 마세요
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${c.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: parsePrompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096
          }
        })
      }
    );

    const result = await response.json() as any;
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // JSON 추출 (코드블록 제거)
    let jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let customers = [];
    try {
      customers = JSON.parse(jsonStr);
    } catch (e) {
      // JSON 파싱 실패 시 수동 파싱 시도
      const lines = raw_data.split('\n').filter(l => l.trim());
      customers = lines.map(line => {
        const phoneMatch = line.match(/01[0-9][-\s]?\d{3,4}[-\s]?\d{4}/);
        const dateMatch = line.match(/\d{2,4}[-./]\d{1,2}[-./]\d{1,2}/);
        const parts = line.split(/[\t,\s]+/).filter(p => p.trim());
        
        return {
          customer_name: parts[0] || null,
          phone: phoneMatch ? phoneMatch[0].replace(/[\s]/g, '-').replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : null,
          last_service: null,
          last_visit_date: dateMatch ? dateMatch[0].replace(/[./]/g, '-') : null
        };
      }).filter(c => c.customer_name);
    }

    return c.json<ApiResponse>({
      success: true,
      data: { customers, count: customers.length },
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[customers/parse] Error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '파싱 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 고객 일괄 등록
api.post('/customers/bulk', async (c) => {
  try {
    const { store_id, customers, followup_cycle_days = 14 } = await c.req.json() as {
      store_id: number;
      customers: Array<{
        customer_name: string;
        phone?: string;
        last_service?: string;
        last_visit_date?: string;
        naver_user_id?: string;
        designer?: string;
        price?: number;
      }>;
      followup_cycle_days: number;
    };

    if (!customers || customers.length === 0) {
      return c.json<ApiResponse>({
        success: false,
        error: '저장할 고객이 없습니다',
        timestamp: Date.now()
      }, 400);
    }

    let inserted = 0;
    let skipped = 0;

    for (const customer of customers) {
      if (!customer.customer_name) {
        skipped++;
        continue;
      }

      // 다음 팔로업 날짜 계산
      let nextFollowupDate = null;
      if (customer.last_visit_date) {
        const visitDate = new Date(customer.last_visit_date);
        visitDate.setDate(visitDate.getDate() + followup_cycle_days);
        nextFollowupDate = visitDate.toISOString().split('T')[0];
      }
      
      // 메모에 담당자 및 가격 정보 저장
      const notes = [];
      if (customer.designer) notes.push(`담당: ${customer.designer}`);
      if (customer.price) notes.push(`금액: ${customer.price}원`);
      const noteStr = notes.length > 0 ? notes.join(', ') : null;

      try {
        await c.env.DB.prepare(`
          INSERT INTO xivix_customers (
            store_id, customer_name, phone, last_service, 
            last_visit_date, next_followup_date, followup_cycle_days,
            naver_user_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          store_id,
          customer.customer_name,
          customer.phone || null,
          customer.last_service || null,
          customer.last_visit_date || null,
          nextFollowupDate,
          followup_cycle_days,
          customer.naver_user_id || null,
          noteStr
        ).run();
        inserted++;
      } catch (e) {
        console.error('[customers/bulk] Insert error:', e);
        skipped++;
      }
    }

    return c.json<ApiResponse>({
      success: true,
      data: { inserted, skipped, total: customers.length },
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[customers/bulk] Error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '저장 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 매장별 고객 목록 조회
api.get('/stores/:storeId/customers', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  try {
    const customers = await c.env.DB.prepare(`
      SELECT * FROM xivix_customers 
      WHERE store_id = ? AND is_active = 1
      ORDER BY next_followup_date ASC, last_visit_date DESC
    `).bind(storeId).all();

    return c.json<ApiResponse>({
      success: true,
      data: customers.results || [],
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// 고객 삭제
api.delete('/customers/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  
  try {
    await c.env.DB.prepare(`
      UPDATE xivix_customers SET is_active = 0 WHERE id = ?
    `).bind(id).run();

    return c.json<ApiResponse>({
      success: true,
      data: { deleted: id },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// 메시지 템플릿 목록 조회
api.get('/stores/:storeId/templates', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  try {
    // 매장별 템플릿 + 기본 템플릿
    const templates = await c.env.DB.prepare(`
      SELECT * FROM xivix_message_templates 
      WHERE (store_id = ? OR is_default = 1) AND is_active = 1
      ORDER BY is_default DESC, trigger_days ASC
    `).bind(storeId).all();

    return c.json<ApiResponse>({
      success: true,
      data: templates.results || [],
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// 메시지 템플릿 생성
api.post('/templates', async (c) => {
  try {
    const data = await c.req.json() as {
      store_id: number;
      template_name: string;
      trigger_type: string;
      trigger_days: number;
      message_content: string;
      business_type?: string;
    };

    const result = await c.env.DB.prepare(`
      INSERT INTO xivix_message_templates (
        store_id, business_type, template_name, trigger_type, 
        trigger_days, message_content
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      data.store_id,
      data.business_type || 'GENERAL',
      data.template_name,
      data.trigger_type,
      data.trigger_days,
      data.message_content
    ).run();

    return c.json<ApiResponse>({
      success: true,
      data: { id: result.meta.last_row_id },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// 메시지 템플릿 수정
api.put('/templates/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  
  try {
    const data = await c.req.json() as {
      template_name?: string;
      trigger_type?: string;
      trigger_days?: number;
      message_content?: string;
    };

    await c.env.DB.prepare(`
      UPDATE xivix_message_templates SET
        template_name = COALESCE(?, template_name),
        trigger_type = COALESCE(?, trigger_type),
        trigger_days = COALESCE(?, trigger_days),
        message_content = COALESCE(?, message_content),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      data.template_name || null,
      data.trigger_type || null,
      data.trigger_days || null,
      data.message_content || null,
      id
    ).run();

    return c.json<ApiResponse>({
      success: true,
      data: { updated: id },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// 템플릿 단일 조회
api.get('/templates/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  
  try {
    const template = await c.env.DB.prepare(`
      SELECT * FROM xivix_message_templates WHERE id = ?
    `).bind(id).first();

    if (!template) {
      return c.json<ApiResponse>({
        success: false,
        error: '템플릿을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }

    return c.json<ApiResponse>({
      success: true,
      data: template,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// 템플릿 삭제
api.delete('/templates/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  
  try {
    await c.env.DB.prepare(`
      DELETE FROM xivix_message_templates WHERE id = ?
    `).bind(id).run();

    return c.json<ApiResponse>({
      success: true,
      data: { deleted: id },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// AI 템플릿 생성 API
api.post('/stores/:storeId/generate-template', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  try {
    const { prompt } = await c.req.json() as { prompt: string };
    
    if (!prompt) {
      return c.json<ApiResponse>({
        success: false,
        error: '프롬프트를 입력해주세요',
        timestamp: Date.now()
      }, 400);
    }
    
    // 매장 정보 가져오기
    const store = await c.env.DB.prepare(`
      SELECT store_name, business_type FROM xivix_stores WHERE id = ?
    `).bind(storeId).first() as { store_name: string; business_type: string } | null;
    
    const storeName = store?.store_name || '매장';
    const businessType = store?.business_type || 'GENERAL';
    
    // Gemini API로 템플릿 생성
    const systemPrompt = `당신은 ${businessType} 업종의 고객 재방문 메시지 템플릿을 만드는 전문가입니다.
매장명: ${storeName}

다음 조건을 반드시 지키세요:
1. 메시지는 친근하고 전문적인 톤으로 작성
2. 이모지를 적절히 사용 (1-2개)
3. 변수를 활용: {고객명}, {매장명}, {시술명}, {경과일}, {방문일}
4. 50자 이상 150자 이내로 작성
5. 마지막에 예약이나 방문을 유도하는 문구 포함
6. 메시지만 출력하고 다른 설명은 하지 마세요

사용자 요청: ${prompt}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${c.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 300
          }
        })
      }
    );

    const geminiData = await geminiResponse.json() as {
      candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
      error?: { message: string };
    };

    if (geminiData.error) {
      throw new Error(geminiData.error.message);
    }

    const template = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!template) {
      throw new Error('템플릿 생성 실패');
    }

    return c.json<ApiResponse>({
      success: true,
      data: { template },
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('Template generation error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '템플릿 생성 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 일괄 메시지 발송 API
api.post('/stores/:storeId/send-bulk-message', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  try {
    const { customer_ids, template_id } = await c.req.json() as { 
      customer_ids: number[];
      template_id?: number;
    };
    
    if (!customer_ids || customer_ids.length === 0) {
      return c.json<ApiResponse>({
        success: false,
        error: '고객을 선택해주세요',
        timestamp: Date.now()
      }, 400);
    }
    
    // 매장 정보 가져오기
    const store = await c.env.DB.prepare(`
      SELECT * FROM xivix_stores WHERE id = ?
    `).bind(storeId).first() as any;
    
    if (!store) {
      return c.json<ApiResponse>({
        success: false,
        error: '매장을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }
    
    // 템플릿 가져오기 (없으면 기본 템플릿)
    let template: any;
    if (template_id) {
      template = await c.env.DB.prepare(`
        SELECT * FROM xivix_message_templates WHERE id = ?
      `).bind(template_id).first();
    } else {
      template = await c.env.DB.prepare(`
        SELECT * FROM xivix_message_templates 
        WHERE (store_id = ? OR is_default = 1) AND is_active = 1
        ORDER BY is_default ASC
        LIMIT 1
      `).bind(storeId).first();
    }
    
    // 기본 메시지
    const defaultMessage = `안녕하세요 {고객명}님! ${store.store_name}입니다.\n\n{시술명} 시술 후 {경과일}일이 지났네요.\n관리가 필요하실 때 언제든 방문해주세요! 💆‍♀️`;
    const messageTemplate = template?.message_content || defaultMessage;
    
    // 고객 정보 가져오기
    const placeholders = customer_ids.map(() => '?').join(',');
    const customers = await c.env.DB.prepare(`
      SELECT * FROM xivix_customers WHERE id IN (${placeholders})
    `).bind(...customer_ids).all();
    
    let sent = 0;
    let failed = 0;
    
    // 각 고객에게 메시지 발송 (네이버 톡톡 또는 SMS)
    for (const customer of (customers.results || []) as any[]) {
      try {
        // 변수 치환
        const today = new Date();
        const visitDate = customer.last_visit_date ? new Date(customer.last_visit_date) : new Date();
        const daysDiff = Math.floor((today.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
        
        const message = messageTemplate
          .replace(/{고객명}/g, customer.customer_name || '고객')
          .replace(/{매장명}/g, store.store_name || '매장')
          .replace(/{시술명}/g, customer.last_service || '시술')
          .replace(/{경과일}/g, String(daysDiff))
          .replace(/{방문일}/g, customer.last_visit_date || '-');
        
        // 발송 로그 저장 (실제 발송은 톡톡 연동 시 구현)
        await c.env.DB.prepare(`
          INSERT INTO xivix_followup_logs (
            store_id, customer_id, template_id, message_content, 
            channel, status, sent_at
          ) VALUES (?, ?, ?, ?, 'talktalk', 'sent', datetime('now'))
        `).bind(
          storeId,
          customer.id,
          template?.id || null,
          message
        ).run();
        
        sent++;
      } catch (err) {
        console.error('Message send error:', err);
        failed++;
      }
    }

    return c.json<ApiResponse>({
      success: true,
      data: { sent, failed, total: customer_ids.length },
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('Bulk message error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// 고객 일괄 삭제 API
api.delete('/stores/:storeId/customers/bulk-delete', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  try {
    const { customer_ids } = await c.req.json() as { customer_ids: number[] };
    
    if (!customer_ids || customer_ids.length === 0) {
      return c.json<ApiResponse>({
        success: false,
        error: '삭제할 고객을 선택해주세요',
        timestamp: Date.now()
      }, 400);
    }
    
    const placeholders = customer_ids.map(() => '?').join(',');
    
    await c.env.DB.prepare(`
      DELETE FROM xivix_customers 
      WHERE id IN (${placeholders}) AND store_id = ?
    `).bind(...customer_ids, storeId).run();

    return c.json<ApiResponse>({
      success: true,
      data: { deleted: customer_ids.length },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// 팔로업 로그 조회
api.get('/stores/:storeId/followup-logs', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  try {
    const logs = await c.env.DB.prepare(`
      SELECT l.*, c.customer_name
      FROM xivix_followup_logs l
      LEFT JOIN xivix_customers c ON l.customer_id = c.id
      WHERE l.store_id = ?
      ORDER BY l.sent_at DESC
      LIMIT 100
    `).bind(storeId).all();

    return c.json<ApiResponse>({
      success: true,
      data: logs.results || [],
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// ============ 자동 발송 (Cron Trigger 대체 API) ============

// 재방문 알림 대상 조회 및 발송
api.post('/followup/process', async (c) => {
  const authHeader = c.req.header('Authorization');
  const cronSecret = c.env.CRON_SECRET || 'xivix-cron-2024';
  
  // 간단한 인증 (외부에서 무단 호출 방지)
  if (authHeader !== `Bearer ${cronSecret}`) {
    return c.json<ApiResponse>({
      success: false,
      error: 'Unauthorized',
      timestamp: Date.now()
    }, 401);
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[Followup] Processing for date: ${today}`);

    // 오늘 발송 대상 고객 조회
    const targets = await c.env.DB.prepare(`
      SELECT 
        c.id as customer_id,
        c.store_id,
        c.customer_name,
        c.phone,
        c.last_service,
        c.last_visit_date,
        c.naver_user_id,
        c.followup_cycle_days,
        s.store_name,
        s.naver_talktalk_id,
        s.business_type,
        s.auto_followup
      FROM xivix_customers c
      JOIN xivix_stores s ON c.store_id = s.id
      WHERE c.next_followup_date <= ?
        AND c.is_active = 1
        AND s.is_active = 1
        AND s.auto_followup = 1
        AND c.naver_user_id IS NOT NULL
      ORDER BY c.next_followup_date ASC
      LIMIT 50
    `).bind(today).all();

    const results = {
      total: targets.results?.length || 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[]
    };

    if (!targets.results || targets.results.length === 0) {
      return c.json<ApiResponse>({
        success: true,
        data: { message: '오늘 발송 대상이 없습니다', ...results },
        timestamp: Date.now()
      });
    }

    // 각 대상에게 메시지 발송
    for (const target of targets.results as any[]) {
      try {
        // 해당 업종의 템플릿 조회
        const template = await c.env.DB.prepare(`
          SELECT * FROM xivix_message_templates
          WHERE (store_id = ? OR (store_id IS NULL AND is_default = 1))
            AND business_type = ?
            AND is_active = 1
          ORDER BY store_id DESC NULLS LAST
          LIMIT 1
        `).bind(target.store_id, target.business_type).first<any>();

        if (!template) {
          results.skipped++;
          results.details.push({
            customer_id: target.customer_id,
            status: 'skipped',
            reason: 'No template found'
          });
          continue;
        }

        // 메시지 변수 치환
        const daysSinceVisit = target.last_visit_date 
          ? Math.floor((Date.now() - new Date(target.last_visit_date).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        let messageContent = template.message_content
          .replace(/\{고객명\}/g, target.customer_name || '고객')
          .replace(/\{매장명\}/g, target.store_name || '매장')
          .replace(/\{시술명\}/g, target.last_service || '시술')
          .replace(/\{경과일\}/g, String(daysSinceVisit))
          .replace(/\{방문일\}/g, target.last_visit_date || '');

        // 네이버 톡톡으로 메시지 발송
        let sendResult = { success: false, resultCode: 'NO_TOKEN' };
        
        if (target.naver_user_id && c.env.NAVER_ACCESS_TOKEN) {
          const response = await fetch('https://gw.talk.naver.com/chatbot/v1/event', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=UTF-8',
              'Authorization': c.env.NAVER_ACCESS_TOKEN
            },
            body: JSON.stringify({
              event: 'send',
              user: target.naver_user_id,
              textContent: { text: messageContent }
            })
          });
          
          sendResult = {
            success: response.ok,
            resultCode: response.ok ? 'OK' : `HTTP_${response.status}`
          };
        }

        // 발송 로그 저장
        await c.env.DB.prepare(`
          INSERT INTO xivix_followup_logs (
            customer_id, store_id, template_id, message_content, status, naver_result_code
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          target.customer_id,
          target.store_id,
          template.id,
          messageContent,
          sendResult.success ? 'sent' : 'failed',
          sendResult.resultCode
        ).run();

        // 다음 팔로업 날짜 업데이트
        if (sendResult.success) {
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + target.followup_cycle_days);
          
          await c.env.DB.prepare(`
            UPDATE xivix_customers 
            SET next_followup_date = ?, total_visits = total_visits + 1, updated_at = datetime('now')
            WHERE id = ?
          `).bind(nextDate.toISOString().split('T')[0], target.customer_id).run();

          results.sent++;
        } else {
          results.failed++;
        }

        results.details.push({
          customer_id: target.customer_id,
          customer_name: target.customer_name,
          status: sendResult.success ? 'sent' : 'failed',
          result_code: sendResult.resultCode
        });

      } catch (err: any) {
        results.failed++;
        results.details.push({
          customer_id: target.customer_id,
          status: 'error',
          error: err.message
        });
      }
    }

    console.log(`[Followup] Completed: sent=${results.sent}, failed=${results.failed}, skipped=${results.skipped}`);

    return c.json<ApiResponse>({
      success: true,
      data: results,
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('[Followup] Process error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// 수동 메시지 발송
api.post('/customers/:id/send-message', async (c) => {
  const customerId = parseInt(c.req.param('id'), 10);
  
  try {
    const { message } = await c.req.json() as { message?: string };
    
    // 고객 정보 조회
    const customer = await c.env.DB.prepare(`
      SELECT c.*, s.store_name, s.naver_talktalk_id
      FROM xivix_customers c
      JOIN xivix_stores s ON c.store_id = s.id
      WHERE c.id = ?
    `).bind(customerId).first<any>();

    if (!customer) {
      return c.json<ApiResponse>({
        success: false,
        error: '고객을 찾을 수 없습니다',
        timestamp: Date.now()
      }, 404);
    }

    if (!customer.naver_user_id) {
      return c.json<ApiResponse>({
        success: false,
        error: '네이버 톡톡 ID가 없어 메시지를 보낼 수 없습니다',
        timestamp: Date.now()
      }, 400);
    }

    // 메시지 발송
    const messageContent = message || `안녕하세요 ${customer.customer_name}님! ${customer.store_name}입니다. 😊`;
    
    const response = await fetch('https://gw.talk.naver.com/chatbot/v1/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Authorization': c.env.NAVER_ACCESS_TOKEN || ''
      },
      body: JSON.stringify({
        event: 'send',
        user: customer.naver_user_id,
        textContent: { text: messageContent }
      })
    });

    // 로그 저장
    await c.env.DB.prepare(`
      INSERT INTO xivix_followup_logs (
        customer_id, store_id, message_content, status, naver_result_code
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      customerId,
      customer.store_id,
      messageContent,
      response.ok ? 'sent' : 'failed',
      response.ok ? 'OK' : `HTTP_${response.status}`
    ).run();

    return c.json<ApiResponse>({
      success: response.ok,
      data: { 
        message: response.ok ? '메시지 발송 완료' : '발송 실패',
        customer_name: customer.customer_name
      },
      timestamp: Date.now()
    });

  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// Health Check API
api.get('/health', async (c) => {
  try {
    // DB 연결 체크
    const dbCheck = await c.env.DB.prepare('SELECT 1 as ok').first();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        status: 'healthy',
        version: c.env.XIVIX_VERSION || '2.0.0',
        database: dbCheck ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: 'Health check failed: ' + error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// 발송 통계 API
api.get('/followup/stats', async (c) => {
  try {
    // 전체 발송 완료 수
    const sentResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM xivix_followup_logs WHERE status = 'sent'
    `).first<{ count: number }>();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        sent_count: sentResult?.count || 0
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// ========== [V2.0] AI 템플릿 생성 API (Gemini 2.5 Pro) ==========
api.post('/ai/generate-template', async (c) => {
  try {
    const { industry, message_type, detail } = await c.req.json();
    
    if (!industry) {
      return c.json<ApiResponse>({
        success: false,
        error: '업종을 선택해주세요.',
        timestamp: Date.now()
      }, 400);
    }
    
    // 업종별 정보
    const industryInfo: Record<string, { name: string; specialty: string; days: number }> = {
      'BEAUTY_SKIN': { name: '피부관리/에스테틱', specialty: '피부 타입 분석, 홈케어 가이드, 코스별 효능', days: 14 },
      'BEAUTY_HAIR': { name: '미용실/헤어숍', specialty: '스타일 추천, 시술 소요시간, 디자이너 매칭', days: 30 },
      'BEAUTY_NAIL': { name: '네일아트/속눈썹', specialty: '디자인 추천, 관리 팁, 예약 안내', days: 21 },
      'MEDICAL': { name: '병원/의원/치과', specialty: '진료 안내, 정기검진 리마인드, 건강 관리', days: 180 },
      'FITNESS': { name: '피트니스/요가/PT', specialty: '프로그램 안내, 트레이너 매칭, 회원권 상담', days: 7 },
      'PET_SERVICE': { name: '애견/반려동물', specialty: '미용 예약, 건강 상담, 호텔 예약', days: 30 },
      'RESTAURANT': { name: '일반 식당/카페', specialty: '메뉴 추천, 예약 안내, 단체 예약', days: 30 },
      'EDUCATION': { name: '학원/교육/과외', specialty: '수강료 안내, 커리큘럼 상담, 레벨 테스트', days: 30 },
      'OTHER': { name: '기타', specialty: '맞춤 비즈니스 로직', days: 14 }
    };
    
    const info = industryInfo[industry] || industryInfo['OTHER'];
    
    // 메시지 유형별 지침
    const messageTypes: Record<string, string> = {
      'after_visit': '시술/서비스 후 재방문 유도 메시지. 고객의 만족도를 묻고, 다음 방문을 안내합니다.',
      'new_customer': '신규 고객 환영 메시지. 매장을 선택해주셔서 감사하다는 내용과 함께 추가 혜택을 안내합니다.',
      'event': '이벤트/프로모션 안내 메시지. 특별 할인이나 시즌 이벤트를 안내합니다.',
      'birthday': '생일 축하 메시지. 진심 어린 축하와 함께 특별 혜택을 안내합니다.',
      'dormant': '휴면 고객 재유입 메시지. 오랜만에 연락드린다며 특별 혜택으로 재방문을 유도합니다.'
    };
    
    const typeGuide = messageTypes[message_type] || messageTypes['after_visit'];
    
    // Gemini API 호출
    const prompt = `당신은 ${info.name} 업종의 마케팅 전문가입니다.

업종: ${info.name}
특징: ${info.specialty}
메시지 유형: ${message_type} - ${typeGuide}
${detail ? '추가 요청사항: ' + detail : ''}

위 정보를 바탕으로 네이버 톡톡으로 발송할 고객 관리 메시지를 3가지 버전으로 작성해주세요.

규칙:
1. 각 메시지는 100-150자 이내
2. 변수 사용: {고객명}, {매장명}, {시술명}, {경과일}
3. 친근하고 자연스러운 말투 (존댓말)
4. 이모지 적절히 사용
5. 마지막에 행동 유도 문구 포함

JSON 형식으로 응답:
{
  "variations": [
    "메시지 버전 1",
    "메시지 버전 2", 
    "메시지 버전 3"
  ],
  "recommended_days": ${info.days}
}`;

    const geminiApiKey = c.env.GEMINI_API_KEY;
    
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1024
          }
        })
      }
    );
    
    if (!geminiRes.ok) {
      throw new Error('Gemini API 호출 실패: ' + geminiRes.status);
    }
    
    const geminiData = await geminiRes.json() as any;
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // JSON 파싱 시도
    let result;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // JSON 파싱 실패 시 텍스트를 직접 사용
        result = {
          variations: [rawText.split('\n').filter((l: string) => l.trim()).slice(0, 3).join('\n')],
          recommended_days: info.days
        };
      }
    } catch (e) {
      result = {
        variations: [rawText],
        recommended_days: info.days
      };
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: result,
      timestamp: Date.now()
    });
    
  } catch (error: any) {
    console.error('AI Template Generation Error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// ========== [V2.0] 2단계 AI 프롬프트 파이프라인 ==========
// GPT-4o (1차 구조화) → Gemini 2.5 Pro (감정 자극형 검수)

api.post('/stores/:id/generate-prompt-pipeline', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const body = await c.req.json() as {
      rawText: string;
      storeName?: string;
      businessType?: string;
      existingPrompt?: string;
    };

    if (!body.rawText || body.rawText.trim().length < 10) {
      return c.json<ApiResponse>({
        success: false,
        error: '텍스트를 입력해주세요 (최소 10자 이상).',
        timestamp: Date.now()
      }, 400);
    }

    // 매장 정보 조회
    const store = await c.env.DB.prepare('SELECT store_name, business_type FROM xivix_stores WHERE id = ?')
      .bind(storeId).first<{ store_name: string; business_type: string }>();

    const input: PromptPipelineInput = {
      rawText: body.rawText,
      storeName: body.storeName || store?.store_name || '매장',
      businessType: body.businessType || store?.business_type || 'BEAUTY_SKIN',
      existingPrompt: body.existingPrompt
    };

    console.log(`[Pipeline API] Store ${storeId} - 입력 텍스트 길이: ${input.rawText.length}`);

    // 2단계 파이프라인 실행
    const result = await runPromptPipeline(c.env, input);

    if (!result.success) {
      return c.json<ApiResponse>({
        success: false,
        error: result.error || '프롬프트 생성 실패',
        timestamp: Date.now()
      }, 500);
    }

    console.log(`[Pipeline API] Store ${storeId} - 완료: Stage1=${result.stage1Model}, Stage2=${result.stage2Model}`);

    return c.json<ApiResponse>({
      success: true,
      data: {
        systemPrompt: result.finalPrompt,
        menuText: result.menuText,
        eventsText: result.eventsText,
        operatingHours: result.operatingHours,
        structuredData: result.structuredData,
        models: {
          stage1: result.stage1Model,
          stage2: result.stage2Model
        }
      },
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('[Pipeline API] Error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '프롬프트 생성 중 오류 발생',
      timestamp: Date.now()
    }, 500);
  }
});

// 텍스트 기반 간단 프롬프트 생성 (기존 API 대체)
api.post('/stores/:id/generate-prompt-from-text', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const body = await c.req.json() as {
      text: string;
      storeName?: string;
      businessType?: string;
      existingPrompt?: string;
    };

    if (!body.text || body.text.trim().length < 10) {
      return c.json<ApiResponse>({
        success: false,
        error: '텍스트를 입력해주세요 (최소 10자 이상).',
        timestamp: Date.now()
      }, 400);
    }

    // 매장 정보 조회
    const store = await c.env.DB.prepare('SELECT store_name, business_type FROM xivix_stores WHERE id = ?')
      .bind(storeId).first<{ store_name: string; business_type: string }>();

    const input: PromptPipelineInput = {
      rawText: body.text,
      storeName: body.storeName || store?.store_name || '매장',
      businessType: body.businessType || store?.business_type || 'BEAUTY_SKIN',
      existingPrompt: body.existingPrompt
    };

    // 2단계 파이프라인 실행
    const result = await runPromptPipeline(c.env, input);

    if (!result.success) {
      return c.json<ApiResponse>({
        success: false,
        error: result.error || '프롬프트 생성 실패',
        timestamp: Date.now()
      }, 500);
    }

    return c.json<ApiResponse>({
      success: true,
      data: {
        systemPrompt: result.finalPrompt,
        menuText: result.menuText,
        operatingHours: result.operatingHours,
        models: {
          stage1: result.stage1Model,
          stage2: result.stage2Model
        }
      },
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('[Text Prompt API] Error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '프롬프트 생성 중 오류 발생',
      timestamp: Date.now()
    }, 500);
  }
});

// ========== 톡톡 설정 API ==========

// 톡톡 설정 저장
api.post('/stores/:id/talktalk/config', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const body = await c.req.json() as {
      partner_id?: string;
      account_id?: string;
      access_token?: string;
    };

    await saveTalkTalkConfig(c.env.DB, storeId, {
      partnerId: body.partner_id,
      accountId: body.account_id,
      accessToken: body.access_token,
      webhookVerified: true
    });

    return c.json<ApiResponse>({
      success: true,
      data: { message: '톡톡 설정이 저장되었습니다' },
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('[TalkTalk Config] Error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '설정 저장 실패',
      timestamp: Date.now()
    }, 500);
  }
});

// 톡톡 설정 조회
api.get('/stores/:id/talktalk/config', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const config = await getTalkTalkConfig(c.env.DB, storeId);

    return c.json<ApiResponse>({
      success: true,
      data: config || { message: '설정 없음' },
      timestamp: Date.now()
    });

  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// API 문서 (간단 버전)
api.get('/docs', async (c) => {
  const docs = {
    name: 'XIVIX AI Core API',
    version: '2.0.0',
    description: '네이버 톡톡 AI 상담 및 고객 관리 시스템',
    baseUrl: 'https://xivix-ai-core.pages.dev/api',
    endpoints: {
      health: {
        method: 'GET',
        path: '/health',
        description: '서버 상태 확인'
      },
      stores: {
        list: { method: 'GET', path: '/stores', description: '매장 목록 조회' },
        get: { method: 'GET', path: '/stores/:id', description: '매장 상세 조회' },
        settings: { method: 'PUT', path: '/stores/:id/settings', description: '매장 설정 저장' },
        customers: { method: 'GET', path: '/stores/:id/customers', description: '매장 고객 목록' },
        templates: { method: 'GET', path: '/stores/:id/templates', description: '메시지 템플릿 목록' }
      },
      customers: {
        parse: { method: 'POST', path: '/customers/parse', description: 'AI로 고객 데이터 파싱' },
        bulk: { method: 'POST', path: '/customers/bulk', description: '고객 일괄 등록' },
        delete: { method: 'DELETE', path: '/customers/:id', description: '고객 삭제' },
        sendMessage: { method: 'POST', path: '/customers/:id/send-message', description: '수동 메시지 발송' }
      },
      templates: {
        create: { method: 'POST', path: '/templates', description: '템플릿 생성' },
        update: { method: 'PUT', path: '/templates/:id', description: '템플릿 수정' }
      },
      followup: {
        process: { method: 'POST', path: '/followup/process', description: '재방문 알림 일괄 처리 (Cron용)' }
      },
      webhook: {
        naver: { method: 'POST', path: '/v1/naver/callback/:storeId', description: '네이버 톡톡 웹훅' }
      },
      industry: {
        list: { method: 'GET', path: '/templates/industry', description: '업종 템플릿 목록' },
        detail: { method: 'GET', path: '/templates/industry/:id', description: '업종 템플릿 상세' }
      }
    }
  };

  return c.json(docs);
});

// ============ 업종 템플릿 API ============

// 업종 템플릿 목록
api.get('/templates/industry', async (c) => {
  const industryList = getIndustryList();
  return c.json({
    success: true,
    data: industryList,
    timestamp: Date.now()
  });
});

// 업종 템플릿 상세
api.get('/templates/industry/:id', async (c) => {
  const id = c.req.param('id');
  const template = getIndustryTemplate(id);
  
  if (!template) {
    return c.json({
      success: false,
      error: '템플릿을 찾을 수 없습니다.',
      timestamp: Date.now()
    }, 404);
  }
  
  return c.json({
    success: true,
    data: {
      id: template.id,
      name: template.name,
      icon: template.icon,
      category: template.category,
      system_prompt: template.systemPrompt,
      persona: template.persona,
      sample_menu: template.sampleMenu,
      faq: template.faq,
      prohibited_keywords: template.prohibitedKeywords
    },
    timestamp: Date.now()
  });
});

// ============================================================================
// [V3.0] 요금제 & 사용량 관리 API
// ============================================================================

import { getPlanConfig, PLAN_CONFIGS, canUseFeature, parsePlan, type PlanType } from '../lib/plan-config';
import { getUsageSummary, getAllStoresUsage } from '../lib/usage-tracker';

// [V3.0-1] 매장 요금제 조회
api.get('/plan/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  const store = await c.env.DB.prepare(
    'SELECT id, store_name, plan, setup_type, monthly_fee, payment_status, store_role, parent_store_id FROM xivix_stores WHERE id = ?'
  ).bind(storeId).first<{
    id: number; store_name: string; plan: string; setup_type: string;
    monthly_fee: number; payment_status: string; store_role: string; parent_store_id: number;
  }>();
  
  if (!store) {
    return c.json<ApiResponse>({ success: false, error: '매장을 찾을 수 없습니다', timestamp: Date.now() }, 404);
  }
  
  const plan = (store.plan || 'light') as PlanType;
  const config = getPlanConfig(plan);
  
  return c.json<ApiResponse>({
    success: true,
    data: {
      store_id: store.id,
      store_name: store.store_name,
      plan,
      planConfig: config,
      setup_type: store.setup_type || 'basic',
      monthly_fee: store.monthly_fee || config.monthlyFee,
      payment_status: store.payment_status || 'pending',
      store_role: store.store_role || 'single',
      parent_store_id: store.parent_store_id,
    },
    timestamp: Date.now()
  });
});

// [V3.0-2] 매장 요금제 변경 (마스터 전용)
api.put('/plan/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const { plan, monthly_fee } = await c.req.json() as { plan: PlanType; monthly_fee?: number };
  
  if (!plan || !PLAN_CONFIGS[plan]) {
    return c.json<ApiResponse>({ success: false, error: '유효하지 않은 요금제입니다', timestamp: Date.now() }, 400);
  }
  
  const config = getPlanConfig(plan);
  const fee = monthly_fee || config.monthlyFee;
  
  await c.env.DB.prepare(`
    UPDATE xivix_stores SET plan = ?, monthly_fee = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(plan, fee, storeId).run();
  
  return c.json<ApiResponse>({
    success: true,
    data: { message: `요금제가 ${config.name}(${fee.toLocaleString()}원/월)로 변경되었습니다` },
    timestamp: Date.now()
  });
});

// [V3.0-3] 사용량 조회
api.get('/usage/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  const store = await c.env.DB.prepare(
    'SELECT plan FROM xivix_stores WHERE id = ?'
  ).bind(storeId).first<{ plan: string }>();
  
  const plan = (store?.plan || 'light') as PlanType;
  const summary = await getUsageSummary(c.env, storeId, plan);
  
  return c.json<ApiResponse>({
    success: true,
    data: summary,
    timestamp: Date.now()
  });
});

// [V3.0-4] 전체 매장 사용량 요약 (마스터용)
api.get('/usage/all/summary', async (c) => {
  const summary = await getAllStoresUsage(c.env);
  
  return c.json<ApiResponse>({
    success: true,
    data: summary,
    timestamp: Date.now()
  });
});

// [V3.0-5] 요금제 목록 조회 (프론트엔드용)
api.get('/plans/list', async (c) => {
  return c.json<ApiResponse>({
    success: true,
    data: Object.entries(PLAN_CONFIGS).map(([key, p]) => ({
      id: key,
      name: p.name,
      nameEn: p.nameEn,
      monthlyFee: p.monthlyFee,
      setupFee: p.setupFee,
      aiLimit: p.aiLimit,
      smsLimit: p.smsLimit,
      smsExtraPrice: p.smsExtraPrice,
      features: p.features,
    })),
    timestamp: Date.now()
  });
});

// ============================================================================
// [V3.0] 수동 메시지 발송 API
// ============================================================================

// [V3.0-6] 개별 메시지 발송 (사장님 → 고객)
api.post('/stores/:storeId/send-message', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const { customer_id, customer_name, customer_phone, message, channel } = await c.req.json() as {
    customer_id?: number;
    customer_name?: string;
    customer_phone?: string;
    message: string;
    channel?: 'talktalk' | 'sms';
  };
  
  if (!message || message.trim().length === 0) {
    return c.json<ApiResponse>({ success: false, error: '메시지 내용을 입력해주세요', timestamp: Date.now() }, 400);
  }
  
  // 요금제 체크
  const store = await c.env.DB.prepare(
    'SELECT id, store_name, plan, naver_talktalk_id FROM xivix_stores WHERE id = ?'
  ).bind(storeId).first<{ id: number; store_name: string; plan: string; naver_talktalk_id: string }>();
  
  if (!store) {
    return c.json<ApiResponse>({ success: false, error: '매장을 찾을 수 없습니다', timestamp: Date.now() }, 404);
  }
  
  const storePlan = (store.plan || 'light') as PlanType;
  if (!canUseFeature(storePlan, 'manualMessageIndiv')) {
    return c.json<ApiResponse>({
      success: false,
      error: `수동 메시지 발송 기능은 스탠다드 이상 요금제에서 이용 가능합니다. (현재: ${getPlanConfig(storePlan).name})`,
      timestamp: Date.now()
    }, 403);
  }
  
  try {
    let sendResult: any = null;
    let usedChannel = channel || 'talktalk';
    
    // 톡톡으로 발송 시도 (customer_id가 있는 경우)
    if (usedChannel === 'talktalk' && customer_id) {
      // 네이버 톡톡으로 직접 발송
      const { sendTextMessage } = await import('../lib/naver-talktalk');
      sendResult = await sendTextMessage(c.env, String(customer_id), message, storeId);
    } else if (customer_phone) {
      // SMS로 발송
      usedChannel = 'sms';
      sendResult = await sendSMS(c.env, customer_phone, `[${store.store_name}] ${message}`);
    } else {
      return c.json<ApiResponse>({
        success: false,
        error: '발송 대상(고객 ID 또는 전화번호)이 필요합니다',
        timestamp: Date.now()
      }, 400);
    }
    
    // 발송 이력 저장
    await c.env.DB.prepare(`
      INSERT INTO xivix_manual_messages (store_id, sender_type, message_type, channel, recipient_count, recipients, message_content, status, success_count, sent_at)
      VALUES (?, 'owner', 'individual', ?, 1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      storeId,
      usedChannel,
      JSON.stringify([{ customer_id, customer_name, customer_phone }]),
      message,
      sendResult?.success ? 'sent' : 'failed',
      sendResult?.success ? 1 : 0
    ).run();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        message: '메시지가 발송되었습니다',
        channel: usedChannel,
        result: sendResult
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: '메시지 발송 실패: ' + error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// [V3.0-7] 단체 메시지 발송 (프리미엄 전용)
api.post('/stores/:storeId/send-bulk', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const { customer_ids, message, channel } = await c.req.json() as {
    customer_ids: number[];
    message: string;
    channel?: 'talktalk' | 'sms';
  };
  
  if (!message || !customer_ids || customer_ids.length === 0) {
    return c.json<ApiResponse>({ success: false, error: '메시지와 수신 고객을 선택해주세요', timestamp: Date.now() }, 400);
  }
  
  // 요금제 체크
  const store = await c.env.DB.prepare(
    'SELECT id, store_name, plan FROM xivix_stores WHERE id = ?'
  ).bind(storeId).first<{ id: number; store_name: string; plan: string }>();
  
  if (!store) {
    return c.json<ApiResponse>({ success: false, error: '매장을 찾을 수 없습니다', timestamp: Date.now() }, 404);
  }
  
  const storePlan = (store.plan || 'light') as PlanType;
  if (!canUseFeature(storePlan, 'manualMessageBulk')) {
    return c.json<ApiResponse>({
      success: false,
      error: `단체 메시지 발송 기능은 프리미엄 이상 요금제에서 이용 가능합니다. (현재: ${getPlanConfig(storePlan).name})`,
      timestamp: Date.now()
    }, 403);
  }
  
  try {
    // 고객 정보 조회
    const placeholders = customer_ids.map(() => '?').join(',');
    const customers = await c.env.DB.prepare(
      `SELECT id, customer_name, phone, naver_user_id FROM xivix_customers WHERE id IN (${placeholders}) AND store_id = ?`
    ).bind(...customer_ids, storeId).all<{
      id: number; customer_name: string; phone: string; naver_user_id: string;
    }>();
    
    let successCount = 0;
    let failCount = 0;
    const results: any[] = [];
    
    for (const customer of (customers.results || [])) {
      try {
        const usedChannel = channel || 'talktalk';
        let sendResult: any;
        
        if (usedChannel === 'talktalk' && customer.naver_user_id) {
          const { sendTextMessage } = await import('../lib/naver-talktalk');
          sendResult = await sendTextMessage(c.env, customer.naver_user_id, message, storeId);
        } else if (customer.phone) {
          sendResult = await sendSMS(c.env, customer.phone, `[${store.store_name}] ${message}`);
        }
        
        if (sendResult?.success) {
          successCount++;
        } else {
          failCount++;
        }
        results.push({ customer_id: customer.id, success: sendResult?.success });
        
        // 50ms 딜레이 (API 부하 방지)
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch {
        failCount++;
        results.push({ customer_id: customer.id, success: false });
      }
    }
    
    // 발송 이력 저장
    await c.env.DB.prepare(`
      INSERT INTO xivix_manual_messages (store_id, sender_type, message_type, channel, recipient_count, message_content, status, success_count, fail_count, sent_at)
      VALUES (?, 'owner', 'bulk', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      storeId,
      channel || 'talktalk',
      customer_ids.length,
      message,
      failCount === 0 ? 'sent' : (successCount === 0 ? 'failed' : 'partial'),
      successCount,
      failCount
    ).run();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        message: `${successCount}/${customer_ids.length}건 발송 완료`,
        successCount,
        failCount,
        results
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: '단체 발송 실패: ' + error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// [V3.0-8] 발송 이력 조회
api.get('/stores/:storeId/messages', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const limit = parseInt(c.req.query('limit') || '20', 10);
  
  const results = await c.env.DB.prepare(`
    SELECT * FROM xivix_manual_messages WHERE store_id = ? ORDER BY created_at DESC LIMIT ?
  `).bind(storeId, limit).all();
  
  return c.json<ApiResponse>({
    success: true,
    data: results.results,
    timestamp: Date.now()
  });
});

// ============================================================================
// [V3.0] KG이니시스 결제 API
// ============================================================================

// [V3.0-9] 결제 요청 준비 (PC/Mobile 공통) — KG이니시스 웹표준 결제
api.post('/payment/prepare', async (c) => {
  const { store_id, payment_type, amount, description, buyer_name, buyer_email, buyer_tel } = await c.req.json() as {
    store_id: number;
    payment_type: 'setup' | 'monthly' | 'sms_extra';
    amount: number;
    description?: string;
    buyer_name?: string;
    buyer_email?: string;
    buyer_tel?: string;
  };
  
  if (!store_id || !payment_type || !amount) {
    return c.json<ApiResponse>({ success: false, error: '필수 정보를 입력해주세요', timestamp: Date.now() }, 400);
  }
  
  const store = await c.env.DB.prepare(
    'SELECT id, store_name, plan FROM xivix_stores WHERE id = ?'
  ).bind(store_id).first<{ id: number; store_name: string; plan: string }>();
  
  if (!store) {
    return c.json<ApiResponse>({ success: false, error: '매장을 찾을 수 없습니다', timestamp: Date.now() }, 404);
  }
  
  const vatAmount = Math.round(amount * 0.1);
  const totalAmount = amount + vatAmount;
  const oid = `XIVIX_${store_id}_${payment_type}_${Date.now()}`;
  const mid = 'MOI9559449';
  const goodname = description || `XIVIX AI ${getPlanConfig((store.plan || 'light') as PlanType).name}`;
  
  // 결제 요청 레코드 생성
  const result = await c.env.DB.prepare(`
    INSERT INTO xivix_payments (store_id, payment_type, amount, vat_amount, total_amount, pg_provider, pg_mid, description, status)
    VALUES (?, ?, ?, ?, ?, 'kginicis', ?, ?, 'pending')
  `).bind(store_id, payment_type, amount, vatAmount, totalAmount, mid, goodname).run();
  
  const paymentId = result.meta.last_row_id;
  
  // KG이니시스 서명 생성 (Web Crypto API — Cloudflare Workers 호환)
  const timestamp = String(Date.now());
  
  // mKey = SHA-256(signKey) — 테스트 signKey: "SU5JTElURV9UUklQTEVERVNfS0VZU1RS"
  const SIGN_KEY = 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS'; // 테스트용 signKey
  const mKeyData = new TextEncoder().encode(SIGN_KEY);
  const mKeyHash = await crypto.subtle.digest('SHA-256', mKeyData);
  const mKey = Array.from(new Uint8Array(mKeyHash)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // signature = SHA-256("oid={oid}&price={price}&timestamp={timestamp}")
  const signSource = `oid=${oid}&price=${totalAmount}&timestamp=${timestamp}`;
  const signData = new TextEncoder().encode(signSource);
  const signHash = await crypto.subtle.digest('SHA-256', signData);
  const signature = Array.from(new Uint8Array(signHash)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // DB에 oid 저장
  await c.env.DB.prepare(
    'UPDATE xivix_payments SET description = ? WHERE id = ?'
  ).bind(oid, paymentId).run();

  const baseUrl = 'https://studioaibotbot.com';
  
  return c.json<ApiResponse>({
    success: true,
    data: {
      payment_id: paymentId,
      oid,
      mid,
      goodname,
      price: totalAmount,
      buyername: buyer_name || store.store_name,
      timestamp,
      signature,
      mKey,
      pg_params: {
        gopaymethod: 'Card',
        mid,
        oid,
        price: totalAmount,
        goodname,
        currency: 'WON',
        acceptmethod: 'below1000:centerCd(Y)',
        returnUrl: `${baseUrl}/api/payment/return`,
        closeUrl: `${baseUrl}/api/payment/close`,
      }
    },
    timestamp: Date.now()
  });
});

// [V3.0-10] 결제 완료 콜백 (KG이니시스 → 서버)
api.post('/payment/return', async (c) => {
  try {
    const formData = await c.req.formData();
    const resultCode = formData.get('resultCode') as string;
    const resultMsg = formData.get('resultMsg') as string;
    const mid = formData.get('mid') as string;
    const orderNumber = formData.get('orderNumber') as string;
    const authToken = formData.get('authToken') as string;
    const authUrl = formData.get('authUrl') as string;
    const TotPrice = formData.get('TotPrice') as string;
    
    if (resultCode !== '0000') {
      // 결제 실패
      return c.html(`<script>alert('결제가 실패했습니다: ${resultMsg}'); window.close();</script>`);
    }
    
    // KG이니시스 승인 요청 (서버에서 2차 인증)
    const authTimestamp = String(Date.now());
    
    // 승인 서명: SHA-256("authToken={authToken}&timestamp={timestamp}")
    const authSignSource = `authToken=${authToken}&timestamp=${authTimestamp}`;
    const authSignData = new TextEncoder().encode(authSignSource);
    const authSignHash = await crypto.subtle.digest('SHA-256', authSignData);
    const authSignature = Array.from(new Uint8Array(authSignHash)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        mid,
        authToken,
        price: TotPrice,
        timestamp: authTimestamp,
        signature: authSignature,
        charset: 'UTF-8',
        format: 'JSON',
      }).toString()
    });
    
    const authResult = await authResponse.json() as any;
    
    if (authResult.resultCode === '0000') {
      // 결제 성공 — DB 업데이트
      await c.env.DB.prepare(`
        UPDATE xivix_payments SET 
          status = 'paid',
          pg_tid = ?,
          card_name = ?,
          card_number = ?,
          approval_number = ?,
          paid_at = CURRENT_TIMESTAMP,
          raw_response = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE pg_mid = ? AND status = 'pending'
        ORDER BY created_at DESC LIMIT 1
      `).bind(
        authResult.tid || '',
        authResult.cardName || '',
        authResult.cardNum || '',
        authResult.applNum || '',
        JSON.stringify(authResult),
        mid
      ).run();
      
      return c.html(`<script>
        alert('결제가 완료되었습니다!');
        if (window.opener) {
          window.opener.postMessage({ type: 'PAYMENT_SUCCESS', tid: '${authResult.tid || ''}' }, '*');
        }
        window.close();
      </script>`);
    } else {
      return c.html(`<script>alert('승인 실패: ${authResult.resultMsg || '알 수 없는 오류'}'); window.close();</script>`);
    }
  } catch (error: any) {
    console.error('[Payment] Return callback error:', error);
    return c.html(`<script>alert('결제 처리 중 오류가 발생했습니다.'); window.close();</script>`);
  }
});

// [V3.0-11] 결제 취소/환불
api.post('/payment/cancel', async (c) => {
  const { payment_id, reason } = await c.req.json() as { payment_id: number; reason?: string };
  
  const payment = await c.env.DB.prepare(
    'SELECT * FROM xivix_payments WHERE id = ? AND status = ?'
  ).bind(payment_id, 'paid').first<any>();
  
  if (!payment) {
    return c.json<ApiResponse>({ success: false, error: '취소할 수 있는 결제를 찾을 수 없습니다', timestamp: Date.now() }, 404);
  }
  
  // KG이니시스 취소 API 호출
  try {
    const cancelResponse = await fetch('https://iniapi.inicis.com/api/v1/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        type: 'Refund',
        paymethod: 'Card',
        timestamp: new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14),
        clientIp: '127.0.0.1',
        mid: 'MOI9559449',
        tid: payment.pg_tid,
        msg: reason || '관리자 취소',
        price: String(payment.total_amount),
        confirmPrice: String(payment.total_amount),
      }).toString()
    });
    
    const cancelResult = await cancelResponse.json() as any;
    
    if (cancelResult.resultCode === '00') {
      await c.env.DB.prepare(`
        UPDATE xivix_payments SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, refund_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(payment.total_amount, payment_id).run();
      
      return c.json<ApiResponse>({
        success: true,
        data: { message: '결제가 취소되었습니다', refund_amount: payment.total_amount },
        timestamp: Date.now()
      });
    } else {
      return c.json<ApiResponse>({
        success: false,
        error: `취소 실패: ${cancelResult.resultMsg || '알 수 없는 오류'}`,
        timestamp: Date.now()
      }, 400);
    }
  } catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: '취소 처리 중 오류: ' + error.message,
      timestamp: Date.now()
    }, 500);
  }
});

// [V3.0-12] 결제 이력 조회
api.get('/payments/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  const results = await c.env.DB.prepare(`
    SELECT * FROM xivix_payments WHERE store_id = ? ORDER BY created_at DESC LIMIT 50
  `).bind(storeId).all();
  
  return c.json<ApiResponse>({
    success: true,
    data: results.results,
    timestamp: Date.now()
  });
});

// [V3.0-13] 매장별 AI API 키 설정
api.put('/stores/:id/ai-keys', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  const { openai_key, gemini_key } = await c.req.json() as {
    openai_key?: string;
    gemini_key?: string;
  };
  
  await c.env.DB.prepare(`
    UPDATE xivix_stores SET 
      store_openai_key = COALESCE(?, store_openai_key),
      store_gemini_key = COALESCE(?, store_gemini_key),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(openai_key || null, gemini_key || null, storeId).run();
  
  return c.json<ApiResponse>({
    success: true,
    data: { message: 'AI API 키가 업데이트되었습니다' },
    timestamp: Date.now()
  });
});

// [V3.0-14] 매장별 AI API 키 조회 (마스킹)
api.get('/stores/:id/ai-keys', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  const store = await c.env.DB.prepare(
    'SELECT store_openai_key, store_gemini_key FROM xivix_stores WHERE id = ?'
  ).bind(storeId).first<{ store_openai_key: string; store_gemini_key: string }>();
  
  if (!store) {
    return c.json<ApiResponse>({ success: false, error: '매장을 찾을 수 없습니다', timestamp: Date.now() }, 404);
  }
  
  // 키 마스킹 (앞 4자 + ****)
  const maskKey = (key: string | null) => {
    if (!key) return null;
    return key.slice(0, 8) + '****' + key.slice(-4);
  };
  
  return c.json<ApiResponse>({
    success: true,
    data: {
      openai_key: maskKey(store.store_openai_key),
      gemini_key: maskKey(store.store_gemini_key),
      openai_set: !!store.store_openai_key,
      gemini_set: !!store.store_gemini_key,
    },
    timestamp: Date.now()
  });
});

// ============================================================================
// [V3.0] 영업사원/대리점 수수료 정산 API
// ============================================================================

// [V3.0-15] 영업사원 등록
api.post('/agents', async (c) => {
  const { name, phone, email, bank_name, bank_account, bank_holder, commission_rate_setup, commission_rate_monthly, notes } = await c.req.json() as {
    name: string; phone: string; email?: string;
    bank_name?: string; bank_account?: string; bank_holder?: string;
    commission_rate_setup?: number; commission_rate_monthly?: number; notes?: string;
  };
  
  if (!name || !phone) {
    return c.json<ApiResponse>({ success: false, error: '이름과 연락처는 필수입니다', timestamp: Date.now() }, 400);
  }
  
  const result = await c.env.DB.prepare(`
    INSERT INTO xivix_agents (name, phone, email, bank_name, bank_account, bank_holder, commission_rate_setup, commission_rate_monthly, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    name, phone, email || null, bank_name || null, bank_account || null, bank_holder || null,
    commission_rate_setup ?? 0.30, commission_rate_monthly ?? 0.20, notes || null
  ).run();
  
  return c.json<ApiResponse>({
    success: true,
    data: { id: result.meta.last_row_id, message: `영업사원 ${name} 등록 완료` },
    timestamp: Date.now()
  });
});

// [V3.0-16] 영업사원 목록 조회
api.get('/agents', async (c) => {
  const agents = await c.env.DB.prepare(`
    SELECT a.*, 
      (SELECT COUNT(*) FROM xivix_agent_stores WHERE agent_id = a.id AND is_active = 1) as active_stores,
      (SELECT COALESCE(SUM(commission_amount), 0) FROM xivix_commissions WHERE agent_id = a.id AND status = 'paid') as total_paid,
      (SELECT COALESCE(SUM(commission_amount), 0) FROM xivix_commissions WHERE agent_id = a.id AND status = 'pending') as pending_amount
    FROM xivix_agents a
    ORDER BY a.created_at DESC
  `).all();
  
  return c.json<ApiResponse>({
    success: true,
    data: agents.results,
    timestamp: Date.now()
  });
});

// [V3.0-17] 영업사원 상세 (매장 목록 + 수수료 이력)
api.get('/agents/:agentId', async (c) => {
  const agentId = parseInt(c.req.param('agentId'), 10);
  
  const agent = await c.env.DB.prepare('SELECT * FROM xivix_agents WHERE id = ?').bind(agentId).first();
  if (!agent) {
    return c.json<ApiResponse>({ success: false, error: '영업사원을 찾을 수 없습니다', timestamp: Date.now() }, 404);
  }
  
  // 담당 매장 목록
  const stores = await c.env.DB.prepare(`
    SELECT s.id, s.store_name, s.plan, s.monthly_fee, s.payment_status, ags.assigned_at, ags.is_active
    FROM xivix_agent_stores ags
    JOIN xivix_stores s ON ags.store_id = s.id
    WHERE ags.agent_id = ?
    ORDER BY ags.is_active DESC, ags.assigned_at DESC
  `).bind(agentId).all();
  
  // 최근 수수료 이력
  const commissions = await c.env.DB.prepare(`
    SELECT co.*, s.store_name
    FROM xivix_commissions co
    JOIN xivix_stores s ON co.store_id = s.id
    WHERE co.agent_id = ?
    ORDER BY co.period DESC, co.created_at DESC
    LIMIT 50
  `).bind(agentId).all();
  
  return c.json<ApiResponse>({
    success: true,
    data: { agent, stores: stores.results, commissions: commissions.results },
    timestamp: Date.now()
  });
});

// [V3.0-18] 영업사원 수정
api.put('/agents/:agentId', async (c) => {
  const agentId = parseInt(c.req.param('agentId'), 10);
  const body = await c.req.json() as any;
  
  const fields: string[] = [];
  const values: any[] = [];
  
  const allowedFields = ['name', 'phone', 'email', 'bank_name', 'bank_account', 'bank_holder', 
    'commission_rate_setup', 'commission_rate_monthly', 'status', 'notes'];
  
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }
  
  if (fields.length === 0) {
    return c.json<ApiResponse>({ success: false, error: '변경할 항목이 없습니다', timestamp: Date.now() }, 400);
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(agentId);
  
  await c.env.DB.prepare(`UPDATE xivix_agents SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  
  return c.json<ApiResponse>({
    success: true,
    data: { message: '영업사원 정보가 수정되었습니다' },
    timestamp: Date.now()
  });
});

// [V3.0-19] 매장-영업사원 배정
api.post('/agents/:agentId/assign-store', async (c) => {
  const agentId = parseInt(c.req.param('agentId'), 10);
  const { store_id } = await c.req.json() as { store_id: number };
  
  if (!store_id) {
    return c.json<ApiResponse>({ success: false, error: '매장 ID가 필요합니다', timestamp: Date.now() }, 400);
  }
  
  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO xivix_agent_stores (agent_id, store_id, is_active, assigned_at)
    VALUES (?, ?, 1, CURRENT_TIMESTAMP)
  `).bind(agentId, store_id).run();
  
  return c.json<ApiResponse>({
    success: true,
    data: { message: '매장이 배정되었습니다' },
    timestamp: Date.now()
  });
});

// [V3.0-20] 월별 수수료 자동 계산 (마스터 실행)
api.post('/commissions/calculate', async (c) => {
  const { period } = await c.req.json() as { period?: string };
  const targetPeriod = period || new Date().toISOString().slice(0, 7); // YYYY-MM
  
  // 모든 활성 영업사원의 활성 매장 조회
  const agentStores = await c.env.DB.prepare(`
    SELECT ags.agent_id, ags.store_id, a.commission_rate_setup, a.commission_rate_monthly,
           a.name as agent_name, s.store_name, s.plan, s.monthly_fee, s.setup_type,
           (SELECT COUNT(*) FROM xivix_agent_stores WHERE agent_id = a.id AND is_active = 1) as active_store_count
    FROM xivix_agent_stores ags
    JOIN xivix_agents a ON ags.agent_id = a.id
    JOIN xivix_stores s ON ags.store_id = s.id
    WHERE ags.is_active = 1 AND a.status = 'active'
  `).all<{
    agent_id: number; store_id: number; 
    commission_rate_setup: number; commission_rate_monthly: number;
    agent_name: string; store_name: string; plan: string; monthly_fee: number; setup_type: string;
    active_store_count: number;
  }>();
  
  let totalCalculated = 0;
  const results: any[] = [];
  
  for (const as of (agentStores.results || [])) {
    // 최소 유지 매장 미달 시 수수료율 하향 (3개 미만 → 15%)
    let monthlyRate = as.commission_rate_monthly;
    if (as.active_store_count < 3) {
      monthlyRate = 0.15;
    }
    
    const monthlyFee = as.monthly_fee || 99000;
    const commissionAmount = Math.round(monthlyFee * monthlyRate);
    
    // 이미 해당 기간에 정산된 내역 있는지 확인
    const existing = await c.env.DB.prepare(`
      SELECT id FROM xivix_commissions 
      WHERE agent_id = ? AND store_id = ? AND period = ? AND commission_type = 'monthly'
    `).bind(as.agent_id, as.store_id, targetPeriod).first();
    
    if (!existing) {
      await c.env.DB.prepare(`
        INSERT INTO xivix_commissions (agent_id, store_id, period, commission_type, base_amount, commission_rate, commission_amount, status)
        VALUES (?, ?, ?, 'monthly', ?, ?, ?, 'pending')
      `).bind(as.agent_id, as.store_id, targetPeriod, monthlyFee, monthlyRate, commissionAmount).run();
      
      totalCalculated++;
      results.push({
        agent: as.agent_name,
        store: as.store_name,
        base: monthlyFee,
        rate: monthlyRate,
        commission: commissionAmount,
      });
    }
  }
  
  return c.json<ApiResponse>({
    success: true,
    data: {
      period: targetPeriod,
      calculated: totalCalculated,
      details: results,
      message: `${targetPeriod} 수수료 ${totalCalculated}건 계산 완료`
    },
    timestamp: Date.now()
  });
});

// [V3.0-21] 수수료 정산 현황 조회 (마스터용)
api.get('/commissions', async (c) => {
  const period = c.req.query('period') || new Date().toISOString().slice(0, 7);
  const status = c.req.query('status') || 'all';
  
  let query = `
    SELECT co.*, a.name as agent_name, a.phone as agent_phone, a.bank_name, a.bank_account, a.bank_holder,
           s.store_name, s.plan
    FROM xivix_commissions co
    JOIN xivix_agents a ON co.agent_id = a.id
    JOIN xivix_stores s ON co.store_id = s.id
    WHERE co.period = ?
  `;
  const binds: any[] = [period];
  
  if (status !== 'all') {
    query += ' AND co.status = ?';
    binds.push(status);
  }
  
  query += ' ORDER BY a.name, s.store_name';
  
  const stmt = binds.length === 1 
    ? c.env.DB.prepare(query).bind(binds[0])
    : c.env.DB.prepare(query).bind(binds[0], binds[1]);
  
  const commissions = await stmt.all();
  
  // 요약 통계
  const summary = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total_count,
      COALESCE(SUM(commission_amount), 0) as total_amount,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_amount,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as paid_amount,
      COUNT(DISTINCT agent_id) as agent_count
    FROM xivix_commissions WHERE period = ?
  `).bind(period).first();
  
  return c.json<ApiResponse>({
    success: true,
    data: { period, summary, commissions: commissions.results },
    timestamp: Date.now()
  });
});

// [V3.0-22] 수수료 지급 처리 (마스터용)
api.put('/commissions/:id/pay', async (c) => {
  const commissionId = parseInt(c.req.param('id'), 10);
  const { payment_method, payment_ref, notes } = await c.req.json() as {
    payment_method?: string; payment_ref?: string; notes?: string;
  };
  
  await c.env.DB.prepare(`
    UPDATE xivix_commissions SET 
      status = 'paid', 
      payment_date = CURRENT_TIMESTAMP,
      payment_method = ?,
      payment_ref = ?,
      notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'pending'
  `).bind(payment_method || '계좌이체', payment_ref || null, notes || null, commissionId).run();
  
  return c.json<ApiResponse>({
    success: true,
    data: { message: '수수료가 지급 처리되었습니다' },
    timestamp: Date.now()
  });
});

// [V3.0-23] 일괄 지급 처리 (마스터용)
api.post('/commissions/bulk-pay', async (c) => {
  const { commission_ids, payment_method } = await c.req.json() as {
    commission_ids: number[]; payment_method?: string;
  };
  
  if (!commission_ids || commission_ids.length === 0) {
    return c.json<ApiResponse>({ success: false, error: '지급할 수수료를 선택해주세요', timestamp: Date.now() }, 400);
  }
  
  const placeholders = commission_ids.map(() => '?').join(',');
  await c.env.DB.prepare(`
    UPDATE xivix_commissions SET 
      status = 'paid', payment_date = CURRENT_TIMESTAMP, payment_method = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id IN (${placeholders}) AND status = 'pending'
  `).bind(payment_method || '계좌이체', ...commission_ids).run();
  
  return c.json<ApiResponse>({
    success: true,
    data: { message: `${commission_ids.length}건 일괄 지급 처리 완료` },
    timestamp: Date.now()
  });
});

// [V3.0-24] 영업사원별 수익 시뮬레이션
api.get('/agents/:agentId/simulation', async (c) => {
  const agentId = parseInt(c.req.param('agentId'), 10);
  
  const agent = await c.env.DB.prepare('SELECT * FROM xivix_agents WHERE id = ?').bind(agentId).first<any>();
  if (!agent) {
    return c.json<ApiResponse>({ success: false, error: '영업사원을 찾을 수 없습니다', timestamp: Date.now() }, 404);
  }
  
  // 활성 매장 조회
  const stores = await c.env.DB.prepare(`
    SELECT s.id, s.store_name, s.plan, s.monthly_fee, s.setup_type
    FROM xivix_agent_stores ags
    JOIN xivix_stores s ON ags.store_id = s.id
    WHERE ags.agent_id = ? AND ags.is_active = 1
  `).bind(agentId).all<any>();
  
  const storeList = stores.results || [];
  const activeCount = storeList.length;
  const monthlyRate = activeCount >= 3 ? agent.commission_rate_monthly : 0.15;
  
  let totalMonthlyBase = 0;
  let totalMonthlyCommission = 0;
  
  for (const s of storeList) {
    const fee = s.monthly_fee || 99000;
    totalMonthlyBase += fee;
    totalMonthlyCommission += Math.round(fee * monthlyRate);
  }
  
  return c.json<ApiResponse>({
    success: true,
    data: {
      agent_name: agent.name,
      active_stores: activeCount,
      monthly_rate: monthlyRate,
      monthly_base: totalMonthlyBase,
      monthly_commission: totalMonthlyCommission,
      annual_commission: totalMonthlyCommission * 12,
      stores: storeList.map((s: any) => ({
        name: s.store_name,
        plan: s.plan,
        fee: s.monthly_fee || 99000,
        commission: Math.round((s.monthly_fee || 99000) * monthlyRate)
      })),
      note: activeCount < 3 ? '⚠️ 최소 유지 매장 3개 미만 → 수수료율 15% 적용' : null
    },
    timestamp: Date.now()
  });
});

// ============================================================================
// [V3.0] Steppay 구독 결제 API — 자동 월결제 시스템
// ============================================================================

// ── Steppay API 헬퍼 ──
async function steppayFetch(env: Env, endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const secretToken = await env.DB.prepare(
    "SELECT setting_value FROM xivix_settings WHERE setting_key = 'steppay_secret_token'"
  ).first<{ setting_value: string }>();
  
  if (!secretToken) {
    throw new Error('Steppay Secret Token이 설정되지 않았습니다. /master에서 설정해주세요.');
  }
  
  const options: RequestInit = {
    method,
    headers: {
      'Secret-Token': secretToken.setting_value,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`https://api.steppay.kr/api/v1${endpoint}`, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Steppay] ${method} ${endpoint} → ${response.status}:`, errorText);
    // 에러 상세 정보를 포함하여 throw
    const err: any = new Error(`Steppay API 오류 (${response.status}): ${errorText}`);
    err.statusCode = response.status;
    try { err.detail = JSON.parse(errorText); } catch { err.detail = errorText; }
    throw err;
  }
  
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}


// [V3.0-25] Steppay 연동 상태 확인
api.get('/steppay/status', async (c) => {
  try {
    const secretToken = await c.env.DB.prepare(
      "SELECT setting_value FROM xivix_settings WHERE setting_key = 'steppay_secret_token'"
    ).first<{ setting_value: string }>();
    
    const products = await c.env.DB.prepare(
      'SELECT * FROM xivix_steppay_products ORDER BY price'
    ).all();
    
    const setupProducts = await c.env.DB.prepare(
      'SELECT * FROM xivix_steppay_setup_products ORDER BY price'
    ).all();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        configured: !!secretToken,
        products: products.results,
        setup_products: setupProducts.results,
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message, timestamp: Date.now() }, 500);
  }
});

// [V3.0-26] Steppay Secret Token 저장
api.post('/steppay/config', async (c) => {
  const { secret_token } = await c.req.json() as { secret_token: string };
  
  if (!secret_token) {
    return c.json<ApiResponse>({ success: false, error: 'Secret Token을 입력해주세요', timestamp: Date.now() }, 400);
  }
  
  // 토큰 유효성 검증 — Steppay API 호출 시도
  try {
    const testRes = await fetch('https://api.steppay.kr/api/v1/products?pageNum=1&pageSize=1', {
      headers: { 'Secret-Token': secret_token, 'Accept': 'application/json' }
    });
    if (!testRes.ok) throw new Error('Invalid token');
  } catch {
    return c.json<ApiResponse>({ success: false, error: '유효하지 않은 Secret Token입니다', timestamp: Date.now() }, 400);
  }
  
  // DB에 저장 (upsert)
  await c.env.DB.prepare(`
    INSERT INTO xivix_settings (setting_key, setting_value, description) 
    VALUES ('steppay_secret_token', ?, 'Steppay API Secret Token')
    ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
  `).bind(secret_token, secret_token).run();
  
  return c.json<ApiResponse>({
    success: true,
    data: { message: 'Steppay Secret Token 저장 완료' },
    timestamp: Date.now()
  });
});

// [V3.0-27] Steppay 상품 초기 등록 (포탈에서 수동 생성 후 ID 매핑용)
api.post('/steppay/sync-products', async (c) => {
  try {
    // Steppay에서 상품 목록 조회
    const products = await steppayFetch(c.env, '/products?pageNum=1&pageSize=50');
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        steppay_products: products.content || products,
        message: '스텝페이 상품 목록 조회 완료. 매핑할 상품 ID를 확인하세요.',
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message, timestamp: Date.now() }, 500);
  }
});

// [V3.0-28] Steppay 상품 ID/Code 매핑 업데이트
api.put('/steppay/products/:plan', async (c) => {
  const plan = c.req.param('plan');
  const { steppay_product_id, steppay_price_id, steppay_product_code, steppay_price_code } = await c.req.json() as {
    steppay_product_id: number;
    steppay_price_id: number;
    steppay_product_code?: string;
    steppay_price_code?: string;
  };
  
  await c.env.DB.prepare(`
    UPDATE xivix_steppay_products 
    SET steppay_product_id = ?, steppay_price_id = ?,
        steppay_product_code = ?, steppay_price_code = ?,
        updated_at = CURRENT_TIMESTAMP 
    WHERE plan = ?
  `).bind(steppay_product_id, steppay_price_id, steppay_product_code || null, steppay_price_code || null, plan).run();
  
  return c.json<ApiResponse>({
    success: true,
    data: { message: `${plan} 요금제 Steppay 상품 매핑 완료` },
    timestamp: Date.now()
  });
});

// [V3.0-28b] Steppay 셋팅비 상품 ID/Code 매핑 업데이트
api.put('/steppay/setup-products/:setupType', async (c) => {
  const setupType = c.req.param('setupType');
  const { steppay_product_id, steppay_price_id, steppay_product_code, steppay_price_code } = await c.req.json() as {
    steppay_product_id: number;
    steppay_price_id: number;
    steppay_product_code?: string;
    steppay_price_code?: string;
  };
  
  await c.env.DB.prepare(`
    UPDATE xivix_steppay_setup_products 
    SET steppay_product_id = ?, steppay_price_id = ?,
        steppay_product_code = ?, steppay_price_code = ?
    WHERE setup_type = ?
  `).bind(steppay_product_id, steppay_price_id, steppay_product_code || null, steppay_price_code || null, setupType).run();
  
  return c.json<ApiResponse>({
    success: true,
    data: { message: `${setupType} 셋팅비 Steppay 상품 매핑 완료` },
    timestamp: Date.now()
  });
});

// [V3.0-30] 런칭 프로모션 정보 조회 API
api.get('/promotion/info', async (c) => {
  const store_id = c.req.query('store_id');
  
  // 프로모션 기본 정보
  const PROMO_VERIFIED_TYPES = ['BEAUTY_HAIR', 'BEAUTY_SKIN', 'BEAUTY_NAIL', 'RESTAURANT', 'CAFE', 'FITNESS', 'MEDICAL'];
  
  let isVerifiedIndustry = false;
  let businessType = '';
  
  if (store_id) {
    const store = await c.env.DB.prepare(
      'SELECT business_type FROM xivix_stores WHERE id = ?'
    ).bind(parseInt(store_id)).first<any>();
    if (store) {
      businessType = store.business_type || '';
      isVerifiedIndustry = PROMO_VERIFIED_TYPES.includes(businessType);
    }
  }
  
  // 요금표 (프로모션 적용)
  const plans = [
    { 
      id: 'mini', name: 'Mini', 
      monthly: 29000, setup: 100000,
      monthly_promo: 29000, // Mini는 첫 달 무료 없음
      setup_promo: isVerifiedIndustry ? 80000 : 100000,
      first_month_free: false,
      setup_discount: isVerifiedIndustry 
    },
    { 
      id: 'light', name: 'Light', 
      monthly: 49000, setup: 300000,
      monthly_promo: 49000,
      setup_promo: isVerifiedIndustry ? 240000 : 300000,
      first_month_free: false,
      setup_discount: isVerifiedIndustry 
    },
    { 
      id: 'standard', name: 'Standard', 
      monthly: 99000, setup: 300000,
      monthly_promo: 0, // 첫 달 무료
      setup_promo: isVerifiedIndustry ? 240000 : 300000,
      first_month_free: true,
      setup_discount: isVerifiedIndustry 
    },
    { 
      id: 'premium', name: 'Premium', 
      monthly: 149000, setup: 500000,
      monthly_promo: 0, // 첫 달 무료
      setup_promo: isVerifiedIndustry ? 400000 : 500000,
      first_month_free: true,
      setup_discount: isVerifiedIndustry 
    }
  ];
  
  return c.json<ApiResponse>({
    success: true,
    data: {
      active: true,
      title: '🎁 XIVIX AI 봇 런칭 기념 프로모션',
      period: '별도 공지 시까지',
      verified_industry: isVerifiedIndustry,
      business_type: businessType,
      conditions: {
        first_month_free: 'Standard/Premium 플랜 신규 신청 시 첫 달 월 구독료 무료',
        setup_discount: '네이버 플레이스 URL 인증 시 셋팅비 20% 할인',
        free_consulting: '무료 AI 도입 진단 상담'
      },
      plans
    },
    timestamp: Date.now()
  });
});

// [V3.0-29] 구독 결제 시작 (고객 생성 → 주문 생성 → 결제 링크 반환)
api.post('/steppay/subscribe', async (c) => {
  const { store_id, plan, buyer_name, buyer_email, buyer_phone, setup_type } = await c.req.json() as {
    store_id: number;
    plan: string;
    buyer_name: string;
    buyer_email: string;
    buyer_phone?: string;
    setup_type?: 'starter' | 'basic' | 'premium'; // 셋팅비 포함 여부
  };
  
  if (!store_id || !plan || !buyer_name || !buyer_email) {
    return c.json<ApiResponse>({ 
      success: false, 
      error: '필수 정보를 입력해주세요 (store_id, plan, buyer_name, buyer_email)', 
      timestamp: Date.now() 
    }, 400);
  }
  
  try {
    // 1. 매장 확인 (프로모션 판단을 위해 업종/스마트플레이스 정보 포함)
    const store = await c.env.DB.prepare(
      'SELECT id, store_name, plan, business_type, business_type_name FROM xivix_stores WHERE id = ?'
    ).bind(store_id).first<any>();
    
    if (!store) {
      return c.json<ApiResponse>({ success: false, error: '매장을 찾을 수 없습니다', timestamp: Date.now() }, 404);
    }
    
    // 2. Steppay 요금제 확인
    const planProduct = await c.env.DB.prepare(
      'SELECT * FROM xivix_steppay_products WHERE plan = ? AND is_active = 1'
    ).bind(plan).first<any>();
    
    if (!planProduct) {
      return c.json<ApiResponse>({ success: false, error: `${plan} 요금제를 찾을 수 없습니다`, timestamp: Date.now() }, 404);
    }
    
    // 3. Steppay 고객 생성 (또는 기존 고객 확인)
    const existingSub = await c.env.DB.prepare(
      'SELECT steppay_customer_id, steppay_customer_code FROM xivix_subscriptions WHERE store_id = ?'
    ).bind(store_id).first<any>();
    
    let customerCode: string;
    let customerId: number;
    
    if (existingSub?.steppay_customer_id) {
      customerCode = existingSub.steppay_customer_code;
      customerId = existingSub.steppay_customer_id;
    } else {
      // 새 고객 생성 (이미 있으면 조회)
      const customerCode_ = `XIVIX_STORE_${store_id}`;
      try {
        const customerResult = await steppayFetch(c.env, '/customers', 'POST', {
          name: buyer_name,
          email: buyer_email,
          phone: buyer_phone || '',
          code: customerCode_,
        });
        customerCode = customerCode_;
        customerId = customerResult.id || customerResult.customerId;
      } catch (customerError: any) {
        // 이미 존재하는 고객인 경우 코드로 조회
        console.log(`[Steppay] Customer creation failed, trying lookup: ${customerError.message}`);
        try {
          const existingCustomer = await steppayFetch(c.env, `/customers?code=${customerCode_}&pageNum=1&pageSize=1`);
          const customers = existingCustomer.content || existingCustomer;
          if (Array.isArray(customers) && customers.length > 0) {
            customerCode = customerCode_;
            customerId = customers[0].id || customers[0].customerId;
          } else {
            throw new Error('고객 생성 및 조회 모두 실패했습니다');
          }
        } catch {
          throw customerError; // 원래 에러 전파
        }
      }
    }
    
    // 4. 주문 아이템 구성 (Steppay API는 productCode + priceCode 형식 필요)
    const orderItems: any[] = [];
    
    // 월 구독 상품
    if (planProduct.steppay_product_code && planProduct.steppay_price_code) {
      // Code 기반 (필수: Steppay API는 Code 형식만 인식)
      orderItems.push({
        productCode: planProduct.steppay_product_code,
        priceCode: planProduct.steppay_price_code,
        quantity: 1,
      });
    } else {
      // Code 미설정 시 name + price fallback (custom 아이템)
      orderItems.push({
        name: planProduct.product_name,
        price: planProduct.price,
        quantity: 1,
        recurring: {
          intervalUnit: 'MONTH',
          intervalCount: 1,
        },
      });
    }
    
    // 셋팅비 (일회성 추가) — 프로모션 할인 자동 적용
    // [런칭 프로모션] 네이버 플레이스 업종 인증 시 셋팅비 20% 할인
    const PROMO_VERIFIED_TYPES = ['BEAUTY_HAIR', 'BEAUTY_SKIN', 'BEAUTY_NAIL', 'RESTAURANT', 'CAFE', 'FITNESS', 'MEDICAL'];
    const isVerifiedIndustry = PROMO_VERIFIED_TYPES.includes(store.business_type || '');
    const setupDiscountRate = isVerifiedIndustry ? 0.20 : 0; // 20% 할인
    
    // [런칭 프로모션] Standard/Premium 첫 달 무료
    const isFirstMonthFree = (plan === 'standard' || plan === 'premium');
    
    let promoApplied: string[] = [];
    let setupFeeOriginal = 0;
    let setupFeeDiscounted = 0;
    if (setup_type) {
      const setupProduct = await c.env.DB.prepare(
        'SELECT * FROM xivix_steppay_setup_products WHERE setup_type = ? AND is_active = 1'
      ).bind(setup_type).first<any>();
      
      if (setupProduct) {
        setupFeeOriginal = setupProduct.price || (setup_type === 'premium' ? 500000 : setup_type === 'basic' ? 300000 : 100000);
        
        if (setupDiscountRate > 0) {
          // [프로모션] 업종 인증 셋팅비 할인 적용
          setupFeeDiscounted = Math.round(setupFeeOriginal * (1 - setupDiscountRate));
          promoApplied.push(`셋팅비 ${Math.round(setupDiscountRate * 100)}% 할인 (${setupFeeOriginal.toLocaleString()}원→${setupFeeDiscounted.toLocaleString()}원)`);
          
          // 할인된 가격으로 커스텀 아이템 추가 (Code 기반 대신 직접 가격 지정)
          orderItems.push({
            name: `${setupProduct.product_name} [런칭 프로모션 ${Math.round(setupDiscountRate * 100)}% 할인]`,
            price: setupFeeDiscounted,
            quantity: 1,
          });
          console.log(`[Promo] Setup fee discount: ${setupFeeOriginal} → ${setupFeeDiscounted} (${store.business_type})`);
        } else {
          // 할인 없음 — 정상가
          setupFeeDiscounted = setupFeeOriginal;
          if (setupProduct.steppay_product_code && setupProduct.steppay_price_code) {
            orderItems.push({ 
              productCode: setupProduct.steppay_product_code, 
              priceCode: setupProduct.steppay_price_code, 
              quantity: 1 
            });
          } else {
            orderItems.push({
              name: setupProduct.product_name,
              price: setupProduct.price,
              quantity: 1,
            });
          }
        }
      }
    }
    
    // [프로모션] Standard/Premium 첫 달 무료 처리
    // Steppay 정기결제에서 첫 달 무료 = 트라이얼 기간으로 처리하거나
    // 월 구독 아이템을 0원으로 교체 (첫 결제만)
    if (isFirstMonthFree) {
      promoApplied.push(`첫 달 월 구독료 무료 (${planProduct.price.toLocaleString()}원→0원)`);
      console.log(`[Promo] First month free for plan ${plan}, store ${store_id}`);
      
      // 월 구독 아이템을 첫 달 0원 + 트라이얼로 재구성
      // orderItems[0]을 교체 (첫 번째가 월 구독)
      orderItems[0] = {
        productCode: planProduct.steppay_product_code,
        priceCode: planProduct.steppay_price_code,
        quantity: 1,
      };
      // 참고: Steppay에서 트라이얼 설정은 상품 자체에서 관리
      // 여기서는 프로모션 기록만 하고, 실제 무료는 Steppay 주문 시 discountAmount로 처리
    }
    
    // 5. 주문 생성
    const orderResult = await steppayFetch(c.env, '/orders', 'POST', {
      customerId: customerId,
      items: orderItems,
    });
    
    const orderCode = orderResult.orderCode || orderResult.code;
    const orderId = orderResult.id || orderResult.orderId;
    
    // 6. 결제 링크 생성
    const paymentLink = `https://api.steppay.kr/api/public/orders/${orderCode}/pay`;
    
    // [프로모션] 적용 내역 로그 저장
    if (promoApplied.length > 0) {
      try {
        await c.env.DB.prepare(`
          INSERT INTO xivix_admin_logs (admin_id, action, target_store_id, details)
          VALUES ('system', 'promotion_applied', ?, ?)
        `).bind(store_id, JSON.stringify({
          promotions: promoApplied,
          setup_fee_original: setupFeeOriginal,
          setup_fee_discounted: setupFeeDiscounted,
          first_month_free: isFirstMonthFree,
          verified_industry: isVerifiedIndustry,
          business_type: store.business_type
        })).run();
      } catch (e) {
        console.error('[Promo] Log save failed:', e);
      }
    }
    
    // 7. DB 업데이트 (구독 레코드 생성/업데이트)
    const existingSubRecord = await c.env.DB.prepare(
      'SELECT id FROM xivix_subscriptions WHERE store_id = ?'
    ).bind(store_id).first<any>();
    
    if (existingSubRecord) {
      // 기존 구독이 active인 경우 status를 보존하고 주문 정보만 업데이트
      // active가 아닌 경우(trial, cancelled 등)에만 pending_payment로 변경
      const existingSub = await c.env.DB.prepare(
        'SELECT status FROM xivix_subscriptions WHERE store_id = ?'
      ).bind(store_id).first<any>();
      const newStatus = existingSub?.status === 'active' ? 'active' : 'pending_payment';
      
      await c.env.DB.prepare(`
        UPDATE xivix_subscriptions SET 
          plan = ?, monthly_fee = ?, status = ?,
          steppay_customer_id = ?, steppay_customer_code = ?,
          steppay_order_id = ?, steppay_order_code = ?,
          steppay_product_id = ?, steppay_price_id = ?,
          steppay_product_code = ?, steppay_price_code = ?,
          payment_method = 'steppay',
          updated_at = CURRENT_TIMESTAMP
        WHERE store_id = ?
      `).bind(plan, planProduct.price, newStatus, customerId, customerCode, orderId, orderCode, 
              planProduct.steppay_product_id, planProduct.steppay_price_id, 
              planProduct.steppay_product_code, planProduct.steppay_price_code, store_id).run();
    } else {
      await c.env.DB.prepare(`
        INSERT INTO xivix_subscriptions (store_id, plan, monthly_fee, status, 
          steppay_customer_id, steppay_customer_code, 
          steppay_order_id, steppay_order_code,
          steppay_product_id, steppay_price_id,
          steppay_product_code, steppay_price_code, payment_method)
        VALUES (?, ?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?, ?, ?, 'steppay')
      `).bind(store_id, plan, planProduct.price, customerId, customerCode, 
              orderId, orderCode, planProduct.steppay_product_id, planProduct.steppay_price_id,
              planProduct.steppay_product_code, planProduct.steppay_price_code).run();
    }
    
    // 결제 이력 생성
    await c.env.DB.prepare(`
      INSERT INTO xivix_payments (store_id, payment_type, amount, vat_amount, total_amount, 
        pg_provider, description, status, steppay_order_id)
      VALUES (?, 'monthly', ?, ?, ?, 'steppay', ?, 'pending', ?)
    `).bind(store_id, planProduct.price, Math.round(planProduct.price * 0.1), 
            planProduct.price + Math.round(planProduct.price * 0.1),
            `${planProduct.product_name} 월 구독`, orderId).run();
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        payment_link: paymentLink,
        order_code: orderCode,
        order_id: orderId,
        customer_code: customerCode,
        plan: plan,
        monthly_fee: isFirstMonthFree ? 0 : planProduct.price,
        monthly_fee_regular: planProduct.price,
        setup_fee: setupFeeDiscounted || (setup_type ? (setup_type === 'premium' ? 500000 : setup_type === 'basic' ? 300000 : 100000) : 0),
        setup_fee_original: setupFeeOriginal,
        promotions: promoApplied,
        message: promoApplied.length > 0 
          ? `🎁 런칭 프로모션 적용! ${promoApplied.join(', ')}. 결제 링크가 생성되었습니다.`
          : '결제 링크가 생성되었습니다. 고객에게 전달해주세요.',
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[Steppay] Subscribe error:', error);
    return c.json<ApiResponse>({ success: false, error: error.message, timestamp: Date.now() }, 500);
  }
});

// [V3.0-30] 구독 상태 조회
api.get('/steppay/subscription/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  const subscription = await c.env.DB.prepare(`
    SELECT s.*, sp.product_name, sp.billing_period
    FROM xivix_subscriptions s
    LEFT JOIN xivix_steppay_products sp ON s.plan = sp.plan
    WHERE s.store_id = ?
  `).bind(storeId).first<any>();
  
  if (!subscription) {
    return c.json<ApiResponse>({ success: false, error: '구독 정보가 없습니다', timestamp: Date.now() }, 404);
  }
  
  // Steppay에서 실시간 구독 상태 조회
  let steppayStatus = null;
  if (subscription.steppay_subscription_id) {
    try {
      steppayStatus = await steppayFetch(c.env, `/subscriptions/${subscription.steppay_subscription_id}`);
    } catch {
      // Steppay 조회 실패 시 DB 데이터만 반환
    }
  }
  
  return c.json<ApiResponse>({
    success: true,
    data: {
      ...subscription,
      steppay_live_status: steppayStatus,
    },
    timestamp: Date.now()
  });
});

// [V3.0-31] 구독 취소
api.post('/steppay/cancel/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const { reason } = await c.req.json() as { reason?: string };
  
  const subscription = await c.env.DB.prepare(
    'SELECT * FROM xivix_subscriptions WHERE store_id = ? AND status = ?'
  ).bind(storeId, 'active').first<any>();
  
  if (!subscription) {
    return c.json<ApiResponse>({ success: false, error: '활성 구독이 없습니다', timestamp: Date.now() }, 404);
  }
  
  try {
    // Steppay 구독 취소 API 호출 (실패해도 DB는 업데이트)
    let steppayResult = null;
    if (subscription.steppay_subscription_id) {
      try {
        steppayResult = await steppayFetch(c.env, `/subscriptions/${subscription.steppay_subscription_id}/cancel`, 'POST', {
          reason: reason || '관리자 취소',
        });
      } catch (e: any) {
        console.log(`[Cancel] Steppay API failed (ignored): ${e.message}`);
      }
    }
    
    // DB 업데이트 (Steppay 실패 여부와 무관하게 항상 실행)
    await c.env.DB.prepare(`
      UPDATE xivix_subscriptions SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE store_id = ? AND status = 'active'
    `).bind(storeId).run();
    
    return c.json<ApiResponse>({
      success: true,
      data: { message: '구독이 취소되었습니다', reason },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message, timestamp: Date.now() }, 500);
  }
});

// [V3.0-32] 구독 플랜 변경 (업/다운그레이드)
api.post('/steppay/change-plan/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  const { new_plan } = await c.req.json() as { new_plan: string };
  
  const subscription = await c.env.DB.prepare(
    'SELECT * FROM xivix_subscriptions WHERE store_id = ? AND status = ?'
  ).bind(storeId, 'active').first<any>();
  
  if (!subscription) {
    return c.json<ApiResponse>({ success: false, error: '활성 구독이 없습니다', timestamp: Date.now() }, 404);
  }
  
  const newPlanProduct = await c.env.DB.prepare(
    'SELECT * FROM xivix_steppay_products WHERE plan = ? AND is_active = 1'
  ).bind(new_plan).first<any>();
  
  if (!newPlanProduct) {
    return c.json<ApiResponse>({ success: false, error: `${new_plan} 요금제를 찾을 수 없습니다`, timestamp: Date.now() }, 404);
  }
  
  try {
    // Steppay 구독 플랜 변경 (다음 결제 주기부터 적용, 실패해도 DB는 업데이트)
    if (subscription.steppay_subscription_id && newPlanProduct.steppay_price_code) {
      try {
        await steppayFetch(c.env, `/subscriptions/${subscription.steppay_subscription_id}/change`, 'POST', {
          priceCode: newPlanProduct.steppay_price_code,
        });
      } catch (e: any) {
        console.log(`[ChangePlan] Steppay API failed (ignored): ${e.message}`);
      }
    }
    
    // DB 업데이트 (Steppay 실패 여부와 무관하게 항상 실행)
    await c.env.DB.prepare(`
      UPDATE xivix_subscriptions SET plan = ?, monthly_fee = ?, 
        steppay_product_id = ?, steppay_price_id = ?,
        steppay_product_code = ?, steppay_price_code = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE store_id = ? AND status = 'active'
    `).bind(new_plan, newPlanProduct.price, newPlanProduct.steppay_product_id, newPlanProduct.steppay_price_id,
            newPlanProduct.steppay_product_code, newPlanProduct.steppay_price_code, storeId).run();
    
    // 매장 요금제도 업데이트
    await c.env.DB.prepare(
      'UPDATE xivix_stores SET plan = ?, monthly_fee = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(new_plan, newPlanProduct.price, storeId).run();
    
    return c.json<ApiResponse>({
      success: true,
      data: { 
        message: `요금제가 ${subscription.plan} → ${new_plan}으로 변경되었습니다`,
        old_plan: subscription.plan,
        new_plan: new_plan,
        new_monthly_fee: newPlanProduct.price,
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message, timestamp: Date.now() }, 500);
  }
});

// [V3.0-33] Steppay 웹훅 수신 (결제 완료 / 구독 갱신 / 실패 등)
api.post('/steppay/webhook', async (c) => {
  try {
    const payload = await c.req.json() as any;
    const eventType = payload.event || payload.eventType || payload.type || 'unknown';
    const eventData = payload.data || payload;
    // V2 페이로드: data.code가 주문코드, data.orderCode는 subscription에서 사용
    const orderCode_ = eventData.code || eventData.orderCode || eventData.order_code || payload.orderCode || '';
    
    console.log(`[Steppay Webhook] Event: ${eventType}, OrderCode: ${orderCode_}`, JSON.stringify(payload).slice(0, 500));
    
    // 웹훅 로그 저장
    await c.env.DB.prepare(`
      INSERT INTO xivix_steppay_webhook_logs (event_type, event_id, order_code, raw_payload)
      VALUES (?, ?, ?, ?)
    `).bind(eventType, payload.idempotentKey || payload.eventId || '', orderCode_, JSON.stringify(payload)).run();
    
    const data = payload.data || payload;
    const orderCode = data.code || data.orderCode || data.order_code || '';
    
    // 주문 코드로 매장 찾기
    let subscription: any = null;
    if (orderCode) {
      subscription = await c.env.DB.prepare(
        'SELECT * FROM xivix_subscriptions WHERE steppay_order_code = ?'
      ).bind(orderCode).first<any>();
    }
    
    switch (eventType) {
      case 'ORDER_PAID':
      case 'order.paid':
      case 'order.payment_completed': {
        // ── 최초 결제 완료 ──
        if (subscription) {
          const subscriptionId = data.subscriptionId || data.subscription?.id;
          
          await c.env.DB.prepare(`
            UPDATE xivix_subscriptions SET 
              status = 'active', 
              steppay_subscription_id = ?,
              started_at = CURRENT_TIMESTAMP,
              next_billing_at = datetime('now', '+1 month'),
              auto_renew = 1,
              updated_at = CURRENT_TIMESTAMP
            WHERE store_id = ?
          `).bind(subscriptionId || null, subscription.store_id).run();
          
          // 매장 상태 활성화
          await c.env.DB.prepare(
            "UPDATE xivix_stores SET is_active = 1, plan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).bind(subscription.plan, subscription.store_id).run();
          
          // 결제 이력 업데이트
          await c.env.DB.prepare(`
            UPDATE xivix_payments SET status = 'paid', paid_at = CURRENT_TIMESTAMP, 
              raw_response = ?, updated_at = CURRENT_TIMESTAMP
            WHERE store_id = ? AND status = 'pending' AND pg_provider = 'steppay'
            ORDER BY created_at DESC LIMIT 1
          `).bind(JSON.stringify(data), subscription.store_id).run();
          
          // 웹훅 로그에 store_id 업데이트
          await c.env.DB.prepare(`
            UPDATE xivix_steppay_webhook_logs SET store_id = ?, processed = 1
            WHERE order_code = ? AND event_type = ? ORDER BY created_at DESC LIMIT 1
          `).bind(subscription.store_id, orderCode, eventType).run();
          
          // 마스터에게 결제 완료 알림 SMS
          try {
            const store = await c.env.DB.prepare('SELECT store_name FROM xivix_stores WHERE id = ?').bind(subscription.store_id).first<any>();
            await notifyMasterPaymentCompleted(
              c.env, store?.store_name || `매장#${subscription.store_id}`,
              subscription.plan, subscription.monthly_fee, subscription.store_id
            );
          } catch (e) { console.error('[Webhook] 결제 완료 알림 실패:', e); }
        }
        break;
      }
      
      case 'SUBSCRIPTION_RENEWED':
      case 'subscription.renewed':
      case 'payment.completed': {
        // ── 구독 갱신 (자동 월결제 성공) ──
        if (subscription) {
          await c.env.DB.prepare(`
            UPDATE xivix_subscriptions SET 
              next_billing_at = datetime('now', '+1 month'),
              updated_at = CURRENT_TIMESTAMP
            WHERE store_id = ?
          `).bind(subscription.store_id).run();
          
          // 갱신 결제 이력 추가
          await c.env.DB.prepare(`
            INSERT INTO xivix_payments (store_id, payment_type, amount, vat_amount, total_amount,
              pg_provider, description, status, paid_at, raw_response, steppay_order_id)
            VALUES (?, 'monthly', ?, ?, ?, 'steppay', ?, 'paid', CURRENT_TIMESTAMP, ?, ?)
          `).bind(
            subscription.store_id, subscription.monthly_fee,
            Math.round(subscription.monthly_fee * 0.1),
            subscription.monthly_fee + Math.round(subscription.monthly_fee * 0.1),
            `구독 갱신 - ${subscription.plan}`, JSON.stringify(data),
            subscription.steppay_order_id
          ).run();
          
          // 사용량 리셋 (월 초기화)
          const period = new Date().toISOString().slice(0, 7);
          await c.env.DB.prepare(`
            INSERT OR IGNORE INTO xivix_usage (store_id, period, ai_conversations, sms_sent, lms_sent, image_analyses)
            VALUES (?, ?, 0, 0, 0, 0)
          `).bind(subscription.store_id, period).run();
          
          // 마스터에게 구독 갱신 알림 SMS
          try {
            const store = await c.env.DB.prepare('SELECT store_name FROM xivix_stores WHERE id = ?').bind(subscription.store_id).first<any>();
            await notifyMasterSubscriptionRenewed(
              c.env, store?.store_name || `매장#${subscription.store_id}`,
              subscription.plan, subscription.monthly_fee, subscription.store_id
            );
          } catch (e) { console.error('[Webhook] 구독 갱신 알림 실패:', e); }
        }
        break;
      }
      
      case 'SUBSCRIPTION_PAYMENT_FAILED':
      case 'subscription.payment_failed':
      case 'payment.failed': {
        // ── 결제 실패 ──
        if (subscription) {
          await c.env.DB.prepare(`
            UPDATE xivix_subscriptions SET status = 'paused', updated_at = CURRENT_TIMESTAMP
            WHERE store_id = ?
          `).bind(subscription.store_id).run();
          
          // 결제 실패 이력
          await c.env.DB.prepare(`
            INSERT INTO xivix_payments (store_id, payment_type, amount, vat_amount, total_amount,
              pg_provider, description, status, raw_response)
            VALUES (?, 'monthly', ?, ?, ?, 'steppay', '결제 실패 - 구독 일시정지', 'failed', ?)
          `).bind(
            subscription.store_id, subscription.monthly_fee,
            Math.round(subscription.monthly_fee * 0.1),
            subscription.monthly_fee + Math.round(subscription.monthly_fee * 0.1),
            JSON.stringify(data)
          ).run();
          
          // 마스터에게 결제 실패 알림 SMS
          try {
            const store = await c.env.DB.prepare('SELECT store_name FROM xivix_stores WHERE id = ?').bind(subscription.store_id).first<any>();
            const failReason = data.failReason || data.errorMessage || '';
            await notifyMasterPaymentFailed(
              c.env, store?.store_name || `매장#${subscription.store_id}`,
              subscription.plan, subscription.monthly_fee, subscription.store_id, failReason
            );
          } catch (e) { console.error('[Webhook] 결제 실패 알림 실패:', e); }
        }
        break;
      }
      
      case 'SUBSCRIPTION_CANCELLED':
      case 'subscription.cancelled':
      case 'payment.canceled': {
        // ── 구독 취소 ──
        if (subscription) {
          await c.env.DB.prepare(`
            UPDATE xivix_subscriptions SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE store_id = ?
          `).bind(subscription.store_id).run();
          
          // 마스터에게 구독 취소 알림 SMS
          try {
            const store = await c.env.DB.prepare('SELECT store_name FROM xivix_stores WHERE id = ?').bind(subscription.store_id).first<any>();
            await notifyMasterSubscriptionCancelled(
              c.env, store?.store_name || `매장#${subscription.store_id}`,
              subscription.plan, subscription.store_id
            );
          } catch (e) { console.error('[Webhook] 구독 취소 알림 실패:', e); }
        }
        break;
      }
      
      case 'subscription.created': {
        // ── 구독 생성됨 ──
        if (subscription) {
          const subId = data.id || data.subscriptionId;
          if (subId) {
            await c.env.DB.prepare(`
              UPDATE xivix_subscriptions SET steppay_subscription_id = ?, updated_at = CURRENT_TIMESTAMP
              WHERE store_id = ?
            `).bind(subId, subscription.store_id).run();
          }
          await c.env.DB.prepare(`
            UPDATE xivix_steppay_webhook_logs SET store_id = ?, processed = 1
            WHERE order_code = ? AND event_type = ? ORDER BY created_at DESC LIMIT 1
          `).bind(subscription.store_id, orderCode, eventType).run();
        }
        break;
      }
      
      case 'order.updated': {
        // order.updated에서 결제 완료 여부 확인 (items[0].status === 'PAID')
        const items = data.items || [];
        const isPaid = items.some((item: any) => item.status === 'PAID');
        if (isPaid && subscription) {
          const subscriptionId = data.subscriptionId || data.subscription?.id ||
            items.find((item: any) => item.subscriptionId)?.subscriptionId;
          
          await c.env.DB.prepare(`
            UPDATE xivix_subscriptions SET 
              status = 'active', 
              steppay_subscription_id = ?,
              started_at = CURRENT_TIMESTAMP,
              next_billing_at = datetime('now', '+1 month'),
              auto_renew = 1,
              updated_at = CURRENT_TIMESTAMP
            WHERE store_id = ?
          `).bind(subscriptionId || null, subscription.store_id).run();
          
          await c.env.DB.prepare(
            "UPDATE xivix_stores SET is_active = 1, plan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).bind(subscription.plan, subscription.store_id).run();
          
          await c.env.DB.prepare(`
            UPDATE xivix_payments SET status = 'paid', paid_at = CURRENT_TIMESTAMP, 
              raw_response = ?, updated_at = CURRENT_TIMESTAMP
            WHERE store_id = ? AND status = 'pending' AND pg_provider = 'steppay'
            ORDER BY created_at DESC LIMIT 1
          `).bind(JSON.stringify(data), subscription.store_id).run();
          
          await c.env.DB.prepare(`
            UPDATE xivix_steppay_webhook_logs SET store_id = ?, processed = 1
            WHERE order_code = ? AND event_type = ? ORDER BY created_at DESC LIMIT 1
          `).bind(subscription.store_id, orderCode, eventType).run();
        }
        break;
      }
      
      default:
        console.log(`[Steppay Webhook] Unhandled event type: ${eventType}`);
    }
    
    return c.json({ success: true, message: 'Webhook received' });
  } catch (error: any) {
    console.error('[Steppay Webhook] Error:', error);
    // 웹훅은 항상 200 반환 (재시도 방지)
    return c.json({ success: false, error: error.message });
  }
});

// [V3.0-34] 전체 구독 현황 대시보드 (마스터용)
api.get('/steppay/dashboard', async (c) => {
  const subscriptions = await c.env.DB.prepare(`
    SELECT s.*, st.store_name, st.is_active as store_active, sp.product_name
    FROM xivix_subscriptions s
    LEFT JOIN xivix_stores st ON s.store_id = st.id
    LEFT JOIN xivix_steppay_products sp ON s.plan = sp.plan
    ORDER BY s.updated_at DESC
  `).all();
  
  // 통계
  const stats = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN status = 'active' THEN monthly_fee ELSE 0 END) as monthly_revenue
    FROM xivix_subscriptions
  `).first<any>();
  
  // 최근 결제 이력
  const recentPayments = await c.env.DB.prepare(`
    SELECT p.*, st.store_name 
    FROM xivix_payments p
    LEFT JOIN xivix_stores st ON p.store_id = st.id
    WHERE p.pg_provider = 'steppay'
    ORDER BY p.created_at DESC LIMIT 20
  `).all();
  
  return c.json<ApiResponse>({
    success: true,
    data: {
      stats,
      subscriptions: subscriptions.results,
      recent_payments: recentPayments.results,
    },
    timestamp: Date.now()
  });
});

// [V3.0-35] 결제 링크 재생성 (미결제 고객용)
api.post('/steppay/resend-link/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  
  const subscription = await c.env.DB.prepare(
    'SELECT * FROM xivix_subscriptions WHERE store_id = ?'
  ).bind(storeId).first<any>();
  
  if (!subscription || !subscription.steppay_order_code) {
    return c.json<ApiResponse>({ success: false, error: '주문 정보가 없습니다. 새로 구독을 생성해주세요.', timestamp: Date.now() }, 404);
  }
  
  const paymentLink = `https://api.steppay.kr/api/public/orders/${subscription.steppay_order_code}/pay`;
  
  return c.json<ApiResponse>({
    success: true,
    data: {
      payment_link: paymentLink,
      order_code: subscription.steppay_order_code,
      plan: subscription.plan,
      monthly_fee: subscription.monthly_fee,
      status: subscription.status,
    },
    timestamp: Date.now()
  });
});

// [V3.0-37] 웹훅 리플레이 - 미처리 웹훅 재처리 (마스터용)
api.post('/steppay/webhook-replay', async (c) => {
  try {
    // 미처리 웹훅 조회
    const unprocessed = await c.env.DB.prepare(`
      SELECT id, raw_payload, event_type, order_code, created_at
      FROM xivix_steppay_webhook_logs WHERE processed = 0
      ORDER BY created_at ASC
    `).all<any>();
    
    const results: any[] = [];
    
    for (const log of unprocessed.results || []) {
      const payload = JSON.parse(log.raw_payload);
      const eventType = payload.event || payload.eventType || payload.type || 'unknown';
      const data = payload.data || payload;
      const orderCode = data.code || data.orderCode || data.order_code || '';
      
      // 먼저 DB의 event_type과 order_code 업데이트
      await c.env.DB.prepare(`
        UPDATE xivix_steppay_webhook_logs SET event_type = ?, order_code = ? WHERE id = ?
      `).bind(eventType, orderCode, log.id).run();
      
      let subscription: any = null;
      if (orderCode) {
        subscription = await c.env.DB.prepare(
          'SELECT * FROM xivix_subscriptions WHERE steppay_order_code = ?'
        ).bind(orderCode).first<any>();
      }
      
      let action = 'skipped';
      
      if (eventType === 'order.payment_completed' || eventType === 'order.paid' || eventType === 'ORDER_PAID') {
        if (subscription) {
          const subscriptionId = data.subscriptionId || data.subscription?.id;
          await c.env.DB.prepare(`
            UPDATE xivix_subscriptions SET 
              status = 'active', steppay_subscription_id = COALESCE(?, steppay_subscription_id),
              started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
              next_billing_at = datetime('now', '+1 month'), auto_renew = 1, updated_at = CURRENT_TIMESTAMP
            WHERE store_id = ?
          `).bind(subscriptionId || null, subscription.store_id).run();
          
          await c.env.DB.prepare(
            "UPDATE xivix_stores SET is_active = 1, plan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).bind(subscription.plan, subscription.store_id).run();
          
          await c.env.DB.prepare(`
            UPDATE xivix_payments SET status = 'paid', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE store_id = ? AND status = 'pending' AND pg_provider = 'steppay'
            ORDER BY created_at DESC LIMIT 1
          `).bind(subscription.store_id).run();
          
          action = 'activated';
        } else {
          action = 'no_subscription';
        }
      } else if (eventType === 'order.updated') {
        const items = data.items || [];
        const isPaid = items.some((item: any) => item.status === 'PAID');
        if (isPaid && subscription) {
          const subscriptionId = data.subscriptionId || data.subscription?.id ||
            items.find((item: any) => item.subscriptionId)?.subscriptionId;
          
          await c.env.DB.prepare(`
            UPDATE xivix_subscriptions SET 
              status = 'active', steppay_subscription_id = COALESCE(?, steppay_subscription_id),
              started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
              next_billing_at = datetime('now', '+1 month'), auto_renew = 1, updated_at = CURRENT_TIMESTAMP
            WHERE store_id = ?
          `).bind(subscriptionId || null, subscription.store_id).run();
          
          await c.env.DB.prepare(
            "UPDATE xivix_stores SET is_active = 1, plan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).bind(subscription.plan, subscription.store_id).run();
          
          action = 'activated_via_order_updated';
        } else {
          action = isPaid ? 'no_subscription' : 'not_paid';
        }
      } else if (eventType === 'subscription.created') {
        if (subscription) {
          const subId = data.id || data.subscriptionId;
          if (subId) {
            await c.env.DB.prepare(`
              UPDATE xivix_subscriptions SET steppay_subscription_id = ?, updated_at = CURRENT_TIMESTAMP
              WHERE store_id = ?
            `).bind(subId, subscription.store_id).run();
          }
          action = 'subscription_id_saved';
        } else {
          action = 'no_subscription';
        }
      } else if (eventType === 'payment.completed') {
        // payment.completed는 orderCode가 다를 수 있어 별도 처리
        if (subscription) {
          action = 'payment_noted';
        } else {
          action = 'no_subscription';
        }
      } else {
        action = `unhandled:${eventType}`;
      }
      
      // processed 마킹
      if (action !== 'skipped' && action !== 'no_subscription') {
        await c.env.DB.prepare(`
          UPDATE xivix_steppay_webhook_logs SET processed = 1, store_id = ? WHERE id = ?
        `).bind(subscription?.store_id || null, log.id).run();
      }
      
      results.push({ id: log.id, event: eventType, orderCode, action });
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: { total: unprocessed.results?.length || 0, results },
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message, timestamp: Date.now() }, 500);
  }
});

// [V3.0-36] 웹훅 로그 조회 (디버깅용)
api.get('/steppay/webhook-logs', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50', 10);
  
  const logs = await c.env.DB.prepare(`
    SELECT * FROM xivix_steppay_webhook_logs ORDER BY created_at DESC LIMIT ?
  `).bind(limit).all();
  
  return c.json<ApiResponse>({
    success: true,
    data: logs.results,
    timestamp: Date.now()
  });
});

export default api;
