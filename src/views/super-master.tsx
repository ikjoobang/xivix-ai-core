// XIVIX AI Core V2.0 - 슈퍼 마스터 대시보드
// 방대표님 전용: 원클릭 AI 셋팅 + 봇 매장 관리
// 단순화된 UI/UX v2026.01.22

// 업종 데이터베이스 (Master Logic)
const INDUSTRY_DATABASE = [
  { id: 'BEAUTY_HAIR', name: '미용실/헤어숍', icon: 'fa-cut', specialty: '스타일 추천, 시술 소요시간 안내, 디자이너 매칭', basePrompt: '스타일링 전문가이자 뷰티 컨설턴트' },
  { id: 'BEAUTY_SKIN', name: '피부관리/에스테틱', icon: 'fa-spa', specialty: '피부 타입 분석, 홈케어 가이드, 코스별 효능 안내', basePrompt: '피부 관리 전문가이자 뷰티 어드바이저' },
  { id: 'BEAUTY_NAIL', name: '네일아트/속눈썹', icon: 'fa-hand-sparkles', specialty: '디자인 추천, 관리 팁, 예약 안내', basePrompt: '네일&속눈썹 아티스트이자 뷰티 상담사' },
  { id: 'RESTAURANT', name: '일반 식당/카페', icon: 'fa-utensils', specialty: '메뉴 추천, 주차 안내, 단체 예약, 알레르기 정보', basePrompt: '레스토랑 매니저이자 메뉴 전문가' },
  { id: 'FITNESS', name: '피트니스/요가/PT', icon: 'fa-dumbbell', specialty: '프로그램 안내, 트레이너 매칭, 회원권 상담', basePrompt: '피트니스 컨설턴트이자 건강 코치' },
  { id: 'MEDICAL', name: '병원/의원/치과', icon: 'fa-hospital', specialty: '진료 안내, 보험 상담, 예약 관리', basePrompt: '의료 코디네이터이자 환자 케어 전문가' },
  { id: 'PROFESSIONAL_LEGAL', name: '법률/세무/보험', icon: 'fa-balance-scale', specialty: '서류 요약, 상담 예약, 기초 법률/보험 상식 안내', basePrompt: '법률/세무 상담 어시스턴트' },
  { id: 'EDUCATION', name: '학원/교육/과외', icon: 'fa-graduation-cap', specialty: '수강료 안내, 커리큘럼 상담, 레벨 테스트 예약', basePrompt: '교육 상담사이자 학습 코디네이터' },
  { id: 'PET_SERVICE', name: '애견/반려동물', icon: 'fa-paw', specialty: '미용 예약, 호텔 예약, 건강 상담', basePrompt: '반려동물 케어 전문가이자 펫 컨시어지' },
  { id: 'REAL_ESTATE', name: '부동산/인테리어', icon: 'fa-home', specialty: '매물 안내, 상담 예약, 시공 문의', basePrompt: '부동산 컨설턴트이자 인테리어 상담사' },
  { id: 'AUTO_SERVICE', name: '자동차 정비/세차', icon: 'fa-car', specialty: '정비 예약, 견적 안내, 부품 상담', basePrompt: '자동차 서비스 매니저이자 정비 상담사' },
  { id: 'PHOTOGRAPHY', name: '사진관/스튜디오', icon: 'fa-camera', specialty: '촬영 예약, 패키지 안내, 포트폴리오 상담', basePrompt: '스튜디오 매니저이자 촬영 코디네이터' },
  { id: 'CUSTOM_SECTOR', name: '직접 입력 (기타)', icon: 'fa-pencil-alt', specialty: '사장님이 정의한 특정 비즈니스 로직에 맞춤 최적화', basePrompt: '비즈니스 전문 어시스턴트' }
];

