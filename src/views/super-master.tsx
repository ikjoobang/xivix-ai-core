// XIVIX AI Core V1.0 - 슈퍼 마스터 대시보드
// 방대표님 전용: 모든 매장의 '심장'을 조종하는 곳
// 범용 업종 확장 시스템 v2026.01.21

// 업종 데이터베이스 (Master Logic) - /connect와 동기화
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
        
        <p class="text-xs text-white/30 uppercase tracking-wider mb-3 px-3">WATCHDOG</p>
        <div class="space-y-1 mb-6">
          <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer" onclick="showSection('watchdog')">
            <i class="fas fa-dog w-5 text-red-400"></i>
            <span>시스템 감시</span>
            <span class="ml-auto" id="watchdog-status">
              <span class="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse"></span>
            </span>
          </div>
          <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer" onclick="showSection('rawdata')">
            <i class="fas fa-database w-5 text-blue-400"></i>
            <span>RAW 데이터</span>
          </div>
          <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer" onclick="showSection('errors')">
            <i class="fas fa-bug w-5 text-red-400"></i>
            <span>에러 로그</span>
            <span class="ml-auto text-red-400 text-xs" id="error-count">0</span>
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
        
        <!-- Section: WATCHDOG 시스템 감시 -->
        <div id="section-watchdog" class="hidden">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <!-- 시스템 상태 신호등 -->
            <div class="glass rounded-xl p-6 border border-white/10">
              <h3 class="font-semibold mb-4 flex items-center gap-2">
                <i class="fas fa-traffic-light text-yellow-400"></i>
                시스템 상태
              </h3>
              <div class="space-y-3" id="system-status-lights">
                <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span class="text-sm">Database (D1)</span>
                  <span class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-gray-500" id="db-status-light"></span>
                    <span class="text-xs text-white/40" id="db-status-text">확인 중...</span>
                  </span>
                </div>
                <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span class="text-sm">KV Storage</span>
                  <span class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-gray-500" id="kv-status-light"></span>
                    <span class="text-xs text-white/40" id="kv-status-text">확인 중...</span>
                  </span>
                </div>
                <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span class="text-sm">R2 Storage</span>
                  <span class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-gray-500" id="r2-status-light"></span>
                    <span class="text-xs text-white/40" id="r2-status-text">확인 중...</span>
                  </span>
                </div>
              </div>
              <div class="mt-4 p-3 rounded-lg" id="overall-status-box">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium">전체 상태</span>
                  <span class="text-lg font-bold" id="overall-status-text">-</span>
                </div>
              </div>
            </div>
            
            <!-- API 헬스체크 -->
            <div class="glass rounded-xl p-6 border border-white/10">
              <h3 class="font-semibold mb-4 flex items-center gap-2">
                <i class="fas fa-heartbeat text-red-400"></i>
                API 상태
              </h3>
              <div class="text-center py-4">
                <p class="text-4xl font-bold gold" id="api-healthy-count">-</p>
                <p class="text-sm text-white/40 mt-1">정상 작동 중</p>
              </div>
              <div class="mt-4 grid grid-cols-2 gap-2 text-center">
                <div class="bg-emerald-500/10 rounded-lg p-2">
                  <p class="text-lg font-bold text-emerald-400" id="api-green-count">0</p>
                  <p class="text-xs text-white/40">GREEN</p>
                </div>
                <div class="bg-red-500/10 rounded-lg p-2">
                  <p class="text-lg font-bold text-red-400" id="api-red-count">0</p>
                  <p class="text-xs text-white/40">RED</p>
                </div>
              </div>
              <button onclick="runWatchdogCheck()" class="w-full mt-4 py-2 glass rounded-lg text-sm hover:bg-white/10 transition-all">
                <i class="fas fa-sync-alt mr-2"></i>지금 점검
              </button>
            </div>
            
            <!-- 오늘의 에러 -->
            <div class="glass rounded-xl p-6 border border-white/10">
              <h3 class="font-semibold mb-4 flex items-center gap-2">
                <i class="fas fa-exclamation-triangle text-orange-400"></i>
                오늘의 에러
              </h3>
              <div class="text-center py-4">
                <p class="text-4xl font-bold" id="today-error-count">0</p>
                <p class="text-sm text-white/40 mt-1">발생 건수</p>
              </div>
              <div class="mt-4 space-y-2" id="recent-errors-mini">
                <p class="text-xs text-white/30 text-center">최근 에러 없음</p>
              </div>
            </div>
          </div>
          
          <!-- Watchdog 버전 정보 -->
          <div class="glass rounded-xl p-4 border border-yellow-500/30 bg-yellow-500/5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <i class="fas fa-dog text-yellow-400 text-2xl"></i>
                <div>
                  <p class="font-semibold">XIVIX Watchdog V1.0</p>
                  <p class="text-sm text-white/40">개발자 할루시네이션 방지 시스템 가동 중</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-xs text-white/40">마지막 점검</p>
                <p class="text-sm gold" id="last-watchdog-check">-</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Section: RAW 데이터 뷰어 -->
        <div id="section-rawdata" class="hidden">
          <div class="glass rounded-xl p-6 mb-6">
            <h3 class="font-semibold mb-4 flex items-center gap-2">
              <i class="fas fa-database text-blue-400"></i>
              D1 Database 직접 조회
            </h3>
            <p class="text-sm text-white/40 mb-4">모든 데이터는 D1 Database의 실제 레코드입니다. 가짜 데이터(Mock)가 없습니다.</p>
            
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <button onclick="downloadRawData('xivix_stores')" class="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-left">
                <i class="fas fa-store text-blue-400 mb-2"></i>
                <p class="font-medium">매장 데이터</p>
                <p class="text-xs text-white/40">xivix_stores</p>
              </button>
              <button onclick="downloadRawData('xivix_conversation_logs')" class="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-left">
                <i class="fas fa-comments text-green-400 mb-2"></i>
                <p class="font-medium">상담 로그</p>
                <p class="text-xs text-white/40">xivix_conversation_logs</p>
              </button>
              <button onclick="downloadRawData('xivix_reservations')" class="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-left">
                <i class="fas fa-calendar-check text-purple-400 mb-2"></i>
                <p class="font-medium">예약 데이터</p>
                <p class="text-xs text-white/40">xivix_reservations</p>
              </button>
              <button onclick="downloadRawData('xivix_error_logs')" class="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-left">
                <i class="fas fa-bug text-red-400 mb-2"></i>
                <p class="font-medium">에러 로그</p>
                <p class="text-xs text-white/40">xivix_error_logs</p>
              </button>
              <button onclick="downloadRawData('xivix_admin_logs')" class="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-left">
                <i class="fas fa-user-shield text-yellow-400 mb-2"></i>
                <p class="font-medium">관리자 로그</p>
                <p class="text-xs text-white/40">xivix_admin_logs</p>
              </button>
              <button onclick="downloadRawData('xivix_notification_logs')" class="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-left">
                <i class="fas fa-bell text-orange-400 mb-2"></i>
                <p class="font-medium">알림 로그</p>
                <p class="text-xs text-white/40">xivix_notification_logs</p>
              </button>
            </div>
            
            <div class="flex gap-3">
              <select id="export-format" class="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white">
                <option value="json">JSON 형식</option>
                <option value="csv">CSV (엑셀 호환)</option>
              </select>
              <input type="number" id="export-limit" value="1000" min="1" max="10000" class="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white w-32" placeholder="최대 행">
            </div>
          </div>
          
          <!-- 데이터 미리보기 -->
          <div class="glass rounded-xl p-6">
            <h3 class="font-semibold mb-4">데이터 미리보기</h3>
            <div id="raw-data-preview" class="bg-black/50 rounded-lg p-4 font-mono text-xs text-green-400 max-h-96 overflow-auto">
              <p class="text-white/40">테이블을 선택하면 데이터가 표시됩니다</p>
            </div>
          </div>
        </div>
        
        <!-- Section: 에러 로그 -->
        <div id="section-errors" class="hidden">
          <div class="glass rounded-xl p-6 mb-6 border border-red-500/30 bg-red-500/5" id="critical-error-banner" style="display: none;">
            <div class="flex items-center gap-3">
              <i class="fas fa-exclamation-circle text-red-400 text-2xl animate-pulse"></i>
              <div>
                <p class="font-semibold text-red-400">⚠️ 긴급: 시스템 에러 감지됨</p>
                <p class="text-sm text-white/60" id="critical-error-message">-</p>
              </div>
            </div>
          </div>
          
          <div class="glass rounded-xl p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="font-semibold flex items-center gap-2">
                <i class="fas fa-bug text-red-400"></i>
                에러 블랙박스
              </h3>
              <button onclick="loadErrorLogs()" class="px-4 py-2 glass rounded-lg text-sm hover:bg-white/10">
                <i class="fas fa-sync-alt mr-2"></i>새로고침
              </button>
            </div>
            
            <div class="grid grid-cols-4 gap-4 mb-6">
              <div class="bg-red-500/10 rounded-xl p-4 text-center">
                <p class="text-2xl font-bold text-red-400" id="error-critical-count">0</p>
                <p class="text-xs text-white/40">CRITICAL</p>
              </div>
              <div class="bg-orange-500/10 rounded-xl p-4 text-center">
                <p class="text-2xl font-bold text-orange-400" id="error-error-count">0</p>
                <p class="text-xs text-white/40">ERROR</p>
              </div>
              <div class="bg-yellow-500/10 rounded-xl p-4 text-center">
                <p class="text-2xl font-bold text-yellow-400" id="error-warning-count">0</p>
                <p class="text-xs text-white/40">WARNING</p>
              </div>
              <div class="bg-blue-500/10 rounded-xl p-4 text-center">
                <p class="text-2xl font-bold text-blue-400" id="error-info-count">0</p>
                <p class="text-xs text-white/40">INFO</p>
              </div>
            </div>
            
            <div class="space-y-3" id="error-log-list">
              <p class="text-center text-white/40 py-8">에러 로그를 불러오는 중...</p>
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
                <div>
                  <p class="text-white/40">톡톡 ID</p>
                  <p id="modal-talktalk-id" class="font-mono gold">-</p>
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
              <h4 class="font-medium mb-3 flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <i class="fas fa-robot text-purple-400"></i>
                  AI 페르소나 설정
                </span>
                <button onclick="generateAIPersona()" class="text-xs px-3 py-1.5 gold-bg text-black rounded-lg font-medium hover:opacity-90 transition-all">
                  <i class="fas fa-magic mr-1"></i>업종별 자동 생성
                </button>
              </h4>
              <div class="space-y-3">
                <div>
                  <label class="block text-sm text-white/60 mb-1">AI 역할</label>
                  <input type="text" id="modal-ai-role" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]" placeholder="예: 뷰티 컨설턴트">
                  <p class="text-xs text-white/30 mt-1" id="ai-role-hint"></p>
                </div>
                <div>
                  <label class="block text-sm text-white/60 mb-1">매장 특징 (AI가 강조할 점)</label>
                  <textarea id="modal-ai-features" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] h-20" placeholder="예: 동탄 1등 미용실, 원장 직접 시술, 정중한 어조"></textarea>
                  <p class="text-xs text-white/30 mt-1" id="ai-features-hint"></p>
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
            
            <!-- 카카오톡 알림 발송 -->
            <div class="glass rounded-xl p-4 border border-yellow-500/30 bg-yellow-500/5">
              <h4 class="font-medium mb-3 flex items-center gap-2">
                <i class="fab fa-facebook-messenger text-yellow-400"></i>
                사장님께 카카오톡 알림 발송
              </h4>
              <div class="space-y-3">
                <p class="text-sm text-white/60">세팅 완료 후 사장님께 알림을 보내주세요</p>
                <div class="grid grid-cols-2 gap-2">
                  <button onclick="sendNotification('setup_complete')" class="py-2 px-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm hover:bg-emerald-500/30 transition-all">
                    <i class="fas fa-check-circle mr-1"></i>세팅완료 알림
                  </button>
                  <button onclick="sendNotification('custom')" class="py-2 px-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm hover:bg-blue-500/30 transition-all">
                    <i class="fas fa-edit mr-1"></i>직접 작성
                  </button>
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
    
    // 업종 데이터베이스 (서버에서 주입)
    const industries = ${industryDataJson};
    
    // 업종 ID로 아이콘 조회
    function getIndustryIcon(businessType) {
      if (!businessType) return 'fa-store';
      const ind = industries.find(i => i.id === businessType);
      return ind ? ind.icon : 'fa-store';
    }
    
    // 업종 ID로 전체 정보 조회
    function getIndustryInfo(businessType) {
      if (!businessType) return null;
      return industries.find(i => i.id === businessType) || null;
    }
    
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
                      <i class="fas \${getIndustryIcon(store.business_type)} text-yellow-400"></i>
                    </div>
                    <div>
                      <h3 class="font-semibold">\${store.store_name}</h3>
                      <p class="text-sm text-white/40">\${store.owner_name} 사장님</p>
                    </div>
                  </div>
                  <span class="status-pending text-xs px-3 py-1 rounded-full">대기중</span>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <p class="text-white/40">연락처</p>
                    <p>\${store.owner_phone || '-'}</p>
                  </div>
                  <div>
                    <p class="text-white/40">업종</p>
                    <div class="flex items-center gap-1">
                      <i class="fas \${getIndustryIcon(store.business_type)} text-xs gold"></i>
                      <span class="gold">\${store.business_type_name || store.business_type || '-'}</span>
                    </div>
                  </div>
                  <div>
                    <p class="text-white/40">톡톡 ID</p>
                    <p class="font-mono gold">@\${store.naver_talktalk_id || '-'}</p>
                  </div>
                </div>
                \${store.business_specialty ? \`
                <div class="p-2 bg-white/5 rounded-lg text-xs text-white/50 mb-3">
                  <i class="fas fa-magic mr-1 gold"></i> AI 전문분야: \${store.business_specialty}
                </div>
                \` : ''}
                <div class="text-xs text-white/30">요청일: \${new Date(store.created_at).toLocaleDateString('ko-KR')}</div>
                <div class="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                  <span class="text-xs text-white/40">
                    상태: <span class="\${store.onboarding_status === 'processing' ? 'text-blue-400' : 'text-yellow-400'}">\${store.onboarding_status === 'processing' ? '세팅 중 75%' : '대기 중 40%'}</span>
                  </span>
                  <div class="flex gap-2">
                    \${store.onboarding_status === 'pending' ? \`
                      <button onclick="event.stopPropagation(); startProcessing(\${store.id})" class="px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-all">
                        <i class="fas fa-play mr-1"></i>세팅 시작
                      </button>
                    \` : ''}
                    <button onclick="event.stopPropagation(); openSetupModal(\${store.id})" class="px-4 py-2 gold-bg text-black rounded-lg text-sm font-medium hover:opacity-90">
                      <i class="fas fa-cog mr-1"></i>세팅 완료
                    </button>
                  </div>
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
        
        // 업종 정보 표시 개선
        const industryInfo = getIndustryInfo(store.business_type);
        const businessTypeEl = document.getElementById('modal-business-type');
        if (industryInfo) {
          businessTypeEl.innerHTML = \`<i class="fas \${industryInfo.icon} mr-1 gold"></i> \${store.business_type_name || industryInfo.name}\`;
        } else {
          businessTypeEl.textContent = store.business_type_name || store.business_type || '-';
        }
        
        document.getElementById('modal-created-at').textContent = new Date(store.created_at).toLocaleDateString('ko-KR');
        document.getElementById('modal-talktalk-id').textContent = '@' + (store.naver_talktalk_id || '-');
        document.getElementById('modal-webhook').value = 'https://xivix-ai-core.pages.dev/v1/naver/callback/' + storeId;
        document.getElementById('modal-ai-role').value = store.ai_persona || '';
        document.getElementById('modal-ai-features').value = store.ai_features || '';
        document.getElementById('modal-ai-tone').value = store.ai_tone || 'professional';
        
        // 업종별 AI 힌트 표시
        updateAIHints(store);
      }
      
      document.getElementById('setup-modal').classList.remove('hidden');
      document.getElementById('setup-modal').classList.add('flex');
    }
    
    // 업종별 AI 힌트 업데이트
    function updateAIHints(store) {
      const industryInfo = getIndustryInfo(store.business_type);
      const roleHint = document.getElementById('ai-role-hint');
      const featuresHint = document.getElementById('ai-features-hint');
      
      if (industryInfo) {
        roleHint.innerHTML = \`<i class="fas fa-lightbulb mr-1 gold"></i> 추천: \${industryInfo.basePrompt}\`;
        featuresHint.innerHTML = \`<i class="fas fa-lightbulb mr-1 gold"></i> 업종 특성: \${industryInfo.specialty}\`;
      } else if (store.business_type === 'CUSTOM_SECTOR' && store.business_type_name) {
        roleHint.innerHTML = \`<i class="fas fa-lightbulb mr-1 gold"></i> 커스텀 업종: "\${store.business_type_name}" 전문 어시스턴트\`;
        featuresHint.innerHTML = \`<i class="fas fa-lightbulb mr-1 gold"></i> 사장님 정의 비즈니스에 최적화된 응대\`;
      } else {
        roleHint.textContent = '';
        featuresHint.textContent = '';
      }
    }
    
    // AI 페르소나 자동 생성
    function generateAIPersona() {
      const store = stores.find(s => s.id === currentStoreId);
      if (!store) {
        alert('매장 정보를 불러올 수 없습니다');
        return;
      }
      
      const industryInfo = getIndustryInfo(store.business_type);
      
      // AI 역할 생성
      let aiRole = '';
      let aiFeatures = '';
      
      if (industryInfo) {
        // 정의된 업종
        aiRole = \`\${store.store_name}의 \${industryInfo.basePrompt}\`;
        aiFeatures = \`전문분야: \${industryInfo.specialty}\\n\\n매장 특징: (사장님 특징을 추가해주세요)\`;
      } else if (store.business_type === 'CUSTOM_SECTOR' && store.business_type_name) {
        // 커스텀 업종
        aiRole = \`\${store.store_name}의 \${store.business_type_name} 전문 어시스턴트\`;
        aiFeatures = \`업종: \${store.business_type_name}\\n\\n(\${store.owner_name} 사장님의 비즈니스 특징을 추가해주세요)\`;
      } else {
        aiRole = \`\${store.store_name}의 비즈니스 어시스턴트\`;
        aiFeatures = '매장 특징을 입력해주세요';
      }
      
      // 입력 필드에 값 설정
      document.getElementById('modal-ai-role').value = aiRole;
      document.getElementById('modal-ai-features').value = aiFeatures;
      
      // 업종별 추천 말투
      const toneMap = {
        'MEDICAL': 'formal',
        'PROFESSIONAL_LEGAL': 'formal',
        'EDUCATION': 'professional',
        'BEAUTY_HAIR': 'friendly',
        'BEAUTY_SKIN': 'friendly',
        'BEAUTY_NAIL': 'friendly',
        'RESTAURANT': 'friendly',
        'FITNESS': 'professional',
        'PET_SERVICE': 'friendly',
        'REAL_ESTATE': 'professional',
        'AUTO_SERVICE': 'professional',
        'PHOTOGRAPHY': 'friendly'
      };
      
      const recommendedTone = toneMap[store.business_type] || 'professional';
      document.getElementById('modal-ai-tone').value = recommendedTone;
      
      // 애니메이션 효과
      const btn = event.currentTarget;
      btn.innerHTML = '<i class="fas fa-check mr-1"></i>생성 완료!';
      setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-magic mr-1"></i>업종별 자동 생성';
      }, 1500);
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
    
    // 카카오톡 알림 발송
    async function sendNotification(type) {
      if (!currentStoreId) {
        alert('매장을 선택해주세요');
        return;
      }
      
      const store = stores.find(s => s.id === currentStoreId);
      if (!store) return;
      
      let message = '';
      
      if (type === 'setup_complete') {
        message = \`🎉 AI 지배인 세팅 완료!

\${store.owner_name || '사장'}님,
\${store.store_name}에 AI 상담사가 배치되었습니다.

지금부터 네이버 톡톡으로 들어오는 문의에 AI가 자동 응답합니다.

문의: XIVIX 고객센터\`;
      } else if (type === 'custom') {
        message = prompt('발송할 메시지를 입력하세요:', \`\${store.owner_name || '사장'}님, XIVIX입니다.\`);
        if (!message) return;
      }
      
      try {
        const res = await fetch('/api/master/notify/' + currentStoreId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notification_type: type === 'setup_complete' ? 'onboarding_complete' : 'custom',
            message: message
          })
        });
        
        const data = await res.json();
        
        if (data.success) {
          alert('알림이 발송되었습니다!');
        } else {
          alert('발송 실패: ' + (data.error || '알림 설정을 확인해주세요'));
        }
      } catch (e) {
        alert('네트워크 오류');
      }
    }
    
    // 세팅 시작 (pending → processing)
    async function startProcessing(storeId) {
      try {
        const res = await fetch('/api/master/status/' + storeId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'processing' })
        });
        
        const data = await res.json();
        
        if (data.success) {
          // 성공 애니메이션
          const btn = event.currentTarget;
          btn.innerHTML = '<i class="fas fa-check mr-1"></i>진행 중!';
          btn.classList.add('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/30');
          btn.classList.remove('bg-blue-500/20', 'text-blue-400', 'border-blue-500/30');
          
          // 1초 후 새로고침
          setTimeout(() => {
            refreshData();
          }, 1000);
        } else {
          alert('상태 변경 실패: ' + (data.error || '알 수 없는 오류'));
        }
      } catch (e) {
        alert('네트워크 오류');
      }
    }
    
    // ============================================================================
    // XIVIX WATCHDOG V1.0 - JavaScript Functions
    // ============================================================================
    
    // Watchdog 시스템 상태 체크
    async function runWatchdogCheck() {
      try {
        document.getElementById('last-watchdog-check').textContent = '점검 중...';
        
        const res = await fetch('/api/watchdog/health');
        const data = await res.json();
        
        if (data.success && data.data) {
          const wd = data.data;
          
          // DB 상태
          const dbStatus = wd.services.database.status;
          document.getElementById('db-status-light').className = \`w-3 h-3 rounded-full \${dbStatus === 'GREEN' ? 'bg-emerald-400' : 'bg-red-400'}\`;
          document.getElementById('db-status-text').textContent = dbStatus === 'GREEN' ? '정상' : '오류';
          
          // KV 상태
          const kvStatus = wd.services.kv_storage.status;
          document.getElementById('kv-status-light').className = \`w-3 h-3 rounded-full \${kvStatus === 'GREEN' ? 'bg-emerald-400' : 'bg-red-400'}\`;
          document.getElementById('kv-status-text').textContent = kvStatus === 'GREEN' ? '정상' : '오류';
          
          // R2 상태
          const r2Status = wd.services.r2_storage.status;
          document.getElementById('r2-status-light').className = \`w-3 h-3 rounded-full \${r2Status === 'GREEN' ? 'bg-emerald-400' : r2Status === 'YELLOW' ? 'bg-yellow-400' : 'bg-red-400'}\`;
          document.getElementById('r2-status-text').textContent = r2Status === 'GREEN' ? '정상' : r2Status === 'YELLOW' ? '점검필요' : '오류';
          
          // 전체 상태
          const overall = wd.overall_status;
          const statusBox = document.getElementById('overall-status-box');
          const statusText = document.getElementById('overall-status-text');
          
          statusBox.className = \`mt-4 p-3 rounded-lg \${overall === 'GREEN' ? 'bg-emerald-500/10 border border-emerald-500/30' : overall === 'YELLOW' ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-red-500/10 border border-red-500/30'}\`;
          statusText.className = \`text-lg font-bold \${overall === 'GREEN' ? 'text-emerald-400' : overall === 'YELLOW' ? 'text-yellow-400' : 'text-red-400'}\`;
          statusText.textContent = overall;
          
          // API 상태
          document.getElementById('api-healthy-count').textContent = wd.endpoints_healthy || 0;
          document.getElementById('api-green-count').textContent = wd.overall_status === 'GREEN' ? 3 : wd.overall_status === 'YELLOW' ? 2 : 1;
          document.getElementById('api-red-count').textContent = wd.critical_failures || 0;
          
          // Watchdog 사이드바 상태
          const watchdogStatus = document.getElementById('watchdog-status');
          watchdogStatus.innerHTML = \`<span class="w-2 h-2 rounded-full \${overall === 'GREEN' ? 'bg-green-400' : overall === 'YELLOW' ? 'bg-yellow-400' : 'bg-red-400'} inline-block animate-pulse"></span>\`;
          
          // 마지막 점검 시간
          document.getElementById('last-watchdog-check').textContent = new Date().toLocaleTimeString('ko-KR');
        }
      } catch (e) {
        console.error('Watchdog check failed:', e);
        document.getElementById('last-watchdog-check').textContent = '점검 실패';
      }
    }
    
    // 에러 로그 로드
    async function loadErrorLogs() {
      try {
        const res = await fetch('/api/watchdog/error-logs');
        const data = await res.json();
        
        if (data.success && data.data) {
          const errors = data.data;
          
          // 오늘 에러 수
          document.getElementById('today-error-count').textContent = errors.today_errors || 0;
          document.getElementById('error-count').textContent = errors.today_errors || 0;
          
          // 심각도별 분류
          const bySeverity = errors.by_severity || [];
          document.getElementById('error-critical-count').textContent = bySeverity.find(s => s.severity === 'CRITICAL')?.count || 0;
          document.getElementById('error-error-count').textContent = bySeverity.find(s => s.severity === 'ERROR')?.count || 0;
          document.getElementById('error-warning-count').textContent = bySeverity.find(s => s.severity === 'WARNING')?.count || 0;
          document.getElementById('error-info-count').textContent = bySeverity.find(s => s.severity === 'INFO')?.count || 0;
          
          // 에러 목록
          const logs = errors.recent_logs || [];
          const errorList = document.getElementById('error-log-list');
          
          if (logs.length === 0) {
            errorList.innerHTML = '<p class="text-center text-white/40 py-8">에러 로그가 없습니다. 시스템이 정상입니다! ✅</p>';
          } else {
            errorList.innerHTML = logs.slice(0, 20).map(log => \`
              <div class="p-4 bg-white/5 rounded-xl border-l-4 \${log.severity === 'CRITICAL' ? 'border-red-500' : log.severity === 'ERROR' ? 'border-orange-500' : log.severity === 'WARNING' ? 'border-yellow-500' : 'border-blue-500'}">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs px-2 py-1 rounded \${log.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : log.severity === 'ERROR' ? 'bg-orange-500/20 text-orange-400' : log.severity === 'WARNING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}">\${log.severity}</span>
                  <span class="text-xs text-white/40">\${new Date(log.created_at).toLocaleString('ko-KR')}</span>
                </div>
                <p class="text-sm font-medium">\${log.error_type}</p>
                <p class="text-xs text-white/60 mt-1">\${log.error_message?.substring(0, 200) || '-'}</p>
                <p class="text-xs text-white/30 mt-1">Endpoint: \${log.endpoint || '-'}</p>
              </div>
            \`).join('');
          }
          
          // 긴급 에러 배너
          const criticalCount = bySeverity.find(s => s.severity === 'CRITICAL')?.count || 0;
          const criticalBanner = document.getElementById('critical-error-banner');
          if (criticalCount > 0 && logs[0]) {
            criticalBanner.style.display = 'block';
            document.getElementById('critical-error-message').textContent = logs[0].error_message?.substring(0, 100) || '확인 필요';
          } else {
            criticalBanner.style.display = 'none';
          }
          
          // 미니 에러 목록 (Watchdog 섹션)
          const miniList = document.getElementById('recent-errors-mini');
          if (logs.length === 0) {
            miniList.innerHTML = '<p class="text-xs text-white/30 text-center">최근 에러 없음 ✅</p>';
          } else {
            miniList.innerHTML = logs.slice(0, 3).map(log => \`
              <div class="text-xs p-2 bg-white/5 rounded">
                <span class="\${log.severity === 'CRITICAL' || log.severity === 'ERROR' ? 'text-red-400' : 'text-yellow-400'}">\${log.error_type}</span>
              </div>
            \`).join('');
          }
        }
      } catch (e) {
        console.error('Error logs load failed:', e);
      }
    }
    
    // RAW 데이터 다운로드
    async function downloadRawData(tableName) {
      const format = document.getElementById('export-format')?.value || 'json';
      const limit = document.getElementById('export-limit')?.value || 1000;
      
      try {
        const preview = document.getElementById('raw-data-preview');
        preview.innerHTML = '<p class="text-yellow-400">데이터 로딩 중...</p>';
        
        const res = await fetch(\`/api/watchdog/raw-data/\${tableName}?format=\${format}&limit=\${limit}\`);
        
        if (format === 'csv') {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = \`\${tableName}_\${new Date().toISOString().split('T')[0]}.csv\`;
          a.click();
          URL.revokeObjectURL(url);
          preview.innerHTML = '<p class="text-green-400">✅ CSV 파일 다운로드 완료!</p>';
        } else {
          const data = await res.json();
          if (data.success) {
            preview.innerHTML = \`<pre>\${JSON.stringify(data.data, null, 2)}</pre>\`;
          } else {
            preview.innerHTML = \`<p class="text-red-400">에러: \${data.error}</p>\`;
          }
        }
      } catch (e) {
        console.error('Raw data download failed:', e);
        document.getElementById('raw-data-preview').innerHTML = '<p class="text-red-400">데이터 로드 실패</p>';
      }
    }
    
    // showSection 업데이트 (Watchdog 섹션 추가)
    const originalShowSection = showSection;
    showSection = function(section) {
      // Update nav
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      if (event?.currentTarget) {
        event.currentTarget.classList.add('active');
      }
      
      // Update title
      const titles = {
        pending: { title: '연동 대기 목록', desc: '사장님들이 연동 요청한 매장을 관리합니다' },
        stores: { title: '전체 매장', desc: '모든 매장의 상태를 확인하고 관리합니다' },
        monitoring: { title: '실시간 모니터링', desc: 'AI 상담 현황을 실시간으로 확인합니다' },
        notifications: { title: '알림 설정', desc: '카카오톡 알림 연동을 설정합니다' },
        security: { title: '보안 설정', desc: '마스터 페이지 보안을 관리합니다' },
        watchdog: { title: 'WATCHDOG 시스템 감시', desc: '개발자 할루시네이션 방지 시스템 - 실시간 무결성 검증' },
        rawdata: { title: 'RAW 데이터 뷰어', desc: 'D1 Database의 실제 레코드를 직접 조회합니다' },
        errors: { title: '에러 블랙박스', desc: '모든 500 에러를 숨김없이 기록합니다' }
      };
      
      document.getElementById('section-title').textContent = titles[section]?.title || '';
      document.getElementById('section-desc').textContent = titles[section]?.desc || '';
      
      // Show section
      document.querySelectorAll('[id^="section-"]').forEach(el => el.classList.add('hidden'));
      document.getElementById('section-' + section)?.classList.remove('hidden');
      
      // 섹션별 데이터 로드
      if (section === 'watchdog') {
        runWatchdogCheck();
        loadErrorLogs();
      } else if (section === 'errors') {
        loadErrorLogs();
      }
    };
    
    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      refreshData();
      runWatchdogCheck();
      loadErrorLogs();
      
      // 60초마다 Watchdog 체크
      setInterval(runWatchdogCheck, 60000);
    });
  </script>
</body>
</html>
  `;
}
