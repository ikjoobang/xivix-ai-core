// XIVIX AI Core V1.0 - 슈퍼 마스터 대시보드
// 방대표님 전용: 모든 매장의 '심장'을 조종하는 곳

export function renderSuperMasterDashboard(): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX Master - 슈퍼 관리자</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; }
    body { background: #050505; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.06); }
    .gold { color: #D4AF37; }
    .gold-bg { background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%); }
    .accent { color: #007AFF; }
    .accent-bg { background: #007AFF; }
    .status-pending { background: rgba(234, 179, 8, 0.1); color: #EAB308; border: 1px solid rgba(234, 179, 8, 0.3); }
    .status-active { background: rgba(16, 185, 129, 0.1); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); }
    .status-paused { background: rgba(239, 68, 68, 0.1); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); }
    .nav-item { transition: all 0.2s ease; }
    .nav-item:hover { background: rgba(255,255,255,0.05); }
    .nav-item.active { background: rgba(212, 175, 55, 0.1); border-left: 3px solid #D4AF37; }
    .store-card { transition: all 0.2s ease; cursor: pointer; }
    .store-card:hover { transform: translateY(-2px); border-color: rgba(212, 175, 55, 0.5); }
    .pulse-alert { animation: pulseAlert 2s infinite; }
    @keyframes pulseAlert {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body class="min-h-screen text-white">
  
  <div class="flex h-screen overflow-hidden">
    
    <!-- Sidebar -->
    <aside class="w-72 glass border-r border-white/5 flex flex-col">
      <div class="p-6 border-b border-white/5">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl gold-bg flex items-center justify-center">
            <i class="fas fa-crown text-black text-xl"></i>
          </div>
          <div>
            <h1 class="text-lg font-bold">XIVIX <span class="gold">Master</span></h1>
            <p class="text-xs text-white/40">슈퍼 관리자 콘솔</p>
          </div>
        </div>
      </div>
      
      <nav class="flex-1 p-4">
        <p class="text-xs text-white/30 uppercase tracking-wider mb-3 px-3">메인</p>
        <div class="space-y-1 mb-6">
          <div class="nav-item active flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer" onclick="showSection('pending')">
            <i class="fas fa-bell text-yellow-400 w-5"></i>
            <span>연동 대기</span>
            <span class="ml-auto bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full" id="pending-count">0</span>
          </div>
          <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer" onclick="showSection('stores')">
            <i class="fas fa-store w-5 text-white/60"></i>
            <span>전체 매장</span>
            <span class="ml-auto text-white/40 text-xs" id="store-count">0</span>
          </div>
          <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer" onclick="showSection('monitoring')">
            <i class="fas fa-eye w-5 text-white/60"></i>
            <span>실시간 모니터링</span>
          </div>
        </div>
        
        <p class="text-xs text-white/30 uppercase tracking-wider mb-3 px-3">설정</p>
        <div class="space-y-1">
          <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer" onclick="showSection('notifications')">
            <i class="fas fa-bell w-5 text-white/60"></i>
            <span>알림 설정</span>
          </div>
          <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer" onclick="showSection('security')">
            <i class="fas fa-shield-alt w-5 text-white/60"></i>
            <span>보안</span>
          </div>
        </div>
      </nav>
      
      <div class="p-4 border-t border-white/5">
        <div class="glass rounded-xl p-4">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-full gold-bg flex items-center justify-center">
              <i class="fas fa-user text-black"></i>
            </div>
            <div>
              <p class="font-medium">방대표님</p>
              <p class="text-xs text-white/40">Master Admin</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
    
    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      
      <!-- Header -->
      <header class="glass border-b border-white/5 px-8 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold" id="section-title">연동 대기 목록</h2>
            <p class="text-sm text-white/40" id="section-desc">사장님들이 연동 요청한 매장을 관리합니다</p>
          </div>
          <div class="flex items-center gap-4">
            <button onclick="refreshData()" class="px-4 py-2 glass rounded-lg hover:bg-white/5 transition-all">
              <i class="fas fa-sync-alt mr-2"></i>새로고침
            </button>
          </div>
        </div>
      </header>
      
      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto p-8">
        
        <!-- Section: 연동 대기 -->
        <div id="section-pending">
          
          <!-- Alert Banner -->
          <div class="glass rounded-xl p-4 mb-6 border border-yellow-500/30 bg-yellow-500/5 pulse-alert" id="alert-banner" style="display: none;">
            <div class="flex items-center gap-3">
              <i class="fas fa-exclamation-circle text-yellow-400 text-xl"></i>
              <div>
                <p class="font-medium">새로운 연동 요청이 있습니다!</p>
                <p class="text-sm text-white/60">가능한 빨리 세팅을 완료해주세요.</p>
              </div>
            </div>
          </div>
          
          <!-- Pending List -->
          <div id="pending-list" class="space-y-4">
            <div class="glass rounded-xl p-8 text-center">
              <i class="fas fa-spinner fa-spin text-2xl text-white/30 mb-4"></i>
              <p class="text-white/40">로딩 중...</p>
            </div>
          </div>
        </div>
        
        <!-- Section: 전체 매장 -->
        <div id="section-stores" class="hidden">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="stores-grid">
            <div class="glass rounded-xl p-8 text-center col-span-full">
              <i class="fas fa-spinner fa-spin text-2xl text-white/30 mb-4"></i>
              <p class="text-white/40">로딩 중...</p>
            </div>
          </div>
        </div>
        
        <!-- Section: 실시간 모니터링 -->
        <div id="section-monitoring" class="hidden">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="glass rounded-xl p-6">
              <h3 class="font-semibold mb-4 flex items-center gap-2">
                <i class="fas fa-comments text-green-400"></i>
                실시간 대화
              </h3>
              <div id="live-conversations" class="space-y-3 max-h-96 overflow-y-auto">
                <p class="text-white/40 text-center py-8">매장을 선택하면 실시간 대화가 표시됩니다</p>
              </div>
            </div>
            <div class="glass rounded-xl p-6">
              <h3 class="font-semibold mb-4 flex items-center gap-2">
                <i class="fas fa-chart-line text-blue-400"></i>
                실시간 통계
              </h3>
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-white/5 rounded-xl p-4 text-center">
                  <p class="text-2xl font-bold gold" id="stat-total">0</p>
                  <p class="text-sm text-white/40">총 매장</p>
                </div>
                <div class="bg-white/5 rounded-xl p-4 text-center">
                  <p class="text-2xl font-bold text-green-400" id="stat-active">0</p>
                  <p class="text-sm text-white/40">운영 중</p>
                </div>
                <div class="bg-white/5 rounded-xl p-4 text-center">
                  <p class="text-2xl font-bold text-yellow-400" id="stat-pending">0</p>
                  <p class="text-sm text-white/40">대기 중</p>
                </div>
                <div class="bg-white/5 rounded-xl p-4 text-center">
                  <p class="text-2xl font-bold text-blue-400" id="stat-today">0</p>
                  <p class="text-sm text-white/40">오늘 상담</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Section: 알림 설정 -->
        <div id="section-notifications" class="hidden">
          <div class="glass rounded-xl p-6 max-w-2xl">
            <h3 class="font-semibold mb-6">카카오톡 알림 설정</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm text-white/60 mb-2">솔라피 API Key</label>
                <input type="password" id="solapi-key" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]" placeholder="솔라피 API Key 입력">
              </div>
              <div>
                <label class="block text-sm text-white/60 mb-2">발신 번호</label>
                <input type="tel" id="sender-number" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]" placeholder="010-0000-0000">
              </div>
              <div>
                <label class="block text-sm text-white/60 mb-2">알림 수신 번호 (방대표님)</label>
                <input type="tel" id="admin-number" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]" placeholder="010-0000-0000">
              </div>
              <button onclick="saveNotificationSettings()" class="w-full py-3 gold-bg text-black rounded-xl font-medium hover:opacity-90">
                설정 저장
              </button>
            </div>
          </div>
        </div>
        
        <!-- Section: 보안 -->
        <div id="section-security" class="hidden">
          <div class="glass rounded-xl p-6 max-w-2xl">
            <h3 class="font-semibold mb-6">보안 설정</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <p class="font-medium">2단계 인증 (2FA)</p>
                  <p class="text-sm text-white/40">마스터 페이지 접근 시 추가 인증</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" class="sr-only peer" checked>
                  <div class="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
              <div class="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <p class="font-medium">접근 로그 기록</p>
                  <p class="text-sm text-white/40">모든 관리자 활동 기록</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" class="sr-only peer" checked>
                  <div class="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </main>
    
    <!-- Store Setup Modal -->
    <div id="setup-modal" class="fixed inset-0 bg-black/80 z-50 hidden items-center justify-center overflow-y-auto">
      <div class="w-full max-w-2xl mx-auto p-4 my-8">
        <div class="glass rounded-2xl overflow-hidden">
          <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-lg">매장 세팅</h3>
              <p class="text-sm text-white/40" id="modal-store-name">매장명</p>
            </div>
            <button onclick="closeSetupModal()" class="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-white/10">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="p-6 space-y-6">
            <!-- 매장 정보 -->
            <div class="glass rounded-xl p-4">
              <h4 class="font-medium mb-3 flex items-center gap-2">
                <i class="fas fa-store text-blue-400"></i>
                매장 정보
              </h4>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-white/40">사장님</p>
                  <p id="modal-owner-name">-</p>
                </div>
                <div>
                  <p class="text-white/40">연락처</p>
                  <p id="modal-owner-phone">-</p>
                </div>
                <div>
                  <p class="text-white/40">업종</p>
                  <p id="modal-business-type">-</p>
                </div>
                <div>
                  <p class="text-white/40">요청일</p>
                  <p id="modal-created-at">-</p>
                </div>
              </div>
            </div>
            
            <!-- 네이버 API 설정 (마스터 전용) -->
            <div class="glass rounded-xl p-4">
              <h4 class="font-medium mb-3 flex items-center gap-2">
                <i class="fas fa-plug text-green-400"></i>
                네이버 API 설정
              </h4>
              <div class="space-y-3">
                <div>
                  <label class="block text-sm text-white/60 mb-1">Authorization Key</label>
                  <input type="password" id="modal-auth-key" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]" placeholder="파트너센터에서 복사한 Authorization 키">
                </div>
                <div>
                  <label class="block text-sm text-white/60 mb-1">Webhook URL</label>
                  <div class="flex gap-2">
                    <input type="text" id="modal-webhook" class="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" readonly>
                    <button onclick="copyModalWebhook()" class="px-3 glass rounded-lg hover:bg-white/10">
                      <i class="fas fa-copy"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- AI 페르소나 설정 -->
            <div class="glass rounded-xl p-4">
              <h4 class="font-medium mb-3 flex items-center gap-2">
                <i class="fas fa-robot text-purple-400"></i>
                AI 페르소나 설정
              </h4>
              <div class="space-y-3">
                <div>
                  <label class="block text-sm text-white/60 mb-1">AI 역할</label>
                  <input type="text" id="modal-ai-role" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]" placeholder="예: 뷰티 컨설턴트">
                </div>
                <div>
                  <label class="block text-sm text-white/60 mb-1">매장 특징 (AI가 강조할 점)</label>
                  <textarea id="modal-ai-features" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] h-20" placeholder="예: 동탄 1등 미용실, 원장 직접 시술, 정중한 어조"></textarea>
                </div>
                <div>
                  <label class="block text-sm text-white/60 mb-1">말투 스타일</label>
                  <select id="modal-ai-tone" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]">
                    <option value="formal">정중하고 격식있는</option>
                    <option value="friendly">친근하고 따뜻한</option>
                    <option value="professional">전문적이고 신뢰감있는</option>
                    <option value="casual">편안하고 캐주얼한</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div class="px-6 py-4 border-t border-white/5 flex gap-3">
            <button onclick="closeSetupModal()" class="flex-1 py-3 glass rounded-xl font-medium hover:bg-white/5">
              취소
            </button>
            <button onclick="activateStore()" class="flex-[2] py-3 gold-bg text-black rounded-xl font-bold hover:opacity-90">
              <i class="fas fa-check mr-2"></i>세팅 완료 & 활성화
            </button>
          </div>
        </div>
      </div>
    </div>
    
  </div>
  
  <script>
    let currentStoreId = null;
    let stores = [];
    
    function showSection(section) {
      // Update nav
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      event.currentTarget.classList.add('active');
      
      // Update title
      const titles = {
        pending: { title: '연동 대기 목록', desc: '사장님들이 연동 요청한 매장을 관리합니다' },
        stores: { title: '전체 매장', desc: '모든 매장의 상태를 확인하고 관리합니다' },
        monitoring: { title: '실시간 모니터링', desc: 'AI 상담 현황을 실시간으로 확인합니다' },
        notifications: { title: '알림 설정', desc: '카카오톡 알림 연동을 설정합니다' },
        security: { title: '보안 설정', desc: '마스터 페이지 보안을 관리합니다' }
      };
      
      document.getElementById('section-title').textContent = titles[section]?.title || '';
      document.getElementById('section-desc').textContent = titles[section]?.desc || '';
      
      // Show section
      document.querySelectorAll('[id^="section-"]').forEach(el => el.classList.add('hidden'));
      document.getElementById('section-' + section)?.classList.remove('hidden');
    }
    
    async function loadPendingStores() {
      try {
        const res = await fetch('/api/master/pending');
        const data = await res.json();
        
        if (data.success && data.data) {
          const pending = data.data;
          document.getElementById('pending-count').textContent = pending.length;
          
          if (pending.length > 0) {
            document.getElementById('alert-banner').style.display = 'flex';
            document.getElementById('pending-list').innerHTML = pending.map(store => \`
              <div class="glass rounded-xl p-5 store-card border border-white/10" onclick="openSetupModal(\${store.id})">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                      <i class="fas fa-store text-yellow-400"></i>
                    </div>
                    <div>
                      <h3 class="font-semibold">\${store.store_name}</h3>
                      <p class="text-sm text-white/40">\${store.owner_name} 사장님</p>
                    </div>
                  </div>
                  <span class="status-pending text-xs px-3 py-1 rounded-full">대기중</span>
                </div>
                <div class="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p class="text-white/40">연락처</p>
                    <p>\${store.owner_phone || '-'}</p>
                  </div>
                  <div>
                    <p class="text-white/40">업종</p>
                    <p>\${store.business_type || '-'}</p>
                  </div>
                  <div>
                    <p class="text-white/40">요청일</p>
                    <p>\${new Date(store.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>
                <div class="mt-4 pt-4 border-t border-white/5 flex justify-end">
                  <button class="px-4 py-2 gold-bg text-black rounded-lg text-sm font-medium hover:opacity-90">
                    <i class="fas fa-cog mr-1"></i>세팅하기
                  </button>
                </div>
              </div>
            \`).join('');
          } else {
            document.getElementById('alert-banner').style.display = 'none';
            document.getElementById('pending-list').innerHTML = \`
              <div class="glass rounded-xl p-8 text-center">
                <i class="fas fa-check-circle text-4xl text-emerald-400 mb-4"></i>
                <p class="text-white/60">대기 중인 연동 요청이 없습니다</p>
              </div>
            \`;
          }
        }
      } catch (e) {
        console.error('Failed to load pending stores:', e);
      }
    }
    
    async function loadAllStores() {
      try {
        const res = await fetch('/api/master/stores');
        const data = await res.json();
        
        if (data.success && data.data) {
          stores = data.data;
          document.getElementById('store-count').textContent = stores.length;
          
          // Update stats
          document.getElementById('stat-total').textContent = stores.length;
          document.getElementById('stat-active').textContent = stores.filter(s => s.onboarding_status === 'active').length;
          document.getElementById('stat-pending').textContent = stores.filter(s => s.onboarding_status === 'pending').length;
          
          // Render grid
          if (stores.length > 0) {
            document.getElementById('stores-grid').innerHTML = stores.map(store => \`
              <div class="glass rounded-xl p-5 store-card border border-white/10" onclick="openSetupModal(\${store.id})">
                <div class="flex items-start justify-between mb-3">
                  <div class="w-10 h-10 rounded-xl \${store.onboarding_status === 'active' ? 'bg-emerald-500/20' : 'bg-yellow-500/20'} flex items-center justify-center">
                    <i class="fas fa-store \${store.onboarding_status === 'active' ? 'text-emerald-400' : 'text-yellow-400'}"></i>
                  </div>
                  <span class="status-\${store.onboarding_status} text-xs px-2 py-0.5 rounded-full">
                    \${store.onboarding_status === 'active' ? '운영중' : store.onboarding_status === 'pending' ? '대기중' : '일시정지'}
                  </span>
                </div>
                <h3 class="font-semibold mb-1">\${store.store_name}</h3>
                <p class="text-sm text-white/40 mb-3">\${store.business_type || '업종 미설정'}</p>
                <p class="text-xs text-white/30">\${new Date(store.created_at).toLocaleDateString('ko-KR')}</p>
              </div>
            \`).join('');
          }
        }
      } catch (e) {
        console.error('Failed to load stores:', e);
      }
    }
    
    function openSetupModal(storeId) {
      currentStoreId = storeId;
      const store = stores.find(s => s.id === storeId);
      
      if (store) {
        document.getElementById('modal-store-name').textContent = store.store_name;
        document.getElementById('modal-owner-name').textContent = store.owner_name || '-';
        document.getElementById('modal-owner-phone').textContent = store.owner_phone || '-';
        document.getElementById('modal-business-type').textContent = store.business_type || '-';
        document.getElementById('modal-created-at').textContent = new Date(store.created_at).toLocaleDateString('ko-KR');
        document.getElementById('modal-webhook').value = 'https://xivix-ai-core.pages.dev/v1/naver/callback/' + storeId;
        document.getElementById('modal-ai-role').value = store.ai_persona || '';
        document.getElementById('modal-ai-features').value = '';
        document.getElementById('modal-ai-tone').value = store.ai_tone || 'professional';
      }
      
      document.getElementById('setup-modal').classList.remove('hidden');
      document.getElementById('setup-modal').classList.add('flex');
    }
    
    function closeSetupModal() {
      document.getElementById('setup-modal').classList.add('hidden');
      document.getElementById('setup-modal').classList.remove('flex');
      currentStoreId = null;
    }
    
    function copyModalWebhook() {
      const webhook = document.getElementById('modal-webhook').value;
      navigator.clipboard.writeText(webhook).then(() => alert('Webhook URL이 복사되었습니다.'));
    }
    
    async function activateStore() {
      if (!currentStoreId) return;
      
      const authKey = document.getElementById('modal-auth-key').value;
      const aiRole = document.getElementById('modal-ai-role').value;
      const aiFeatures = document.getElementById('modal-ai-features').value;
      const aiTone = document.getElementById('modal-ai-tone').value;
      
      try {
        const res = await fetch('/api/master/activate/' + currentStoreId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auth_key: authKey,
            ai_persona: aiRole,
            ai_features: aiFeatures,
            ai_tone: aiTone
          })
        });
        
        const data = await res.json();
        
        if (data.success) {
          alert('매장이 활성화되었습니다! 사장님께 카카오톡으로 알림이 발송됩니다.');
          closeSetupModal();
          refreshData();
        } else {
          alert('활성화 실패: ' + (data.error || '알 수 없는 오류'));
        }
      } catch (e) {
        alert('네트워크 오류');
      }
    }
    
    async function refreshData() {
      await Promise.all([loadPendingStores(), loadAllStores()]);
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', refreshData);
  </script>
</body>
</html>
  `;
}
