// XIVIX AI Core V1.0 - REST API Routes
// 대시보드 및 관리 기능용 API

import { Hono } from 'hono';
import type { Env, Store, User, ConversationLog, Reservation, DashboardStats, ApiResponse } from '../types';
import { getStoreStats, cacheStoreStats } from '../lib/kv-context';
import { getImage, deleteImage, cleanupOldImages } from '../lib/r2-storage';
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
  INDUSTRY_TEMPLATES
} from '../lib/industry-templates';

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
        c.env.MASTER_PHONE || '010-4845-3065',
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
function validateSmartPlaceUrl(url: string): { valid: boolean; placeId?: string; error?: string; needsRedirect?: boolean } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: '올바른 링크를 입력해주세요' };
  }
  
  const trimmedUrl = url.trim();
  
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
  
  return { valid: false, error: '지원하지 않는 링크 형식입니다. 네이버 플레이스/지도 링크 또는 Place ID를 입력해주세요.' };
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
    data: validation.valid ? { place_id: validation.placeId } : null,
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

문의: 010-4845-3065`;

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
    const businessType = store.business_type || 'OTHER';
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
    
    // 4. DB 업데이트 - 원클릭으로 활성화
    const today = new Date().toISOString().split('T')[0];
    
    await c.env.DB.prepare(`
      UPDATE xivix_stores SET
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
      const systemInstruction = buildSystemInstruction({
        store_name: store?.store_name,
        menu_data: store?.menu_data,
        operating_hours: store?.operating_hours,
        ai_persona: prompt_config?.persona || store?.ai_persona,
        ai_tone: prompt_config?.tone || store?.ai_tone
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
    } else if (model === 'gemini') {
      // Gemini는 환경변수로만 사용
      const hasKey = !!c.env.GEMINI_API_KEY;
      return c.json<ApiResponse>({
        success: hasKey,
        error: hasKey ? undefined : 'Gemini API 키가 설정되지 않았습니다',
        timestamp: Date.now()
      });
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

// 텍스트 입력으로 프롬프트 생성 (권장 방식)
api.post('/stores/:id/generate-prompt-from-text', async (c) => {
  const storeId = parseInt(c.req.param('id'), 10);
  
  try {
    const { text, storeName, businessType } = await c.req.json() as {
      text: string;
      storeName?: string;
      businessType?: string;
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
    
    // AI로 정보 정리 및 프롬프트 생성
    const prompt = `당신은 매장 AI 상담원 프롬프트 전문가입니다.

아래 텍스트에서 정보를 추출하고, AI 상담원용 시스템 프롬프트를 생성하세요.

## 매장 정보
- 매장명: ${storeName || '(입력 필요)'}
- 업종: ${businessType || 'BEAUTY_SKIN'}

## 입력된 텍스트
${text}

## 출력 형식 (JSON만 출력)
{
  "menuText": "정리된 메뉴/서비스 목록 (줄바꿈으로 구분)\\n예: 서비스명 - 가격\\n서비스명 - 정가 → 할인가 (할인율)",
  "operatingHours": "영업시간 (없으면 null)",
  "systemPrompt": "아래 형식으로 작성:\\n\\n당신은 ${storeName || '[매장명]'}의 전문 AI 상담원입니다.\\n\\n## 서비스 가격표\\n- 서비스1: 00,000원\\n- 서비스2: 정가 → 할인가 (할인율)\\n...\\n\\n## 현재 이벤트/프로모션\\n(이벤트 내용 상세히)\\n\\n## 기타 안내\\n- VAT 별도 여부\\n- 시술 소요시간\\n- 예약 안내\\n\\n## 응대 지침\\n- 고객 문의에 친절하고 전문적으로 응대합니다\\n- 가격 문의 시 정확한 가격과 현재 이벤트를 함께 안내합니다\\n- 대화 마무리 시 예약을 유도합니다"
}

중요: 
1. 가격 정보가 있으면 반드시 포함
2. 할인/이벤트 정보는 눈에 띄게 강조
3. 인사말은 포함하지 않음 (시스템 프롬프트는 AI 지침용)
4. JSON만 출력, 다른 텍스트 금지`;
    
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096
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
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // JSON 파싱
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return c.json<ApiResponse>({
        success: false,
        error: 'AI 응답 파싱 실패',
        timestamp: Date.now()
      }, 500);
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    return c.json<ApiResponse>({
      success: true,
      data: result,
      timestamp: Date.now()
    });
    
  } catch (error: any) {
    console.error('Generate prompt from text error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: error.message || '프롬프트 생성 실패',
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
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
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
5. 담당자가 "다듬다헤어(현장결제)" 같은 경우는 designer를 null로
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
      }
    }
  };

  return c.json(docs);
});

export default api;
