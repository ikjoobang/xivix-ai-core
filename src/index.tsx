// XIVIX AI Core V1.0 - Main Application Entry
// Hono Framework with Cloudflare Pages

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { serveStatic } from 'hono/cloudflare-workers';
import type { Env } from './types';
import webhookRoutes from './routes/webhook';
import apiRoutes from './routes/api';
import { renderLogin } from './views/login';
import { renderClientOnboarding } from './views/client-onboarding';
import { renderSuperMasterDashboard } from './views/super-master';
import { renderStoreSettings } from './views/store-settings';
import { renderRequestPage } from './views/request';
import { renderCustomerManagement } from './views/customer-management';
import { renderUnifiedAdmin } from './views/admin-unified';

const app = new Hono<{ Bindings: Env }>();

// ============ Middleware ============

// CORS for API routes
app.use('/api/*', cors({
  origin: ['https://xivix.kr', 'https://xivix-ai-core.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-Response-Time'],
  maxAge: 86400,
  credentials: true
}));

// Secure headers
app.use('*', secureHeaders({
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin'
}));

// Logger for development
app.use('*', logger());

// Response time header
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  c.res.headers.set('X-Response-Time', `${ms}ms`);
});

// Static files from public/static
app.use('/static/*', serveStatic({ root: './' }));

// Favicon
app.get('/favicon.svg', (c) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#D4AF37"/><text x="50" y="65" font-size="50" font-weight="bold" font-family="Arial" fill="#000" text-anchor="middle">X</text></svg>`;
  return c.body(svg, 200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=86400'
  });
});

app.get('/favicon.ico', (c) => {
  // Redirect to SVG favicon
  return c.redirect('/favicon.svg', 301);
});

// ============ Health Check ============
app.get('/health', async (c) => {
  const startTime = Date.now();
  
  // DB 연결 테스트
  let dbStatus = 'unknown';
  let dbLatency = 0;
  try {
    const dbStart = Date.now();
    await c.env.DB.prepare('SELECT 1').run();
    dbLatency = Date.now() - dbStart;
    dbStatus = 'healthy';
  } catch (e) {
    dbStatus = 'unhealthy';
  }
  
  // KV 연결 테스트
  let kvStatus = 'unknown';
  let kvLatency = 0;
  try {
    const kvStart = Date.now();
    await c.env.KV.get('health-check-test');
    kvLatency = Date.now() - kvStart;
    kvStatus = 'healthy';
  } catch (e) {
    kvStatus = 'unhealthy';
  }
  
  const totalLatency = Date.now() - startTime;
  const isHealthy = dbStatus === 'healthy' && kvStatus === 'healthy';
  
  return c.json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    uptime: process.uptime ? process.uptime() : null,
    services: {
      database: {
        status: dbStatus,
        latency_ms: dbLatency
      },
      kv_store: {
        status: kvStatus,
        latency_ms: kvLatency
      }
    },
    response_time_ms: totalLatency
  }, isHealthy ? 200 : 503);
});

// ============ Routes ============

// ============ [네이버 톡톡 웹훅] ============
// webhookRoutes에서 모든 webhook 처리 담당
// GET/POST /v1/naver/callback/:storeId 는 webhookRoutes에서 처리

// Mount webhook routes (네이버 톡톡) - 실제 AI 응답 로직 포함
app.route('/', webhookRoutes);

// Mount API routes
app.route('/api', apiRoutes);

// ============ Dashboard Pages ============

// Login page
app.get('/login', async (c) => {
  return c.html(renderLogin());
});

// Dashboard → Master로 리다이렉트 (폐기됨)
app.get('/dashboard', (c) => c.redirect('/master'));
app.get('/dashboard/:storeId', (c) => {
  const storeId = c.req.param('storeId');
  return c.redirect(`/store/${storeId}/settings`);
});

// ============ Zero-Touch Onboarding Pages ============

// 고객용 30초 연동 페이지
app.get('/connect', async (c) => {
  return c.html(renderClientOnboarding());
});

// 슈퍼 마스터 대시보드 (방대표님 전용)
app.get('/master', async (c) => {
  // TODO: 마스터 인증 체크
  return c.html(renderSuperMasterDashboard());
});

// 기존 admin을 master로 리다이렉트
app.get('/admin', async (c) => {
  return c.redirect('/master');
});

// 매장 상세 설정 페이지
app.get('/store/:storeId/settings', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  return c.html(renderStoreSettings(storeId));
});

// 고객 관리 페이지
app.get('/store/:storeId/customers', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  return c.html(renderCustomerManagement(storeId));
});

// 설정 변경 요청 페이지 (사장님용)
app.get('/request', async (c) => {
  return c.html(renderRequestPage());
});

