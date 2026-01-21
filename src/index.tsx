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
import { renderDashboard } from './views/dashboard';
import { renderLogin } from './views/login';
import { renderAdminDashboard } from './views/admin-dashboard';

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

// ============ Routes ============

// Mount webhook routes (네이버 톡톡)
app.route('/', webhookRoutes);

// Mount API routes
app.route('/api', apiRoutes);

// ============ Dashboard Pages ============

// Login page
app.get('/login', async (c) => {
  return c.html(renderLogin());
});

// Main dashboard
app.get('/dashboard', async (c) => {
  // In production, check auth token from cookie/header
  const storeId = 1; // Default store
  return c.html(renderDashboard(storeId, c.env.XIVIX_VERSION));
});

// Dashboard with store ID
app.get('/dashboard/:storeId', async (c) => {
  const storeId = parseInt(c.req.param('storeId'), 10);
  return c.html(renderDashboard(storeId, c.env.XIVIX_VERSION));
});

// Admin Dashboard (멀티테넌트 업체 관리)
app.get('/admin', async (c) => {
  return c.html(renderAdminDashboard());
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
        CORE V1.0
      </p>
      
      <p class="text-lg text-white/40 max-w-xl mx-auto mb-12 leading-relaxed">
        Gemini 2.5 Flash 기반<br>
        <span class="text-[#007AFF]">초고속 AI 상담 자동화 엔진</span>
      </p>
      
      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="/dashboard" class="group px-8 py-4 bg-[#007AFF] hover:bg-[#0066DD] rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-3">
          <i class="fas fa-rocket"></i>
          대시보드 접속
          <i class="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
        </a>
        <a href="/api/system/info" class="px-8 py-4 glass hover:bg-white/10 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3">
          <i class="fas fa-code"></i>
          API 문서
        </a>
      </div>
    </div>
    
    <!-- Feature Cards -->
    <div class="relative z-10 mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
      <div class="glass rounded-2xl p-6 hover:bg-white/5 transition-all duration-300">
        <div class="w-12 h-12 rounded-xl bg-[#007AFF]/10 flex items-center justify-center mb-4">
          <i class="fas fa-bolt text-[#007AFF] text-xl"></i>
        </div>
        <h3 class="text-lg font-semibold mb-2">초고속 응답</h3>
        <p class="text-white/50 text-sm leading-relaxed">
          첫 토큰 생성 0.5초 이내<br>
          SSE 스트리밍 실시간 전송
        </p>
      </div>
      
      <div class="glass rounded-2xl p-6 hover:bg-white/5 transition-all duration-300">
        <div class="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
          <i class="fas fa-image text-cyan-400 text-xl"></i>
        </div>
        <h3 class="text-lg font-semibold mb-2">멀티모달 분석</h3>
        <p class="text-white/50 text-sm leading-relaxed">
          이미지 + 텍스트 동시 처리<br>
          맞춤형 서비스 추천
        </p>
      </div>
      
      <div class="glass rounded-2xl p-6 hover:bg-white/5 transition-all duration-300">
        <div class="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
          <i class="fas fa-calendar-check text-emerald-400 text-xl"></i>
        </div>
        <h3 class="text-lg font-semibold mb-2">예약 자동화</h3>
        <p class="text-white/50 text-sm leading-relaxed">
          네이버 예약 API 연동<br>
          AI 자동 예약 확정
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
