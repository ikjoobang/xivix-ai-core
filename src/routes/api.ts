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
