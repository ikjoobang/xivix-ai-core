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
  { id: 'INSURANCE', name: '보험설계사', icon: 'fa-shield-alt', specialty: '보장분석, 리모델링 제안, 청구 안내', basePrompt: '보험 전문 설계사이자 보장분석 어드바이저' },
  { id: 'FREELANCER_BLOG', name: '블로거/작가', icon: 'fa-blog', specialty: '서비스 안내, 포트폴리오 소개, 견적 문의', basePrompt: '콘텐츠 전문가이자 블로그/SNS 상담사' },
  { id: 'FREELANCER_DESIGN', name: '디자인/영상', icon: 'fa-palette', specialty: '포트폴리오 소개, 작업 견적, 납기 안내', basePrompt: '디자인/영상 전문가이자 크리에이티브 상담사' },
  { id: 'FREELANCER_IT', name: 'IT/마케팅', icon: 'fa-laptop-code', specialty: '서비스 소개, 기술 상담, 견적 안내', basePrompt: 'IT/마케팅 전문가이자 기술 상담사' },
  { id: 'FREELANCER_TUTOR', name: '강사/컨설턴트', icon: 'fa-chalkboard-teacher', specialty: '커리큘럼 안내, 수강 상담, 일정 조율', basePrompt: '교육/컨설팅 전문가이자 학습 상담사' },
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
    .request-filter-btn.active { background: rgba(168, 85, 247, 0.2); color: #A855F7; border-color: #A855F7; }
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
      <button onclick="showTab('requests')" class="tab-btn px-6 py-3 rounded-xl border border-white/10 text-sm font-medium flex items-center gap-2">
        <i class="fas fa-inbox"></i>
        요청 목록
        <span class="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full text-xs" id="requests-badge">0</span>
      </button>
      <button onclick="showTab('customers')" class="tab-btn px-6 py-3 rounded-xl border border-white/10 text-sm font-medium flex items-center gap-2">
        <i class="fas fa-users"></i>
        고객 관리
        <span class="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-xs" id="customers-badge">0</span>
      </button>
      <button onclick="showTab('ai-helper')" class="tab-btn px-6 py-3 rounded-xl border border-white/10 text-sm font-medium flex items-center gap-2">
        <i class="fas fa-magic"></i>
        AI 템플릿 상담
      </button>
    </div>
  </div>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-6 pb-12">
    
    <!-- Tab: 연동 대기 -->
    <div id="tab-pending" class="tab-content">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold mb-2">연동 대기 매장</h2>
          <p class="text-white/50">버튼 하나로 AI 셋팅을 완료하세요</p>
        </div>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
            <input type="checkbox" id="select-all-pending" onchange="toggleSelectAll('pending')" class="w-4 h-4 rounded">
            전체 선택
          </label>
          <button onclick="bulkDeleteStores('pending')" id="bulk-delete-pending" class="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-sm flex items-center gap-2 hidden">
            <i class="fas fa-trash-alt"></i>
            <span id="bulk-delete-pending-count">0</span>개 삭제
          </button>
        </div>
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
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
            <input type="checkbox" id="select-all-bots" onchange="toggleSelectAll('bots')" class="w-4 h-4 rounded">
            전체 선택
          </label>
          <button onclick="bulkDeleteStores('bots')" id="bulk-delete-bots" class="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-sm flex items-center gap-2 hidden">
            <i class="fas fa-trash-alt"></i>
            <span id="bulk-delete-bots-count">0</span>개 삭제
          </button>
        </div>
      </div>
      
      <div id="bots-list" class="grid gap-4">
        <div class="glass rounded-2xl p-8 text-center">
          <i class="fas fa-spinner fa-spin text-3xl text-white/30 mb-4"></i>
          <p class="text-white/50">로딩 중...</p>
        </div>
      </div>
    </div>

    <!-- Tab: 요청 목록 -->
    <div id="tab-requests" class="tab-content hidden">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold mb-2">📬 설정 변경 요청</h2>
          <p class="text-white/50">사장님들의 설정 변경 요청을 처리하세요</p>
        </div>
        <div class="flex gap-2">
          <button onclick="loadRequests('pending')" class="request-filter-btn active px-4 py-2 glass rounded-xl text-sm flex items-center gap-2">
            <i class="fas fa-clock"></i>
            대기중
          </button>
          <button onclick="loadRequests('completed')" class="request-filter-btn px-4 py-2 glass rounded-xl text-sm flex items-center gap-2">
            <i class="fas fa-check"></i>
            완료
          </button>
          <button onclick="loadRequests('rejected')" class="request-filter-btn px-4 py-2 glass rounded-xl text-sm flex items-center gap-2">
            <i class="fas fa-times"></i>
            거절
          </button>
        </div>
      </div>
      
      <div id="requests-list" class="grid gap-4">
        <div class="glass rounded-2xl p-8 text-center">
          <i class="fas fa-spinner fa-spin text-3xl text-white/30 mb-4"></i>
          <p class="text-white/50">로딩 중...</p>
        </div>
      </div>
    </div>

    <!-- Tab: 고객 관리 -->
    <div id="tab-customers" class="tab-content hidden">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold mb-2">👥 전체 고객 관리</h2>
          <p class="text-white/50">모든 매장의 고객을 통합 관리하세요</p>
        </div>
        <select id="customer-store-select" onchange="loadCustomersByStore(this.value)" class="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white min-w-[200px]">
          <option value="all">전체 매장</option>
        </select>
      </div>
      
      <div class="glass rounded-2xl p-6 mb-6">
        <div class="flex items-center gap-4 mb-4">
          <input type="text" id="customer-search" placeholder="고객명, 전화번호 검색..." 
            class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
            onkeyup="filterCustomers()">
          <button onclick="loadAllCustomers()" class="px-4 py-3 glass rounded-xl hover:bg-white/10 flex items-center gap-2">
            <i class="fas fa-sync-alt"></i>
          </button>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-white/50 border-b border-white/10">
                <th class="pb-3">고객명</th>
                <th class="pb-3">연락처</th>
                <th class="pb-3">매장</th>
                <th class="pb-3">최근 시술</th>
                <th class="pb-3">마지막 방문</th>
                <th class="pb-3">다음 알림</th>
                <th class="pb-3 text-center">액션</th>
              </tr>
            </thead>
            <tbody id="customers-table-body">
              <tr>
                <td colspan="7" class="py-8 text-center text-white/40">
                  <i class="fas fa-spinner fa-spin mr-2"></i> 로딩 중...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="glass rounded-2xl p-6">
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <i class="fas fa-chart-pie text-blue-400"></i>
          고객 통계
        </h3>
        <div class="grid grid-cols-4 gap-4">
          <div class="bg-white/5 rounded-xl p-4 text-center">
            <p class="text-3xl font-bold gold" id="stat-total-customers">0</p>
            <p class="text-sm text-white/50 mt-1">전체 고객</p>
          </div>
          <div class="bg-white/5 rounded-xl p-4 text-center">
            <p class="text-3xl font-bold text-green-400" id="stat-today-followups">0</p>
            <p class="text-sm text-white/50 mt-1">오늘 발송 대상</p>
          </div>
          <div class="bg-white/5 rounded-xl p-4 text-center">
            <p class="text-3xl font-bold text-blue-400" id="stat-sent-messages">0</p>
            <p class="text-sm text-white/50 mt-1">발송 완료</p>
          </div>
          <div class="bg-white/5 rounded-xl p-4 text-center">
            <p class="text-3xl font-bold text-red-400" id="stat-overdue">0</p>
            <p class="text-sm text-white/50 mt-1">기한 초과</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: AI 템플릿 상담 -->
    <div id="tab-ai-helper" class="tab-content hidden">
      <div class="mb-6">
        <h2 class="text-2xl font-bold mb-2">🤖 AI 템플릿 상담</h2>
        <p class="text-white/50">Gemini 2.5 Pro가 업종별 맞춤 메시지를 추천해드립니다</p>
      </div>
      
      <div class="grid grid-cols-2 gap-6">
        <!-- 입력 영역 -->
        <div class="glass rounded-2xl p-6">
          <h3 class="font-semibold mb-4 flex items-center gap-2">
            <i class="fas fa-question-circle text-purple-400"></i>
            상담 요청
          </h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-white/60 mb-2">업종 선택</label>
              <select id="ai-industry-select" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
                <option value="">업종을 선택하세요...</option>
                <option value="BEAUTY_SKIN">피부관리/에스테틱</option>
                <option value="BEAUTY_HAIR">미용실/헤어숍</option>
                <option value="BEAUTY_NAIL">네일아트/속눈썹</option>
                <option value="MEDICAL">병원/의원/치과</option>
                <option value="FITNESS">피트니스/요가/PT</option>
                <option value="PET_SERVICE">애견/반려동물</option>
                <option value="RESTAURANT">일반 식당/카페</option>
                <option value="EDUCATION">학원/교육/과외</option>
                <option value="OTHER">기타</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-2">메시지 유형</label>
              <select id="ai-message-type" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
                <option value="after_visit">재방문 안내 (시술 후 팔로업)</option>
                <option value="new_customer">신규 고객 환영</option>
                <option value="event">이벤트/프로모션 안내</option>
                <option value="birthday">생일 축하</option>
                <option value="dormant">휴면 고객 재유입</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-2">추가 요청사항 (선택)</label>
              <textarea id="ai-request-detail" rows="4" 
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white resize-none"
                placeholder="예: 친근한 말투로 해주세요, 이모지 많이 써주세요, 가격 할인 정보 포함해주세요..."></textarea>
            </div>
            
            <button onclick="generateAITemplate()" class="w-full py-4 gold-bg text-black rounded-xl font-bold text-lg flex items-center justify-center gap-2 btn-action">
              <i class="fas fa-magic"></i>
              AI 메시지 생성
            </button>
          </div>
        </div>
        
        <!-- 결과 영역 -->
        <div class="glass rounded-2xl p-6">
          <h3 class="font-semibold mb-4 flex items-center gap-2">
            <i class="fas fa-lightbulb text-yellow-400"></i>
            AI 추천 결과
          </h3>
          
          <div id="ai-result-container" class="space-y-4">
            <div class="bg-white/5 rounded-xl p-8 text-center">
              <i class="fas fa-robot text-5xl text-white/20 mb-4"></i>
              <p class="text-white/50">왼쪽에서 옵션을 선택하고<br>"AI 메시지 생성" 버튼을 클릭하세요</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 업종별 추천 템플릿 -->
      <div class="glass rounded-2xl p-6 mt-6">
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <i class="fas fa-star text-yellow-400"></i>
          업종별 추천 템플릿
        </h3>
        <div class="grid grid-cols-3 gap-4" id="recommended-templates">
          <div onclick="loadRecommendedTemplate('BEAUTY_SKIN')" class="bg-white/5 hover:bg-white/10 rounded-xl p-4 cursor-pointer transition-all">
            <div class="flex items-center gap-3 mb-2">
              <i class="fas fa-spa text-pink-400"></i>
              <span class="font-medium">피부관리</span>
            </div>
            <p class="text-xs text-white/50">7~14일 후 재방문 안내, 홈케어 팁</p>
          </div>
          <div onclick="loadRecommendedTemplate('BEAUTY_HAIR')" class="bg-white/5 hover:bg-white/10 rounded-xl p-4 cursor-pointer transition-all">
            <div class="flex items-center gap-3 mb-2">
              <i class="fas fa-cut text-purple-400"></i>
              <span class="font-medium">헤어샵</span>
            </div>
            <p class="text-xs text-white/50">30일 후 컷/펌 리터치 안내</p>
          </div>
          <div onclick="loadRecommendedTemplate('MEDICAL')" class="bg-white/5 hover:bg-white/10 rounded-xl p-4 cursor-pointer transition-all">
            <div class="flex items-center gap-3 mb-2">
              <i class="fas fa-hospital text-blue-400"></i>
              <span class="font-medium">병원/치과</span>
            </div>
            <p class="text-xs text-white/50">6개월 정기검진 안내</p>
          </div>
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

  <!-- 업종 선택 모달 (원클릭 셋팅 전) -->
  <div id="industry-modal" class="fixed inset-0 bg-black/80 z-50 hidden items-center justify-center">
    <div class="glass rounded-2xl w-full max-w-lg mx-4 p-6">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-bold">
          <i class="fas fa-store gold mr-2"></i>
          업종을 선택해주세요
        </h3>
        <button onclick="closeIndustryModal()" class="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-white/10">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <p class="text-white/60 text-sm mb-4">선택한 업종에 맞는 AI 템플릿이 자동 적용됩니다.</p>
      
      <div class="grid grid-cols-2 gap-3" id="industry-grid">
        <button onclick="selectIndustry('BEAUTY_HAIR')" class="industry-option p-4 glass rounded-xl text-left hover:border-yellow-500/50 transition-all">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
              <i class="fas fa-cut text-pink-400"></i>
            </div>
            <div>
              <p class="font-semibold">미용실/헤어샵</p>
              <p class="text-xs text-white/50">커트, 펌, 염색</p>
            </div>
          </div>
        </button>
        
        <button onclick="selectIndustry('BEAUTY_SKIN')" class="industry-option p-4 glass rounded-xl text-left hover:border-yellow-500/50 transition-all">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <i class="fas fa-spa text-purple-400"></i>
            </div>
            <div>
              <p class="font-semibold">피부관리/에스테틱</p>
              <p class="text-xs text-white/50">피부케어, 관리</p>
            </div>
          </div>
        </button>
        
        <button onclick="selectIndustry('BEAUTY_NAIL')" class="industry-option p-4 glass rounded-xl text-left hover:border-yellow-500/50 transition-all">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <i class="fas fa-hand-sparkles text-red-400"></i>
            </div>
            <div>
              <p class="font-semibold">네일샵</p>
              <p class="text-xs text-white/50">네일아트, 속눈썹</p>
            </div>
          </div>
        </button>
        
        <button onclick="selectIndustry('MEDICAL')" class="industry-option p-4 glass rounded-xl text-left hover:border-yellow-500/50 transition-all">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <i class="fas fa-hospital text-blue-400"></i>
            </div>
            <div>
              <p class="font-semibold">병원/의원</p>
              <p class="text-xs text-white/50">진료, 치과, 한의원</p>
            </div>
          </div>
        </button>
        
        <button onclick="selectIndustry('RESTAURANT')" class="industry-option p-4 glass rounded-xl text-left hover:border-yellow-500/50 transition-all">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <i class="fas fa-utensils text-orange-400"></i>
            </div>
            <div>
              <p class="font-semibold">음식점/카페</p>
              <p class="text-xs text-white/50">레스토랑, 카페, 맛집</p>
            </div>
          </div>
        </button>
        
        <button onclick="selectIndustry('FITNESS')" class="industry-option p-4 glass rounded-xl text-left hover:border-yellow-500/50 transition-all">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-lime-500/20 flex items-center justify-center">
              <i class="fas fa-dumbbell text-lime-400"></i>
            </div>
            <div>
              <p class="font-semibold">피트니스/헬스</p>
              <p class="text-xs text-white/50">PT, 요가, 필라테스</p>
            </div>
          </div>
        </button>
        
        <button onclick="selectIndustry('INSURANCE')" class="industry-option p-4 glass rounded-xl text-left hover:border-yellow-500/50 transition-all">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <i class="fas fa-shield-alt text-green-400"></i>
            </div>
            <div>
              <p class="font-semibold">보험설계사</p>
              <p class="text-xs text-white/50">보장분석, 상담</p>
            </div>
          </div>
        </button>
        
        <button onclick="selectIndustry('MEDICAL')" class="industry-option p-4 glass rounded-xl text-left hover:border-yellow-500/50 transition-all">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <i class="fas fa-hospital text-blue-400"></i>
            </div>
            <div>
              <p class="font-semibold">병원/의원</p>
              <p class="text-xs text-white/50">진료, 치과, 한의원</p>
            </div>
          </div>
        </button>
      </div>
      
      <!-- 프리랜서/개인사업자 전용 섹션 -->
      <div class="mt-4 pt-4 border-t border-white/10">
        <p class="text-sm text-purple-400 font-semibold mb-3">
          <i class="fas fa-user-tie mr-1"></i>
          프리랜서 · 개인사업자
        </p>
        <div class="grid grid-cols-2 gap-3">
          <button onclick="selectIndustry('FREELANCER_BLOG')" class="industry-option p-4 glass rounded-xl text-left hover:border-purple-500/50 transition-all border-purple-500/20">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <i class="fas fa-blog text-emerald-400"></i>
              </div>
              <div>
                <p class="font-semibold">블로거/작가</p>
                <p class="text-xs text-white/50">블로그, 콘텐츠 제작</p>
              </div>
            </div>
          </button>
          
          <button onclick="selectIndustry('FREELANCER_DESIGN')" class="industry-option p-4 glass rounded-xl text-left hover:border-purple-500/50 transition-all border-purple-500/20">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <i class="fas fa-palette text-pink-400"></i>
              </div>
              <div>
                <p class="font-semibold">디자인/영상</p>
                <p class="text-xs text-white/50">그래픽, 사진, 영상</p>
              </div>
            </div>
          </button>
          
          <button onclick="selectIndustry('FREELANCER_IT')" class="industry-option p-4 glass rounded-xl text-left hover:border-purple-500/50 transition-all border-purple-500/20">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <i class="fas fa-laptop-code text-cyan-400"></i>
              </div>
              <div>
                <p class="font-semibold">IT/개발/마케팅</p>
                <p class="text-xs text-white/50">웹, 앱, SNS 마케팅</p>
              </div>
            </div>
          </button>
          
          <button onclick="selectIndustry('FREELANCER_TUTOR')" class="industry-option p-4 glass rounded-xl text-left hover:border-purple-500/50 transition-all border-purple-500/20">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <i class="fas fa-chalkboard-teacher text-amber-400"></i>
              </div>
              <div>
                <p class="font-semibold">강사/컨설턴트</p>
                <p class="text-xs text-white/50">교육, 코칭, 상담</p>
              </div>
            </div>
          </button>
        </div>
      </div>
      
      <!-- 기타 -->
      <div class="mt-3">
        <button onclick="selectIndustry('CUSTOM_SECTOR')" class="industry-option w-full p-4 glass rounded-xl text-left hover:border-yellow-500/50 transition-all">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gray-500/20 flex items-center justify-center">
              <i class="fas fa-cog text-gray-400"></i>
            </div>
            <div>
              <p class="font-semibold">기타 서비스업</p>
              <p class="text-xs text-white/50">위 목록에 없는 업종 (직접 설정)</p>
            </div>
          </div>
        </button>
      </div>
      
      <div class="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
        <p class="text-xs text-yellow-400">
          <i class="fas fa-lightbulb mr-1"></i>
          업종 선택 후 상세 설정에서 프롬프트를 수정할 수 있습니다.
        </p>
      </div>
    </div>
  </div>

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
      
      await Promise.all([loadPendingStores(), loadBotStores(), loadStats(), loadRequests()]);
      
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
              <div class="glass rounded-2xl p-6 card-hover" data-store-id="\${store.id}" data-store-name="\${store.store_name}" data-list-type="pending">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-4">
                    <input type="checkbox" class="store-checkbox pending-checkbox w-5 h-5 rounded cursor-pointer" 
                      data-store-id="\${store.id}" data-store-name="\${store.store_name}"
                      onchange="updateBulkDeleteButton('pending')">
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
              <div class="glass rounded-2xl p-6 card-hover" data-store-id="\${store.id}" data-store-name="\${store.store_name}" data-list-type="bots">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-4">
                    <input type="checkbox" class="store-checkbox bots-checkbox w-5 h-5 rounded cursor-pointer" 
                      data-store-id="\${store.id}" data-store-name="\${store.store_name}"
                      onchange="updateBulkDeleteButton('bots')">
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
    let pendingSetupStoreId = null;
    
    // 업종 선택 모달 열기
    function quickSetup(storeId) {
      pendingSetupStoreId = storeId;
      document.getElementById('industry-modal').classList.remove('hidden');
      document.getElementById('industry-modal').classList.add('flex');
    }
    
    // 업종 선택 모달 닫기
    function closeIndustryModal() {
      document.getElementById('industry-modal').classList.add('hidden');
      document.getElementById('industry-modal').classList.remove('flex');
      pendingSetupStoreId = null;
    }
    
    // 업종 선택 후 셋팅 실행
    async function selectIndustry(industryType) {
      if (!pendingSetupStoreId) return;
      
      // 선택된 업종 표시
      document.querySelectorAll('.industry-option').forEach(btn => {
        btn.classList.remove('border-yellow-500', 'bg-yellow-500/10');
      });
      event.currentTarget.classList.add('border-yellow-500', 'bg-yellow-500/10');
      
      // 잠시 후 셋팅 진행
      setTimeout(async () => {
        closeIndustryModal();
        await executeQuickSetup(pendingSetupStoreId, industryType);
      }, 300);
    }
    
    // 실제 셋팅 실행
    async function executeQuickSetup(storeId, industryType) {
      // 해당 카드의 버튼 찾기
      const card = document.querySelector(\`[data-store-id="\${storeId}"][data-list-type="pending"]\`);
      const btn = card?.querySelector('.btn-action.gold-bg');
      
      if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI 셋팅 중...';
        btn.disabled = true;
      }
      
      try {
        // 업종 포함하여 API 호출
        const res = await fetch('/api/master/quick-setup/' + storeId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ business_type: industryType })
        });
        
        const data = await res.json();
        
        if (data.success) {
          if (btn) {
            btn.innerHTML = '<i class="fas fa-check"></i> 완료!';
            btn.classList.remove('gold-bg', 'text-black');
            btn.classList.add('bg-green-500', 'text-white');
          }
          
          // 1.5초 후 새로고침
          setTimeout(() => {
            loadPendingStores();
            loadBotStores();
            loadStats();
          }, 1500);
        } else {
          alert('셋팅 실패: ' + (data.error || '알 수 없는 오류'));
          if (btn) {
            btn.innerHTML = '<i class="fas fa-magic"></i> 원클릭 AI 셋팅';
            btn.disabled = false;
          }
        }
      } catch (e) {
        console.error('Quick setup error:', e);
        alert('네트워크 오류: ' + e.message);
        if (btn) {
          btn.innerHTML = '<i class="fas fa-magic"></i> 원클릭 AI 셋팅';
          btn.disabled = false;
        }
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
    
    // ========== [V2.0] 일괄 삭제 기능 ==========
    function toggleSelectAll(listType) {
      const selectAllCheckbox = document.getElementById('select-all-' + listType);
      const checkboxes = document.querySelectorAll('.' + listType + '-checkbox');
      
      checkboxes.forEach(cb => {
        cb.checked = selectAllCheckbox.checked;
      });
      
      updateBulkDeleteButton(listType);
    }
    
    function updateBulkDeleteButton(listType) {
      const checkboxes = document.querySelectorAll('.' + listType + '-checkbox:checked');
      const bulkDeleteBtn = document.getElementById('bulk-delete-' + listType);
      const countSpan = document.getElementById('bulk-delete-' + listType + '-count');
      
      if (checkboxes.length > 0) {
        bulkDeleteBtn.classList.remove('hidden');
        countSpan.textContent = checkboxes.length;
      } else {
        bulkDeleteBtn.classList.add('hidden');
      }
      
      // 전체 선택 체크박스 상태 업데이트
      const allCheckboxes = document.querySelectorAll('.' + listType + '-checkbox');
      const selectAllCheckbox = document.getElementById('select-all-' + listType);
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = allCheckboxes.length > 0 && checkboxes.length === allCheckboxes.length;
      }
    }
    
    async function bulkDeleteStores(listType) {
      const checkboxes = document.querySelectorAll('.' + listType + '-checkbox:checked');
      const storeIds = Array.from(checkboxes).map(cb => ({
        id: cb.dataset.storeId,
        name: cb.dataset.storeName
      }));
      
      if (storeIds.length === 0) {
        alert('삭제할 매장을 선택해주세요.');
        return;
      }
      
      const storeNames = storeIds.map(s => s.name).join('\\n- ');
      const confirmed = confirm(\`⚠️ \${storeIds.length}개 매장을 삭제하시겠습니까?\\n\\n삭제 대상:\\n- \${storeNames}\\n\\n이 작업은 되돌릴 수 없습니다.\`);
      
      if (!confirmed) return;
      
      // 버튼 비활성화 및 로딩 표시
      const deleteBtn = document.getElementById('bulk-delete-' + listType);
      const originalText = deleteBtn.innerHTML;
      deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 삭제 중...';
      deleteBtn.disabled = true;
      
      // 삭제 진행
      let successCount = 0;
      let failCount = 0;
      const errors = [];
      
      for (const store of storeIds) {
        try {
          console.log('Deleting store:', store.id, store.name);
          const res = await fetch('/api/master/store/' + store.id, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });
          
          const data = await res.json();
          console.log('Delete result:', data);
          
          if (data.success) {
            successCount++;
          } else {
            failCount++;
            errors.push(store.name + ': ' + (data.error || '알 수 없는 오류'));
            console.error('Failed to delete store', store.id, data.error);
          }
        } catch (e) {
          failCount++;
          errors.push(store.name + ': 네트워크 오류');
          console.error('Delete error for store', store.id, e);
        }
      }
      
      // 버튼 복원
      deleteBtn.innerHTML = originalText;
      deleteBtn.disabled = false;
      
      // 결과 표시
      let resultMsg = \`삭제 완료!\\n\\n✅ 성공: \${successCount}개\\n❌ 실패: \${failCount}개\`;
      if (errors.length > 0) {
        resultMsg += \`\\n\\n실패 목록:\\n\${errors.join('\\n')}\`;
      }
      alert(resultMsg);
      
      // 체크박스 초기화
      const selectAllEl = document.getElementById('select-all-' + listType);
      if (selectAllEl) selectAllEl.checked = false;
      
      // 목록 새로고침
      loadPendingStores();
      loadBotStores();
      loadStats();
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
    
    // ========== [V2.0] 요청 목록 관리 ==========
    let currentRequestFilter = 'pending';
    
    async function loadRequests(status = 'pending') {
      currentRequestFilter = status;
      
      // 필터 버튼 상태 업데이트
      document.querySelectorAll('.request-filter-btn').forEach(btn => btn.classList.remove('active'));
      event?.currentTarget?.classList.add('active');
      
      try {
        const res = await fetch('/api/request/list?status=' + status);
        const data = await res.json();
        
        if (data.success && data.data) {
          const requests = data.data;
          
          // 배지 업데이트 (pending 개수만)
          if (status === 'pending') {
            document.getElementById('requests-badge').textContent = requests.length;
          }
          
          if (requests.length === 0) {
            document.getElementById('requests-list').innerHTML = \`
              <div class="glass rounded-2xl p-12 text-center">
                <i class="fas fa-inbox text-5xl text-white/20 mb-4"></i>
                <p class="text-xl font-semibold mb-2">\${status === 'pending' ? '대기 중인 요청이 없습니다' : status === 'completed' ? '완료된 요청이 없습니다' : '거절된 요청이 없습니다'}</p>
              </div>
            \`;
            return;
          }
          
          document.getElementById('requests-list').innerHTML = requests.map(req => {
            const typeIcons = {
              'ai_response': 'fa-robot',
              'hours': 'fa-clock',
              'menu': 'fa-utensils',
              'info': 'fa-info-circle',
              'pause': 'fa-pause-circle',
              'other': 'fa-question-circle'
            };
            const typeColors = {
              'ai_response': 'blue',
              'hours': 'green',
              'menu': 'orange',
              'info': 'purple',
              'pause': 'red',
              'other': 'gray'
            };
            const icon = typeIcons[req.request_type] || 'fa-question-circle';
            const color = typeColors[req.request_type] || 'gray';
            const createdAt = new Date(req.created_at).toLocaleString('ko-KR');
            
            return \`
              <div class="glass rounded-2xl p-6 card-hover">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-2xl bg-\${color}-500/20 flex items-center justify-center">
                      <i class="fas \${icon} text-\${color}-400 text-xl"></i>
                    </div>
                    <div>
                      <h3 class="text-lg font-bold">\${req.store_name || '미확인 매장'}</h3>
                      <p class="text-white/50">\${req.request_type_label || req.request_type}</p>
                      <p class="text-xs text-white/30 mt-1">\${createdAt}</p>
                    </div>
                  </div>
                  
                  \${req.status === 'pending' ? \`
                    <div class="flex items-center gap-2">
                      <button onclick="updateRequestStatus(\${req.id}, 'completed')" class="btn-action px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl text-sm flex items-center gap-2">
                        <i class="fas fa-check"></i>
                        처리 완료
                      </button>
                      <button onclick="updateRequestStatus(\${req.id}, 'rejected')" class="btn-action px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-sm flex items-center gap-2">
                        <i class="fas fa-times"></i>
                        거절
                      </button>
                    </div>
                  \` : \`
                    <span class="px-3 py-1 rounded-full text-xs \${req.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                      \${req.status === 'completed' ? '완료' : '거절'}
                    </span>
                  \`}
                </div>
                
                <div class="mt-4 pt-4 border-t border-white/5">
                  <p class="text-sm text-white/70 whitespace-pre-wrap">\${req.content}</p>
                  \${req.contact_time ? \`<p class="text-xs text-white/40 mt-2"><i class="fas fa-phone mr-1"></i>연락 가능 시간: \${req.contact_time}</p>\` : ''}
                  \${req.admin_note ? \`<p class="text-xs text-yellow-400 mt-2"><i class="fas fa-sticky-note mr-1"></i>관리자 메모: \${req.admin_note}</p>\` : ''}
                </div>
              </div>
            \`;
          }).join('');
        }
      } catch (e) {
        console.error('Failed to load requests:', e);
        document.getElementById('requests-list').innerHTML = \`
          <div class="glass rounded-2xl p-8 text-center">
            <i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-4"></i>
            <p class="text-white/50">요청 목록을 불러올 수 없습니다</p>
          </div>
        \`;
      }
    }
    
    async function updateRequestStatus(requestId, status) {
      const note = status === 'rejected' ? prompt('거절 사유를 입력하세요 (선택):') : null;
      
      try {
        const res = await fetch('/api/request/' + requestId + '/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, note })
        });
        
        const data = await res.json();
        
        if (data.success) {
          alert(status === 'completed' ? '요청이 처리 완료되었습니다.' : '요청이 거절되었습니다.');
          loadRequests(currentRequestFilter);
        } else {
          alert('상태 변경 실패: ' + (data.error || '알 수 없는 오류'));
        }
      } catch (e) {
        alert('네트워크 오류');
      }
    }
    
    // ========== [V2.0] 고객 관리 기능 ==========
    let allCustomers = [];
    
    async function loadAllCustomers() {
      try {
        // 먼저 매장 목록 로드
        if (stores.length === 0) {
          const storesRes = await fetch('/api/master/stores');
          const storesData = await storesRes.json();
          if (storesData.success) {
            stores = storesData.data;
            populateStoreSelect();
          }
        }
        
        // 전체 고객 통계 로드
        let totalCustomers = 0;
        let todayFollowups = 0;
        let sentMessages = 0;
        let overdue = 0;
        const today = new Date().toISOString().split('T')[0];
        
        allCustomers = [];
        
        for (const store of stores.filter(s => s.is_active === 1)) {
          try {
            const res = await fetch('/api/stores/' + store.id + '/customers');
            const data = await res.json();
            if (data.success && data.data) {
              data.data.forEach(c => {
                c.store_name = store.store_name;
                c.store_id = store.id;
                allCustomers.push(c);
                
                if (c.next_followup_date) {
                  if (c.next_followup_date === today) todayFollowups++;
                  if (c.next_followup_date < today) overdue++;
                }
              });
              totalCustomers += data.data.length;
            }
          } catch (e) {
            console.error('Failed to load customers for store', store.id, e);
          }
        }
        
        // 발송 로그 카운트
        try {
          const logsRes = await fetch('/api/followup/stats');
          const logsData = await logsRes.json();
          if (logsData.success) {
            sentMessages = logsData.data?.sent_count || 0;
          }
        } catch (e) {}
        
        // 통계 업데이트
        document.getElementById('stat-total-customers').textContent = totalCustomers;
        document.getElementById('stat-today-followups').textContent = todayFollowups;
        document.getElementById('stat-sent-messages').textContent = sentMessages;
        document.getElementById('stat-overdue').textContent = overdue;
        document.getElementById('customers-badge').textContent = totalCustomers;
        
        renderCustomersTable(allCustomers);
      } catch (e) {
        console.error('Failed to load all customers:', e);
      }
    }
    
    function populateStoreSelect() {
      const select = document.getElementById('customer-store-select');
      if (!select) return;
      
      select.innerHTML = '<option value="all">전체 매장</option>' + 
        stores.filter(s => s.is_active === 1).map(s => 
          '<option value="' + s.id + '">' + s.store_name + '</option>'
        ).join('');
    }
    
    async function loadCustomersByStore(storeId) {
      if (storeId === 'all') {
        renderCustomersTable(allCustomers);
      } else {
        renderCustomersTable(allCustomers.filter(c => c.store_id == storeId));
      }
    }
    
    function filterCustomers() {
      const search = document.getElementById('customer-search').value.toLowerCase();
      const storeId = document.getElementById('customer-store-select').value;
      
      let filtered = storeId === 'all' ? allCustomers : allCustomers.filter(c => c.store_id == storeId);
      
      if (search) {
        filtered = filtered.filter(c => 
          (c.customer_name || '').toLowerCase().includes(search) ||
          (c.phone || '').includes(search)
        );
      }
      
      renderCustomersTable(filtered);
    }
    
    function renderCustomersTable(customers) {
      const tbody = document.getElementById('customers-table-body');
      if (!tbody) return;
      
      if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-white/40">등록된 고객이 없습니다</td></tr>';
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      tbody.innerHTML = customers.map(c => {
        const isOverdue = c.next_followup_date && c.next_followup_date < today;
        const isToday = c.next_followup_date === today;
        
        return \`
          <tr class="border-b border-white/5 hover:bg-white/5">
            <td class="py-3 font-medium">\${c.customer_name || '-'}</td>
            <td class="py-3 text-white/70">\${c.phone || '-'}</td>
            <td class="py-3 text-white/70">\${c.store_name || '-'}</td>
            <td class="py-3 text-white/70">\${c.last_service || '-'}</td>
            <td class="py-3 text-white/70">\${c.last_visit_date || '-'}</td>
            <td class="py-3">
              <span class="\${isOverdue ? 'text-red-400' : isToday ? 'text-green-400' : 'text-white/70'}">
                \${c.next_followup_date || '-'}
                \${isOverdue ? ' <i class="fas fa-exclamation-circle"></i>' : ''}
                \${isToday ? ' <i class="fas fa-bell"></i>' : ''}
              </span>
            </td>
            <td class="py-3 text-center">
              <button onclick="sendCustomerMessage(\${c.id}, '\${c.customer_name}')" 
                class="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs hover:bg-blue-500/30">
                <i class="fas fa-paper-plane mr-1"></i>발송
              </button>
            </td>
          </tr>
        \`;
      }).join('');
    }
    
    async function sendCustomerMessage(customerId, customerName) {
      if (!confirm(customerName + '님에게 메시지를 발송하시겠습니까?')) return;
      
      try {
        const res = await fetch('/api/customers/' + customerId + '/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await res.json();
        
        if (data.success) {
          alert('메시지가 발송되었습니다!');
          loadAllCustomers();
        } else {
          alert('발송 실패: ' + (data.error || '알 수 없는 오류'));
        }
      } catch (e) {
        alert('네트워크 오류');
      }
    }
    
    // ========== [V2.0] AI 템플릿 상담 기능 ==========
    async function generateAITemplate() {
      const industry = document.getElementById('ai-industry-select').value;
      const messageType = document.getElementById('ai-message-type').value;
      const detail = document.getElementById('ai-request-detail').value;
      
      if (!industry) {
        alert('업종을 선택해주세요.');
        return;
      }
      
      const container = document.getElementById('ai-result-container');
      container.innerHTML = \`
        <div class="bg-white/5 rounded-xl p-8 text-center">
          <i class="fas fa-spinner fa-spin text-5xl text-purple-400 mb-4"></i>
          <p class="text-white/70">Gemini 2.5 Pro가 메시지를 생성 중입니다...</p>
        </div>
      \`;
      
      try {
        const res = await fetch('/api/ai/generate-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            industry,
            message_type: messageType,
            detail
          })
        });
        
        const data = await res.json();
        
        if (data.success && data.data) {
          const result = data.data;
          container.innerHTML = \`
            <div class="space-y-4">
              <div class="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <p class="text-sm text-green-400 flex items-center gap-2">
                  <i class="fas fa-check-circle"></i>
                  AI가 \${result.variations?.length || 3}개의 메시지를 생성했습니다!
                </p>
              </div>
              
              \${(result.variations || [result.message]).map((msg, i) => \`
                <div class="bg-white/5 rounded-xl p-4">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-white/50">버전 \${i + 1}</span>
                    <button onclick="copyTemplate('\${i}')" class="text-xs text-blue-400 hover:text-blue-300">
                      <i class="fas fa-copy mr-1"></i>복사
                    </button>
                  </div>
                  <p class="text-white whitespace-pre-wrap" id="template-\${i}">\${msg}</p>
                </div>
              \`).join('')}
              
              <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <p class="text-sm text-yellow-400 flex items-center gap-2">
                  <i class="fas fa-lightbulb"></i>
                  팁: 복사 후 고객 관리 페이지에서 메시지 템플릿으로 저장하세요
                </p>
              </div>
              
              \${result.recommended_days ? \`
                <div class="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p class="text-sm text-blue-400">
                    <i class="fas fa-calendar-alt mr-2"></i>
                    추천 발송 주기: <strong>\${result.recommended_days}일</strong> 후
                  </p>
                </div>
              \` : ''}
            </div>
          \`;
        } else {
          throw new Error(data.error || '알 수 없는 오류');
        }
      } catch (e) {
        container.innerHTML = \`
          <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
            <i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-4"></i>
            <p class="text-red-400">메시지 생성 실패: \${e.message}</p>
            <button onclick="generateAITemplate()" class="mt-4 px-4 py-2 bg-red-500/20 rounded-lg text-sm">
              다시 시도
            </button>
          </div>
        \`;
      }
    }
    
    function copyTemplate(index) {
      const el = document.getElementById('template-' + index);
      if (el) {
        navigator.clipboard.writeText(el.textContent);
        alert('클립보드에 복사되었습니다!');
      }
    }
    
    function loadRecommendedTemplate(industry) {
      document.getElementById('ai-industry-select').value = industry;
      document.getElementById('ai-message-type').value = 'after_visit';
      generateAITemplate();
    }
    
    // 초기 로드
    document.addEventListener('DOMContentLoaded', async () => {
      const isAuthed = await checkAuth();
      if (!isAuthed) return;
      
      loadPendingStores();
      loadBotStores();
      loadStats();
      loadRequests();
      loadAllCustomers();
    });
  </script>
  
</body>
</html>
`;
}