export function renderSuperMasterDashboard(): string {
  const industryDataJson = JSON.stringify(INDUSTRY_DATABASE);
  
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX Master V2.0</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; }
    body { background: #0a0a0a; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .gold { color: #D4AF37; }
    .gold-bg { background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%); }
    .btn-action { transition: all 0.2s ease; transform: scale(1); }
    .btn-action:hover { transform: scale(1.02); }
    .btn-action:active { transform: scale(0.98); }
    .card-hover { transition: all 0.2s ease; }
    .card-hover:hover { border-color: rgba(212, 175, 55, 0.5); transform: translateY(-2px); }
    .pulse-dot { animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .tab-btn.active { background: rgba(212, 175, 55, 0.2); color: #D4AF37; border-color: #D4AF37; }
  </style>
</head>
<body class="min-h-screen text-white">
  
  <!-- Header -->
  <header class="glass border-b border-white/10 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-xl gold-bg flex items-center justify-center">
          <i class="fas fa-crown text-black"></i>
        </div>
        <div>
          <h1 class="text-xl font-bold">XIVIX <span class="gold">Master</span></h1>
          <p class="text-xs text-white/40">V2.0 - 원클릭 AI 관리</p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <button onclick="refreshAll()" class="px-4 py-2 glass rounded-xl text-sm hover:bg-white/10 flex items-center gap-2">
          <i class="fas fa-sync-alt"></i>
          <span>새로고침</span>
        </button>
        <div class="flex items-center gap-2 text-sm text-white/60">
          <span class="w-2 h-2 rounded-full bg-green-400 pulse-dot"></span>
          시스템 정상
        </div>
        <button onclick="logout()" class="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/30 flex items-center gap-2">
          <i class="fas fa-sign-out-alt"></i>
          <span>로그아웃</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Tab Navigation -->
  <div class="max-w-7xl mx-auto px-6 py-4">
    <div class="flex gap-2">
      <button onclick="showTab('pending')" class="tab-btn active px-6 py-3 rounded-xl border border-white/10 text-sm font-medium flex items-center gap-2">
        <i class="fas fa-clock"></i>
        연동 대기
        <span class="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs" id="pending-badge">0</span>
      </button>
      <button onclick="showTab('bots')" class="tab-btn px-6 py-3 rounded-xl border border-white/10 text-sm font-medium flex items-center gap-2">
        <i class="fas fa-robot"></i>
        봇 매장 관리
        <span class="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs" id="bots-badge">0</span>
      </button>
      <button onclick="showTab('stats')" class="tab-btn px-6 py-3 rounded-xl border border-white/10 text-sm font-medium flex items-center gap-2">
        <i class="fas fa-chart-bar"></i>
        통계
      </button>
    </div>
  </div>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-6 pb-12">
    
    <!-- Tab: 연동 대기 -->
    <div id="tab-pending" class="tab-content">
      <div class="mb-6">
        <h2 class="text-2xl font-bold mb-2">연동 대기 매장</h2>
        <p class="text-white/50">버튼 하나로 AI 셋팅을 완료하세요</p>
      </div>
      
      <div id="pending-list" class="grid gap-4">
        <div class="glass rounded-2xl p-8 text-center">
          <i class="fas fa-spinner fa-spin text-3xl text-white/30 mb-4"></i>
          <p class="text-white/50">로딩 중...</p>
        </div>
      </div>
    </div>

    <!-- Tab: 봇 매장 관리 -->
    <div id="tab-bots" class="tab-content hidden">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold mb-2">🤖 봇 매장 관리</h2>
          <p class="text-white/50">활성화된 AI 봇을 관리하고 기간을 설정하세요</p>
        </div>
      </div>
      
      <div id="bots-list" class="grid gap-4">
        <div class="glass rounded-2xl p-8 text-center">
          <i class="fas fa-spinner fa-spin text-3xl text-white/30 mb-4"></i>
          <p class="text-white/50">로딩 중...</p>
        </div>
      </div>
    </div>

    <!-- Tab: 통계 -->
    <div id="tab-stats" class="tab-content hidden">
      <div class="mb-6">
        <h2 class="text-2xl font-bold mb-2">📊 전체 통계</h2>
        <p class="text-white/50">XIVIX 시스템 현황</p>
      </div>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="glass rounded-2xl p-6 text-center">
          <p class="text-4xl font-bold gold" id="stat-total">0</p>
          <p class="text-sm text-white/50 mt-2">전체 매장</p>
        </div>
        <div class="glass rounded-2xl p-6 text-center">
          <p class="text-4xl font-bold text-green-400" id="stat-active">0</p>
          <p class="text-sm text-white/50 mt-2">봇 가동 중</p>
        </div>
        <div class="glass rounded-2xl p-6 text-center">
          <p class="text-4xl font-bold text-yellow-400" id="stat-pending">0</p>
          <p class="text-sm text-white/50 mt-2">대기 중</p>
        </div>
        <div class="glass rounded-2xl p-6 text-center">
          <p class="text-4xl font-bold text-blue-400" id="stat-conversations">0</p>
          <p class="text-sm text-white/50 mt-2">총 상담</p>
        </div>
      </div>
      
      <div class="glass rounded-2xl p-6">
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <i class="fas fa-server text-green-400"></i>
          시스템 상태
        </h3>
        <div class="grid grid-cols-3 gap-4" id="system-status">
          <div class="bg-white/5 rounded-xl p-4 flex items-center justify-between">
            <span class="text-sm">Database</span>
            <span class="w-3 h-3 rounded-full bg-green-400"></span>
          </div>
          <div class="bg-white/5 rounded-xl p-4 flex items-center justify-between">
            <span class="text-sm">KV Storage</span>
            <span class="w-3 h-3 rounded-full bg-green-400"></span>
          </div>
          <div class="bg-white/5 rounded-xl p-4 flex items-center justify-between">
            <span class="text-sm">Gemini AI</span>
            <span class="w-3 h-3 rounded-full bg-green-400"></span>
          </div>
        </div>
      </div>
    </div>

  </main>

  <!-- 봇 기간 설정 모달 -->
  <div id="bot-modal" class="fixed inset-0 bg-black/80 z-50 hidden items-center justify-center">
    <div class="glass rounded-2xl w-full max-w-md mx-4 p-6">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-bold">봇 기간 설정</h3>
        <button onclick="closeBotModal()" class="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-white/10">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="space-y-4">
        <div>
          <p class="text-sm text-white/60 mb-2">매장명</p>
          <p class="font-semibold" id="modal-store-name">-</p>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-white/60 mb-2">시작일</label>
            <input type="date" id="modal-start-date" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
          </div>
          <div>
            <label class="block text-sm text-white/60 mb-2">종료일</label>
            <input type="date" id="modal-end-date" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
          </div>
        </div>
        
        <div class="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <p class="text-sm text-blue-400">
            <i class="fas fa-info-circle mr-2"></i>
            기간 내 봇이 자동으로 고객 응대 및 예약을 처리합니다.
          </p>
        </div>
        
        <div class="flex gap-3 pt-4">
          <button onclick="closeBotModal()" class="flex-1 py-3 glass rounded-xl font-medium hover:bg-white/5">
            취소
          </button>
          <button onclick="saveBotPeriod()" class="flex-1 py-3 gold-bg text-black rounded-xl font-bold hover:opacity-90">
            저장
          </button>
        </div>
      </div>
    </div>
  </div>

  <script>
    let stores = [];
    let currentBotStoreId = null;
    const industries = ${industryDataJson};
    
    // 업종 정보 조회
    function getIndustryInfo(businessType) {
      return industries.find(i => i.id === businessType) || { icon: 'fa-store', name: businessType || '기타' };
    }
    
    // 탭 전환
    function showTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
      
      event.currentTarget.classList.add('active');
      document.getElementById('tab-' + tab).classList.remove('hidden');
    }
    
    // 전체 새로고침
    async function refreshAll() {
      const btn = event.currentTarget;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 새로고침 중...';
      btn.disabled = true;
      
      await Promise.all([loadPendingStores(), loadBotStores(), loadStats()]);
      
      btn.innerHTML = '<i class="fas fa-sync-alt"></i> 새로고침';
      btn.disabled = false;
    }
    
    // 연동 대기 매장 로드
    async function loadPendingStores() {
      try {
        const res = await fetch('/api/master/pending');
        const data = await res.json();
        
        if (data.success && data.data) {
          const pending = data.data.filter(s => s.onboarding_status === 'pending');
          document.getElementById('pending-badge').textContent = pending.length;
          document.getElementById('stat-pending').textContent = pending.length;
          
          if (pending.length === 0) {
            document.getElementById('pending-list').innerHTML = \`
              <div class="glass rounded-2xl p-12 text-center">
                <i class="fas fa-check-circle text-5xl text-green-400 mb-4"></i>
                <p class="text-xl font-semibold mb-2">모든 매장 셋팅 완료!</p>
                <p class="text-white/50">대기 중인 연동 요청이 없습니다</p>
              </div>
            \`;
            return;
          }
          
          document.getElementById('pending-list').innerHTML = pending.map(store => {
            const ind = getIndustryInfo(store.business_type);
            return \`
              <div class="glass rounded-2xl p-6 card-hover">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
                      <i class="fas \${ind.icon} text-yellow-400 text-xl"></i>
                    </div>
                    <div>
                      <h3 class="text-lg font-bold">\${store.store_name}</h3>
                      <p class="text-white/50">\${store.owner_name || '-'} 사장님 · \${store.business_type_name || ind.name}</p>
                      <p class="text-xs text-white/30 mt-1">톡톡 ID: @\${store.naver_talktalk_id || '-'}</p>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-3">
                    <button onclick="quickSetup(\${store.id})" class="btn-action px-6 py-3 gold-bg text-black rounded-xl font-bold text-sm flex items-center gap-2">
                      <i class="fas fa-magic"></i>
                      원클릭 AI 셋팅
                    </button>
                    <button onclick="deleteStore(\${store.id}, '\${store.store_name}')" class="btn-action w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 text-white/40 hover:text-red-400" title="삭제">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              </div>
            \`;
          }).join('');
        }
      } catch (e) {
        console.error('Failed to load pending stores:', e);
      }
    }
    
    // 봇 매장 로드
    async function loadBotStores() {
      try {
        const res = await fetch('/api/master/stores');
        const data = await res.json();
        
        if (data.success && data.data) {
          stores = data.data;
          const bots = data.data.filter(s => s.onboarding_status === 'active' && s.is_active === 1);
          document.getElementById('bots-badge').textContent = bots.length;
          document.getElementById('stat-active').textContent = bots.length;
          document.getElementById('stat-total').textContent = data.data.length;
          
          if (bots.length === 0) {
            document.getElementById('bots-list').innerHTML = \`
              <div class="glass rounded-2xl p-12 text-center">
                <i class="fas fa-robot text-5xl text-white/20 mb-4"></i>
                <p class="text-xl font-semibold mb-2">활성화된 봇이 없습니다</p>
                <p class="text-white/50">"연동 대기" 탭에서 매장을 활성화하세요</p>
              </div>
            \`;
            return;
          }
          
          document.getElementById('bots-list').innerHTML = bots.map(store => {
            const ind = getIndustryInfo(store.business_type);
            const startDate = store.bot_start_date || store.activated_at?.split(' ')[0] || '-';
            const endDate = store.bot_end_date || '무제한';
            const isRunning = !store.bot_end_date || new Date(store.bot_end_date) >= new Date();
            
            return \`
              <div class="glass rounded-2xl p-6 card-hover">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-2xl \${isRunning ? 'bg-green-500/20' : 'bg-red-500/20'} flex items-center justify-center relative">
                      <i class="fas fa-robot \${isRunning ? 'text-green-400' : 'text-red-400'} text-xl"></i>
                      \${isRunning ? '<span class="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full pulse-dot"></span>' : ''}
                    </div>
                    <div>
                      <h3 class="text-lg font-bold">\${store.store_name}</h3>
                      <p class="text-white/50">\${store.owner_name || '-'} 사장님 · \${store.business_type_name || ind.name}</p>
                      <div class="flex items-center gap-4 mt-2 text-xs">
                        <span class="text-white/40">
                          <i class="fas fa-calendar mr-1"></i>
                          \${startDate} ~ \${endDate}
                        </span>
                        <span class="\${isRunning ? 'text-green-400' : 'text-red-400'}">
                          <i class="fas fa-circle text-[8px] mr-1"></i>
                          \${isRunning ? '운영 중' : '기간 만료'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-2">
                    <a href="/store/\${store.id}/settings" class="btn-action px-4 py-2 gold-bg rounded-xl text-sm flex items-center gap-2 text-black font-medium">
                      <i class="fas fa-cog"></i>
                      설정
                    </a>
                    <button onclick="openBotModal(\${store.id})" class="btn-action px-4 py-2 glass rounded-xl text-sm flex items-center gap-2 hover:bg-white/10">
                      <i class="fas fa-calendar-alt"></i>
                      기간 설정
                    </button>
                    <button onclick="toggleBot(\${store.id}, \${isRunning ? 'false' : 'true'})" class="btn-action px-4 py-2 \${isRunning ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'} rounded-xl text-sm flex items-center gap-2">
                      <i class="fas \${isRunning ? 'fa-pause' : 'fa-play'}"></i>
                      \${isRunning ? '일시정지' : '재시작'}
                    </button>
                    <button onclick="deleteStore(\${store.id}, '\${store.store_name}')" class="btn-action w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 text-white/40 hover:text-red-400" title="삭제">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
                
                <div class="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <p class="text-white/40">오늘 상담</p>
                    <p class="font-bold text-lg">\${store.today_conversations || 0}</p>
                  </div>
                  <div>
                    <p class="text-white/40">총 상담</p>
                    <p class="font-bold text-lg">\${store.total_conversations || 0}</p>
                  </div>
                  <div>
                    <p class="text-white/40">예약 전환</p>
                    <p class="font-bold text-lg">\${store.total_reservations || 0}</p>
                  </div>
                </div>
              </div>
            \`;
          }).join('');
        }
      } catch (e) {
        console.error('Failed to load bot stores:', e);
      }
    }
    
    // 통계 로드
    async function loadStats() {
      try {
        const res = await fetch('/api/master/dashboard');
        const data = await res.json();
        
        if (data.success && data.data?.summary) {
          document.getElementById('stat-pending').textContent = data.data.summary.pending_stores || 0;
          document.getElementById('stat-active').textContent = data.data.summary.active_stores || 0;
        }
      } catch (e) {
        console.error('Failed to load stats:', e);
      }
    }
    
    // ========== [1] 원클릭 AI 셋팅 ==========
    async function quickSetup(storeId) {
      const btn = event.currentTarget;
      const originalHtml = btn.innerHTML;
      
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI 셋팅 중...';
      btn.disabled = true;
      
      try {
        // 1. 원클릭 셋팅 API 호출
        const res = await fetch('/api/master/quick-setup/' + storeId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await res.json();
        
        if (data.success) {
          btn.innerHTML = '<i class="fas fa-check"></i> 완료!';
          btn.classList.remove('gold-bg', 'text-black');
          btn.classList.add('bg-green-500', 'text-white');
          
          // 2초 후 새로고침
          setTimeout(() => {
            loadPendingStores();
            loadBotStores();
            loadStats();
          }, 1500);
        } else {
          alert('셋팅 실패: ' + (data.error || '알 수 없는 오류'));
          btn.innerHTML = originalHtml;
          btn.disabled = false;
        }
      } catch (e) {
        console.error('Quick setup error:', e);
        alert('네트워크 오류: ' + e.message);
        btn.innerHTML = originalHtml;
        btn.disabled = false;
      }
    }
    
    // ========== [2] 봇 기간 설정 ==========
    function openBotModal(storeId) {
      currentBotStoreId = storeId;
      const store = stores.find(s => s.id === storeId);
      
      if (store) {
        document.getElementById('modal-store-name').textContent = store.store_name;
        document.getElementById('modal-start-date').value = store.bot_start_date || new Date().toISOString().split('T')[0];
        document.getElementById('modal-end-date').value = store.bot_end_date || '';
      }
      
      document.getElementById('bot-modal').classList.remove('hidden');
      document.getElementById('bot-modal').classList.add('flex');
    }
    
    function closeBotModal() {
      document.getElementById('bot-modal').classList.add('hidden');
      document.getElementById('bot-modal').classList.remove('flex');
      currentBotStoreId = null;
    }
    
    async function saveBotPeriod() {
      if (!currentBotStoreId) return;
      
      const startDate = document.getElementById('modal-start-date').value;
      const endDate = document.getElementById('modal-end-date').value;
      
      try {
        const res = await fetch('/api/master/bot-period/' + currentBotStoreId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ start_date: startDate, end_date: endDate || null })
        });
        
        const data = await res.json();
        
        if (data.success) {
          alert('봇 기간이 설정되었습니다!');
          closeBotModal();
          loadBotStores();
        } else {
          alert('저장 실패: ' + (data.error || '알 수 없는 오류'));
        }
      } catch (e) {
        alert('네트워크 오류');
      }
    }
    
    // 봇 일시정지/재시작
    async function toggleBot(storeId, activate) {
      const action = activate === 'true' ? '재시작' : '일시정지';
      if (!confirm(\`봇을 \${action}하시겠습니까?\`)) return;
      
      try {
        const res = await fetch('/api/master/bot-toggle/' + storeId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: activate === 'true' })
        });
        
        const data = await res.json();
        
        if (data.success) {
          loadBotStores();
        } else {
          alert('실패: ' + (data.error || '알 수 없는 오류'));
        }
      } catch (e) {
        alert('네트워크 오류');
      }
    }
    
    // ========== [V2.0] 매장 삭제 ==========
    async function deleteStore(storeId, storeName) {
      // 안전장치: 확인 창
      const confirmed = confirm(\`정말 '\${storeName}' 매장을 삭제하시겠습니까?\\n\\n⚠️ 주의: 삭제 시 해당 매장의 모든 데이터(상담 로그, 예약, API 토큰)가 함께 삭제됩니다.\\n\\n이 작업은 되돌릴 수 없습니다.\`);
      
      if (!confirmed) return;
      
      // 2차 확인 (중요 데이터 보호)
      const doubleConfirm = confirm(\`마지막 확인: '\${storeName}' 매장을 정말 삭제합니까?\`);
      
      if (!doubleConfirm) return;
      
      try {
        const res = await fetch('/api/master/store/' + storeId, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await res.json();
        
        if (data.success) {
          alert(\`'\${storeName}' 매장이 삭제되었습니다.\`);
          // 모든 목록 새로고침
          loadPendingStores();
          loadBotStores();
          loadStats();
        } else {
          alert('삭제 실패: ' + (data.error || '알 수 없는 오류'));
        }
      } catch (e) {
        console.error('Delete store error:', e);
        alert('네트워크 오류가 발생했습니다.');
      }
    }
    
    // ========== 인증 관리 ==========
    function getAuthToken() {
      return localStorage.getItem('xivix_token') || sessionStorage.getItem('xivix_token');
    }
    
    function getAuthHeaders() {
      const token = getAuthToken();
      return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
    }
    
    async function checkAuth() {
      const token = getAuthToken();
      if (!token) {
        window.location.href = '/login';
        return false;
      }
      
      try {
        const res = await fetch('/api/auth/verify', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        
        if (!data.success || data.data.userType !== 'master') {
          alert('마스터 권한이 필요합니다.');
          window.location.href = '/login';
          return false;
        }
        
        return true;
      } catch (e) {
        console.error('Auth check failed:', e);
        window.location.href = '/login';
        return false;
      }
    }
    
    function logout() {
      const token = getAuthToken();
      if (token) {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token }
        }).catch(console.error);
      }
      
      localStorage.removeItem('xivix_token');
      localStorage.removeItem('xivix_user_type');
      localStorage.removeItem('xivix_user');
      sessionStorage.removeItem('xivix_token');
      sessionStorage.removeItem('xivix_user_type');
      sessionStorage.removeItem('xivix_user');
      
      window.location.href = '/login';
    }
    
    // 초기 로드
    document.addEventListener('DOMContentLoaded', async () => {
      const isAuthed = await checkAuth();
      if (!isAuthed) return;
      
      loadPendingStores();
      loadBotStores();
      loadStats();
    });
  </script>
  
</body>
</html>
`;
}
