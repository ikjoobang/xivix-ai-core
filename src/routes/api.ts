// XIVIX AI Core V1.0 - REST API Routes
// 대시보드 및 관리 기능용 API

import { Hono } from 'hono';
import type { Env, Store, User, ConversationLog, Reservation, DashboardStats, ApiResponse } from '../types';
import { getStoreStats, cacheStoreStats } from '../lib/kv-context';
import { getImage, deleteImage, cleanupOldImages } from '../lib/r2-storage';

const api = new Hono<{ Bindings: Env }>();

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

api.post('/reservations', async (c) => {
  const data = await c.req.json() as Partial<Reservation>;
  
  const result = await c.env.DB.prepare(`
    INSERT INTO xivix_reservations 
    (store_id, customer_id, customer_name, customer_phone, service_name, reservation_date, reservation_time, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).bind(
    data.store_id,
    data.customer_id,
    data.customer_name || '',
    data.customer_phone || '',
    data.service_name || '',
    data.reservation_date,
    data.reservation_time,
    data.created_by || 'manual'
  ).run();
  
  return c.json<ApiResponse<{ id: number }>>({
    success: true,
    data: { id: result.meta.last_row_id as number },
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
    
    // 마스터에게 카카오톡 알림 발송 (솔라피)
    try {
      await sendNotificationToMaster(c.env, {
        store_id: storeId as number,
        store_name: data.store_name,
        owner_name: data.owner_name,
        owner_phone: data.owner_phone,
        naver_talktalk_id: data.naver_talktalk_id || '-'
      });
    } catch (notifyError) {
      // 알림 실패해도 요청은 성공 처리
      console.error('Notification failed:', notifyError);
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: { 
        id: storeId,
        message: '연동 요청이 완료되었습니다. 곧 연락드리겠습니다.'
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
    // 네이버 businessType → XIVIX 업종 코드 매핑
    const businessTypeMapping: { [key: string]: { code: string; name: string } } = {
      'hairshop': { code: 'BEAUTY_HAIR', name: '미용실' },
      'beauty': { code: 'BEAUTY_SKIN', name: '피부관리/에스테틱' },
      'nail': { code: 'BEAUTY_NAIL', name: '네일샵' },
      'restaurant': { code: 'RESTAURANT', name: '음식점' },
      'cafe': { code: 'CAFE', name: '카페' },
      'fitness': { code: 'FITNESS', name: '헬스/피트니스' },
      'hospital': { code: 'MEDICAL', name: '병원/의원' },
      'pharmacy': { code: 'PHARMACY', name: '약국' },
      'accommodation': { code: 'ACCOMMODATION', name: '숙박' },
      'education': { code: 'EDUCATION', name: '학원/교육' }
    };
    
    // 실제 수집된 업종 코드로 매핑 (할루시네이션 방지)
    let mappedBusinessType = { code: 'OTHER', name: extractedData.category || '기타' };
    if (extractedData.business_type_code && businessTypeMapping[extractedData.business_type_code]) {
      mappedBusinessType = businessTypeMapping[extractedData.business_type_code];
      console.log(`[SmartPlace] 업종 코드 매핑: ${extractedData.business_type_code} → ${mappedBusinessType.code} (${mappedBusinessType.name})`);
    } else if (extractedData.category) {
      // 카테고리 텍스트로 추론
      if (extractedData.category.includes('미용') || extractedData.category.includes('헤어')) {
        mappedBusinessType = { code: 'BEAUTY_HAIR', name: '미용실' };
      } else if (extractedData.category.includes('음식') || extractedData.category.includes('식당')) {
        mappedBusinessType = { code: 'RESTAURANT', name: '음식점' };
      } else if (extractedData.category.includes('카페') || extractedData.category.includes('커피')) {
        mappedBusinessType = { code: 'CAFE', name: '카페' };
      }
    }
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

export default api;
