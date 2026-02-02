// XIVIX AI Core V1.0 - 고객용 30초 연동 페이지
// Zero-Touch Onboarding: 사장님은 클릭 한 번만!
// 범용 업종 확장 시스템 v2026.01.21

// 업종 데이터베이스 (Master Logic)
const INDUSTRY_DATABASE = [
  { id: 'BEAUTY_HAIR', name: '미용실/헤어숍', icon: 'fa-cut', specialty: '스타일 추천, 시술 소요시간 안내, 디자이너 매칭' },
  { id: 'BEAUTY_SKIN', name: '피부관리/에스테틱', icon: 'fa-spa', specialty: '피부 타입 분석, 홈케어 가이드, 코스별 효능 안내' },
  { id: 'BEAUTY_NAIL', name: '네일아트/속눈썹', icon: 'fa-hand-sparkles', specialty: '디자인 추천, 관리 팁, 예약 안내' },
  { id: 'RESTAURANT', name: '일반 식당/카페', icon: 'fa-utensils', specialty: '메뉴 추천, 주차 안내, 단체 예약, 알레르기 정보' },
  { id: 'FITNESS', name: '피트니스/요가/PT', icon: 'fa-dumbbell', specialty: '프로그램 안내, 트레이너 매칭, 회원권 상담' },
  { id: 'MEDICAL', name: '병원/의원/치과', icon: 'fa-hospital', specialty: '진료 안내, 보험 상담, 예약 관리' },
  { id: 'PROFESSIONAL_LEGAL', name: '법률/세무/보험', icon: 'fa-balance-scale', specialty: '서류 요약, 상담 예약, 기초 법률/보험 상식 안내' },
  { id: 'EDUCATION', name: '학원/교육/과외', icon: 'fa-graduation-cap', specialty: '수강료 안내, 커리큘럼 상담, 레벨 테스트 예약' },
  { id: 'PET_SERVICE', name: '애견/반려동물', icon: 'fa-paw', specialty: '미용 예약, 호텔 예약, 건강 상담' },
  { id: 'REAL_ESTATE', name: '부동산/인테리어', icon: 'fa-home', specialty: '매물 안내, 상담 예약, 시공 문의' },
  { id: 'AUTO_SERVICE', name: '자동차 정비/세차', icon: 'fa-car', specialty: '정비 예약, 견적 안내, 부품 상담' },
  { id: 'PHOTOGRAPHY', name: '사진관/스튜디오', icon: 'fa-camera', specialty: '촬영 예약, 패키지 안내, 포트폴리오 상담' },
  { id: 'CUSTOM_SECTOR', name: '직접 입력 (기타)', icon: 'fa-pencil-alt', specialty: '사장님이 정의한 특정 비즈니스 로직에 맞춤 최적화' }
];

export function renderClientOnboarding(storeId?: number): string {
  const industryOptionsHtml = INDUSTRY_DATABASE.map(ind => 
    `<div class="industry-option" data-id="${ind.id}" data-name="${ind.name}" data-specialty="${ind.specialty}" onclick="selectIndustry('${ind.id}')">
      <i class="fas ${ind.icon} text-lg"></i>
      <div class="flex-1">
        <p class="font-medium">${ind.name}</p>
        <p class="text-xs text-white/40">${ind.specialty}</p>
      </div>
    </div>`
  ).join('');

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX - AI 지배인 연동</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; }
    body { background: #050505; }
    .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.06); }
    .gold { color: #D4AF37; }
    .gold-bg { background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%); }
    .gold-border { border: 1px solid rgba(212, 175, 55, 0.3); }
    .pulse-gold { animation: pulseGold 2s infinite; }
    @keyframes pulseGold {
      0%, 100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.4); }
      50% { box-shadow: 0 0 0 15px rgba(212, 175, 55, 0); }
    }
    .step-card { transition: all 0.3s ease; }
    .progress-bar { transition: width 0.5s ease; }
    .highlight-box {
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%);
      border: 1px solid rgba(212, 175, 55, 0.3);
    }
    
    /* 업종 선택 드롭다운 스타일 */
    .industry-selector {
      position: relative;
    }
    .industry-dropdown {
      position: absolute;
      bottom: 100%;
      left: 0;
      right: 0;
      max-height: 250px;
      overflow-y: auto;
      z-index: 100;
      display: none;
      margin-bottom: 8px;
      background: #0a0a0a; /* 불투명 배경 */
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 12px;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.8);
    }
    .industry-dropdown.show {
      display: block;
    }
    .industry-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      transition: all 0.2s;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .industry-option:hover {
      background: rgba(212, 175, 55, 0.1);
    }
    .industry-option.selected {
      background: rgba(212, 175, 55, 0.2);
      border-left: 3px solid #D4AF37;
    }
    .industry-option:last-child {
      border-bottom: none;
    }
    
    /* 검색 필터 하이라이트 */
    .industry-option.hidden {
      display: none;
    }
    
    /* 커스텀 입력 필드 */
    .custom-input-wrapper {
      display: none;
    }
    .custom-input-wrapper.show {
      display: block;
    }
  </style>
