// XIVIX AI Core V1.0 - Admin Dashboard (Full SaaS Version)
// 멀티테넌트 업체 관리 + 10단계 설정 마법사

export function renderAdminDashboard(): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX Admin - 업체 관리</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: 0.02em; }
    body { background: #050505; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.06); }
    .accent { color: #007AFF; }
    .accent-bg { background: #007AFF; }
    .input-field { @apply w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#007AFF] transition-all; }
    .btn-primary { @apply px-6 py-3 bg-[#007AFF] text-white rounded-xl font-medium hover:bg-[#0066DD] transition-all; }
    .btn-secondary { @apply px-6 py-3 glass text-white rounded-xl font-medium hover:bg-white/10 transition-all; }
    .step-indicator { @apply w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all; }
    .step-indicator.active { @apply bg-[#007AFF] text-white; }
    .step-indicator.completed { @apply bg-emerald-500 text-white; }
    .step-indicator.pending { @apply bg-white/10 text-white/40; }
    .tab-btn { @apply px-4 py-2 rounded-lg transition-all; }
    .tab-btn.active { @apply bg-[#007AFF]/20 text-[#007AFF]; }
    .tab-btn:not(.active) { @apply text-white/60 hover:text-white hover:bg-white/5; }
  </style>
</head>
<body class="min-h-screen text-white">
  <div class="flex h-screen overflow-hidden">
    
    <!-- Sidebar -->
    <aside class="w-64 glass border-r border-white/5 flex flex-col">
      <div class="p-6 border-b border-white/5">
        <a href="/" class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl accent-bg flex items-center justify-center">
            <i class="fas fa-brain text-white"></i>
          </div>
          <div>
            <h1 class="text-lg font-bold">XIVIX</h1>
            <p class="text-xs text-white/40">Admin Console</p>
          </div>
        </a>
      </div>
      
      <nav class="flex-1 p-4 space-y-1">
        <div class="nav-item active flex items-center gap-3 px-4 py-3 rounded-xl bg-[#007AFF]/10 text-[#007AFF] font-medium cursor-pointer" onclick="showSection('stores')">
          <i class="fas fa-store w-5"></i>
          업체 관리
        </div>
        <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 cursor-pointer" onclick="showSection('analytics')">
          <i class="fas fa-chart-bar w-5"></i>
          통합 분석
        </div>
        <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 cursor-pointer" onclick="showSection('customers')">
          <i class="fas fa-users w-5"></i>
          고객 관리
        </div>
        <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 cursor-pointer" onclick="showSection('marketing')">
          <i class="fas fa-bullhorn w-5"></i>
          마케팅
        </div>
        <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 cursor-pointer" onclick="showSection('reservations')">
          <i class="fas fa-calendar-check w-5"></i>
          예약 관리
        </div>
        <div class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 cursor-pointer" onclick="showSection('settings')">
          <i class="fas fa-cog w-5"></i>
          시스템 설정
        </div>
      </nav>
    </aside>
    
    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <header class="glass border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold" id="page-title">업체 관리</h2>
          <p class="text-sm text-white/40">등록된 업체를 관리하고 새 업체를 추가합니다</p>
        </div>
        <button onclick="openSetupWizard()" class="btn-primary flex items-center gap-2">
          <i class="fas fa-plus"></i>
          새 업체 등록
        </button>
      </header>
      
      <div class="flex-1 overflow-y-auto p-8">
        
        <!-- Stores Section -->
        <div id="section-stores">
          <!-- Store List -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="store-list">
            <div class="glass rounded-2xl p-6 text-center text-white/30">
              <i class="fas fa-spinner fa-spin text-2xl mb-4"></i>
              <p>로딩 중...</p>
            </div>
          </div>
        </div>
        
        <!-- Analytics Section -->
        <div id="section-analytics" class="hidden">
          <div class="glass rounded-2xl p-8 text-center">
            <i class="fas fa-chart-bar text-4xl text-white/30 mb-4"></i>
            <h3 class="text-lg font-semibold mb-2">통합 분석 대시보드</h3>
            <p class="text-white/40">모든 업체의 AI 상담 성과를 한눈에 확인합니다</p>
          </div>
        </div>
        
        <!-- Customers Section (CRM) -->
        <div id="section-customers" class="hidden">
          <div class="glass rounded-2xl p-8 text-center">
            <i class="fas fa-users text-4xl text-white/30 mb-4"></i>
            <h3 class="text-lg font-semibold mb-2">고객 관리 (CRM)</h3>
            <p class="text-white/40">고객 데이터베이스, 세그먼트, 히스토리 관리</p>
          </div>
        </div>
        
        <!-- Marketing Section -->
        <div id="section-marketing" class="hidden">
          <div class="glass rounded-2xl p-8 text-center">
            <i class="fas fa-bullhorn text-4xl text-white/30 mb-4"></i>
            <h3 class="text-lg font-semibold mb-2">마케팅 관리</h3>
            <p class="text-white/40">프로모션, 캠페인, SMS 메시지 관리</p>
          </div>
        </div>
        
        <!-- Reservations Section -->
        <div id="section-reservations" class="hidden">
          <div class="glass rounded-2xl p-8 text-center">
            <i class="fas fa-calendar-check text-4xl text-white/30 mb-4"></i>
            <h3 class="text-lg font-semibold mb-2">예약 관리</h3>
            <p class="text-white/40">AI가 생성한 예약 및 예약 설정 관리</p>
          </div>
        </div>
        
        <!-- Settings Section -->
        <div id="section-settings" class="hidden">
          <div class="glass rounded-2xl p-8 text-center">
            <i class="fas fa-cog text-4xl text-white/30 mb-4"></i>
            <h3 class="text-lg font-semibold mb-2">시스템 설정</h3>
            <p class="text-white/40">관리자 계정, API 키, 보안 설정</p>
          </div>
        </div>
        
      </div>
    </main>
  </div>
  
  <!-- Setup Wizard Modal -->
  <div id="setup-wizard-modal" class="fixed inset-0 bg-black/80 z-50 hidden items-center justify-center overflow-y-auto">
    <div class="w-full max-w-4xl mx-auto p-4 my-8">
      <div class="glass rounded-3xl overflow-hidden">
        
        <!-- Wizard Header -->
        <div class="px-8 py-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold">새 업체 등록</h2>
            <p class="text-white/40">10단계 설정 마법사</p>
          </div>
          <button onclick="closeSetupWizard()" class="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- Step Indicators -->
        <div class="px-8 py-4 border-b border-white/5 overflow-x-auto">
          <div class="flex items-center gap-2 min-w-max">
            ${[
              '네이버 API',
              '상권분석',
              '기본정보',
              '서비스/메뉴',
              'AI 페르소나',
              'AI 말투',
              'CRM',
              '마케팅',
              '예약설정',
              '검토/테스트'
            ].map((label, i) => `
              <div class="flex items-center">
                <div class="step-indicator ${i === 0 ? 'active' : 'pending'}" data-step="${i + 1}">
                  ${i + 1}
                </div>
                <span class="ml-2 text-xs ${i === 0 ? 'text-white' : 'text-white/40'}" data-step-label="${i + 1}">${label}</span>
                ${i < 9 ? '<div class="w-4 h-px bg-white/10 mx-2"></div>' : ''}
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- Wizard Content -->
        <div class="p-8 max-h-[60vh] overflow-y-auto">
          
          <!-- Step 1: 네이버 API 연결 -->
          <div id="wizard-step-1" class="wizard-step">
            <h3 class="text-xl font-semibold mb-6 flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <i class="fas fa-plug text-green-400"></i>
              </span>
              네이버 API 연결
            </h3>
            
            <div class="space-y-6">
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">네이버 톡톡 API</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm text-white/60 mb-2">Client ID <span class="text-red-400">*</span></label>
                    <input type="text" class="input-field" placeholder="발급받은 Client ID" id="naver-client-id">
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">Client Secret <span class="text-red-400">*</span></label>
                    <input type="password" class="input-field" placeholder="발급받은 Client Secret" id="naver-client-secret">
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-sm text-white/60 mb-2">Access Token <span class="text-red-400">*</span></label>
                    <input type="password" class="input-field" placeholder="보내기 API 토큰" id="naver-access-token">
                  </div>
                </div>
                <div class="mt-4 p-4 bg-blue-500/10 rounded-xl">
                  <p class="text-sm text-blue-400">
                    <i class="fas fa-info-circle mr-2"></i>
                    Webhook URL (등록 시 자동 생성): <code class="bg-white/10 px-2 py-1 rounded">https://xivix-ai-core.pages.dev/v1/naver/callback/{store_id}</code>
                  </p>
                </div>
              </div>
              
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">네이버 예약 API (선택)</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm text-white/60 mb-2">사업자 ID</label>
                    <input type="text" class="input-field" placeholder="네이버 예약 사업자 ID" id="naver-business-id">
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">API Key</label>
                    <input type="password" class="input-field" placeholder="예약 API Key" id="naver-reservation-key">
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Step 2: 상권/경쟁사/타겟 분석 -->
          <div id="wizard-step-2" class="wizard-step hidden">
            <h3 class="text-xl font-semibold mb-6 flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <i class="fas fa-chart-pie text-purple-400"></i>
              </span>
              상권/경쟁사/타겟 분석
            </h3>
            
            <div class="space-y-6">
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">업종 및 상권</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm text-white/60 mb-2">업종 카테고리 <span class="text-red-400">*</span></label>
                    <select class="input-field" id="business-category">
                      <option value="">선택하세요</option>
                      <option value="beauty_salon">미용실/헤어샵</option>
                      <option value="skin_care">피부관리/에스테틱</option>
                      <option value="nail_shop">네일샵</option>
                      <option value="restaurant">레스토랑/카페</option>
                      <option value="fitness">피트니스/요가</option>
                      <option value="medical">병원/의원</option>
                      <option value="pet_service">반려동물 서비스</option>
                      <option value="education">학원/교육</option>
                      <option value="other">기타</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">경쟁 강도</label>
                    <select class="input-field" id="competition-level">
                      <option value="low">낮음 (동종업체 3개 미만)</option>
                      <option value="medium">보통 (동종업체 3-10개)</option>
                      <option value="high">높음 (동종업체 10개 이상)</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">타겟 고객</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm text-white/60 mb-2">타겟 연령대</label>
                    <select class="input-field" id="target-age">
                      <option value="20-30">20-30대</option>
                      <option value="30-40">30-40대</option>
                      <option value="40-50">40-50대</option>
                      <option value="all">전 연령</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">타겟 성별</label>
                    <select class="input-field" id="target-gender">
                      <option value="female">여성</option>
                      <option value="male">남성</option>
                      <option value="all">전체</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">소득 수준</label>
                    <select class="input-field" id="target-income">
                      <option value="budget">가성비 중시</option>
                      <option value="middle">중간</option>
                      <option value="premium">프리미엄</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">우리 매장 차별점</h4>
                <div id="usp-container">
                  <div class="flex gap-2 mb-2">
                    <input type="text" class="input-field flex-1" placeholder="예: 원장 직접 시술" id="usp-1">
                    <button onclick="addUSPField()" class="btn-secondary px-4"><i class="fas fa-plus"></i></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Step 3: 매장 기본 정보 -->
          <div id="wizard-step-3" class="wizard-step hidden">
            <h3 class="text-xl font-semibold mb-6 flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <i class="fas fa-store text-blue-400"></i>
              </span>
              매장 기본 정보
            </h3>
            
            <div class="space-y-6">
              <div class="glass rounded-xl p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm text-white/60 mb-2">매장명 <span class="text-red-400">*</span></label>
                    <input type="text" class="input-field" placeholder="예: 뷰티플 스킨케어" id="store-name">
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">대표자명 <span class="text-red-400">*</span></label>
                    <input type="text" class="input-field" placeholder="대표자 이름" id="owner-name">
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-sm text-white/60 mb-2">매장 주소 <span class="text-red-400">*</span></label>
                    <input type="text" class="input-field" placeholder="서울시 강남구 테헤란로 123" id="store-address">
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">전화번호</label>
                    <input type="tel" class="input-field" placeholder="02-1234-5678" id="store-phone">
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">이메일</label>
                    <input type="email" class="input-field" placeholder="store@example.com" id="store-email">
                  </div>
                </div>
              </div>
              
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">영업시간</h4>
                <div class="space-y-3" id="operating-hours">
                  ${['월', '화', '수', '목', '금', '토', '일'].map((day, i) => `
                    <div class="flex items-center gap-4">
                      <label class="w-12 font-medium">${day}</label>
                      <label class="flex items-center gap-2">
                        <input type="checkbox" class="w-4 h-4 rounded" checked data-day="${i}">
                        <span class="text-sm text-white/60">영업</span>
                      </label>
                      <input type="time" class="input-field w-32" value="${i < 6 ? '10:00' : '10:00'}" data-day-open="${i}">
                      <span class="text-white/40">~</span>
                      <input type="time" class="input-field w-32" value="${i < 6 ? '21:00' : '18:00'}" data-day-close="${i}">
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
          
          <!-- Step 4: 서비스/메뉴 설정 -->
          <div id="wizard-step-4" class="wizard-step hidden">
            <h3 class="text-xl font-semibold mb-6 flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <i class="fas fa-list-alt text-orange-400"></i>
              </span>
              서비스/메뉴 설정
            </h3>
            
            <div class="space-y-4" id="menu-container">
              <div class="glass rounded-xl p-4 menu-item">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label class="block text-sm text-white/60 mb-2">서비스명</label>
                    <input type="text" class="input-field" placeholder="예: 기초 피부관리">
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">가격 (원)</label>
                    <input type="number" class="input-field" placeholder="80000">
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">소요시간 (분)</label>
                    <input type="number" class="input-field" placeholder="60">
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">설명</label>
                    <input type="text" class="input-field" placeholder="딥클렌징 + 수분관리">
                  </div>
                </div>
              </div>
            </div>
            <button onclick="addMenuItem()" class="w-full mt-4 py-3 glass rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">
              <i class="fas fa-plus mr-2"></i>서비스 추가
            </button>
            
            <div class="glass rounded-xl p-6 mt-6">
              <h4 class="font-semibold mb-4">현재 프로모션 (선택)</h4>
              <textarea class="input-field h-24" placeholder="예: 첫 방문 고객 10% 할인, 친구 추천 시 양쪽 모두 5,000원 할인" id="promotions"></textarea>
            </div>
          </div>
          
          <!-- Step 5: AI 페르소나 설정 -->
          <div id="wizard-step-5" class="wizard-step hidden">
            <h3 class="text-xl font-semibold mb-6 flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <i class="fas fa-robot text-pink-400"></i>
              </span>
              AI 페르소나 설정
            </h3>
            
            <div class="space-y-6">
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">AI 역할</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm text-white/60 mb-2">역할 이름 <span class="text-red-400">*</span></label>
                    <input type="text" class="input-field" placeholder="예: 뷰티 컨설턴트, 웰니스 매니저" id="ai-role-name">
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">경력 연차</label>
                    <input type="number" class="input-field" placeholder="10" value="10" id="ai-experience">
                  </div>
                </div>
                <div class="mt-4">
                  <label class="block text-sm text-white/60 mb-2">전문 분야 (쉼표로 구분)</label>
                  <input type="text" class="input-field" placeholder="예: 피부 진단, 맞춤 관리, 안티에이징" id="ai-specialty">
                </div>
              </div>
              
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">성격 특성</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm text-white/60 mb-2">주요 성격</label>
                    <select class="input-field" id="ai-personality">
                      <option value="professional">전문적 - 신뢰감 있는 전문가</option>
                      <option value="warm">따뜻함 - 친근하고 공감적인</option>
                      <option value="energetic">활기참 - 밝고 긍정적인</option>
                      <option value="calm">차분함 - 안정적이고 편안한</option>
                      <option value="witty">위트 - 재치있고 유머러스한</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">부가 특성 (복수 선택)</label>
                    <div class="flex flex-wrap gap-2" id="secondary-traits">
                      ${['꼼꼼함', '적극적', '배려심', '솔직함', '인내심', '창의적', '세심함', '신속함'].map(trait => `
                        <label class="flex items-center gap-2 px-3 py-2 glass rounded-lg cursor-pointer hover:bg-white/5">
                          <input type="checkbox" value="${trait}" class="w-4 h-4 rounded">
                          <span class="text-sm">${trait}</span>
                        </label>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Step 6: AI 말투 설정 -->
          <div id="wizard-step-6" class="wizard-step hidden">
            <h3 class="text-xl font-semibold mb-6 flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <i class="fas fa-comment-dots text-cyan-400"></i>
              </span>
              AI 말투 설정
            </h3>
            
            <div class="space-y-6">
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">말투 스타일</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm text-white/60 mb-2">격식 수준</label>
                    <select class="input-field" id="ai-formality">
                      <option value="very_formal">매우 격식 (~하십니다, ~드립니다)</option>
                      <option value="formal" selected>격식 (~합니다, ~해드립니다)</option>
                      <option value="polite_casual">공손-캐주얼 (~해요, ~할게요)</option>
                      <option value="casual">캐주얼 (~야, ~해)</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">이모지 사용</label>
                    <select class="input-field" id="ai-emoji">
                      <option value="none">사용 안함</option>
                      <option value="minimal" selected>최소 (핵심 포인트만)</option>
                      <option value="moderate">적당히 (문장 끝에)</option>
                      <option value="frequent">자주 (친근한 느낌)</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">허용 이모지 선택</h4>
                <div class="flex flex-wrap gap-2" id="allowed-emojis">
                  ${['😊', '✨', '💇‍♀️', '💆‍♀️', '🌟', '❤️', '👍', '📞', '📅', '💪', '🎉', '💯'].map(emoji => `
                    <label class="flex items-center justify-center w-12 h-12 glass rounded-xl cursor-pointer hover:bg-white/10 text-2xl">
                      <input type="checkbox" value="${emoji}" class="hidden" checked>
                      <span>${emoji}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
              
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">맞춤 문구</h4>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm text-white/60 mb-2">인사말 (줄바꿈으로 여러 개 입력)</label>
                    <textarea class="input-field h-20" placeholder="안녕하세요! {매장명}입니다.&#10;반갑습니다! 무엇을 도와드릴까요?" id="custom-greetings"></textarea>
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">예약 유도 문구</label>
                    <textarea class="input-field h-20" placeholder="예약 도와드릴까요?&#10;지금 예약하시면 대기 없이 바로 가능해요." id="custom-closings"></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Step 7: CRM 설정 -->
          <div id="wizard-step-7" class="wizard-step hidden">
            <h3 class="text-xl font-semibold mb-6 flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <i class="fas fa-user-tag text-emerald-400"></i>
              </span>
              고객 관리 (CRM) 설정
            </h3>
            
            <div class="space-y-6">
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">고객 세그먼트</h4>
                <div class="space-y-3">
                  <div class="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                    <span class="w-24 text-sm font-medium">신규 고객</span>
                    <span class="text-sm text-white/60">환영 인사, 매장 소개, 첫 방문 혜택 안내</span>
                  </div>
                  <div class="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                    <span class="w-24 text-sm font-medium">단골 고객</span>
                    <span class="text-sm text-white/60">기억하는 느낌, 개인화 추천, VIP 혜택 안내</span>
                  </div>
                  <div class="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                    <span class="w-24 text-sm font-medium">이탈 위험</span>
                    <span class="text-sm text-white/60">안부 인사, 특별 프로모션, 재방문 유도</span>
                  </div>
                </div>
              </div>
              
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">팔로업 규칙</h4>
                <div class="space-y-3">
                  <label class="flex items-center gap-3">
                    <input type="checkbox" class="w-4 h-4 rounded" checked>
                    <span class="text-sm">예약 완료 시 → 즉시 예약 확인 메시지</span>
                  </label>
                  <label class="flex items-center gap-3">
                    <input type="checkbox" class="w-4 h-4 rounded" checked>
                    <span class="text-sm">방문 완료 후 1일 → 감사 메시지 + 리뷰 요청</span>
                  </label>
                  <label class="flex items-center gap-3">
                    <input type="checkbox" class="w-4 h-4 rounded" checked>
                    <span class="text-sm">30일 미방문 시 → 안부 인사 + 프로모션</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Step 8: 마케팅 설정 -->
          <div id="wizard-step-8" class="wizard-step hidden">
            <h3 class="text-xl font-semibold mb-6 flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <i class="fas fa-bullhorn text-yellow-400"></i>
              </span>
              마케팅 설정
            </h3>
            
            <div class="space-y-6">
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">자동 메시지</h4>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm text-white/60 mb-2">생일 축하 메시지</label>
                    <textarea class="input-field h-20" placeholder="{고객명}님, 생일 축하드려요! 🎂 생일 기념으로 10% 할인 쿠폰을 선물로 드릴게요." id="birthday-message"></textarea>
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">방문 기념일 메시지</label>
                    <textarea class="input-field h-20" placeholder="{고객명}님, 벌써 저희 매장과 1주년이네요! 감사의 마음을 담아 특별 혜택을 준비했어요." id="anniversary-message"></textarea>
                  </div>
                </div>
              </div>
              
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">SMS 설정</h4>
                <div class="space-y-4">
                  <label class="flex items-center gap-3">
                    <input type="checkbox" class="w-4 h-4 rounded" id="sms-enabled">
                    <span>SMS 발송 사용</span>
                  </label>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">발신 번호</label>
                    <input type="tel" class="input-field" placeholder="02-1234-5678" id="sms-sender">
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Step 9: 예약 설정 -->
          <div id="wizard-step-9" class="wizard-step hidden">
            <h3 class="text-xl font-semibold mb-6 flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <i class="fas fa-calendar-alt text-indigo-400"></i>
              </span>
              예약 시스템 설정
            </h3>
            
            <div class="space-y-6">
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">예약 규칙</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm text-white/60 mb-2">사전 예약 가능 일수</label>
                    <input type="number" class="input-field" value="30" id="advance-booking-days">
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">최소 예약 시간 전 (시간)</label>
                    <input type="number" class="input-field" value="2" id="min-notice-hours">
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">예약 슬롯 단위 (분)</label>
                    <select class="input-field" id="slot-duration">
                      <option value="15">15분</option>
                      <option value="30" selected>30분</option>
                      <option value="60">60분</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">시간대별 최대 예약 수</label>
                    <input type="number" class="input-field" value="1" id="max-bookings-per-slot">
                  </div>
                </div>
              </div>
              
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">취소 정책</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm text-white/60 mb-2">무료 취소 가능 시간 전</label>
                    <input type="number" class="input-field" value="24" id="free-cancellation-hours">
                  </div>
                  <div>
                    <label class="block text-sm text-white/60 mb-2">노쇼 정책</label>
                    <input type="text" class="input-field" placeholder="연락 없이 방문하지 않으시면 다음 예약이 제한될 수 있습니다." id="no-show-policy">
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Step 10: 최종 검토 및 테스트 -->
          <div id="wizard-step-10" class="wizard-step hidden">
            <h3 class="text-xl font-semibold mb-6 flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <i class="fas fa-check-double text-emerald-400"></i>
              </span>
              최종 검토 및 테스트
            </h3>
            
            <div class="space-y-6">
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">설정 요약</h4>
                <div id="setup-summary" class="space-y-3 text-sm">
                  <!-- Summary will be populated by JS -->
                </div>
              </div>
              
              <div class="glass rounded-xl p-6">
                <h4 class="font-semibold mb-4">AI 테스트</h4>
                <div class="space-y-4">
                  <div class="bg-white/5 rounded-xl p-4" id="test-chat-area">
                    <div class="text-center text-white/30 py-4">
                      <i class="fas fa-robot text-2xl mb-2"></i>
                      <p>테스트 메시지를 입력하여 AI 응답을 확인하세요</p>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <input type="text" class="input-field flex-1" placeholder="테스트 메시지 입력..." id="test-message-input">
                    <button onclick="testAI()" class="btn-primary">테스트</button>
                  </div>
                  <div class="flex gap-2 flex-wrap">
                    <button onclick="setTestMessage('예약 가능한 시간 알려주세요')" class="px-3 py-1 text-sm glass rounded-lg hover:bg-white/10">예약 문의</button>
                    <button onclick="setTestMessage('가격표 좀 알려주세요')" class="px-3 py-1 text-sm glass rounded-lg hover:bg-white/10">가격 문의</button>
                    <button onclick="setTestMessage('피부관리 받고 싶은데요')" class="px-3 py-1 text-sm glass rounded-lg hover:bg-white/10">서비스 문의</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
        
        <!-- Wizard Footer -->
        <div class="px-8 py-6 border-t border-white/5 flex items-center justify-between">
          <button onclick="prevStep()" class="btn-secondary" id="prev-btn" style="display:none;">
            <i class="fas fa-arrow-left mr-2"></i>이전
          </button>
          <div class="flex-1"></div>
          <button onclick="nextStep()" class="btn-primary" id="next-btn">
            다음<i class="fas fa-arrow-right ml-2"></i>
          </button>
          <button onclick="saveStore()" class="btn-primary hidden" id="save-btn">
            <i class="fas fa-check mr-2"></i>업체 등록 완료
          </button>
        </div>
        
      </div>
    </div>
  </div>

  <script>
    let currentStep = 1;
    const totalSteps = 10;
    
    function showSection(section) {
      document.querySelectorAll('[id^="section-"]').forEach(el => el.classList.add('hidden'));
      document.getElementById('section-' + section)?.classList.remove('hidden');
      
      document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('bg-[#007AFF]/10', 'text-[#007AFF]', 'font-medium');
        el.classList.add('text-white/60');
      });
      event?.target.closest('.nav-item')?.classList.add('bg-[#007AFF]/10', 'text-[#007AFF]', 'font-medium');
      event?.target.closest('.nav-item')?.classList.remove('text-white/60');
    }
    
    function openSetupWizard() {
      document.getElementById('setup-wizard-modal').classList.remove('hidden');
      document.getElementById('setup-wizard-modal').classList.add('flex');
      currentStep = 1;
      updateWizardUI();
    }
    
    function closeSetupWizard() {
      document.getElementById('setup-wizard-modal').classList.add('hidden');
      document.getElementById('setup-wizard-modal').classList.remove('flex');
    }
    
    function updateWizardUI() {
      // Update step indicators
      for (let i = 1; i <= totalSteps; i++) {
        const indicator = document.querySelector(\`.step-indicator[data-step="\${i}"]\`);
        const label = document.querySelector(\`[data-step-label="\${i}"]\`);
        
        indicator.classList.remove('active', 'completed', 'pending');
        label.classList.remove('text-white', 'text-emerald-400', 'text-white/40');
        
        if (i < currentStep) {
          indicator.classList.add('completed');
          indicator.innerHTML = '<i class="fas fa-check"></i>';
          label.classList.add('text-emerald-400');
        } else if (i === currentStep) {
          indicator.classList.add('active');
          indicator.textContent = i;
          label.classList.add('text-white');
        } else {
          indicator.classList.add('pending');
          indicator.textContent = i;
          label.classList.add('text-white/40');
        }
      }
      
      // Show/hide steps
      document.querySelectorAll('.wizard-step').forEach(el => el.classList.add('hidden'));
      document.getElementById('wizard-step-' + currentStep)?.classList.remove('hidden');
      
      // Update buttons
      document.getElementById('prev-btn').style.display = currentStep === 1 ? 'none' : 'flex';
      document.getElementById('next-btn').classList.toggle('hidden', currentStep === totalSteps);
      document.getElementById('save-btn').classList.toggle('hidden', currentStep !== totalSteps);
      
      // Generate summary on last step
      if (currentStep === totalSteps) {
        generateSummary();
      }
    }
    
    function nextStep() {
      if (currentStep < totalSteps) {
        currentStep++;
        updateWizardUI();
      }
    }
    
    function prevStep() {
      if (currentStep > 1) {
        currentStep--;
        updateWizardUI();
      }
    }
    
    function addMenuItem() {
      const container = document.getElementById('menu-container');
      const newItem = document.createElement('div');
      newItem.className = 'glass rounded-xl p-4 menu-item';
      newItem.innerHTML = \`
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm text-white/60 mb-2">서비스명</label>
            <input type="text" class="input-field" placeholder="예: 기초 피부관리">
          </div>
          <div>
            <label class="block text-sm text-white/60 mb-2">가격 (원)</label>
            <input type="number" class="input-field" placeholder="80000">
          </div>
          <div>
            <label class="block text-sm text-white/60 mb-2">소요시간 (분)</label>
            <input type="number" class="input-field" placeholder="60">
          </div>
          <div class="flex items-end gap-2">
            <div class="flex-1">
              <label class="block text-sm text-white/60 mb-2">설명</label>
              <input type="text" class="input-field" placeholder="딥클렌징 + 수분관리">
            </div>
            <button onclick="this.closest('.menu-item').remove()" class="px-4 py-3 glass rounded-xl text-red-400 hover:bg-red-500/10">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      \`;
      container.appendChild(newItem);
    }
    
    let uspCount = 1;
    function addUSPField() {
      uspCount++;
      const container = document.getElementById('usp-container');
      const newField = document.createElement('div');
      newField.className = 'flex gap-2 mb-2';
      newField.innerHTML = \`
        <input type="text" class="input-field flex-1" placeholder="차별점 입력" id="usp-\${uspCount}">
        <button onclick="this.parentElement.remove()" class="btn-secondary px-4 text-red-400"><i class="fas fa-times"></i></button>
      \`;
      container.appendChild(newField);
    }
    
    function generateSummary() {
      const summary = document.getElementById('setup-summary');
      const storeName = document.getElementById('store-name')?.value || '미입력';
      const businessCategory = document.getElementById('business-category')?.value || '미입력';
      const aiRole = document.getElementById('ai-role-name')?.value || '미입력';
      const aiPersonality = document.getElementById('ai-personality')?.value || '미입력';
      const aiFormality = document.getElementById('ai-formality')?.value || '미입력';
      
      summary.innerHTML = \`
        <div class="grid grid-cols-2 gap-4">
          <div class="p-3 bg-white/5 rounded-lg">
            <p class="text-white/40">매장명</p>
            <p class="font-medium">\${storeName}</p>
          </div>
          <div class="p-3 bg-white/5 rounded-lg">
            <p class="text-white/40">업종</p>
            <p class="font-medium">\${businessCategory}</p>
          </div>
          <div class="p-3 bg-white/5 rounded-lg">
            <p class="text-white/40">AI 역할</p>
            <p class="font-medium">\${aiRole}</p>
          </div>
          <div class="p-3 bg-white/5 rounded-lg">
            <p class="text-white/40">AI 성격</p>
            <p class="font-medium">\${aiPersonality}</p>
          </div>
          <div class="p-3 bg-white/5 rounded-lg">
            <p class="text-white/40">말투</p>
            <p class="font-medium">\${aiFormality}</p>
          </div>
          <div class="p-3 bg-white/5 rounded-lg">
            <p class="text-white/40">상태</p>
            <p class="font-medium text-emerald-400">설정 완료</p>
          </div>
        </div>
      \`;
    }
    
    function setTestMessage(msg) {
      document.getElementById('test-message-input').value = msg;
    }
    
    async function testAI() {
      const message = document.getElementById('test-message-input').value;
      if (!message) return;
      
      const chatArea = document.getElementById('test-chat-area');
      chatArea.innerHTML = \`
        <div class="flex justify-end mb-3">
          <div class="bg-[#007AFF]/20 rounded-xl rounded-br-none px-4 py-2 max-w-xs">
            <p class="text-sm">\${message}</p>
          </div>
        </div>
        <div class="flex justify-start">
          <div class="bg-white/5 rounded-xl rounded-bl-none px-4 py-2 max-w-xs">
            <i class="fas fa-spinner fa-spin mr-2"></i>AI 응답 생성 중...
          </div>
        </div>
      \`;
      
      try {
        const res = await fetch('/v1/test/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, customer_id: 'wizard-test' })
        });
        const data = await res.json();
        
        chatArea.innerHTML = \`
          <div class="flex justify-end mb-3">
            <div class="bg-[#007AFF]/20 rounded-xl rounded-br-none px-4 py-2 max-w-xs">
              <p class="text-sm">\${message}</p>
            </div>
          </div>
          <div class="flex justify-start">
            <div class="bg-white/5 rounded-xl rounded-bl-none px-4 py-2 max-w-md">
              <p class="text-sm">\${data.response || data.error}</p>
              <p class="text-xs text-white/40 mt-2">\${data.response_time_ms}ms</p>
            </div>
          </div>
        \`;
      } catch (e) {
        chatArea.innerHTML += '<p class="text-red-400 text-sm mt-2">테스트 실패</p>';
      }
    }
    
    async function saveStore() {
      const storeData = {
        store_name: document.getElementById('store-name')?.value,
        business_type: document.getElementById('business-category')?.value,
        address: document.getElementById('store-address')?.value,
        phone: document.getElementById('store-phone')?.value,
        operating_hours: '10:00-21:00',
        ai_persona: document.getElementById('ai-role-name')?.value + ' (' + document.getElementById('ai-personality')?.value + ')',
        ai_tone: document.getElementById('ai-formality')?.value,
        menu_data: JSON.stringify(collectMenuData())
      };
      
      try {
        const res = await fetch('/api/stores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(storeData)
        });
        const data = await res.json();
        
        if (data.success) {
          alert('업체가 등록되었습니다!');
          closeSetupWizard();
          loadStores();
        } else {
          alert('등록 실패: ' + (data.error || '알 수 없는 오류'));
        }
      } catch (e) {
        alert('네트워크 오류');
      }
    }
    
    function collectMenuData() {
      const menus = [];
      document.querySelectorAll('.menu-item').forEach(item => {
        const inputs = item.querySelectorAll('input');
        if (inputs[0]?.value) {
          menus.push({
            name: inputs[0].value,
            price: parseInt(inputs[1]?.value) || 0,
            duration: parseInt(inputs[2]?.value) || 60,
            description: inputs[3]?.value || ''
          });
        }
      });
      return menus;
    }
    
    async function loadStores() {
      try {
        const res = await fetch('/api/stores');
        const data = await res.json();
        
        const container = document.getElementById('store-list');
        if (data.success && data.data?.length > 0) {
          container.innerHTML = data.data.map(store => \`
            <div class="glass rounded-2xl p-6 hover:bg-white/5 transition-all cursor-pointer" onclick="location.href='/dashboard/\${store.id}'">
              <div class="flex items-start justify-between mb-4">
                <div class="w-12 h-12 rounded-xl bg-[#007AFF]/20 flex items-center justify-center">
                  <i class="fas fa-store text-[#007AFF]"></i>
                </div>
                <span class="text-xs px-2 py-1 rounded-full \${store.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}">
                  \${store.is_active ? '운영중' : '비활성'}
                </span>
              </div>
              <h3 class="font-semibold mb-1">\${store.store_name}</h3>
              <p class="text-sm text-white/40 mb-4">\${store.business_type || '업종 미설정'}</p>
              <div class="flex items-center gap-4 text-xs text-white/40">
                <span><i class="fas fa-calendar mr-1"></i>\${new Date(store.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
          \`).join('');
        } else {
          container.innerHTML = \`
            <div class="glass rounded-2xl p-8 text-center col-span-full">
              <i class="fas fa-store-slash text-4xl text-white/20 mb-4"></i>
              <p class="text-white/40 mb-4">등록된 업체가 없습니다</p>
              <button onclick="openSetupWizard()" class="btn-primary">
                <i class="fas fa-plus mr-2"></i>첫 업체 등록하기
              </button>
            </div>
          \`;
        }
      } catch (e) {
        console.error('Failed to load stores:', e);
      }
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', loadStores);
  </script>
</body>
</html>
  `;
}
