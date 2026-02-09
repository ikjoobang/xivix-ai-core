// XIVIX AI Core V1.0 - Premium Dashboard View
// Deep Black Theme with Glassmorphism

export function renderDashboard(storeId: number, version: string = '1.0.0'): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: 0.02em; }
    body { background: #050505; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
    
    .glass {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .glass-hover:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
    }
    .accent { color: #007AFF; }
    .accent-bg { background: #007AFF; }
    .accent-border { border-color: #007AFF; }
    
    .stat-card {
      background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
    }
    .stat-card:hover {
      background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
    }
    
    .glow { box-shadow: 0 0 40px rgba(0, 122, 255, 0.1); }
    .glow-sm { box-shadow: 0 0 20px rgba(0, 122, 255, 0.08); }
    
    .chat-bubble {
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .typing::after {
      content: '|';
      animation: blink 1s step-end infinite;
    }
    @keyframes blink {
      50% { opacity: 0; }
    }
    
    .pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .nav-item {
      cursor: pointer;
      transition: all 0.2s;
    }
    .nav-item:hover {
      background: rgba(255,255,255,0.05);
    }
    .nav-item.active {
      background: rgba(0, 122, 255, 0.1);
      color: #007AFF;
    }
    
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.8);
      z-index: 50;
      align-items: center;
      justify-content: center;
    }
    .modal.show {
      display: flex;
    }
  </style>
</head>
<body class="min-h-screen text-white">
  <div class="flex h-screen overflow-hidden">
    
    <!-- Sidebar -->
    <aside class="w-64 glass border-r border-white/5 flex flex-col">
      <!-- Logo -->
      <div class="p-6 border-b border-white/5">
        <a href="/" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div class="w-10 h-10 rounded-xl accent-bg flex items-center justify-center">
            <i class="fas fa-brain text-white"></i>
          </div>
          <div>
            <h1 class="text-lg font-bold">XIVIX</h1>
            <p class="text-xs text-white/40">AI Core v${version}</p>
          </div>
        </a>
      </div>
      
      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-1">
        <div class="nav-item active flex items-center gap-3 px-4 py-3 rounded-xl font-medium" data-section="dashboard">
          <i class="fas fa-chart-line w-5"></i>
          대시보드
        </div>
        <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-white/60" data-section="chat-test">
          <i class="fas fa-comments w-5"></i>
          AI 테스트
        </div>
        <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-white/60" data-section="logs">
          <i class="fas fa-history w-5"></i>
          상담 이력
        </div>
        <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-white/60" data-section="reservations">
          <i class="fas fa-calendar-alt w-5"></i>
          예약 관리
        </div>
        <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-white/60" data-section="messages">
          <i class="fas fa-paper-plane w-5"></i>
          메시지 발송
        </div>
        <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-white/60" data-section="usage">
          <i class="fas fa-chart-pie w-5"></i>
          사용량
        </div>
        <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-white/60" data-section="settings">
          <i class="fas fa-store w-5"></i>
          매장 설정
        </div>
      </nav>
      
      <!-- System Status -->
      <div class="p-4 border-t border-white/5">
        <div class="glass rounded-xl p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-2 h-2 rounded-full bg-emerald-400 pulse"></span>
            <span class="text-sm font-medium">시스템 상태</span>
          </div>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between">
              <span class="text-white/40">Gemini API</span>
              <span class="text-emerald-400">정상</span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/40">네이버 톡톡</span>
              <span class="text-emerald-400">연결됨</span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/40">D1 Database</span>
              <span class="text-emerald-400">정상</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
    
    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      
      <!-- Header -->
      <header class="glass border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold" id="page-title">실시간 대시보드</h2>
          <p class="text-sm text-white/40">Store ID: ${storeId}</p>
        </div>
        <div class="flex items-center gap-4">
          <button onclick="fetchStats()" class="px-4 py-2 text-sm glass rounded-lg hover:bg-white/10 transition-all">
            <i class="fas fa-sync-alt mr-2"></i>새로고침
          </button>
          <a href="/api/system/health" target="_blank" class="px-4 py-2 text-sm glass rounded-lg hover:bg-white/10 transition-all">
            <i class="fas fa-heartbeat mr-2"></i>Health
          </a>
        </div>
      </header>
      
      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto p-8">
        
        <!-- Dashboard Section -->
        <div id="section-dashboard">
          <!-- Stats Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <!-- Total Conversations -->
            <div class="stat-card rounded-2xl p-6 border border-white/5 transition-all cursor-pointer" onclick="showSection('logs')">
              <div class="flex items-center justify-between mb-4">
                <div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <i class="fas fa-comments text-blue-400 text-xl"></i>
                </div>
              </div>
              <p class="text-3xl font-bold mb-1" id="stat-total-conv">-</p>
              <p class="text-sm text-white/40">총 상담 건수</p>
            </div>
            
            <!-- Today Conversations -->
            <div class="stat-card rounded-2xl p-6 border border-white/5 transition-all">
              <div class="flex items-center justify-between mb-4">
                <div class="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <i class="fas fa-clock text-cyan-400 text-xl"></i>
                </div>
                <span class="text-xs text-white/40">오늘</span>
              </div>
              <p class="text-3xl font-bold mb-1" id="stat-today-conv">-</p>
              <p class="text-sm text-white/40">오늘 상담</p>
            </div>
            
            <!-- Conversion Rate -->
            <div class="stat-card rounded-2xl p-6 border border-white/5 transition-all">
              <div class="flex items-center justify-between mb-4">
                <div class="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <i class="fas fa-chart-line text-emerald-400 text-xl"></i>
                </div>
              </div>
              <p class="text-3xl font-bold mb-1"><span id="stat-conversion">-</span>%</p>
              <p class="text-sm text-white/40">예약 전환율</p>
            </div>
            
            <!-- Avg Response Time -->
            <div class="stat-card rounded-2xl p-6 border border-white/5 transition-all">
              <div class="flex items-center justify-between mb-4">
                <div class="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <i class="fas fa-bolt text-purple-400 text-xl"></i>
                </div>
                <span class="text-xs text-white/40">평균</span>
              </div>
              <p class="text-3xl font-bold mb-1"><span id="stat-response-time">-</span><span class="text-lg text-white/40">ms</span></p>
              <p class="text-sm text-white/40">응답 속도</p>
            </div>
          </div>
          
          <!-- Quick Actions -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button onclick="showSection('chat-test')" class="glass rounded-2xl p-6 text-left hover:bg-white/5 transition-all group">
              <div class="w-12 h-12 rounded-xl bg-[#007AFF]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <i class="fas fa-robot text-[#007AFF] text-xl"></i>
              </div>
              <h3 class="font-semibold mb-2">AI 테스트</h3>
              <p class="text-sm text-white/40">Gemini 2.5 Flash AI와 대화를 테스트합니다</p>
            </button>
            
            <button onclick="showSection('logs')" class="glass rounded-2xl p-6 text-left hover:bg-white/5 transition-all group">
              <div class="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <i class="fas fa-history text-cyan-400 text-xl"></i>
              </div>
              <h3 class="font-semibold mb-2">상담 이력</h3>
              <p class="text-sm text-white/40">고객 상담 기록을 확인합니다</p>
            </button>
            
            <button onclick="showSection('reservations')" class="glass rounded-2xl p-6 text-left hover:bg-white/5 transition-all group">
              <div class="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <i class="fas fa-calendar-check text-emerald-400 text-xl"></i>
              </div>
              <h3 class="font-semibold mb-2">예약 관리</h3>
              <p class="text-sm text-white/40">AI가 생성한 예약을 관리합니다</p>
            </button>
          </div>
          
          <!-- Charts -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="glass rounded-2xl overflow-hidden">
              <div class="px-6 py-4 border-b border-white/5">
                <h3 class="font-semibold">응답 시간 추이</h3>
                <p class="text-xs text-white/40 mt-1">최근 24시간</p>
              </div>
              <div class="p-6">
                <canvas id="latencyChart" height="200"></canvas>
              </div>
            </div>
            
            <div class="glass rounded-2xl overflow-hidden">
              <div class="px-6 py-4 border-b border-white/5">
                <h3 class="font-semibold">전환 퍼널</h3>
                <p class="text-xs text-white/40 mt-1">이번 주 기준</p>
              </div>
              <div class="p-6">
                <canvas id="funnelChart" height="200"></canvas>
              </div>
            </div>
          </div>
        </div>
        
        <!-- AI Test Section -->
        <div id="section-chat-test" class="hidden">
          <div class="max-w-3xl mx-auto">
            <div class="glass rounded-2xl overflow-hidden">
              <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 class="font-semibold flex items-center gap-2">
                  <i class="fas fa-robot text-[#007AFF]"></i>
                  AI 테스트 채팅
                </h3>
                <span class="text-xs text-white/40">Gemini 2.5 Flash</span>
              </div>
              
              <div class="h-96 overflow-y-auto p-6 space-y-4" id="chat-messages">
                <div class="text-center text-white/30 text-sm py-8">
                  <i class="fas fa-comments text-4xl mb-4 block opacity-30"></i>
                  메시지를 입력하여 AI 응답을 테스트하세요
                </div>
              </div>
              
              <div class="p-4 border-t border-white/5">
                <form id="chat-form" class="flex gap-3">
                  <input 
                    type="text" 
                    id="chat-input"
                    placeholder="메시지를 입력하세요... (예: 피부관리 예약하고 싶어요)"
                    class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#007AFF] transition-all"
                  >
                  <button type="submit" class="px-6 py-3 accent-bg rounded-xl font-medium hover:opacity-90 transition-all flex items-center gap-2">
                    <i class="fas fa-paper-plane"></i>
                    전송
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Logs Section -->
        <div id="section-logs" class="hidden">
          <div class="glass rounded-2xl overflow-hidden">
            <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 class="font-semibold">상담 이력</h3>
              <button onclick="fetchLogs()" class="text-sm text-white/40 hover:text-white transition-all">
                <i class="fas fa-sync-alt mr-1"></i> 새로고침
              </button>
            </div>
            <div class="divide-y divide-white/5" id="logs-container">
              <div class="p-8 text-center text-white/30">
                <i class="fas fa-spinner fa-spin text-2xl mb-4 block"></i>
                로딩 중...
              </div>
            </div>
          </div>
        </div>
        
        <!-- Reservations Section -->
        <div id="section-reservations" class="hidden">
          <div class="glass rounded-2xl overflow-hidden">
            <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 class="font-semibold">예약 목록</h3>
              <span class="text-xs text-white/40" id="today-date"></span>
            </div>
            <div class="divide-y divide-white/5" id="reservations-container">
              <div class="p-8 text-center text-white/30">
                <i class="fas fa-spinner fa-spin text-2xl mb-4 block"></i>
                로딩 중...
              </div>
            </div>
          </div>
        </div>
        
        <!-- Messages Section -->
        <div id="section-messages" class="hidden">
          <div class="glass rounded-2xl overflow-hidden">
            <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 class="font-semibold">메시지 발송</h3>
              <div class="flex gap-2">
                <button onclick="showMessageTab('individual')" id="tab-individual" class="px-3 py-1 text-xs rounded-lg accent-bg text-white">개별 발송</button>
                <button onclick="showMessageTab('bulk')" id="tab-bulk" class="px-3 py-1 text-xs rounded-lg bg-white/10 text-white/60">단체 발송</button>
                <button onclick="showMessageTab('history')" id="tab-history" class="px-3 py-1 text-xs rounded-lg bg-white/10 text-white/60">발송 이력</button>
              </div>
            </div>
            <div class="p-6">
              <!-- Individual Message -->
              <div id="msg-individual">
                <div class="space-y-4">
                  <div>
                    <label class="text-sm text-white/60 mb-1 block">수신자</label>
                    <input type="text" id="msg-recipient-name" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" placeholder="고객명 또는 전화번호">
                  </div>
                  <div>
                    <label class="text-sm text-white/60 mb-1 block">전화번호</label>
                    <input type="text" id="msg-recipient-phone" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" placeholder="010-1234-5678">
                  </div>
                  <div>
                    <label class="text-sm text-white/60 mb-1 block">채널</label>
                    <select id="msg-channel" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500">
                      <option value="talktalk">네이버 톡톡</option>
                      <option value="sms">SMS</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-sm text-white/60 mb-1 block">메시지 내용</label>
                    <textarea id="msg-content" rows="4" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none" placeholder="발송할 메시지를 입력하세요"></textarea>
                    <div class="text-right mt-1"><span class="text-xs text-white/40" id="msg-char-count">0 / 90자 (SMS) · 2000자 (LMS)</span></div>
                  </div>
                  <button onclick="sendIndividualMessage()" class="w-full py-3 rounded-xl accent-bg text-white font-medium hover:opacity-90 transition">
                    <i class="fas fa-paper-plane mr-2"></i>발송하기
                  </button>
                </div>
              </div>
              <!-- Bulk Message -->
              <div id="msg-bulk" class="hidden">
                <div class="space-y-4">
                  <div class="glass rounded-xl p-4">
                    <div class="flex items-center justify-between mb-3">
                      <label class="text-sm font-medium">수신 고객 선택</label>
                      <button onclick="selectAllCustomers()" class="text-xs accent cursor-pointer">전체 선택</button>
                    </div>
                    <div id="bulk-customer-list" class="max-h-48 overflow-y-auto space-y-2">
                      <div class="text-center text-white/30 py-4">고객 목록 로딩 중...</div>
                    </div>
                    <div class="mt-2 text-xs text-white/40">선택된 고객: <span id="bulk-selected-count">0</span>명</div>
                  </div>
                  <div>
                    <label class="text-sm text-white/60 mb-1 block">메시지 내용</label>
                    <textarea id="bulk-msg-content" rows="4" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none" placeholder="단체 발송할 메시지를 입력하세요"></textarea>
                  </div>
                  <button onclick="sendBulkMessage()" class="w-full py-3 rounded-xl accent-bg text-white font-medium hover:opacity-90 transition">
                    <i class="fas fa-users mr-2"></i>단체 발송하기
                  </button>
                </div>
              </div>
              <!-- Message History -->
              <div id="msg-history" class="hidden">
                <div id="msg-history-list" class="space-y-3">
                  <div class="text-center text-white/30 py-8"><i class="fas fa-spinner fa-spin text-xl mb-3 block"></i>로딩 중...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Usage Section -->
        <div id="section-usage" class="hidden">
          <div class="glass rounded-2xl overflow-hidden">
            <div class="px-6 py-4 border-b border-white/5">
              <h3 class="font-semibold">이번 달 사용량</h3>
            </div>
            <div class="p-6 space-y-6" id="usage-container">
              <div class="text-center text-white/30 py-8"><i class="fas fa-spinner fa-spin text-xl mb-3 block"></i>로딩 중...</div>
            </div>
          </div>
        </div>
        
        <!-- Settings Section -->
        <div id="section-settings" class="hidden">
          <div class="glass rounded-2xl overflow-hidden">
            <div class="px-6 py-4 border-b border-white/5">
              <h3 class="font-semibold">매장 설정</h3>
            </div>
            <div class="p-6" id="settings-container">
              <div class="p-8 text-center text-white/30">
                <i class="fas fa-spinner fa-spin text-2xl mb-4 block"></i>
                로딩 중...
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </main>
  </div>

  <script>
    const STORE_ID = ${storeId};
    let currentSection = 'dashboard';
    
    // Format date
    document.getElementById('today-date').textContent = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    });
    
    // Navigation
    function showSection(section) {
      // Hide all sections
      document.querySelectorAll('[id^="section-"]').forEach(el => el.classList.add('hidden'));
      // Show selected section
      document.getElementById('section-' + section).classList.remove('hidden');
      
      // Update nav items
      document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active', 'accent');
        el.classList.add('text-white/60');
      });
      const activeNav = document.querySelector('[data-section="' + section + '"]');
      if (activeNav) {
        activeNav.classList.add('active', 'accent');
        activeNav.classList.remove('text-white/60');
      }
      
      // Update title
      const titles = {
        'dashboard': '실시간 대시보드',
        'chat-test': 'AI 테스트',
        'logs': '상담 이력',
        'reservations': '예약 관리',
        'messages': '메시지 발송',
        'usage': '사용량',
        'settings': '매장 설정'
      };
      document.getElementById('page-title').textContent = titles[section] || section;
      
      currentSection = section;
      
      // Load data for section
      if (section === 'logs') fetchLogs();
      if (section === 'reservations') fetchReservations();
      if (section === 'messages') fetchCustomersForBulk();
      if (section === 'usage') fetchUsage();
      if (section === 'settings') fetchSettings();
    }
    
    // Setup nav click handlers
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section;
        if (section) showSection(section);
      });
    });
    
    // Fetch dashboard stats
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats/' + STORE_ID);
        const data = await res.json();
        
        if (data.success && data.data) {
          document.getElementById('stat-total-conv').textContent = data.data.total_conversations.toLocaleString();
          document.getElementById('stat-today-conv').textContent = data.data.today_conversations.toLocaleString();
          document.getElementById('stat-conversion').textContent = data.data.conversion_rate.toFixed(1);
          document.getElementById('stat-response-time').textContent = data.data.avg_response_time_ms.toLocaleString();
        }
      } catch (e) {
        console.error('Failed to fetch stats:', e);
      }
    }
    
    // Fetch logs
    async function fetchLogs() {
      try {
        const res = await fetch('/api/logs/' + STORE_ID + '?limit=20');
        const data = await res.json();
        
        const container = document.getElementById('logs-container');
        if (data.success && data.data && data.data.length > 0) {
          container.innerHTML = data.data.map(log => \`
            <div class="p-4 hover:bg-white/5 transition-all">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-user text-blue-400"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium">\${log.customer_id}</span>
                    <span class="text-xs text-white/30">\${new Date(log.created_at).toLocaleString('ko-KR')}</span>
                    <span class="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">\${log.response_time_ms}ms</span>
                  </div>
                  <p class="text-sm text-white/60 mb-2">\${log.customer_message}</p>
                  <div class="bg-[#007AFF]/10 border border-[#007AFF]/20 rounded-lg px-3 py-2 text-sm">
                    <span class="text-[#007AFF] text-xs font-medium">AI 응답:</span>
                    <p class="text-white/80 mt-1">\${log.ai_response}</p>
                  </div>
                </div>
              </div>
            </div>
          \`).join('');
        } else {
          container.innerHTML = '<div class="p-8 text-center text-white/30">상담 이력이 없습니다</div>';
        }
      } catch (e) {
        console.error('Failed to fetch logs:', e);
      }
    }
    
    // Fetch reservations
    async function fetchReservations() {
      try {
        const res = await fetch('/api/reservations/' + STORE_ID);
        const data = await res.json();
        
        const container = document.getElementById('reservations-container');
        if (data.success && data.data && data.data.length > 0) {
          container.innerHTML = data.data.map(r => \`
            <div class="p-4 hover:bg-white/5 transition-all flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <i class="fas fa-calendar-check text-emerald-400"></i>
                </div>
                <div>
                  <p class="font-medium">\${r.service_name}</p>
                  <p class="text-sm text-white/40">\${r.reservation_date} \${r.reservation_time} · \${r.customer_name || r.customer_id}</p>
                </div>
              </div>
              <span class="text-xs px-3 py-1 rounded-full \${
                r.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' :
                r.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                r.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                'bg-white/10 text-white/60'
              }">\${
                r.status === 'confirmed' ? '확정' :
                r.status === 'pending' ? '대기' :
                r.status === 'cancelled' ? '취소' :
                r.status === 'completed' ? '완료' : r.status
              }</span>
            </div>
          \`).join('');
        } else {
          container.innerHTML = '<div class="p-8 text-center text-white/30">예약이 없습니다</div>';
        }
      } catch (e) {
        console.error('Failed to fetch reservations:', e);
      }
    }
    
    // Fetch settings
    async function fetchSettings() {
      try {
        const res = await fetch('/api/stores/' + STORE_ID);
        const data = await res.json();
        
        const container = document.getElementById('settings-container');
        if (data.success && data.data) {
          const store = data.data;
          container.innerHTML = \`
            <div class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm text-white/40 mb-2">매장명</label>
                  <div class="glass rounded-xl px-4 py-3">\${store.store_name}</div>
                </div>
                <div>
                  <label class="block text-sm text-white/40 mb-2">업종</label>
                  <div class="glass rounded-xl px-4 py-3">\${store.business_type}</div>
                </div>
                <div>
                  <label class="block text-sm text-white/40 mb-2">영업시간</label>
                  <div class="glass rounded-xl px-4 py-3">\${store.operating_hours}</div>
                </div>
                <div>
                  <label class="block text-sm text-white/40 mb-2">전화번호</label>
                  <div class="glass rounded-xl px-4 py-3">\${store.phone || '-'}</div>
                </div>
              </div>
              <div>
                <label class="block text-sm text-white/40 mb-2">AI 페르소나</label>
                <div class="glass rounded-xl px-4 py-3 text-sm">\${store.ai_persona || '설정되지 않음'}</div>
              </div>
              <div>
                <label class="block text-sm text-white/40 mb-2">AI 말투</label>
                <div class="glass rounded-xl px-4 py-3 text-sm">\${store.ai_tone || '설정되지 않음'}</div>
              </div>
            </div>
          \`;
        } else {
          container.innerHTML = '<div class="p-8 text-center text-white/30">매장 정보를 불러올 수 없습니다</div>';
        }
      } catch (e) {
        console.error('Failed to fetch settings:', e);
      }
    }
    
    // Chat form
    document.getElementById('chat-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const message = input.value.trim();
      if (!message) return;
      
      const container = document.getElementById('chat-messages');
      
      // Clear initial message
      if (container.querySelector('.text-center')) {
        container.innerHTML = '';
      }
      
      // Add user message
      container.innerHTML += \`
        <div class="flex items-start gap-3 chat-bubble">
          <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">
            <i class="fas fa-user text-blue-400"></i>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-sm font-medium">나</span>
              <span class="text-xs text-white/30">방금 전</span>
            </div>
            <div class="glass rounded-xl rounded-tl-none px-4 py-3 text-sm">\${message}</div>
          </div>
        </div>
      \`;
      
      // Add loading indicator
      const loadingId = 'loading-' + Date.now();
      container.innerHTML += \`
        <div id="\${loadingId}" class="flex items-start gap-3 chat-bubble">
          <div class="w-8 h-8 rounded-full bg-[#007AFF]/20 flex items-center justify-center text-xs">
            <i class="fas fa-robot text-[#007AFF]"></i>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-sm font-medium accent">XIVIX AI</span>
              <span class="text-xs text-white/30">응답 중...</span>
            </div>
            <div class="bg-[#007AFF]/10 border border-[#007AFF]/20 rounded-xl rounded-tl-none px-4 py-3 text-sm">
              <i class="fas fa-spinner fa-spin mr-2"></i>AI가 응답을 생성하고 있습니다...
            </div>
          </div>
        </div>
      \`;
      
      container.scrollTop = container.scrollHeight;
      input.value = '';
      
      try {
        const startTime = Date.now();
        const res = await fetch('/v1/test/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, customer_id: 'dashboard-test' })
        });
        const data = await res.json();
        const responseTime = Date.now() - startTime;
        
        // Remove loading indicator
        document.getElementById(loadingId).remove();
        
        if (data.success) {
          container.innerHTML += \`
            <div class="flex items-start gap-3 chat-bubble">
              <div class="w-8 h-8 rounded-full bg-[#007AFF]/20 flex items-center justify-center text-xs">
                <i class="fas fa-robot text-[#007AFF]"></i>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-medium accent">XIVIX AI</span>
                  <span class="text-xs text-white/30">방금 전</span>
                  <span class="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">\${data.response_time_ms || responseTime}ms</span>
                </div>
                <div class="bg-[#007AFF]/10 border border-[#007AFF]/20 rounded-xl rounded-tl-none px-4 py-3 text-sm whitespace-pre-wrap">\${data.response}</div>
              </div>
            </div>
          \`;
        } else {
          container.innerHTML += \`
            <div class="flex items-start gap-3 chat-bubble">
              <div class="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-xs">
                <i class="fas fa-exclamation text-red-400"></i>
              </div>
              <div class="flex-1">
                <div class="bg-red-500/10 border border-red-500/20 rounded-xl rounded-tl-none px-4 py-3 text-sm text-red-400">
                  오류: \${data.error || '응답을 받을 수 없습니다'}
                </div>
              </div>
            </div>
          \`;
        }
        
        container.scrollTop = container.scrollHeight;
      } catch (err) {
        document.getElementById(loadingId).remove();
        container.innerHTML += \`
          <div class="text-center text-red-400 text-sm py-2">
            네트워크 오류가 발생했습니다
          </div>
        \`;
      }
    });
    
    // Initialize charts
    function initCharts() {
      const latencyCtx = document.getElementById('latencyChart').getContext('2d');
      new Chart(latencyCtx, {
        type: 'line',
        data: {
          labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
          datasets: [{
            label: '응답시간 (ms)',
            data: [380, 420, 350, 480, 520, 410, 390],
            borderColor: '#007AFF',
            backgroundColor: 'rgba(0, 122, 255, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10 } } }
          }
        }
      });
      
      const funnelCtx = document.getElementById('funnelChart').getContext('2d');
      new Chart(funnelCtx, {
        type: 'bar',
        data: {
          labels: ['상담 시작', '관심 표현', '예약 문의', '예약 완료'],
          datasets: [{
            data: [100, 68, 42, 28],
            backgroundColor: ['rgba(0, 122, 255, 0.8)', 'rgba(0, 200, 255, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(52, 211, 153, 0.8)'],
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10 } } },
            y: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } } }
          }
        }
      });
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      fetchStats();
      initCharts();
      setInterval(fetchStats, 30000);
    });
    
    // ============ 메시지 발송 기능 ============
    function showMessageTab(tab) {
      ['individual', 'bulk', 'history'].forEach(t => {
        document.getElementById('msg-' + t).classList.add('hidden');
        document.getElementById('tab-' + t).classList.remove('accent-bg');
        document.getElementById('tab-' + t).classList.add('bg-white/10', 'text-white/60');
      });
      document.getElementById('msg-' + tab).classList.remove('hidden');
      document.getElementById('tab-' + tab).classList.add('accent-bg');
      document.getElementById('tab-' + tab).classList.remove('bg-white/10', 'text-white/60');
      document.getElementById('tab-' + tab).classList.add('text-white');
      
      if (tab === 'bulk') fetchCustomersForBulk();
      if (tab === 'history') fetchMessageHistory();
    }
    
    // 글자수 카운터
    document.getElementById('msg-content')?.addEventListener('input', function() {
      const len = this.value.length;
      const type = len <= 90 ? 'SMS' : 'LMS';
      document.getElementById('msg-char-count').textContent = len + ' / 90자 (SMS) · 2000자 (LMS)' + (len > 90 ? ' → LMS 적용' : '');
    });
    
    // 개별 메시지 발송
    async function sendIndividualMessage() {
      const phone = document.getElementById('msg-recipient-phone').value.trim();
      const message = document.getElementById('msg-content').value.trim();
      const channel = document.getElementById('msg-channel').value;
      const name = document.getElementById('msg-recipient-name').value.trim();
      
      if (!message) { alert('메시지 내용을 입력해주세요'); return; }
      if (channel === 'sms' && !phone) { alert('SMS 발송 시 전화번호가 필요합니다'); return; }
      
      try {
        const res = await fetch('/api/stores/' + STORE_ID + '/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_name: name, customer_phone: phone, message, channel })
        });
        const data = await res.json();
        
        if (data.success) {
          alert('메시지가 발송되었습니다!');
          document.getElementById('msg-content').value = '';
          document.getElementById('msg-recipient-phone').value = '';
          document.getElementById('msg-recipient-name').value = '';
        } else {
          alert('발송 실패: ' + (data.error || '알 수 없는 오류'));
        }
      } catch (err) {
        alert('네트워크 오류가 발생했습니다');
      }
    }
    
    // 단체 발송용 고객 목록 로드
    let bulkCustomers = [];
    let selectedCustomerIds = new Set();
    
    async function fetchCustomersForBulk() {
      try {
        const res = await fetch('/api/store/' + STORE_ID + '/customers?limit=100');
        const data = await res.json();
        bulkCustomers = data.success ? (data.data || []) : [];
        renderBulkCustomerList();
      } catch { bulkCustomers = []; renderBulkCustomerList(); }
    }
    
    function renderBulkCustomerList() {
      const container = document.getElementById('bulk-customer-list');
      if (bulkCustomers.length === 0) {
        container.innerHTML = '<div class="text-center text-white/30 py-4">등록된 고객이 없습니다</div>';
        return;
      }
      container.innerHTML = bulkCustomers.map(c => \`
        <label class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer">
          <input type="checkbox" class="bulk-check rounded" value="\${c.id}" onchange="updateBulkCount()" \${selectedCustomerIds.has(c.id) ? 'checked' : ''}>
          <span class="text-sm">\${c.customer_name || '고객'}</span>
          <span class="text-xs text-white/40 ml-auto">\${c.phone || c.naver_user_id || '-'}</span>
        </label>
      \`).join('');
    }
    
    function updateBulkCount() {
      selectedCustomerIds = new Set(
        [...document.querySelectorAll('.bulk-check:checked')].map(el => parseInt(el.value))
      );
      document.getElementById('bulk-selected-count').textContent = selectedCustomerIds.size;
    }
    
    function selectAllCustomers() {
      const checkboxes = document.querySelectorAll('.bulk-check');
      const allChecked = [...checkboxes].every(cb => cb.checked);
      checkboxes.forEach(cb => cb.checked = !allChecked);
      updateBulkCount();
    }
    
    // 단체 메시지 발송
    async function sendBulkMessage() {
      const message = document.getElementById('bulk-msg-content').value.trim();
      if (!message) { alert('메시지 내용을 입력해주세요'); return; }
      if (selectedCustomerIds.size === 0) { alert('수신 고객을 선택해주세요'); return; }
      
      if (!confirm(\`\${selectedCustomerIds.size}명에게 발송하시겠습니까?\`)) return;
      
      try {
        const res = await fetch('/api/stores/' + STORE_ID + '/send-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_ids: [...selectedCustomerIds], message, channel: 'talktalk' })
        });
        const data = await res.json();
        
        if (data.success) {
          alert(\`발송 완료: \${data.data.successCount}/\${selectedCustomerIds.size}건 성공\`);
          document.getElementById('bulk-msg-content').value = '';
          selectedCustomerIds.clear();
          updateBulkCount();
        } else {
          alert('발송 실패: ' + (data.error || '알 수 없는 오류'));
        }
      } catch (err) {
        alert('네트워크 오류가 발생했습니다');
      }
    }
    
    // 발송 이력 조회
    async function fetchMessageHistory() {
      try {
        const res = await fetch('/api/stores/' + STORE_ID + '/messages?limit=20');
        const data = await res.json();
        const list = data.success ? (data.data || []) : [];
        
        const container = document.getElementById('msg-history-list');
        if (list.length === 0) {
          container.innerHTML = '<div class="text-center text-white/30 py-8"><i class="fas fa-inbox text-3xl mb-3 block"></i>발송 이력이 없습니다</div>';
          return;
        }
        
        container.innerHTML = list.map(m => \`
          <div class="glass rounded-xl p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs px-2 py-1 rounded \${m.message_type === 'bulk' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}">
                \${m.message_type === 'bulk' ? '단체' : '개별'} · \${m.channel}
              </span>
              <span class="text-xs text-white/40">\${new Date(m.sent_at || m.created_at).toLocaleString('ko-KR')}</span>
            </div>
            <p class="text-sm text-white/80 truncate">\${m.message_content}</p>
            <div class="flex items-center gap-3 mt-2 text-xs text-white/40">
              <span><i class="fas fa-users mr-1"></i>\${m.recipient_count}명</span>
              <span class="text-emerald-400"><i class="fas fa-check mr-1"></i>\${m.success_count}건 성공</span>
              \${m.fail_count > 0 ? '<span class="text-red-400"><i class="fas fa-times mr-1"></i>' + m.fail_count + '건 실패</span>' : ''}
              <span class="\${m.status === 'sent' ? 'text-emerald-400' : m.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}">\${m.status}</span>
            </div>
          </div>
        \`).join('');
      } catch {
        document.getElementById('msg-history-list').innerHTML = '<div class="text-center text-red-400 py-4">이력 조회 실패</div>';
      }
    }
    
    // ============ 사용량 기능 ============
    async function fetchUsage() {
      try {
        const [usageRes, planRes] = await Promise.all([
          fetch('/api/usage/' + STORE_ID),
          fetch('/api/plan/' + STORE_ID)
        ]);
        const usageData = await usageRes.json();
        const planData = await planRes.json();
        
        if (!usageData.success) return;
        
        const u = usageData.data;
        const plan = planData.data || {};
        const config = plan.planConfig || {};
        
        const container = document.getElementById('usage-container');
        container.innerHTML = \`
          <!-- 요금제 정보 -->
          <div class="glass rounded-xl p-5">
            <div class="flex items-center justify-between mb-3">
              <div>
                <h4 class="text-lg font-semibold">\${config.name || '라이트'} <span class="text-sm text-white/40">(\${config.nameEn || 'Light'})</span></h4>
                <p class="text-sm text-white/50 mt-1">월 \${(config.monthlyFee || 49000).toLocaleString()}원 · \${u.month}</p>
              </div>
              <span class="px-3 py-1 rounded-full text-xs \${plan.payment_status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}">
                \${plan.payment_status === 'active' ? '정상' : plan.payment_status || '대기'}
              </span>
            </div>
          </div>
          
          <!-- AI 대화 사용량 -->
          <div class="glass rounded-xl p-5">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <i class="fas fa-robot accent"></i>
                <span class="font-medium">AI 대화</span>
              </div>
              <span class="text-sm">\${u.ai.used.toLocaleString()} / \${u.ai.limit.toLocaleString()}건</span>
            </div>
            <div class="w-full bg-white/5 rounded-full h-3 overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500 \${u.ai.percentage > 90 ? 'bg-red-500' : u.ai.percentage > 70 ? 'bg-yellow-500' : 'bg-blue-500'}" 
                   style="width: \${Math.min(100, u.ai.percentage)}%"></div>
            </div>
            <div class="flex justify-between mt-2 text-xs text-white/40">
              <span>\${u.ai.percentage}% 사용</span>
              <span>\${(u.ai.limit - u.ai.used).toLocaleString()}건 남음</span>
            </div>
          </div>
          
          <!-- SMS 사용량 -->
          <div class="glass rounded-xl p-5">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <i class="fas fa-sms accent"></i>
                <span class="font-medium">SMS</span>
              </div>
              <span class="text-sm">\${u.sms.used.toLocaleString()} / \${u.sms.limit.toLocaleString()}건</span>
            </div>
            <div class="w-full bg-white/5 rounded-full h-3 overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500 \${u.sms.percentage > 100 ? 'bg-red-500' : u.sms.percentage > 80 ? 'bg-yellow-500' : 'bg-emerald-500'}" 
                   style="width: \${Math.min(100, u.sms.percentage)}%"></div>
            </div>
            <div class="flex justify-between mt-2 text-xs text-white/40">
              <span>\${u.sms.percentage}% 사용</span>
              \${u.sms.extraCount > 0 ? '<span class="text-yellow-400">초과 ' + u.sms.extraCount + '건 (' + u.sms.extraCost.toLocaleString() + '원)</span>' : '<span>' + Math.max(0, u.sms.limit - u.sms.used) + '건 남음</span>'}
            </div>
          </div>
          
          <!-- 기타 사용량 -->
          <div class="grid grid-cols-3 gap-3">
            <div class="glass rounded-xl p-4 text-center">
              <i class="fas fa-comment-dots text-lg mb-2 text-blue-400 block"></i>
              <div class="text-xl font-bold">\${u.talktalk.toLocaleString()}</div>
              <div class="text-xs text-white/40 mt-1">톡톡 발송</div>
            </div>
            <div class="glass rounded-xl p-4 text-center">
              <i class="fas fa-envelope text-lg mb-2 text-purple-400 block"></i>
              <div class="text-xl font-bold">\${u.lms}</div>
              <div class="text-xs text-white/40 mt-1">LMS 발송</div>
            </div>
            <div class="glass rounded-xl p-4 text-center">
              <i class="fas fa-image text-lg mb-2 text-emerald-400 block"></i>
              <div class="text-xl font-bold">\${u.imageAnalyses}</div>
              <div class="text-xs text-white/40 mt-1">이미지 분석</div>
            </div>
          </div>
          
          <!-- 활성 기능 목록 -->
          <div class="glass rounded-xl p-5">
            <h4 class="font-medium mb-3"><i class="fas fa-check-circle accent mr-2"></i>활성 기능</h4>
            <div class="flex flex-wrap gap-2">
              \${(config.features || []).map(f => {
                const names = {
                  aiAutoResponse: 'AI 자동응답', multiLanguage: '다국어', reservationReminder: '예약 리마인더',
                  menuPriceGuide: '메뉴 안내', locationHoursGuide: '위치 안내', customerDataMgmt: 'CRM',
                  visitCycleAlert: '방문주기 알림', revenueStats: '매출 통계', manualMessageIndiv: '개별 발송',
                  manualMessageBulk: '단체 발송', expertAI: '전문 상담 AI', verificationAI: '검증 AI',
                  imageAnalysis: '이미지 분석', multiStore: '멀티매장', dedicatedManager: '전담 매니저',
                  noshowPrevention: '노쇼 방지', monthlyReport: '월간 리포트', callbackRequest: '콜백 요청'
                };
                return '<span class="px-3 py-1 text-xs rounded-full bg-white/5 text-white/70">' + (names[f] || f) + '</span>';
              }).join('')}
            </div>
          </div>
        \`;
      } catch (err) {
        document.getElementById('usage-container').innerHTML = '<div class="text-center text-red-400 py-4">사용량 조회 실패</div>';
      }
    }
  </script>
</body>
</html>
  `;
}
