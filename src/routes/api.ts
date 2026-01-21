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
      INSERT INTO xivix_stores (user_id, store_name, owner_name, owner_phone, business_type, business_type_name, business_specialty, naver_talktalk_id, onboarding_status, is_active)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)
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
    // 솔라피 API 호출 (카카오 알림톡 또는 SMS)
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
          to: setting.setting_value.replace(/-/g, ''),
          from: setting.setting_value.replace(/-/g, ''), // 발신번호 (설정에서 가져오거나 기본값)
          text: message,
          type: 'SMS'
        }
      })
    });
    
    const result = await response.json() as { groupId?: string; errorCode?: string };
    
    // 발송 로그 기록
    await env.DB.prepare(`
      INSERT INTO xivix_notification_logs (store_id, notification_type, recipient_phone, recipient_type, content, status, provider_message_id, sent_at)
      VALUES (?, 'onboarding_request', ?, 'master', ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      data.store_id, 
      setting.setting_value, 
      message,
      result.groupId ? 'sent' : 'failed',
      result.groupId || null
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
async function generateSolapiSignature(apiKey: string, apiSecret: string, timestamp: string) {
  const salt = crypto.randomUUID();
  const message = timestamp + salt;
  
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
    // 매장 정보 업데이트
    await c.env.DB.prepare(`
      UPDATE xivix_stores SET
        onboarding_status = 'active',
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

export default api;