</head>
<body class="min-h-screen text-white flex items-center justify-center p-4">
  
  <div class="w-full max-w-lg">
    
    <!-- Header -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl gold-bg mb-4">
        <i class="fas fa-robot text-3xl text-black"></i>
      </div>
      <h1 class="text-3xl font-bold mb-2">XIVIX <span class="gold">AI 지배인</span></h1>
      <p class="text-white/60">어떤 업종이든 30분 내 AI 상담사 배치</p>
    </div>
    
    <!-- Main Card -->
    <div class="glass rounded-3xl p-8 gold-border">
      
      <!-- Step Indicator -->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-2">
          <div class="step-dot w-3 h-3 rounded-full gold-bg" id="dot-1"></div>
          <div class="w-12 h-0.5 bg-white/10" id="line-1"></div>
          <div class="step-dot w-3 h-3 rounded-full bg-white/20" id="dot-2"></div>
          <div class="w-12 h-0.5 bg-white/10" id="line-2"></div>
          <div class="step-dot w-3 h-3 rounded-full bg-white/20" id="dot-3"></div>
        </div>
        <span class="text-sm text-white/40" id="step-label">1 / 3 단계</span>
      </div>
      
      <!-- ================================================ -->
      <!-- Step 1: 네이버 톡톡 계정 ID 확인 -->
      <!-- ================================================ -->
      <div id="step-1" class="step-content">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/20 mb-4">
            <i class="fas fa-id-card text-2xl text-green-400"></i>
          </div>
          <h2 class="text-xl font-bold mb-2">네이버 톡톡 계정 ID 확인</h2>
          <p class="text-white/60 text-sm">파트너센터에서 6자리 계정 코드를 확인해주세요</p>
        </div>
        
        <!-- 가이드 박스 -->
        <div class="highlight-box rounded-xl p-4 mb-4">
          <p class="text-sm font-medium mb-3 flex items-center gap-2">
            <i class="fas fa-lightbulb text-yellow-400"></i>
            계정 ID 찾는 방법
          </p>
          <div class="space-y-2 text-sm">
            <div class="flex items-start gap-3">
              <span class="w-5 h-5 rounded-full gold-bg text-black flex items-center justify-center text-xs shrink-0 font-bold">1</span>
              <span class="text-white/80">네이버 톡톡 파트너센터 접속</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="w-5 h-5 rounded-full gold-bg text-black flex items-center justify-center text-xs shrink-0 font-bold">2</span>
              <span class="text-white/80"><strong>좌측 상단 프로필</strong> 아래 확인</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="w-5 h-5 rounded-full gold-bg text-black flex items-center justify-center text-xs shrink-0 font-bold">3</span>
              <span class="text-white/80"><strong class="gold">@wc92cf</strong> 같은 <strong>6자리 코드</strong> 복사</span>
            </div>
          </div>
        </div>
        
        <!-- 계정 ID 입력 -->
        <div class="glass rounded-xl p-4 mb-4">
          <label class="block text-sm text-white/60 mb-2">
            톡톡 계정 ID <span class="text-red-400">*</span>
            <span class="text-xs text-white/40">(예: wc92cf)</span>
          </label>
          <div class="flex items-center gap-2">
            <span class="text-white/40">@</span>
            <input type="text" id="talktalk-id" 
              class="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-lg font-mono tracking-wider placeholder-white/30 focus:outline-none focus:border-[#D4AF37] transition-all uppercase" 
              placeholder="wc92cf" 
              maxlength="10"
              autocomplete="off"
              autocapitalize="characters">
          </div>
        </div>
        
        <button onclick="goToStep(2)" class="w-full py-4 gold-bg text-black rounded-xl font-bold text-lg hover:opacity-90 transition-all">
          확인 완료 <i class="fas fa-arrow-right ml-2"></i>
        </button>
        
        <a href="https://partner.talk.naver.com" target="_blank" class="block text-center text-sm text-white/40 hover:text-white/60 mt-4">
          <i class="fas fa-external-link-alt mr-1"></i>
          파트너센터 바로가기
        </a>
      </div>
      
      <!-- ================================================ -->
      <!-- Step 2: XIVIX 관리자 초대 -->
      <!-- ================================================ -->
      <div id="step-2" class="step-content hidden">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 mb-4">
            <i class="fas fa-user-plus text-2xl text-blue-400"></i>
          </div>
          <h2 class="text-xl font-bold mb-2">XIVIX 관리자 초대</h2>
          <p class="text-white/60 text-sm">톡톡 파트너센터에서 XIVIX를 멤버로 초대해주세요</p>
        </div>
        
        <!-- 초대 정보 카드 -->
        <div class="highlight-box rounded-xl p-4 mb-4">
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p class="text-xs text-white/40 mb-1">초대할 이름</p>
              <p class="font-medium gold">XIVIX 지배인</p>
            </div>
            <div>
              <p class="text-xs text-white/40 mb-1">초대할 이메일</p>
              <p class="font-mono text-sm">comtnb@naver.com</p>
            </div>
          </div>
          <button onclick="copyInviteEmail()" id="copy-email-btn" class="w-full py-2 glass rounded-lg text-sm hover:bg-white/10 transition-all">
            <i class="fas fa-copy mr-2"></i>이메일 복사하기
          </button>
        </div>
        
        <!-- 초대 방법 가이드 -->
        <div class="glass rounded-xl p-4 mb-6">
          <p class="text-xs text-white/40 mb-3">초대 방법 (파트너센터에서)</p>
          <div class="space-y-3 text-sm">
            <div class="flex items-start gap-3">
              <span class="w-6 h-6 rounded-full gold-bg text-black flex items-center justify-center text-xs shrink-0 font-bold">1</span>
              <span class="text-white/80"><strong>설정</strong> 메뉴 클릭</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="w-6 h-6 rounded-full gold-bg text-black flex items-center justify-center text-xs shrink-0 font-bold">2</span>
              <span class="text-white/80"><strong>상담 멤버관리</strong> 선택</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="w-6 h-6 rounded-full gold-bg text-black flex items-center justify-center text-xs shrink-0 font-bold">3</span>
              <span class="text-white/80"><strong class="gold">+ 새로운 멤버 초대하기</strong> 클릭</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="w-6 h-6 rounded-full gold-bg text-black flex items-center justify-center text-xs shrink-0 font-bold">4</span>
              <div>
                <span class="text-white/80">이름: <strong>XIVIX 지배인</strong></span><br>
                <span class="text-white/80">이메일: <strong class="gold">comtnb@naver.com</strong></span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="flex gap-3">
          <button onclick="goToStep(1)" class="flex-1 py-4 glass rounded-xl font-medium hover:bg-white/5 transition-all">
            <i class="fas fa-arrow-left mr-2"></i> 이전
          </button>
          <button onclick="goToStep(3)" class="flex-[2] py-4 gold-bg text-black rounded-xl font-bold hover:opacity-90 transition-all">
            초대 완료 <i class="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>
      
      <!-- ================================================ -->
      <!-- Step 3: 연동 요청 (매장정보 + 업종 선택) -->
      <!-- ================================================ -->
      <div id="step-3" class="step-content hidden">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/20 mb-4 pulse-gold">
            <i class="fas fa-magic text-2xl text-purple-400"></i>
          </div>
          <h2 class="text-xl font-bold mb-2">연동 요청하기</h2>
          <p class="text-white/60 text-sm">스마트 플레이스 링크로 자동 분석!</p>
        </div>
        
        <!-- ============ 스마트 플레이스 자동 분석 (추가) ============ -->
        <div class="highlight-box rounded-xl p-4 mb-4">
          <p class="text-sm font-medium mb-3 flex items-center gap-2">
            <i class="fas fa-bolt text-yellow-400"></i>
            <span class="gold">원클릭 자동 분석</span> - 링크만 넣으면 끝!
          </p>
          <div class="flex gap-2">
            <input type="text" id="smart-place-url" 
              class="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm" 
              placeholder="네이버 스마트 플레이스 링크 붙여넣기">
            <button onclick="analyzeSmartPlace()" id="analyze-btn" class="px-4 py-3 gold-bg text-black rounded-lg font-bold text-sm hover:opacity-90 transition-all shrink-0">
              <i class="fas fa-search" id="analyze-icon"></i>
            </button>
          </div>
          <p class="text-xs text-white/40 mt-2">
            <i class="fas fa-info-circle mr-1"></i>
            네이버 지도나 플레이스 링크를 넣으면 AI가 자동으로 분석합니다
          </p>
          <!-- 분석 결과 미리보기 -->
          <div id="analysis-result" class="hidden mt-4 p-3 glass rounded-lg border border-emerald-500/30">
            <div class="flex items-center gap-2 mb-2">
              <i class="fas fa-check-circle text-emerald-400"></i>
              <span class="text-sm font-medium text-emerald-400">AI 분석 완료!</span>
            </div>
            <div class="text-sm space-y-1">
              <p class="text-white/60">매장명: <span id="analyzed-store-name" class="text-white font-medium">-</span></p>
              <p class="text-white/60">업종: <span id="analyzed-category" class="text-white">-</span></p>
              <p class="text-white/60">AI 제안: <span id="analyzed-persona" class="gold text-xs">-</span></p>
            </div>
            <button onclick="applyAnalysis()" class="w-full mt-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-all">
              <i class="fas fa-magic mr-1"></i> 분석 결과 적용하기
            </button>
          </div>
        </div>
        
        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1 h-px bg-white/10"></div>
          <span class="text-xs text-white/40">또는 직접 입력</span>
          <div class="flex-1 h-px bg-white/10"></div>
        </div>
        <!-- ============ 스마트 플레이스 자동 분석 끝 ============ -->
        
        <!-- 매장 정보 입력 -->
        <div class="space-y-4 mb-6">
          <div>
            <label class="block text-sm text-white/60 mb-2">매장 이름 <span class="text-red-400">*</span></label>
            <input type="text" id="store-name" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37] transition-all" placeholder="예: 뷰티플 헤어샵">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-white/60 mb-2">사장님 성함 <span class="text-red-400">*</span></label>
              <input type="text" id="owner-name" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37] transition-all" placeholder="예: 홍길동">
            </div>
            <div>
              <label class="block text-sm text-white/60 mb-2">연락처 <span class="text-red-400">*</span></label>
              <input type="tel" id="owner-phone" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37] transition-all" placeholder="010-0000-0000">
            </div>
          </div>
          
          <!-- 업종 선택 (검색 가능한 드롭다운) -->
          <div>
            <label class="block text-sm text-white/60 mb-2">
              업종 선택 <span class="text-red-400">*</span>
              <span class="text-xs text-white/40">(어떤 업종이든 AI가 전문가로 변신합니다)</span>
            </label>
            <div class="industry-selector">
              <!-- 선택된 업종 표시 / 검색 입력 -->
              <div class="relative">
                <input type="text" id="industry-search" 
                  class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37] transition-all pr-10" 
                  placeholder="업종 검색 또는 선택..."
                  onclick="toggleIndustryDropdown(true)"
                  oninput="filterIndustries(this.value)">
                <button type="button" onclick="toggleIndustryDropdown()" class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                  <i class="fas fa-chevron-down" id="dropdown-icon"></i>
                </button>
              </div>
              
              <!-- 드롭다운 목록 -->
              <div id="industry-dropdown" class="industry-dropdown glass rounded-xl mt-2 gold-border">
                ${industryOptionsHtml}
              </div>
            </div>
            
            <!-- 선택된 업종 정보 -->
            <div id="selected-industry-info" class="mt-2 p-3 glass rounded-lg hidden">
              <div class="flex items-center gap-3">
                <i id="selected-icon" class="fas fa-store text-lg gold"></i>
                <div class="flex-1">
                  <p class="font-medium text-sm" id="selected-name">-</p>
                  <p class="text-xs text-white/40" id="selected-specialty">-</p>
                </div>
                <button onclick="clearIndustrySelection()" class="text-white/40 hover:text-red-400">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
            
            <!-- 직접 입력 (커스텀) -->
            <div id="custom-input-wrapper" class="custom-input-wrapper mt-3">
              <label class="block text-sm text-white/60 mb-2">업종명 직접 입력</label>
              <input type="text" id="custom-industry" 
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37] transition-all" 
                placeholder="예: 웨딩플래너, 꽃집, 세탁소...">
              <p class="text-xs text-white/40 mt-2">
                <i class="fas fa-magic mr-1 gold"></i>
                AI가 입력하신 업종의 전문가로 자동 최적화됩니다
              </p>
            </div>
          </div>
          
          <!-- 숨겨진 업종 값 -->
          <input type="hidden" id="business-type" value="">
          <input type="hidden" id="business-type-name" value="">
          <input type="hidden" id="business-specialty" value="">
        </div>
        
        <!-- 입력 요약 -->
        <div class="glass rounded-xl p-4 mb-4">
          <p class="text-xs text-white/40 mb-3">연동 정보 확인</p>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-white/60">톡톡 ID</span>
              <span class="font-mono gold" id="summary-talktalk">@-</span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/60">업종</span>
              <span class="gold" id="summary-industry">-</span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/60">매니저 초대</span>
              <span class="text-emerald-400"><i class="fas fa-check-circle mr-1"></i>완료</span>
            </div>
          </div>
        </div>
        
        <!-- 안내 문구 -->
        <div class="glass rounded-xl p-4 mb-6 border border-emerald-500/30 bg-emerald-500/5">
          <div class="flex items-start gap-3">
            <i class="fas fa-check-circle text-emerald-400 mt-0.5"></i>
            <div class="text-sm">
              <p class="text-white/80 mb-1">어떤 업종이든 30분 내 세팅 완료!</p>
              <p class="text-white/50">XIVIX 전문가가 업종에 맞는 AI 페르소나를 설정하고, 카카오톡으로 완료 안내를 드립니다.</p>
            </div>
          </div>
        </div>
        
        <div class="flex gap-3">
          <button onclick="goToStep(2)" class="flex-1 py-4 glass rounded-xl font-medium hover:bg-white/5 transition-all">
            <i class="fas fa-arrow-left mr-2"></i> 이전
          </button>
          <button onclick="submitRequest()" id="submit-btn" class="flex-[2] py-4 gold-bg text-black rounded-xl font-bold hover:opacity-90 transition-all pulse-gold">
            <i class="fas fa-paper-plane mr-2"></i> 연동 요청하기
          </button>
        </div>
      </div>
      
      <!-- ================================================ -->
      <!-- Step 4: 완료 화면 -->
      <!-- ================================================ -->
      <div id="step-4" class="step-content hidden">
        <div class="text-center py-8">
          <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 mb-6">
            <i class="fas fa-check text-4xl text-emerald-400"></i>
          </div>
          <h2 class="text-2xl font-bold mb-3">연동 요청 완료!</h2>
          <p class="text-white/60 mb-6">XIVIX 전문가가 곧 세팅을 시작합니다<br>보통 <strong class="gold">30분 이내</strong> 완료됩니다</p>
          
          <!-- 진행 상태 -->
          <div class="glass rounded-xl p-4 mb-6">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-white/60">진행 상태</span>
              <span class="text-sm gold" id="status-text">대기 중</span>
            </div>
            <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div class="progress-bar h-full gold-bg rounded-full" style="width: 10%" id="progress-bar"></div>
            </div>
            <p class="text-xs text-white/40 mt-2" id="status-detail">XIVIX 지배인이 업종에 맞는 AI를 준비 중...</p>
          </div>
          
          <!-- 안내 -->
          <div class="glass rounded-xl p-4 mb-4 text-left">
            <p class="text-sm text-white/60 mb-3">완료 후 안내 방법</p>
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2 text-white/70">
                <i class="fab fa-facebook-messenger text-yellow-400"></i>
                <span>카카오톡으로 완료 알림</span>
              </div>
              <div class="flex items-center gap-2 text-white/70">
                <i class="fas fa-phone text-green-400"></i>
                <span>필요시 전화 안내</span>
              </div>
            </div>
          </div>
          
          <div class="glass rounded-xl p-4">
            <p class="text-sm text-white/60 mb-2">문의가 필요하시면</p>
            <a href="tel:010-4845-3065" class="text-lg gold font-medium">
              <i class="fas fa-phone mr-2"></i>010-4845-3065
            </a>
          </div>
        </div>
      </div>
      
    </div>
    
    <!-- Footer -->
    <p class="text-center text-white/30 text-sm mt-6">
      © 2026 XIVIX. 세상의 모든 사장님을 위해.
    </p>
    
  </div>
  
  <script>
    // 업종 데이터베이스 (클라이언트용)
    const industries = ${JSON.stringify(INDUSTRY_DATABASE)};
    
    let currentStep = 1;
    let talktalkId = '';
    let selectedIndustry = null;
    
    // ============ 유효성 검사 함수 (추가) ============
    // 톡톡 ID 정규식 검증: 4~10자리 영문/숫자
    function validateTalktalkId(id) {
      const regex = /^[A-Z0-9]{4,10}$/;
      return regex.test(id);
    }
    
    // 전화번호 검증: 숫자만 추출 후 10~11자리
    function validatePhone(phone) {
      const digits = phone.replace(/[^0-9]/g, '');
      return digits.length >= 10 && digits.length <= 11;
    }
    
    // 실시간 유효성 검사 상태 업데이트
    function updateValidationStatus() {
      const storeName = document.getElementById('store-name')?.value.trim();
      const ownerName = document.getElementById('owner-name')?.value.trim();
      const ownerPhone = document.getElementById('owner-phone')?.value.trim();
      const businessType = document.getElementById('business-type')?.value;
      const submitBtn = document.getElementById('submit-btn');
      
      if (!submitBtn) return;
      
      const isValid = storeName && ownerName && validatePhone(ownerPhone || '') && businessType && talktalkId;
      
      if (isValid) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      } else {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
    }
    // ============ 유효성 검사 함수 끝 ============
    
    function goToStep(step) {
      // Step 1 → 2: 톡톡 ID 검증 (정규식 강화)
      if (step === 2 && currentStep === 1) {
        const id = document.getElementById('talktalk-id').value.trim().toUpperCase();
        if (!id || !validateTalktalkId(id)) {
          alert('톡톡 계정 ID를 정확히 입력해주세요.\\n(4~10자리 영문/숫자 조합, 예: WC92CF)');
          return;
        }
        talktalkId = id;
      }
      
      // Step 2 → 3: 요약 업데이트
      if (step === 3 && currentStep === 2) {
        document.getElementById('summary-talktalk').textContent = '@' + talktalkId;
      }
      
      currentStep = step;
      
      // Hide all steps
      document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
      document.getElementById('step-' + step)?.classList.remove('hidden');
      
      // Update dots
      for (let i = 1; i <= 3; i++) {
        const dot = document.getElementById('dot-' + i);
        if (i < step) {
          dot.className = 'step-dot w-3 h-3 rounded-full bg-emerald-500';
        } else if (i === step) {
          dot.className = 'step-dot w-3 h-3 rounded-full gold-bg';
        } else {
          dot.className = 'step-dot w-3 h-3 rounded-full bg-white/20';
        }
      }
      
      // Update label
      if (step <= 3) {
        document.getElementById('step-label').textContent = step + ' / 3 단계';
      }
    }
    
    // 업종 드롭다운 토글
    function toggleIndustryDropdown(show) {
      const dropdown = document.getElementById('industry-dropdown');
      const icon = document.getElementById('dropdown-icon');
      
      if (show === undefined) {
        dropdown.classList.toggle('show');
      } else if (show) {
        dropdown.classList.add('show');
      } else {
        dropdown.classList.remove('show');
      }
      
      if (dropdown.classList.contains('show')) {
        icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
      } else {
        icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
      }
    }
    
    // 업종 검색 필터
    function filterIndustries(query) {
      const options = document.querySelectorAll('.industry-option');
      const lowerQuery = query.toLowerCase();
      
      options.forEach(opt => {
        const name = opt.dataset.name.toLowerCase();
        const specialty = opt.dataset.specialty.toLowerCase();
        
        if (name.includes(lowerQuery) || specialty.includes(lowerQuery)) {
          opt.classList.remove('hidden');
        } else {
          opt.classList.add('hidden');
        }
      });
      
      toggleIndustryDropdown(true);
    }
    
    // 업종 선택
    function selectIndustry(id) {
      const industry = industries.find(i => i.id === id);
      if (!industry) return;
      
      selectedIndustry = industry;
      
      // 검색창에 선택된 업종 표시
      document.getElementById('industry-search').value = industry.name;
      
      // 히든 필드 업데이트
      document.getElementById('business-type').value = industry.id;
      document.getElementById('business-type-name').value = industry.name;
      document.getElementById('business-specialty').value = industry.specialty;
      
      // 선택된 업종 정보 표시
      const infoBox = document.getElementById('selected-industry-info');
      document.getElementById('selected-icon').className = 'fas ' + industry.icon + ' text-lg gold';
      document.getElementById('selected-name').textContent = industry.name;
      document.getElementById('selected-specialty').textContent = industry.specialty;
      infoBox.classList.remove('hidden');
      
      // 요약 업데이트
      document.getElementById('summary-industry').textContent = industry.name;
      
      // 커스텀 입력 표시/숨김
      const customWrapper = document.getElementById('custom-input-wrapper');
      if (industry.id === 'CUSTOM_SECTOR') {
        customWrapper.classList.add('show');
      } else {
        customWrapper.classList.remove('show');
      }
      
      // 선택 표시
      document.querySelectorAll('.industry-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.id === id) {
          opt.classList.add('selected');
        }
      });
      
      // 드롭다운 닫기
      toggleIndustryDropdown(false);
    }
    
    // 업종 선택 초기화
    function clearIndustrySelection() {
      selectedIndustry = null;
      document.getElementById('industry-search').value = '';
      document.getElementById('business-type').value = '';
      document.getElementById('business-type-name').value = '';
      document.getElementById('business-specialty').value = '';
      document.getElementById('selected-industry-info').classList.add('hidden');
      document.getElementById('summary-industry').textContent = '-';
      document.getElementById('custom-input-wrapper').classList.remove('show');
      document.querySelectorAll('.industry-option').forEach(opt => opt.classList.remove('selected'));
    }
    
    // 이메일 복사
    function copyInviteEmail() {
      const email = 'comtnb@naver.com';
      
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email).then(onCopySuccess).catch(fallbackCopy);
      } else {
        fallbackCopy();
      }
      
      function fallbackCopy() {
        const textArea = document.createElement('textarea');
        textArea.value = email;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          onCopySuccess();
        } catch (e) {
          alert('복사할 이메일: ' + email);
        }
        document.body.removeChild(textArea);
      }
      
      function onCopySuccess() {
        const btn = document.getElementById('copy-email-btn');
        btn.innerHTML = '<i class="fas fa-check mr-2 text-emerald-400"></i>복사 완료!';
        setTimeout(() => {
          btn.innerHTML = '<i class="fas fa-copy mr-2"></i>이메일 복사하기';
        }, 2000);
      }
    }
    
    // 연동 요청 제출
    async function submitRequest() {
      const storeName = document.getElementById('store-name').value.trim();
      const ownerName = document.getElementById('owner-name').value.trim();
      const ownerPhone = document.getElementById('owner-phone').value.trim();
      const businessType = document.getElementById('business-type').value;
      const businessTypeName = document.getElementById('business-type-name').value;
      const businessSpecialty = document.getElementById('business-specialty').value;
      const customIndustry = document.getElementById('custom-industry')?.value.trim();
      
      // 필수 입력 검증
      if (!storeName || !ownerName || !ownerPhone) {
        alert('매장 이름, 사장님 성함, 연락처를 모두 입력해주세요.');
        return;
      }
      
      // 전화번호 형식 검증 (추가)
      if (!validatePhone(ownerPhone)) {
        alert('연락처를 정확히 입력해주세요.\\n(10~11자리 숫자, 예: 010-1234-5678)');
        return;
      }
      
      if (!businessType) {
        alert('업종을 선택해주세요.');
        return;
      }
      
      // 커스텀 업종일 경우 직접 입력 검증
      if (businessType === 'CUSTOM_SECTOR' && !customIndustry) {
        alert('업종명을 직접 입력해주세요.');
        return;
      }
      
      // 톡톡 ID 검증
      if (!talktalkId) {
        alert('톡톡 계정 ID가 입력되지 않았습니다. 처음부터 다시 시도해주세요.');
        goToStep(1);
        return;
      }
      
      const btn = document.getElementById('submit-btn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 요청 중...';
      
      // 최종 업종명 결정
      const finalBusinessType = businessType === 'CUSTOM_SECTOR' ? 'CUSTOM_SECTOR' : businessType;
      const finalBusinessName = businessType === 'CUSTOM_SECTOR' ? customIndustry : businessTypeName;
      
      const data = {
        store_name: storeName,
        owner_name: ownerName,
        owner_phone: ownerPhone,
        business_type: finalBusinessType,
        business_type_name: finalBusinessName,
        business_specialty: businessType === 'CUSTOM_SECTOR' ? '사장님 정의 맞춤 최적화' : businessSpecialty,
        naver_talktalk_id: talktalkId,
        status: 'pending'
      };
      
      try {
        const res = await fetch('/api/onboarding/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        const result = await res.json();
        
        if (result.success) {
          // Show completion screen
          document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
          document.getElementById('step-4').classList.remove('hidden');
          
          // 실시간 상태 폴링 시작 (가짜 게이지 대신)
          startStatusPolling(result.data.id);
        } else {
          alert('요청 실패: ' + (result.error || '잠시 후 다시 시도해주세요'));
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i> 연동 요청하기';
        }
      } catch (e) {
        alert('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i> 연동 요청하기';
      }
    }
    
    // 실시간 상태 폴링 (3초마다)
    let currentStoreId = null;
    let pollingInterval = null;
    
    function startStatusPolling(storeId) {
      currentStoreId = storeId;
      
      // 초기 상태 표시
      updateProgressUI(20, '요청 접수', 'XIVIX 전문가에게 알림을 보냈습니다...');
      
      // 3초마다 상태 체크
      pollingInterval = setInterval(async () => {
        try {
          const res = await fetch('/api/onboarding/status/' + storeId);
          const result = await res.json();
          
          if (result.success && result.data) {
            const { progress, statusText, statusDetail, status, is_active, naver_talktalk_id } = result.data;
            
            updateProgressUI(progress, statusText, statusDetail);
            
            // 완료 시 폴링 중지 및 완료 UI 표시
            if (status === 'active' || is_active) {
              clearInterval(pollingInterval);
              pollingInterval = null;
              showCompletionUI(naver_talktalk_id);
            }
          }
        } catch (e) {
          console.error('Status polling error:', e);
        }
      }, 3000);
    }
    
    function updateProgressUI(progress, statusText, statusDetail) {
      const progressBar = document.getElementById('progress-bar');
      const statusTextEl = document.getElementById('status-text');
      const statusDetailEl = document.getElementById('status-detail');
      
      if (progressBar) progressBar.style.width = progress + '%';
      if (statusTextEl) statusTextEl.textContent = statusText;
      if (statusDetailEl) statusDetailEl.textContent = statusDetail;
    }
    
    function showCompletionUI(talktalkId) {
      const step4 = document.getElementById('step-4');
      if (!step4) return;
      
      // 축하 애니메이션 및 완료 UI
      step4.innerHTML = \`
        <div class="text-center py-8">
          <div class="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500/20 mb-6 animate-bounce">
            <i class="fas fa-check-circle text-5xl text-emerald-400"></i>
          </div>
          <h2 class="text-3xl font-bold mb-3 gold">🎉 연동 완료!</h2>
          <p class="text-white/80 mb-6">AI 지배인이 매장에 배치되었습니다!</p>
          
          <!-- 완료 상태 -->
          <div class="glass rounded-xl p-4 mb-6">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-white/60">진행 상태</span>
              <span class="text-sm text-emerald-400 font-bold">✅ 완료!</span>
            </div>
            <div class="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style="width: 100%"></div>
            </div>
            <p class="text-sm text-emerald-400 mt-2">AI 지배인이 고객 상담을 시작합니다! 🚀</p>
          </div>
          
          <!-- 네이버 톡톡 바로가기 버튼 -->
          <a href="https://talk.naver.com/ct/\${talktalkId || ''}" target="_blank" 
             class="block w-full py-4 gold-bg text-black rounded-xl font-bold text-lg hover:opacity-90 transition-all mb-4">
            <i class="fas fa-comment-dots mr-2"></i> 네이버 톡톡 상담 바로가기
          </a>
          
          <div class="glass rounded-xl p-4 text-left">
            <p class="text-sm text-white/60 mb-3">다음 단계</p>
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2 text-white/70">
                <i class="fas fa-check text-emerald-400"></i>
                <span>톡톡으로 테스트 메시지를 보내보세요</span>
              </div>
              <div class="flex items-center gap-2 text-white/70">
                <i class="fas fa-check text-emerald-400"></i>
                <span>AI가 업종에 맞게 자동 응답합니다</span>
              </div>
            </div>
          </div>
          
          <div class="glass rounded-xl p-4 mt-4">
            <p class="text-sm text-white/60 mb-2">문의가 필요하시면</p>
            <a href="tel:010-4845-3065" class="text-lg gold font-medium">
              <i class="fas fa-phone mr-2"></i>010-4845-3065
            </a>
          </div>
          
          <!-- 사용 설명서 버튼 추가 -->
          <button onclick="showUserManual()" class="w-full mt-4 py-3 glass rounded-xl text-white/80 hover:bg-white/10 transition-all border border-white/10">
            <i class="fas fa-book-open mr-2 gold"></i> AI 지배인 200% 활용 가이드 보기
          </button>
        </div>
      \`;
      
      // 100% 완료 시 자동으로 사용 설명서 모달 표시
      setTimeout(() => {
        showUserManual();
      }, 1500);
    }
    
    // 사용 설명서 모달 표시 함수
    function showUserManual() {
      // 기존 모달이 있으면 제거
      const existingModal = document.getElementById('user-manual-modal');
      if (existingModal) existingModal.remove();
      
      const modal = document.createElement('div');
      modal.id = 'user-manual-modal';
      modal.className = 'fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto';
      modal.innerHTML = \`
        <div class="w-full max-w-lg glass rounded-2xl overflow-hidden animate-fade-in" style="animation: fadeIn 0.3s ease;">
          <!-- 모달 헤더 -->
          <div class="px-6 py-4 border-b border-white/10 flex items-center justify-between gold-bg">
            <div class="flex items-center gap-3">
              <i class="fas fa-crown text-black text-xl"></i>
              <h3 class="font-bold text-black text-lg">AI 지배인 200% 활용 가이드</h3>
            </div>
            <button onclick="closeUserManual()" class="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center hover:bg-black/30 text-black">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <!-- 모달 내용 -->
          <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            
            <!-- 핵심 기능 1 -->
            <div class="glass rounded-xl p-4 border border-emerald-500/30">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <i class="fas fa-bolt text-emerald-400"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-emerald-400 mb-1">24/7 초고속 자동 응대</h4>
                  <p class="text-sm text-white/70">사장님이 주무시는 시간에도 Gemini 2.5 Flash 엔진이 <strong class="gold">1초 내</strong>에 고객 상담을 시작합니다. 단순 문의는 AI가 해결하고 사장님은 예약만 확인하세요.</p>
                </div>
              </div>
            </div>
            
            <!-- 핵심 기능 2 -->
            <div class="glass rounded-xl p-4 border border-blue-500/30">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                  <i class="fas fa-camera text-blue-400"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-blue-400 mb-1">이미지 정밀 분석</h4>
                  <p class="text-sm text-white/70">고객이 보낸 피부, 헤어, 제품 사진을 AI가 <strong class="gold">즉시 판독</strong>합니다. 사진 한 장으로 전문가급 상담이 가능해집니다.</p>
                </div>
              </div>
            </div>
            
            <!-- 핵심 기능 3 -->
            <div class="glass rounded-xl p-4 border border-yellow-500/30">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                  <i class="fas fa-calendar-check text-yellow-400"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-yellow-400 mb-1">예약 클로징 기술</h4>
                  <p class="text-sm text-white/70">상담의 끝은 항상 <strong class="gold">'네이버 예약'</strong>입니다. 단순 질문으로 끝날 고객을 실질적인 방문 고객으로 전환합니다.</p>
                </div>
              </div>
            </div>
            
            <!-- 핵심 기능 4 -->
            <div class="glass rounded-xl p-4 border border-purple-500/30">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                  <i class="fas fa-eye text-purple-400"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-purple-400 mb-1">실시간 개입 모니터링</h4>
                  <p class="text-sm text-white/70">AI와 고객의 대화가 이상하다면 사장님이 <strong class="gold">언제든 톡톡 앱</strong>에서 직접 대화에 끼어들 수 있습니다.</p>
                </div>
              </div>
            </div>
            
            <!-- 안내 메시지 -->
            <div class="text-center pt-4 border-t border-white/10">
              <p class="text-sm text-white/50 mb-2">
                <i class="fas fa-info-circle mr-1"></i>
                지금부터 AI 지배인이 고객 상담을 시작합니다!
              </p>
              <p class="text-xs text-white/30">문의: 010-4845-3065 | © 2026 XIVIX</p>
            </div>
          </div>
          
          <!-- 모달 푸터 -->
          <div class="px-6 py-4 border-t border-white/10">
            <button onclick="closeUserManual()" class="w-full py-3 gold-bg text-black rounded-xl font-bold hover:opacity-90 transition-all">
              <i class="fas fa-rocket mr-2"></i> 확인했습니다, 시작하기!
            </button>
          </div>
        </div>
      \`;
      
      document.body.appendChild(modal);
      
      // 배경 클릭 시 닫기
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeUserManual();
      });
    }
    
    // 사용 설명서 모달 닫기
    function closeUserManual() {
      const modal = document.getElementById('user-manual-modal');
      if (modal) modal.remove();
    }
    
    // 페이지 떠날 때 폴링 정리
    window.addEventListener('beforeunload', () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    });
    
    // 페이지 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', function(e) {
      const selector = document.querySelector('.industry-selector');
      if (selector && !selector.contains(e.target)) {
        toggleIndustryDropdown(false);
      }
    });
    
    // Auto uppercase for talktalk ID input
    document.addEventListener('DOMContentLoaded', function() {
      const talktalkInput = document.getElementById('talktalk-id');
      if (talktalkInput) {
        talktalkInput.addEventListener('input', function(e) {
          e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
          // 실시간 유효성 표시 (추가)
          const isValid = validateTalktalkId(e.target.value);
          e.target.style.borderColor = isValid ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)';
        });
      }
      
      // Step 3 입력 필드 실시간 유효성 검사 이벤트 리스너 (추가)
      const step3Inputs = ['store-name', 'owner-name', 'owner-phone'];
      step3Inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
          input.addEventListener('input', updateValidationStatus);
        }
      });
    });
    
    // ============ 스마트 플레이스 자동 분석 함수 (추가) ============
    let analysisData = null; // AI 분석 결과 저장
    
    async function analyzeSmartPlace() {
      const urlInput = document.getElementById('smart-place-url');
      const analyzeBtn = document.getElementById('analyze-btn');
      const analyzeIcon = document.getElementById('analyze-icon');
      const resultDiv = document.getElementById('analysis-result');
      
      const url = urlInput?.value?.trim();
      
      if (!url) {
        alert('네이버 스마트 플레이스 링크를 입력해주세요');
        return;
      }
      
      // 로딩 상태
      analyzeBtn.disabled = true;
      analyzeIcon.className = 'fas fa-spinner fa-spin';
      
      try {
        const res = await fetch('/api/smartplace/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        
        const result = await res.json();
        
        if (result.success && result.data) {
          analysisData = result.data;
          
          // 결과 표시
          document.getElementById('analyzed-store-name').textContent = result.data.place_info?.store_name || result.data.auto_fill?.store_name || '-';
          document.getElementById('analyzed-category').textContent = result.data.ai_analysis?.business_type_name || result.data.place_info?.category || '-';
          document.getElementById('analyzed-persona').textContent = result.data.ai_analysis?.ai_persona?.substring(0, 50) + '...' || '-';
          
          resultDiv.classList.remove('hidden');
          urlInput.style.borderColor = 'rgba(16, 185, 129, 0.5)';
        } else {
          alert(result.error || '분석에 실패했습니다. 올바른 링크인지 확인해주세요.');
          urlInput.style.borderColor = 'rgba(239, 68, 68, 0.5)';
        }
      } catch (e) {
        alert('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        analyzeBtn.disabled = false;
        analyzeIcon.className = 'fas fa-search';
      }
    }
    
    // 분석 결과 적용
    function applyAnalysis() {
      if (!analysisData) return;
      
      const autoFill = analysisData.auto_fill;
      const aiAnalysis = analysisData.ai_analysis;
      const placeInfo = analysisData.place_info;
      
      // 매장명 자동 입력
      if (autoFill?.store_name) {
        document.getElementById('store-name').value = autoFill.store_name;
      }
      
      // 업종 자동 선택
      if (autoFill?.business_type && autoFill.business_type !== 'OTHER') {
        selectIndustry(autoFill.business_type);
      } else if (autoFill?.business_type_name) {
        // 커스텀 업종으로 설정
        selectIndustry('CUSTOM_SECTOR');
        const customInput = document.getElementById('custom-industry');
        if (customInput) {
          customInput.value = autoFill.business_type_name;
        }
      }
      
      // 숨김 필드에 AI 분석 데이터 저장
      document.getElementById('business-specialty').value = aiAnalysis?.ai_features || '';
      
      // 알림
      const resultDiv = document.getElementById('analysis-result');
      resultDiv.innerHTML = \`
        <div class="flex items-center gap-2">
          <i class="fas fa-check-circle text-emerald-400"></i>
          <span class="text-sm font-medium text-emerald-400">적용 완료!</span>
        </div>
        <p class="text-xs text-white/60 mt-1">아래 정보를 확인 후 연동 요청해주세요</p>
      \`;
      
      // 유효성 검사 업데이트
      updateValidationStatus();
    }
    // ============ 스마트 플레이스 자동 분석 함수 끝 ============
  </script>
</body>
</html>
  `;
}