// 통합 관리자 페이지 (V3.0)
app.get('/admin/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  return c.html(renderUnifiedAdmin(storeId));
});

// ============ Root & Landing ============

app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX AI Core V1.0</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; }
    body { background: #050505; }
    .gradient-text {
      background: linear-gradient(135deg, #007AFF 0%, #00D4FF 50%, #007AFF 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: gradient 3s ease infinite;
    }
    @keyframes gradient {
      0% { background-position: 0% center; }
      50% { background-position: 100% center; }
      100% { background-position: 0% center; }
    }
    .glass {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .glow {
      box-shadow: 0 0 60px rgba(0, 122, 255, 0.15);
    }
    .pulse-ring {
      animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.8); opacity: 1; }
      80%, 100% { transform: scale(2); opacity: 0; }
    }
  </style>
</head>
<body class="min-h-screen text-white overflow-x-hidden">
  <!-- Hero Section -->
  <div class="min-h-screen flex flex-col items-center justify-center relative px-4">
    <!-- Animated Background -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
    </div>
    
    <!-- Logo & Title -->
    <div class="relative z-10 text-center">
      <div class="relative inline-block mb-8">
        <div class="w-24 h-24 rounded-2xl glass glow flex items-center justify-center">
          <i class="fas fa-brain text-4xl text-[#007AFF]"></i>
        </div>
        <div class="absolute inset-0 w-24 h-24 rounded-2xl border-2 border-[#007AFF]/30 pulse-ring"></div>
      </div>
      
      <h1 class="text-5xl md:text-7xl font-bold mb-4 tracking-tight">
        <span class="gradient-text">XIVIX</span>
        <span class="text-white/90"> AI</span>
      </h1>
      
      <p class="text-xl md:text-2xl text-white/50 font-light tracking-wide mb-2">
        CORE V2.0
      </p>
      
      <p class="text-lg text-white/40 max-w-xl mx-auto mb-12 leading-relaxed">
        GPT-4o + Gemini 2.5 Pro 검증 시스템<br>
        <span class="text-[#007AFF]">전문 상담 AI 자동화 엔진</span>
      </p>
      
      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="/master" class="group px-8 py-4 bg-[#007AFF] hover:bg-[#0066DD] rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-3">
          <i class="fas fa-rocket"></i>
          마스터 대시보드
          <i class="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
        </a>
        <a href="/connect" class="px-8 py-4 glass hover:bg-white/10 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3">
          <i class="fas fa-plug"></i>
          신규 연동 신청
        </a>
      </div>
    </div>
    
    <!-- Feature Cards -->
    <div class="relative z-10 mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
      <div class="glass rounded-2xl p-6 hover:bg-white/5 transition-all duration-300">
        <div class="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
          <i class="fas fa-robot text-green-400 text-xl"></i>
        </div>
        <h3 class="text-lg font-semibold mb-2">GPT-4o 전문 상담</h3>
        <p class="text-white/50 text-sm leading-relaxed">
          의료/법률/보험 정확도 최고<br>
          전문가급 응답 품질
        </p>
      </div>
      
      <div class="glass rounded-2xl p-6 hover:bg-white/5 transition-all duration-300">
        <div class="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
          <i class="fas fa-shield-check text-indigo-400 text-xl"></i>
        </div>
        <h3 class="text-lg font-semibold mb-2">Gemini Pro 검증</h3>
        <p class="text-white/50 text-sm leading-relaxed">
          할루시네이션 자동 감지<br>
          교차 검증으로 신뢰도 보장
        </p>
      </div>
      
      <div class="glass rounded-2xl p-6 hover:bg-white/5 transition-all duration-300">
        <div class="w-12 h-12 rounded-xl bg-[#007AFF]/10 flex items-center justify-center mb-4">
          <i class="fas fa-bolt text-[#007AFF] text-xl"></i>
        </div>
        <h3 class="text-lg font-semibold mb-2">Flash 빠른 응답</h3>
        <p class="text-white/50 text-sm leading-relaxed">
          일반 문의 0.5초 응답<br>
          SSE 스트리밍 지원
        </p>
      </div>
    </div>
    
    <!-- Version Badge -->
    <div class="absolute bottom-8 text-center text-white/30 text-sm">
      <p>Powered by <span class="text-[#007AFF]">Cloudflare Workers</span> · Edge Computing</p>
    </div>
  </div>
</body>
</html>
  `);
});

// 404 Handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not Found',
    path: c.req.path,
    timestamp: Date.now()
  }, 404);
});

// Error Handler
app.onError((err, c) => {
  console.error('Application Error:', err);
  return c.json({
    success: false,
    error: err.message || 'Internal Server Error',
    timestamp: Date.now()
  }, 500);
});

export default app;
