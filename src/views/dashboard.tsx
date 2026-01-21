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
  </style>
</head>
<body class="min-h-screen text-white">
  <div class="flex h-screen overflow-hidden">
    
    <!-- Sidebar -->
    <aside class="w-64 glass border-r border-white/5 flex flex-col">
      <!-- Logo -->
      <div class="p-6 border-b border-white/5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl accent-bg flex items-center justify-center">
            <i class="fas fa-brain text-white"></i>
          </div>
          <div>
            <h1 class="text-lg font-bold">XIVIX</h1>
            <p class="text-xs text-white/40">AI Core v${version}</p>
          </div>
        </div>
      </div>
      
      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-1">
        <a href="#" class="flex items-center gap-3 px-4 py-3 rounded-xl accent-bg/10 accent font-medium">
          <i class="fas fa-chart-line w-5"></i>
          대시보드
        </a>
        <a href="#" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">
          <i class="fas fa-comments w-5"></i>
          실시간 상담
        </a>
        <a href="#" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">
          <i class="fas fa-calendar-alt w-5"></i>
          예약 관리
        </a>
        <a href="#" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">
          <i class="fas fa-store w-5"></i>
          매장 설정
        </a>
        <a href="#" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">
          <i class="fas fa-robot w-5"></i>
          AI 페르소나
        </a>
        <a href="#" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">
          <i class="fas fa-history w-5"></i>
          상담 이력
        </a>
      </nav>
      
      <!-- User Profile -->
      <div class="p-4 border-t border-white/5">
        <div class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 cursor-pointer transition-all">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <i class="fas fa-user text-sm"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">관리자</p>
            <p class="text-xs text-white/40 truncate">admin@xivix.kr</p>
          </div>
          <i class="fas fa-chevron-right text-white/30 text-xs"></i>
        </div>
      </div>
    </aside>
    
    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      
      <!-- Header -->
      <header class="glass border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold">실시간 대시보드</h2>
          <p class="text-sm text-white/40">Store ID: ${storeId}</p>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 text-sm">
            <span class="w-2 h-2 rounded-full bg-emerald-400 pulse"></span>
            <span class="text-white/60">시스템 정상</span>
          </div>
          <button class="p-2 rounded-lg hover:bg-white/5 transition-all relative">
            <i class="fas fa-bell text-white/60"></i>
            <span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
          </button>
          <button class="p-2 rounded-lg hover:bg-white/5 transition-all">
            <i class="fas fa-cog text-white/60"></i>
          </button>
        </div>
      </header>
      
      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto p-8">
        
        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <!-- Total Conversations -->
          <div class="stat-card rounded-2xl p-6 border border-white/5 transition-all">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <i class="fas fa-comments text-blue-400 text-xl"></i>
              </div>
              <span class="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                <i class="fas fa-arrow-up mr-1"></i>12%
              </span>
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
              <span class="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                <i class="fas fa-arrow-up mr-1"></i>5.2%
              </span>
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
        
        <!-- Main Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Realtime Chat Monitor -->
          <div class="lg:col-span-2 glass rounded-2xl overflow-hidden">
            <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 class="font-semibold flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400 pulse"></span>
                실시간 상담 모니터
              </h3>
              <button class="text-sm text-white/40 hover:text-white transition-all">
                전체 보기 <i class="fas fa-arrow-right ml-1"></i>
              </button>
            </div>
            <div class="p-6 h-96 overflow-y-auto space-y-4" id="chat-monitor">
              <div class="flex items-start gap-3 chat-bubble">
                <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">
                  <i class="fas fa-user text-blue-400"></i>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium">고객 #A2K9</span>
                    <span class="text-xs text-white/30">방금 전</span>
                  </div>
                  <div class="glass rounded-xl rounded-tl-none px-4 py-3 text-sm">
                    피부 관리 받고 싶은데 예약 가능한 시간 있나요?
                  </div>
                </div>
              </div>
              
              <div class="flex items-start gap-3 chat-bubble">
                <div class="w-8 h-8 rounded-full bg-[#007AFF]/20 flex items-center justify-center text-xs">
                  <i class="fas fa-robot text-[#007AFF]"></i>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium accent">XIVIX AI</span>
                    <span class="text-xs text-white/30">방금 전</span>
                    <span class="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">420ms</span>
                  </div>
                  <div class="bg-[#007AFF]/10 border border-[#007AFF]/20 rounded-xl rounded-tl-none px-4 py-3 text-sm">
                    안녕하세요. 오늘 오후 3시, 5시 슬롯이 가능합니다. 어떤 시간대가 편하실까요? 예약 도와드리겠습니다.
                  </div>
                </div>
              </div>
              
              <div class="flex items-center justify-center text-white/30 text-sm py-4">
                <i class="fas fa-spinner fa-spin mr-2"></i>
                새 메시지 대기 중...
              </div>
            </div>
          </div>
          
          <!-- Performance Chart -->
          <div class="glass rounded-2xl overflow-hidden">
            <div class="px-6 py-4 border-b border-white/5">
              <h3 class="font-semibold">응답 시간 추이</h3>
              <p class="text-xs text-white/40 mt-1">최근 24시간</p>
            </div>
            <div class="p-6">
              <canvas id="latencyChart" height="200"></canvas>
            </div>
          </div>
          
          <!-- Today's Reservations -->
          <div class="glass rounded-2xl overflow-hidden">
            <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 class="font-semibold">오늘의 AI 예약</h3>
              <span class="text-xs text-white/40" id="today-date"></span>
            </div>
            <div class="p-4 space-y-3" id="reservations-list">
              <div class="glass-hover rounded-xl p-4 cursor-pointer transition-all">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium">14:00</span>
                  <span class="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full">확정</span>
                </div>
                <p class="text-sm text-white/60">기초 피부관리 - 고객 #A2K9</p>
              </div>
              <div class="glass-hover rounded-xl p-4 cursor-pointer transition-all">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium">16:30</span>
                  <span class="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-full">대기</span>
                </div>
                <p class="text-sm text-white/60">프리미엄 케어 - 고객 #B3M2</p>
              </div>
              <div class="glass-hover rounded-xl p-4 cursor-pointer transition-all">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium">18:00</span>
                  <span class="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full">확정</span>
                </div>
                <p class="text-sm text-white/60">스페셜 트리트먼트 - 고객 #C7K1</p>
              </div>
            </div>
          </div>
          
          <!-- System Resources -->
          <div class="glass rounded-2xl overflow-hidden">
            <div class="px-6 py-4 border-b border-white/5">
              <h3 class="font-semibold">시스템 리소스</h3>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span class="text-white/60">API 요청량</span>
                  <span class="font-medium">1,247 / 10,000</span>
                </div>
                <div class="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style="width: 12%"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span class="text-white/60">KV 저장소</span>
                  <span class="font-medium">2.4 MB / 1 GB</span>
                </div>
                <div class="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style="width: 0.24%"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span class="text-white/60">R2 이미지 저장소</span>
                  <span class="font-medium">156 MB / 10 GB</span>
                </div>
                <div class="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style="width: 1.56%"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span class="text-white/60">D1 데이터베이스</span>
                  <span class="font-medium">8.2 MB / 500 MB</span>
                </div>
                <div class="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" style="width: 1.64%"></div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Conversion Funnel -->
          <div class="glass rounded-2xl overflow-hidden">
            <div class="px-6 py-4 border-b border-white/5">
              <h3 class="font-semibold">전환 퍼널</h3>
              <p class="text-xs text-white/40 mt-1">이번 주 기준</p>
            </div>
            <div class="p-6">
              <canvas id="funnelChart" height="180"></canvas>
            </div>
          </div>
          
        </div>
      </div>
      
    </main>
  </div>

  <script>
    const STORE_ID = ${storeId};
    
    // Format date
    document.getElementById('today-date').textContent = new Date().toLocaleDateString('ko-KR', {
      month: 'long', day: 'numeric', weekday: 'short'
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
    
    // Initialize charts
    function initCharts() {
      // Latency Chart
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
            x: {
              grid: { color: 'rgba(255,255,255,0.03)' },
              ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10 } }
            },
            y: {
              grid: { color: 'rgba(255,255,255,0.03)' },
              ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10 } }
            }
          }
        }
      });
      
      // Funnel Chart (Horizontal Bar)
      const funnelCtx = document.getElementById('funnelChart').getContext('2d');
      new Chart(funnelCtx, {
        type: 'bar',
        data: {
          labels: ['상담 시작', '관심 표현', '예약 문의', '예약 완료'],
          datasets: [{
            data: [100, 68, 42, 28],
            backgroundColor: [
              'rgba(0, 122, 255, 0.8)',
              'rgba(0, 200, 255, 0.7)',
              'rgba(16, 185, 129, 0.7)',
              'rgba(52, 211, 153, 0.8)'
            ],
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { color: 'rgba(255,255,255,0.03)' },
              ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10 } }
            },
            y: {
              grid: { display: false },
              ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } }
            }
          }
        }
      });
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      fetchStats();
      initCharts();
      
      // Refresh stats every 30 seconds
      setInterval(fetchStats, 30000);
    });
  </script>
</body>
</html>
  `;
}
