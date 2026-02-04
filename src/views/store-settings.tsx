// XIVIX AI Core V2.0 - 매장 상세 설정 페이지
// 프롬프트 편집 + 테스트 봇 + AI 모델 선택 + 매장 정보 관리

export function renderStoreSettings(storeId: number): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>매장 설정 - XIVIX</title>
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
    .chat-container { height: 400px; overflow-y: auto; }
    .chat-bubble-user { background: #D4AF37; color: #000; }
    .chat-bubble-bot { background: rgba(255,255,255,0.1); }
    .tab-active { border-bottom: 2px solid #D4AF37; color: #D4AF37; }
    textarea:focus, input:focus, select:focus { outline: none; border-color: #D4AF37; }
    select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; padding-right: 40px; }
    select option { background: #1a1a1a; color: white; padding: 12px; }
    .btn-primary { background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%); color: #000; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-secondary { background: rgba(255,255,255,0.1); }
    .btn-secondary:hover { background: rgba(255,255,255,0.15); }
    .typing-indicator span { animation: typing 1.4s infinite; }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
  </style>
</head>
<body class="min-h-screen text-white">

  <!-- Header -->
  <header class="glass border-b border-white/10 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <a href="/master" class="text-white/60 hover:text-white">
          <i class="fas fa-arrow-left"></i>
        </a>
        <div class="w-10 h-10 rounded-xl gold-bg flex items-center justify-center">
          <i class="fas fa-store text-black"></i>
        </div>
        <div>
          <h1 class="text-xl font-bold" id="store-name">매장 설정</h1>
          <p class="text-xs text-white/40">Store ID: ${storeId}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <a href="/store/${storeId}/customers" class="px-4 py-2 btn-secondary rounded-xl font-medium flex items-center gap-2">
          <i class="fas fa-users"></i>
          고객 관리
        </a>
        <button onclick="saveAllSettings()" class="px-6 py-2 btn-primary rounded-xl font-medium flex items-center gap-2">
          <i class="fas fa-save"></i>
          전체 저장
        </button>
      </div>
    </div>
  </header>

  <!-- Tab Navigation -->
  <div class="max-w-7xl mx-auto px-6 pt-6">
    <div class="flex gap-6 border-b border-white/10">
      <button onclick="showSettingsTab('prompt')" class="settings-tab tab-active pb-3 px-2 font-medium" data-tab="prompt">
        <i class="fas fa-robot mr-2"></i>AI 프롬프트
      </button>
      <button onclick="showSettingsTab('store-info')" class="settings-tab pb-3 px-2 text-white/60 hover:text-white" data-tab="store-info">
        <i class="fas fa-info-circle mr-2"></i>매장 정보
      </button>
      <button onclick="showSettingsTab('ai-model')" class="settings-tab pb-3 px-2 text-white/60 hover:text-white" data-tab="ai-model">
        <i class="fas fa-brain mr-2"></i>AI 모델 설정
      </button>
      <button onclick="showSettingsTab('advanced')" class="settings-tab pb-3 px-2 text-white/60 hover:text-white" data-tab="advanced">
        <i class="fas fa-cog mr-2"></i>고급 설정
      </button>
    </div>
  </div>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-6 py-6">
    
    <!-- Tab 1: AI 프롬프트 설정 -->
    <div id="tab-prompt" class="tab-content">
      
      <!-- 🚀 자동 생성 섹션 -->
      <div class="glass rounded-2xl p-6 mb-6 border-2 border-dashed border-[#D4AF37]/30">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold flex items-center gap-2">
            <i class="fas fa-magic gold"></i>
            AI 자동 생성
            <span class="text-xs bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-1 rounded-full">NEW</span>
          </h2>
        </div>
        
        <p class="text-sm text-white/60 mb-4">
          URL, PDF, 이미지를 입력하면 AI가 매장 정보와 프롬프트를 자동으로 생성합니다.
        </p>
        
        <!-- URL 입력 -->
        <div class="mb-4">
          <label class="block text-sm text-white/60 mb-2">
            <i class="fas fa-link mr-1"></i>URL 입력 (플레이스/블로그/홈페이지) - Enter 또는 버튼 클릭 시 자동 적용
          </label>
          <div class="flex gap-2">
            <input type="text" id="auto-url" 
              class="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
              placeholder="https://naver.me/xxx 또는 https://m.place.naver.com/place/xxx"
              onkeypress="if(event.key==='Enter') analyzeUrl()">
            <button onclick="analyzeUrl()" class="px-6 py-3 btn-primary rounded-xl font-medium whitespace-nowrap">
              <i class="fas fa-magic mr-1"></i>분석 + 자동적용
            </button>
          </div>
          <p class="text-xs text-white/40 mt-2">
            <i class="fas fa-info-circle mr-1"></i>
            URL을 입력하면 AI가 매장 정보, 메뉴, 이벤트/할인 정보를 자동으로 추출하고 프롬프트에 반영합니다.
          </p>
        </div>
        
        <!-- 파일 업로드 -->
        <div class="mb-4">
          <label class="block text-sm text-white/60 mb-2">
            <i class="fas fa-file-upload mr-1"></i>파일 업로드 (PDF, 이미지)
          </label>
          <div class="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-[#D4AF37]/50 transition-all cursor-pointer" onclick="document.getElementById('file-upload').click()">
            <input type="file" id="file-upload" class="hidden" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" onchange="handleFileUpload(event)">
            <div id="upload-preview" class="hidden"></div>
            <div id="upload-placeholder">
              <i class="fas fa-cloud-upload-alt text-4xl text-white/30 mb-3"></i>
              <p class="text-white/60 mb-1">클릭하거나 파일을 드래그하세요</p>
              <p class="text-xs text-white/40">PDF (최대 50MB), 이미지 (최대 20MB)</p>
              <p class="text-xs text-white/40 mt-1">메뉴판, 가격표, 브로슈어, 심의규정 등</p>
            </div>
          </div>
        </div>
        
        <!-- 업로드된 파일 목록 -->
        <div id="uploaded-files" class="hidden mb-4">
          <label class="block text-sm text-white/60 mb-2">업로드된 파일</label>
          <div id="file-list" class="space-y-2"></div>
        </div>
        
        <!-- 분석 버튼 -->
        <button onclick="generatePromptFromSources()" id="generate-btn" class="w-full py-4 gold-bg rounded-xl font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50" disabled>
          <i class="fas fa-wand-magic-sparkles"></i>
          AI로 프롬프트 자동 생성
        </button>
        
        <!-- 분석 진행 상태 -->
        <div id="analysis-status" class="hidden mt-4 p-4 bg-white/5 rounded-xl">
          <div class="flex items-center gap-3">
            <div class="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
            <span id="analysis-text">분석 중...</span>
          </div>
          <div class="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
            <div id="analysis-progress" class="h-full bg-[#D4AF37] transition-all duration-300" style="width: 0%"></div>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- 프롬프트 편집 영역 -->
        <div class="glass rounded-2xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold flex items-center gap-2">
              <i class="fas fa-edit gold"></i>
              프롬프트 편집
            </h2>
            <button onclick="resetPrompt()" class="text-sm text-white/60 hover:text-white">
              <i class="fas fa-undo mr-1"></i>초기화
            </button>
          </div>
          
          <!-- 페르소나 -->
          <div class="mb-4">
            <label class="block text-sm text-white/60 mb-2">AI 페르소나 (역할)</label>
            <input type="text" id="ai-persona" 
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
              placeholder="예: 친절한 매장 매니저">
          </div>
          
          <!-- 톤앤매너 -->
          <div class="mb-4">
            <label class="block text-sm text-white/60 mb-2">톤앤매너</label>
            <select id="ai-tone" class="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white cursor-pointer">
              <option value="friendly" class="bg-[#1a1a1a] text-white py-2">친근하고 따뜻한</option>
              <option value="professional" class="bg-[#1a1a1a] text-white py-2">전문적이고 신뢰감 있는</option>
              <option value="casual" class="bg-[#1a1a1a] text-white py-2">캐주얼하고 편한</option>
              <option value="formal" class="bg-[#1a1a1a] text-white py-2">격식있고 정중한</option>
              <option value="energetic" class="bg-[#1a1a1a] text-white py-2">활기차고 긍정적인</option>
            </select>
          </div>
          
          <!-- 인사말 -->
          <div class="mb-4">
            <label class="block text-sm text-white/60 mb-2">환영 인사말</label>
            <textarea id="greeting-message" rows="2"
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white resize-none"
              placeholder="예: 안녕하세요! OO에 오신 것을 환영합니다."></textarea>
          </div>
          
          <!-- 시스템 프롬프트 -->
          <div class="mb-4">
            <label class="block text-sm text-white/60 mb-2">시스템 프롬프트 (상세 지침)</label>
            <textarea id="system-prompt" rows="8"
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white resize-none font-mono text-sm"
              placeholder="AI에게 전달할 상세 지침을 입력하세요..."></textarea>
            <p class="text-xs text-white/40 mt-2">
              <i class="fas fa-info-circle mr-1"></i>
              매장 정보, 심의 규정, 응답 가이드라인 등을 상세히 작성하세요.
            </p>
          </div>
          
          <!-- 금지 키워드 -->
          <div class="mb-4">
            <label class="block text-sm text-white/60 mb-2">금지 키워드 (쉼표로 구분)</label>
            <input type="text" id="forbidden-keywords"
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
              placeholder="예: 확실히, 100%, 보장">
          </div>
          
          <button onclick="applyPromptChanges()" class="w-full py-3 btn-secondary rounded-xl font-medium">
            <i class="fas fa-check mr-2"></i>변경사항 적용 (테스트에 반영)
          </button>
        </div>
        
        <!-- 테스트 챗봇 영역 -->
        <div class="glass rounded-2xl p-6 flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold flex items-center gap-2">
              <i class="fas fa-comment-dots gold"></i>
              테스트 챗봇
            </h2>
            <button onclick="clearChat()" class="text-sm text-white/60 hover:text-white">
              <i class="fas fa-trash mr-1"></i>대화 초기화
            </button>
          </div>
          
          <!-- 채팅 영역 -->
          <div id="chat-messages" class="chat-container flex-1 space-y-3 mb-4 p-4 bg-black/30 rounded-xl">
            <div class="text-center text-white/40 text-sm py-8">
              <i class="fas fa-robot text-3xl mb-2 block"></i>
              프롬프트를 수정하고 테스트해보세요
            </div>
          </div>
          
          <!-- 메시지 입력 -->
          <div class="flex gap-2">
            <input type="text" id="test-message" 
              class="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
              placeholder="테스트 메시지를 입력하세요..."
              onkeypress="if(event.key==='Enter') sendTestMessage()">
            <button onclick="sendTestMessage()" class="px-6 py-3 btn-primary rounded-xl font-medium">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
          
          <!-- 빠른 테스트 버튼 -->
          <div class="flex gap-2 mt-3 flex-wrap">
            <button onclick="quickTest('안녕하세요')" class="px-3 py-1 text-xs bg-white/5 rounded-lg hover:bg-white/10">안녕하세요</button>
            <button onclick="quickTest('가격이 어떻게 되나요?')" class="px-3 py-1 text-xs bg-white/5 rounded-lg hover:bg-white/10">가격 문의</button>
            <button onclick="quickTest('예약하고 싶어요')" class="px-3 py-1 text-xs bg-white/5 rounded-lg hover:bg-white/10">예약 문의</button>
            <button onclick="quickTest('영업시간 알려주세요')" class="px-3 py-1 text-xs bg-white/5 rounded-lg hover:bg-white/10">영업시간</button>
            <button onclick="quickTest('위치가 어디예요?')" class="px-3 py-1 text-xs bg-white/5 rounded-lg hover:bg-white/10">위치 문의</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tab 2: 매장 정보 -->
    <div id="tab-store-info" class="tab-content hidden">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- 기본 정보 -->
        <div class="glass rounded-2xl p-6">
          <h2 class="text-lg font-bold flex items-center gap-2 mb-4">
            <i class="fas fa-store gold"></i>
            기본 정보
          </h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-white/60 mb-2">매장명</label>
              <input type="text" id="store-name-input"
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-2">업종</label>
              <select id="business-type" class="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white cursor-pointer">
                <option value="BEAUTY_HAIR" class="bg-[#1a1a1a] text-white">미용실/헤어숍</option>
                <option value="BEAUTY_SKIN" class="bg-[#1a1a1a] text-white">피부관리/에스테틱</option>
                <option value="BEAUTY_NAIL" class="bg-[#1a1a1a] text-white">네일아트/속눈썹</option>
                <option value="RESTAURANT" class="bg-[#1a1a1a] text-white">일반 식당/카페</option>
                <option value="FITNESS" class="bg-[#1a1a1a] text-white">피트니스/요가/PT</option>
                <option value="MEDICAL" class="bg-[#1a1a1a] text-white">병원/의원/치과</option>
                <option value="PROFESSIONAL_LEGAL" class="bg-[#1a1a1a] text-white">법률/세무/보험</option>
                <option value="EDUCATION" class="bg-[#1a1a1a] text-white">학원/교육/과외</option>
                <option value="PET_SERVICE" class="bg-[#1a1a1a] text-white">애견/반려동물</option>
                <option value="OTHER" class="bg-[#1a1a1a] text-white">기타</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-2">주소</label>
              <input type="text" id="store-address"
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                placeholder="예: 서울시 강남구 역삼동 123-45">
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-2">매장 전화번호 (고객 안내용)</label>
              <input type="text" id="store-phone"
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                placeholder="예: 02-1234-5678">
            </div>
          </div>
        </div>
        
        <!-- SMS 알림 연락처 설정 -->
        <div class="glass rounded-2xl p-6">
          <h2 class="text-lg font-bold flex items-center gap-2 mb-4">
            <i class="fas fa-bell gold"></i>
            SMS 알림 연락처
            <span class="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full ml-2">NEW</span>
          </h2>
          
          <div class="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
            <p class="text-sm text-blue-400">
              <i class="fas fa-info-circle mr-2"></i>
              고객이 "전화해주세요", "연락 부탁" 등 요청 시 아래 번호로 SMS 알림이 전송됩니다.
            </p>
          </div>
          
          <div class="space-y-4">
            <!-- 원장님 휴대폰 -->
            <div>
              <label class="block text-sm text-white/60 mb-2">
                <i class="fas fa-user-tie mr-1"></i>원장님 휴대폰 (필수)
              </label>
              <input type="text" id="owner-phone"
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                placeholder="예: 010-1234-5678">
              <p class="text-xs text-white/40 mt-1">
                고객 콜백 요청 시 이 번호로 SMS가 발송됩니다.
              </p>
            </div>
            
            <!-- 추가 관리자 -->
            <div>
              <label class="block text-sm text-white/60 mb-2">
                <i class="fas fa-users mr-1"></i>추가 관리자 (선택)
              </label>
              <div id="additional-contacts-list" class="space-y-2 mb-3">
                <!-- 동적으로 추가됨 -->
              </div>
              <button onclick="addAdditionalContact()" class="w-full py-3 btn-secondary rounded-xl text-sm">
                <i class="fas fa-plus mr-2"></i>관리자 추가 (직원/디자이너)
              </button>
              <p class="text-xs text-white/40 mt-2">
                원장님과 함께 SMS 알림을 받을 직원/디자이너를 추가하세요.
              </p>
            </div>
          </div>
        </div>
        
        <!-- 영업시간 -->
        <div class="glass rounded-2xl p-6">
          <h2 class="text-lg font-bold flex items-center gap-2 mb-4">
            <i class="fas fa-clock gold"></i>
            영업시간
          </h2>
          
          <div id="operating-hours" class="space-y-3">
            <!-- 영업시간 입력 폼은 JS로 동적 생성 -->
          </div>
          
          <textarea id="operating-hours-text" rows="6"
            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white resize-none mt-4"
            placeholder="예:
월-금: 10:00 - 21:00
토: 10:00 - 18:00
일: 휴무
점심시간: 12:00 - 13:00"></textarea>
        </div>
        
        <!-- 메뉴/서비스 정보 -->
        <div class="glass rounded-2xl p-6 lg:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold flex items-center gap-2">
              <i class="fas fa-list gold"></i>
              메뉴/서비스 정보
            </h2>
            <button onclick="addMenuItem()" class="px-4 py-2 btn-secondary rounded-xl text-sm">
              <i class="fas fa-plus mr-1"></i>항목 추가
            </button>
          </div>
          
          <!-- 쉬운 입력 폼 -->
          <div id="menu-items" class="space-y-3 mb-4">
            <!-- 기본 항목들 -->
          </div>
          
          <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
            <p class="text-sm text-yellow-400">
              <i class="fas fa-lightbulb mr-2"></i>
              <strong>입력 팁:</strong> "서비스명 / 가격 / 소요시간" 순으로 입력하세요. AI가 고객 문의 시 활용합니다.
            </p>
          </div>
          
          <div class="mt-4">
            <label class="block text-sm text-white/60 mb-2">텍스트로 직접 입력 (자유 형식)</label>
            <textarea id="menu-data-text" rows="8"
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white resize-none text-sm"
              placeholder="예시:
커트 - 30,000원 (30분)
남성 커트 - 20,000원 (20분)
디지털 펌 - 150,000원~ (2시간)
볼륨 펌 - 120,000원~ (2시간)
염색 - 60,000원~ (1시간 30분)"></textarea>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tab 3: AI 모델 설정 -->
    <div id="tab-ai-model" class="tab-content hidden">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- AI 모델 선택 -->
        <div class="glass rounded-2xl p-6">
          <h2 class="text-lg font-bold flex items-center gap-2 mb-4">
            <i class="fas fa-brain gold"></i>
            AI 모델 선택
          </h2>
          
          <div class="space-y-4">
            <!-- Gemini Flash (일반 상담) -->
            <label class="block cursor-pointer">
              <div class="flex items-center gap-4 p-4 bg-white/5 rounded-xl border-2 border-transparent hover:border-white/20 transition-all model-option" data-model="gemini">
                <input type="radio" name="ai-model" value="gemini" class="hidden" checked>
                <div class="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <i class="fas fa-bolt text-blue-400 text-xl"></i>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold">Gemini 2.5 Flash <span class="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full ml-2">빠름</span></h3>
                  <p class="text-sm text-white/60">일반 상담용 - 빠른 응답, 한국어 우수</p>
                </div>
                <div class="w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center model-check">
                  <i class="fas fa-check text-xs hidden"></i>
                </div>
              </div>
            </label>
            
            <!-- Gemini Pro (전문 상담) - 권장 -->
            <label class="block cursor-pointer">
              <div class="flex items-center gap-4 p-4 bg-white/5 rounded-xl border-2 border-transparent hover:border-white/20 transition-all model-option" data-model="gemini-pro">
                <input type="radio" name="ai-model" value="gemini-pro" class="hidden">
                <div class="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <i class="fas fa-gem text-indigo-400 text-xl"></i>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold">Gemini 2.5 Pro <span class="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full ml-2">★ 권장</span></h3>
                  <p class="text-sm text-white/60">전문 상담용 - 보험/의료/법률 정확도 최고</p>
                </div>
                <div class="w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center model-check">
                  <i class="fas fa-check text-xs hidden"></i>
                </div>
              </div>
            </label>
            
            <!-- OpenAI GPT-4o -->
            <label class="block cursor-pointer">
              <div class="flex items-center gap-4 p-4 bg-white/5 rounded-xl border-2 border-transparent hover:border-white/20 transition-all model-option" data-model="openai">
                <input type="radio" name="ai-model" value="openai" class="hidden">
                <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <i class="fas fa-robot text-green-400 text-xl"></i>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold">OpenAI GPT-4o</h3>
                  <p class="text-sm text-white/60">이미지 분석/OCR 우수, 영문 정보 강점</p>
                </div>
                <div class="w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center model-check">
                  <i class="fas fa-check text-xs hidden"></i>
                </div>
              </div>
            </label>
            
            <!-- Claude -->
            <label class="block cursor-pointer">
              <div class="flex items-center gap-4 p-4 bg-white/5 rounded-xl border-2 border-transparent hover:border-white/20 transition-all model-option" data-model="claude">
                <input type="radio" name="ai-model" value="claude" class="hidden">
                <div class="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <i class="fas fa-brain text-purple-400 text-xl"></i>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold">Claude 3.5 Sonnet <span class="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full ml-2">예정</span></h3>
                  <p class="text-sm text-white/60">안전한 응답, 긴 문맥 처리 우수</p>
                </div>
                <div class="w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center model-check">
                  <i class="fas fa-check text-xs hidden"></i>
                </div>
              </div>
            </label>
          </div>
        </div>
        
        <!-- API 키 설정 -->
        <div class="glass rounded-2xl p-6">
          <h2 class="text-lg font-bold flex items-center gap-2 mb-4">
            <i class="fas fa-key gold"></i>
            API 키 설정
          </h2>
          
          <div class="space-y-4">
            <div class="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <p class="text-sm text-yellow-400">
                <i class="fas fa-info-circle mr-1"></i>
                API 키는 암호화되어 안전하게 저장됩니다.
              </p>
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-2">OpenAI API Key</label>
              <div class="relative">
                <input type="password" id="openai-api-key"
                  class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white pr-12"
                  placeholder="sk-proj-...">
                <button onclick="togglePassword('openai-api-key')" class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-2">Anthropic API Key (선택)</label>
              <div class="relative">
                <input type="password" id="anthropic-api-key"
                  class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white pr-12"
                  placeholder="sk-ant-...">
                <button onclick="togglePassword('anthropic-api-key')" class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            
            <button onclick="testApiKey()" class="w-full py-3 btn-secondary rounded-xl font-medium">
              <i class="fas fa-plug mr-2"></i>API 연결 테스트
            </button>
          </div>
          
          <!-- 모델 파라미터 -->
          <div class="mt-6 pt-6 border-t border-white/10">
            <h3 class="font-bold mb-4">모델 파라미터</h3>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm text-white/60 mb-2">Temperature (창의성): <span id="temp-value">0.7</span></label>
                <input type="range" id="temperature" min="0" max="1" step="0.1" value="0.7"
                  class="w-full" oninput="updateTempValue(this.value)">
                <div class="flex justify-between text-xs text-white/40 mt-1">
                  <span>정확함 (0.0)</span>
                  <span class="text-yellow-400">★ 권장 (0.7)</span>
                  <span>창의적 (1.0)</span>
                </div>
                <p class="text-xs text-white/40 mt-2">
                  <i class="fas fa-info-circle mr-1"></i>
                  높을수록 창의적이지만 할루시네이션(오답) 위험 증가. 일반 상담은 0.7 권장.
                </p>
              </div>
              
              <div>
                <label class="block text-sm text-white/60 mb-2">Max Tokens (최대 응답 길이)</label>
                <select id="max-tokens" class="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white cursor-pointer">
                  <option value="512">짧은 답변 (~300자)</option>
                  <option value="1024" selected>★ 일반 답변 (~600자) - 권장</option>
                  <option value="2048">상세 설명 (~1200자)</option>
                </select>
                <p class="text-xs text-white/40 mt-2">
                  <i class="fas fa-info-circle mr-1"></i>
                  토큰 = AI 응답 길이. 너무 길면 비용 증가, 너무 짧으면 답변 불충분.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tab 4: 고급 설정 -->
    <div id="tab-advanced" class="tab-content hidden">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- 이미지 OCR 설정 -->
        <div class="glass rounded-2xl p-6">
          <h2 class="text-lg font-bold flex items-center gap-2 mb-4">
            <i class="fas fa-image gold"></i>
            이미지 OCR 설정
          </h2>
          
          <div class="space-y-4">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" id="ocr-enabled" class="w-5 h-5 rounded" checked>
              <span>이미지 OCR 활성화</span>
            </label>
            
            <p class="text-sm text-white/60">
              고객이 이미지를 보내면 텍스트를 자동으로 추출하여 AI가 분석합니다.
              (헤어스타일 사진, 메뉴판, 영수증, 반려동물 사진, 차량 사진 등)
            </p>
            
            <div>
              <label class="block text-sm text-white/60 mb-2">OCR 후 AI 지침 (업종별 프리셋)</label>
              <select id="ocr-preset" onchange="applyOcrPreset()" class="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white cursor-pointer mb-3">
                <option value="default">직접 입력</option>
                <option value="beauty_hair">🔹 미용실/헤어숍 - 헤어스타일 분석</option>
                <option value="beauty_skin">🔹 피부관리/에스테틱 - 피부 상태 분석</option>
                <option value="restaurant">🔹 식당/카페 - 메뉴판 분석</option>
                <option value="pet">🔹 반려동물 - 애완동물 사진 분석</option>
                <option value="auto">🔹 자동차 영업 - 차량 사진 분석</option>
                <option value="medical">🔹 병원/의원 - 서류/진료표 분석</option>
                <option value="freelancer">🔹 프리랜서/1인샵 - 포트폴리오 분석</option>
              </select>
              <textarea id="ocr-instruction" rows="4"
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white resize-none text-sm"
                placeholder="예: 이미지에서 추출된 텍스트를 바탕으로 친절하게 답변해주세요."></textarea>
            </div>
          </div>
        </div>
        
        <!-- 예약/연락처 연동 설정 -->
        <div class="glass rounded-2xl p-6">
          <h2 class="text-lg font-bold flex items-center gap-2 mb-4">
            <i class="fas fa-link gold"></i>
            예약/연락 연동
          </h2>
          
          <div class="space-y-4">
            <!-- 예약 방식 선택 -->
            <div>
              <label class="block text-sm text-white/60 mb-2">예약/연락 방식 선택</label>
              <select id="booking-method" onchange="toggleBookingOptions()" class="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white cursor-pointer">
                <option value="naver">네이버 예약 연동</option>
                <option value="phone">전화 연결</option>
                <option value="kakao">카카오톡 연결</option>
                <option value="instagram">인스타그램 DM</option>
                <option value="sms">문자 예약</option>
                <option value="callback">시술 후 콜백 (프리랜서용)</option>
              </select>
            </div>
            
            <!-- 네이버 예약 옵션 -->
            <div id="naver-options" class="space-y-4">
              <div>
                <label class="block text-sm text-white/60 mb-2">네이버 톡톡 ID</label>
                <input type="text" id="naver-talktalk-id"
                  class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  placeholder="예: WC92CF">
              </div>
              
              <div>
                <label class="block text-sm text-white/60 mb-2">네이버 예약 ID (숫자)</label>
                <input type="text" id="naver-reservation-id"
                  class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  placeholder="예: 262580 (네이버 플레이스 ID)">
                <p class="text-xs text-white/40 mt-1">
                  <i class="fas fa-info-circle mr-1"></i>
                  네이버 예약 페이지 URL에서 확인 가능
                </p>
              </div>
            </div>
            
            <!-- 프리랜서/1인샵 옵션 -->
            <div id="freelancer-options" class="space-y-4 hidden">
              <div>
                <label class="block text-sm text-white/60 mb-2">연락처 (전화번호)</label>
                <input type="text" id="contact-phone"
                  class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  placeholder="예: 010-1234-5678">
              </div>
              
              <div>
                <label class="block text-sm text-white/60 mb-2">카카오톡 오픈채팅 ID (선택)</label>
                <input type="text" id="kakao-id"
                  class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  placeholder="예: @design_studio">
              </div>
              
              <div>
                <label class="block text-sm text-white/60 mb-2">인스타그램 ID (선택)</label>
                <input type="text" id="instagram-id"
                  class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  placeholder="예: @hair_artist_kim">
              </div>
              
              <div class="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p class="text-sm text-blue-400">
                  <i class="fas fa-info-circle mr-2"></i>
                  <strong>프리랜서/1인샵 모드:</strong> "현재 시술 중이시라면, 완료 후 연락드리겠습니다"라고 안내합니다.
                </p>
              </div>
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-2">Webhook URL</label>
              <div class="flex gap-2">
                <input type="text" id="webhook-url" readonly
                  class="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/60"
                  value="https://xivix-ai-core.pages.dev/v1/naver/callback/${storeId}">
                <button onclick="copyWebhookUrl()" class="px-4 py-3 btn-secondary rounded-xl">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 자동화 설정 -->
        <div class="glass rounded-2xl p-6 lg:col-span-2">
          <h2 class="text-lg font-bold flex items-center gap-2 mb-4">
            <i class="fas fa-magic gold"></i>
            자동화 설정
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label class="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10">
              <input type="checkbox" id="auto-greeting" class="w-5 h-5 rounded" checked>
              <div>
                <span class="font-medium">자동 환영 메시지</span>
                <p class="text-xs text-white/60">채팅방 입장 시 자동 인사</p>
              </div>
            </label>
            
            <label class="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10">
              <input type="checkbox" id="auto-reservation" class="w-5 h-5 rounded" checked>
              <div>
                <span class="font-medium">예약 유도 메시지</span>
                <p class="text-xs text-white/60">예약 키워드 감지 시 버튼 전송</p>
              </div>
            </label>
            
            <label class="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10">
              <input type="checkbox" id="auto-followup" class="w-5 h-5 rounded">
              <div>
                <span class="font-medium">재방문 메시지</span>
                <p class="text-xs text-white/60">상담 후 자동 팔로업</p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
    
  </main>

  <script>
    const STORE_ID = ${storeId};
    let storeData = null;
    let currentPromptConfig = {};
    
    // 페이지 로드 시 데이터 가져오기
    document.addEventListener('DOMContentLoaded', () => {
      loadStoreData();
      initModelSelection();
    });
    
    // 매장 데이터 로드
    async function loadStoreData() {
      try {
        const res = await fetch('/api/stores/' + STORE_ID);
        const data = await res.json();
        if (data.success && data.data) {
          storeData = data.data;
          populateForm(storeData);
        }
      } catch (err) {
        console.error('Failed to load store data:', err);
        showToast('매장 정보를 불러오는데 실패했습니다', 'error');
      }
    }
    
    // 폼에 데이터 채우기
    function populateForm(store) {
      console.log('[populateForm] 데이터 로드:', store);
      
      // 기본 정보
      document.getElementById('store-name').textContent = store.store_name || '매장 설정';
      document.getElementById('store-name-input').value = store.store_name || '';
      document.getElementById('business-type').value = store.business_type || 'OTHER';
      
      // 매장 정보 (주소, 전화번호)
      const addressEl = document.getElementById('store-address');
      if (addressEl) addressEl.value = store.address || '';
      
      const phoneEl = document.getElementById('store-phone');
      if (phoneEl) phoneEl.value = store.phone || '';
      
      // AI 설정
      document.getElementById('ai-persona').value = store.ai_persona || '';
      document.getElementById('ai-tone').value = store.ai_tone || 'friendly';
      document.getElementById('greeting-message').value = store.greeting_message || '';
      document.getElementById('system-prompt').value = store.system_prompt || '';
      
      // 영업시간 및 메뉴
      document.getElementById('operating-hours-text').value = store.operating_hours || '';
      document.getElementById('menu-data-text').value = store.menu_data || '';
      
      // 네이버 연동
      document.getElementById('naver-talktalk-id').value = store.naver_talktalk_id || '';
      document.getElementById('naver-reservation-id').value = store.naver_reservation_id || '';
      
      // SMS 알림 연락처 - 원장님 휴대폰
      const ownerPhoneEl = document.getElementById('owner-phone');
      if (ownerPhoneEl) {
        ownerPhoneEl.value = store.owner_phone || '';
        console.log('[populateForm] owner_phone 설정:', store.owner_phone);
      }
      
      // 추가 관리자 로드 - 기존 항목 먼저 제거
      const contactsList = document.getElementById('additional-contacts-list');
      if (contactsList) contactsList.innerHTML = '';
      
      if (store.additional_contacts) {
        try {
          const contacts = JSON.parse(store.additional_contacts);
          console.log('[populateForm] additional_contacts 파싱:', contacts);
          contacts.forEach(contact => addAdditionalContact(contact.name, contact.phone));
        } catch (e) {
          console.warn('Failed to parse additional_contacts:', e);
        }
      }
      
      // AI 모델 선택
      if (store.ai_model) {
        selectModel(store.ai_model);
      }
      
      // 고급 설정 - OCR
      const ocrEnabledEl = document.getElementById('ocr-enabled');
      if (ocrEnabledEl) ocrEnabledEl.checked = store.ocr_enabled !== false;
      
      const ocrInstructionEl = document.getElementById('ocr-instruction');
      if (ocrInstructionEl) ocrInstructionEl.value = store.ocr_instruction || '';
      
      // OCR 프리셋 - 저장된 instruction 값으로 프리셋 자동 선택
      const ocrPresetEl = document.getElementById('ocr-preset');
      if (ocrPresetEl && store.ocr_instruction) {
        // 프리셋 매칭 시도 (정확히 일치하는 프리셋이 있으면 선택)
        const presetOptions = ocrPresetEl.options;
        let matched = false;
        for (let i = 0; i < presetOptions.length; i++) {
          if (presetOptions[i].value !== 'default') {
            // 프리셋 적용 후 비교를 위해 임시로 선택
            ocrPresetEl.value = presetOptions[i].value;
            applyOcrPreset();
            if (ocrInstructionEl.value === store.ocr_instruction) {
              matched = true;
              break;
            }
          }
        }
        if (!matched) {
          ocrPresetEl.value = 'default';
          ocrInstructionEl.value = store.ocr_instruction;
        }
      }
      
      // 고급 설정 - 자동화
      const autoGreetingEl = document.getElementById('auto-greeting');
      if (autoGreetingEl) autoGreetingEl.checked = store.auto_greeting !== false;
      
      const autoReservationEl = document.getElementById('auto-reservation');
      if (autoReservationEl) autoReservationEl.checked = store.auto_reservation !== false;
      
      const autoFollowupEl = document.getElementById('auto-followup');
      if (autoFollowupEl) autoFollowupEl.checked = store.auto_followup == 1 || store.auto_followup === true;
      
      // 모델 파라미터
      const temperatureEl = document.getElementById('temperature');
      if (temperatureEl && store.ai_temperature) {
        temperatureEl.value = store.ai_temperature;
        document.getElementById('temp-value').textContent = store.ai_temperature;
      }
      
      console.log('[populateForm] 고급 설정 로드 완료');
    }
    
    // 추가 관리자 항목 추가
    function addAdditionalContact(name = '', phone = '') {
      const container = document.getElementById('additional-contacts-list');
      const index = container.children.length;
      
      const itemDiv = document.createElement('div');
      itemDiv.className = 'flex gap-2 items-center';
      itemDiv.innerHTML = \`
        <input type="text" placeholder="이름 (예: 디자이너A)" value="\${name}"
          class="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm additional-contact-name">
        <input type="text" placeholder="전화번호 (예: 010-1234-5678)" value="\${phone}"
          class="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm additional-contact-phone">
        <button onclick="this.parentElement.remove()" class="text-white/40 hover:text-red-400 px-2">
          <i class="fas fa-times"></i>
        </button>
      \`;
      container.appendChild(itemDiv);
    }
    
    // 추가 관리자 데이터 수집
    function getAdditionalContacts() {
      const contacts = [];
      document.querySelectorAll('#additional-contacts-list > div').forEach(item => {
        const name = item.querySelector('.additional-contact-name').value.trim();
        const phone = item.querySelector('.additional-contact-phone').value.trim();
        if (name && phone) {
          contacts.push({ name, phone });
        }
      });
      return contacts;
    }
    
    // 탭 전환
    function showSettingsTab(tabName) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.settings-tab').forEach(el => {
        el.classList.remove('tab-active');
        el.classList.add('text-white/60');
      });
      
      document.getElementById('tab-' + tabName).classList.remove('hidden');
      document.querySelector('[data-tab="' + tabName + '"]').classList.add('tab-active');
      document.querySelector('[data-tab="' + tabName + '"]').classList.remove('text-white/60');
    }
    
    // AI 모델 선택 초기화
    function initModelSelection() {
      document.querySelectorAll('.model-option').forEach(option => {
        option.addEventListener('click', () => {
          const model = option.dataset.model;
          selectModel(model);
        });
      });
    }
    
    function selectModel(model) {
      document.querySelectorAll('.model-option').forEach(opt => {
        const isSelected = opt.dataset.model === model;
        opt.classList.toggle('border-[#D4AF37]', isSelected);
        opt.querySelector('.model-check').classList.toggle('border-[#D4AF37]', isSelected);
        opt.querySelector('.model-check').classList.toggle('bg-[#D4AF37]', isSelected);
        opt.querySelector('.model-check i').classList.toggle('hidden', !isSelected);
        opt.querySelector('input').checked = isSelected;
      });
    }
    
    // 프롬프트 변경사항 적용
    function applyPromptChanges() {
      currentPromptConfig = {
        persona: document.getElementById('ai-persona').value,
        tone: document.getElementById('ai-tone').value,
        greeting: document.getElementById('greeting-message').value,
        systemPrompt: document.getElementById('system-prompt').value,
        forbidden: document.getElementById('forbidden-keywords').value
      };
      showToast('프롬프트 변경사항이 테스트에 적용되었습니다', 'success');
    }
    
    // 테스트 메시지 전송
    async function sendTestMessage() {
      const input = document.getElementById('test-message');
      const message = input.value.trim();
      if (!message) return;
      
      input.value = '';
      addChatMessage(message, 'user');
      addTypingIndicator();
      
      try {
        const res = await fetch('/api/chat/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: STORE_ID,
            message: message,
            prompt_config: currentPromptConfig,
            ai_model: document.querySelector('input[name="ai-model"]:checked')?.value || 'gemini'
          })
        });
        
        const data = await res.json();
        removeTypingIndicator();
        
        if (data.success) {
          addChatMessage(data.response, 'bot');
        } else {
          addChatMessage('오류가 발생했습니다: ' + (data.error || '알 수 없는 오류'), 'bot');
        }
      } catch (err) {
        removeTypingIndicator();
        addChatMessage('네트워크 오류가 발생했습니다', 'bot');
      }
    }
    
    function quickTest(message) {
      document.getElementById('test-message').value = message;
      sendTestMessage();
    }
    
    // 채팅 메시지 추가
    function addChatMessage(text, type) {
      const container = document.getElementById('chat-messages');
      const placeholder = container.querySelector('.text-center');
      if (placeholder) placeholder.remove();
      
      const div = document.createElement('div');
      div.className = 'flex ' + (type === 'user' ? 'justify-end' : 'justify-start');
      div.innerHTML = \`
        <div class="max-w-[80%] px-4 py-2 rounded-2xl \${type === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}">
          \${text.replace(/\\n/g, '<br>')}
        </div>
      \`;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    }
    
    function addTypingIndicator() {
      const container = document.getElementById('chat-messages');
      const div = document.createElement('div');
      div.id = 'typing-indicator';
      div.className = 'flex justify-start';
      div.innerHTML = \`
        <div class="px-4 py-2 rounded-2xl chat-bubble-bot typing-indicator">
          <span>●</span><span>●</span><span>●</span>
        </div>
      \`;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    }
    
    function removeTypingIndicator() {
      const indicator = document.getElementById('typing-indicator');
      if (indicator) indicator.remove();
    }
    
    function clearChat() {
      const container = document.getElementById('chat-messages');
      container.innerHTML = \`
        <div class="text-center text-white/40 text-sm py-8">
          <i class="fas fa-robot text-3xl mb-2 block"></i>
          프롬프트를 수정하고 테스트해보세요
        </div>
      \`;
    }
    
    // Temperature 값 업데이트
    function updateTempValue(value) {
      document.getElementById('temp-value').textContent = value;
    }
    
    // OCR 프리셋 적용
    function applyOcrPreset() {
      const preset = document.getElementById('ocr-preset').value;
      const instruction = document.getElementById('ocr-instruction');
      
      const presets = {
        'default': '',
        'beauty_hair': '고객이 헤어스타일 사진을 보내면:\\n1. 어떤 스타일인지 분석해주세요 (레이어드컷, 펌 종류 등)\\n2. 저희 매장에서 시술 가능한지 안내해주세요\\n3. 예상 가격과 소요시간을 안내해주세요\\n4. "원하시는 스타일로 예약 도와드릴까요?"로 마무리해주세요',
        'beauty_skin': '고객이 피부 사진을 보내면:\\n1. 피부 상태를 간단히 분석해주세요 (건성/지성/복합성 등)\\n2. 추천 관리 코스를 안내해주세요\\n3. 가격과 예상 효과를 설명해주세요\\n4. "피부 상담 예약 도와드릴까요?"로 마무리해주세요',
        'restaurant': '고객이 메뉴판 사진을 보내면:\\n1. 메뉴와 가격을 확인해주세요\\n2. 인기 메뉴나 추천 메뉴를 안내해주세요\\n3. 예약이나 주문 가능 여부를 안내해주세요',
        'pet': '고객이 반려동물 사진을 보내면:\\n1. 반려동물 종류와 상태를 확인해주세요\\n2. 적합한 서비스(미용/호텔/진료 등)를 추천해주세요\\n3. 예약 가능 시간을 안내해주세요\\n4. "우리 아이 케어 예약 도와드릴까요?"로 마무리해주세요',
        'auto': '고객이 차량 사진을 보내면:\\n1. 차량 종류와 상태를 확인해주세요\\n2. 관심 있으신 부분을 여쭤보세요\\n3. 해당 차량 정보나 서비스를 안내해주세요\\n4. "상담 예약이나 시승 예약 도와드릴까요?"로 마무리해주세요',
        'medical': '고객이 서류나 진료표 사진을 보내면:\\n1. 내용을 확인하고 간단히 설명해주세요\\n2. 추가로 필요한 정보가 있으면 안내해주세요\\n3. 진료 예약이나 상담 예약을 안내해주세요\\n※ 의료 진단은 하지 않습니다',
        'freelancer': '고객이 포트폴리오나 작업물 사진을 보내면:\\n1. 원하시는 스타일/작업을 확인해주세요\\n2. 비슷한 작업 가능 여부를 안내해주세요\\n3. "현재 시술 중이시라면 완료 후 연락드리겠습니다" 또는 가능한 시간을 안내해주세요'
      };
      
      if (presets[preset]) {
        instruction.value = presets[preset];
      }
    }
    
    // 예약 방식에 따른 옵션 토글
    function toggleBookingOptions() {
      const method = document.getElementById('booking-method').value;
      const naverOptions = document.getElementById('naver-options');
      const freelancerOptions = document.getElementById('freelancer-options');
      
      // 네이버 옵션: naver 선택 시만 표시
      naverOptions.classList.toggle('hidden', method !== 'naver');
      
      // 프리랜서 옵션: phone, kakao, instagram, sms, callback 시 표시
      const showFreelancer = ['phone', 'kakao', 'instagram', 'sms', 'callback'].includes(method);
      freelancerOptions.classList.toggle('hidden', !showFreelancer);
    }
    
    // 메뉴 항목 추가
    function addMenuItem() {
      const container = document.getElementById('menu-items');
      const index = container.children.length;
      
      const itemDiv = document.createElement('div');
      itemDiv.className = 'flex gap-2 items-center';
      itemDiv.innerHTML = \`
        <input type="text" placeholder="서비스명 (예: 커트)" 
          class="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
        <input type="text" placeholder="가격 (예: 30,000원)" 
          class="w-32 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
        <input type="text" placeholder="시간 (예: 30분)" 
          class="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
        <button onclick="this.parentElement.remove()" class="text-white/40 hover:text-red-400 px-2">
          <i class="fas fa-times"></i>
        </button>
      \`;
      container.appendChild(itemDiv);
    }
    
    // 전체 저장
    async function saveAllSettings() {
      // 메뉴 항목 수집
      const menuItems = [];
      document.querySelectorAll('#menu-items > div').forEach(item => {
        const inputs = item.querySelectorAll('input');
        if (inputs[0].value) {
          menuItems.push({
            name: inputs[0].value,
            price: inputs[1].value,
            time: inputs[2].value
          });
        }
      });
      
      // 텍스트 영역의 데이터와 합치기
      let menuData = document.getElementById('menu-data-text').value;
      if (menuItems.length > 0) {
        const menuItemsText = menuItems.map(m => 
          \`\${m.name} - \${m.price}\${m.time ? ' (' + m.time + ')' : ''}\`
        ).join('\\n');
        menuData = menuData ? menuData + '\\n' + menuItemsText : menuItemsText;
      }
      
      // 추가 관리자 데이터 수집
      const additionalContacts = getAdditionalContacts();
      
      const settings = {
        // 기본 매장 정보
        store_name: document.getElementById('store-name-input').value,
        business_type: document.getElementById('business-type').value,
        address: document.getElementById('store-address')?.value || '',
        phone: document.getElementById('store-phone')?.value || '',
        
        // AI 설정
        ai_persona: document.getElementById('ai-persona').value,
        ai_tone: document.getElementById('ai-tone').value,
        greeting_message: document.getElementById('greeting-message').value,
        system_prompt: document.getElementById('system-prompt').value,
        
        // 영업 정보
        operating_hours: document.getElementById('operating-hours-text').value,
        menu_data: menuData,
        
        // AI 모델
        ai_model: document.querySelector('input[name="ai-model"]:checked')?.value || 'gemini',
        
        // 연동 설정
        naver_talktalk_id: document.getElementById('naver-talktalk-id').value,
        naver_reservation_id: document.getElementById('naver-reservation-id').value,
        ocr_enabled: document.getElementById('ocr-enabled').checked,
        ocr_instruction: document.getElementById('ocr-instruction').value,
        booking_method: document.getElementById('booking-method').value,
        contact_phone: document.getElementById('contact-phone')?.value || '',
        kakao_id: document.getElementById('kakao-id')?.value || '',
        instagram_id: document.getElementById('instagram-id')?.value || '',
        
        // 모델 파라미터
        temperature: parseFloat(document.getElementById('temperature').value),
        max_tokens: parseInt(document.getElementById('max-tokens').value),
        
        // 자동화 설정
        auto_greeting: document.getElementById('auto-greeting')?.checked ?? true,
        auto_reservation: document.getElementById('auto-reservation')?.checked ?? true,
        auto_followup: document.getElementById('auto-followup')?.checked ?? false,
        
        // SMS 알림 연락처
        owner_phone: document.getElementById('owner-phone')?.value || '',
        additional_contacts: additionalContacts.length > 0 ? JSON.stringify(additionalContacts) : ''
      };
      
      console.log('[saveAllSettings] 저장 데이터:', settings);
      
      try {
        const res = await fetch('/api/stores/' + STORE_ID + '/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        });
        
        const data = await res.json();
        if (data.success) {
          showToast('설정이 저장되었습니다', 'success');
        } else {
          showToast('저장 실패: ' + (data.error || '알 수 없는 오류'), 'error');
        }
      } catch (err) {
        showToast('네트워크 오류', 'error');
      }
    }
    
    // API 키 테스트
    async function testApiKey() {
      const model = document.querySelector('input[name="ai-model"]:checked')?.value;
      const openaiKey = document.getElementById('openai-api-key').value;
      
      if (model === 'openai' && !openaiKey) {
        showToast('OpenAI API 키를 입력해주세요', 'error');
        return;
      }
      
      showToast('API 연결 테스트 중...', 'info');
      
      try {
        const res = await fetch('/api/test-api-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            model: model,
            api_key: openaiKey 
          })
        });
        
        const data = await res.json();
        if (data.success) {
          showToast('API 연결 성공!', 'success');
        } else {
          showToast('API 연결 실패: ' + data.error, 'error');
        }
      } catch (err) {
        showToast('테스트 중 오류 발생', 'error');
      }
    }
    
    // 비밀번호 토글
    function togglePassword(inputId) {
      const input = document.getElementById(inputId);
      input.type = input.type === 'password' ? 'text' : 'password';
    }
    
    // Webhook URL 복사
    function copyWebhookUrl() {
      const url = document.getElementById('webhook-url').value;
      navigator.clipboard.writeText(url);
      showToast('Webhook URL이 복사되었습니다', 'success');
    }
    
    // 프롬프트 초기화
    function resetPrompt() {
      if (storeData) {
        populateForm(storeData);
        showToast('프롬프트가 초기화되었습니다', 'info');
      }
    }
    
    // 토스트 메시지
    function showToast(message, type = 'info') {
      const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
      };
      
      const toast = document.createElement('div');
      toast.className = \`fixed bottom-4 right-4 px-6 py-3 rounded-xl text-white \${colors[type]} shadow-lg z-50\`;
      toast.textContent = message;
      document.body.appendChild(toast);
      
      setTimeout(() => toast.remove(), 3000);
    }
    
    // ============ 자동 생성 기능 ============
    
    let uploadedFiles = [];
    let analyzedUrl = null;
    
    // URL 분석 → 자동 저장 → 폼 반영 (한 번에 실행)
    async function analyzeUrl() {
      const url = document.getElementById('auto-url').value.trim();
      const aiModel = document.querySelector('input[name="ai-model"]:checked')?.value || 'gemini';
      
      if (!url) {
        showToast('URL을 입력해주세요', 'error');
        return;
      }
      
      // 상태 표시
      const statusDiv = document.getElementById('analysis-status');
      const statusText = document.getElementById('analysis-text');
      const progressBar = document.getElementById('analysis-progress');
      statusDiv.classList.remove('hidden');
      statusText.textContent = 'URL 분석 중...';
      progressBar.style.width = '20%';
      
      try {
        // 자동 프롬프트 생성 및 저장 API 호출 (한 번에 분석 + 저장)
        statusText.textContent = 'AI가 분석하고 프롬프트를 생성 중...';
        progressBar.style.width = '50%';
        
        const generateRes = await fetch(\`/api/stores/\${STORE_ID}/auto-generate-prompt\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, aiModel })
        });
        
        const generateData = await generateRes.json();
        progressBar.style.width = '100%';
        
        if (generateData.success) {
          analyzedUrl = generateData.data;
          const result = generateData.data.extractedInfo;
          
          // 폼에 데이터 적용
          if (result.storeName) {
            document.getElementById('store-name-input').value = result.storeName;
            document.getElementById('store-name').textContent = result.storeName;
          }
          if (result.address) {
            const addrEl = document.getElementById('store-address');
            if (addrEl) addrEl.value = result.address;
          }
          if (result.phone) {
            const phoneEl = document.getElementById('store-phone');
            if (phoneEl) phoneEl.value = result.phone;
          }
          if (result.operatingHours) {
            document.getElementById('operating-hours-text').value = result.operatingHours;
          }
          if (result.businessType) {
            document.getElementById('business-type').value = result.businessType;
          }
          if (result.systemPrompt) {
            document.getElementById('system-prompt').value = result.systemPrompt;
          }
          if (result.features && result.features.length > 0) {
            document.getElementById('ai-persona').value = result.features.join(', ');
          }
          if (result.menuData && result.menuData.length > 0) {
            const menuText = result.menuData.map(m => 
              \`\${m.name} - \${m.price}\${m.description ? ' (' + m.description + ')' : ''}\`
            ).join('\\n');
            document.getElementById('menu-data-text').value = menuText;
          }
          
          // 분석 결과 요약
          let summary = '✅ 자동 분석 및 저장 완료!\\n\\n';
          if (result.storeName) summary += \`매장명: \${result.storeName}\\n\`;
          if (result.businessType) summary += \`업종: \${result.businessType}\\n\`;
          if (result.menuData?.length) summary += \`메뉴/서비스: \${result.menuData.length}개\\n\`;
          if (result.events?.length) summary += \`이벤트: \${result.events.length}개\\n\`;
          
          console.log('AI 분석 결과:', result);
          showToast('✅ 프롬프트가 자동 생성되고 저장되었습니다!', 'success');
          
          updateGenerateButton();
        } else {
          showToast('분석 실패: ' + (generateData.error || '알 수 없는 오류'), 'error');
        }
      } catch (err) {
        console.error('Analysis error:', err);
        showToast('분석 중 오류 발생: ' + err.message, 'error');
      } finally {
        setTimeout(() => {
          statusDiv.classList.add('hidden');
          progressBar.style.width = '0%';
        }, 1000);
      }
    }
    
    // 파일 업로드 처리
    function handleFileUpload(event) {
      const files = Array.from(event.target.files);
      const maxPdfSize = 50 * 1024 * 1024; // 50MB
      const maxImageSize = 20 * 1024 * 1024; // 20MB
      
      for (const file of files) {
        const isPdf = file.type === 'application/pdf';
        const isImage = file.type.startsWith('image/');
        const maxSize = isPdf ? maxPdfSize : maxImageSize;
        
        if (file.size > maxSize) {
          showToast(\`\${file.name}: 파일 크기 초과 (최대 \${isPdf ? '50MB' : '20MB'})\`, 'error');
          continue;
        }
        
        if (!isPdf && !isImage) {
          showToast(\`\${file.name}: 지원하지 않는 형식\`, 'error');
          continue;
        }
        
        uploadedFiles.push(file);
      }
      
      updateFileList();
      updateGenerateButton();
    }
    
    // 파일 목록 업데이트
    function updateFileList() {
      const container = document.getElementById('uploaded-files');
      const list = document.getElementById('file-list');
      const placeholder = document.getElementById('upload-placeholder');
      
      if (uploadedFiles.length === 0) {
        container.classList.add('hidden');
        placeholder.classList.remove('hidden');
        return;
      }
      
      container.classList.remove('hidden');
      placeholder.classList.add('hidden');
      
      list.innerHTML = uploadedFiles.map((file, index) => \`
        <div class="flex items-center justify-between p-3 bg-white/5 rounded-xl">
          <div class="flex items-center gap-3">
            <i class="fas \${file.type === 'application/pdf' ? 'fa-file-pdf text-red-400' : 'fa-file-image text-blue-400'}"></i>
            <div>
              <p class="text-sm font-medium">\${file.name}</p>
              <p class="text-xs text-white/40">\${formatFileSize(file.size)}</p>
            </div>
          </div>
          <button onclick="removeFile(\${index})" class="text-white/40 hover:text-red-400">
            <i class="fas fa-times"></i>
          </button>
        </div>
      \`).join('');
    }
    
    // 파일 삭제
    function removeFile(index) {
      uploadedFiles.splice(index, 1);
      updateFileList();
      updateGenerateButton();
    }
    
    // 파일 크기 포맷
    function formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    // 생성 버튼 상태 업데이트
    function updateGenerateButton() {
      const btn = document.getElementById('generate-btn');
      const hasSource = uploadedFiles.length > 0 || analyzedUrl || document.getElementById('auto-url').value.trim();
      btn.disabled = !hasSource;
    }
    
    // URL 입력 감지
    document.addEventListener('DOMContentLoaded', () => {
      const urlInput = document.getElementById('auto-url');
      if (urlInput) {
        urlInput.addEventListener('input', updateGenerateButton);
      }
    });
    
    // AI 자동 생성
    async function generatePromptFromSources() {
      const url = document.getElementById('auto-url').value.trim();
      const aiModel = document.querySelector('input[name="ai-model"]:checked')?.value || 'gemini';
      
      if (!url && uploadedFiles.length === 0) {
        showToast('URL 또는 파일을 입력해주세요', 'error');
        return;
      }
      
      // 상태 표시
      const statusDiv = document.getElementById('analysis-status');
      const statusText = document.getElementById('analysis-text');
      const progressBar = document.getElementById('analysis-progress');
      statusDiv.classList.remove('hidden');
      
      try {
        let uploadedFileKeys = [];
        
        // 1. 파일 업로드 (있는 경우)
        if (uploadedFiles.length > 0) {
          for (let i = 0; i < uploadedFiles.length; i++) {
            const file = uploadedFiles[i];
            statusText.textContent = \`파일 업로드 중... (\${i + 1}/\${uploadedFiles.length})\`;
            progressBar.style.width = \`\${((i + 1) / uploadedFiles.length) * 30}%\`;
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', 'analysis');
            
            const uploadRes = await fetch(\`/api/stores/\${STORE_ID}/files/upload\`, {
              method: 'POST',
              body: formData
            });
            const uploadData = await uploadRes.json();
            
            if (uploadData.success) {
              uploadedFileKeys.push(uploadData.data.key);
              showToast(\`\${file.name} 업로드 완료\`, 'success');
            } else {
              showToast(\`\${file.name} 업로드 실패: \${uploadData.error}\`, 'error');
            }
          }
        }
        
        // 2. 자동 프롬프트 생성 요청
        statusText.textContent = 'AI가 분석하고 프롬프트를 생성 중...';
        progressBar.style.width = '60%';
        
        const generateRes = await fetch(\`/api/stores/\${STORE_ID}/auto-generate-prompt\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url: url || undefined,
            fileKey: uploadedFileKeys[0] || undefined, // 첫 번째 파일만 분석 (여러 파일은 추후 지원)
            aiModel: aiModel
          })
        });
        
        const generateData = await generateRes.json();
        progressBar.style.width = '100%';
        
        if (generateData.success) {
          // 생성된 데이터 적용
          const result = generateData.data.extractedInfo;
          
          if (result.storeName) document.getElementById('store-name-input').value = result.storeName;
          if (result.address) {
            const addrEl = document.getElementById('store-address');
            if (addrEl) addrEl.value = result.address || '';
          }
          if (result.phone) {
            const phoneEl = document.getElementById('store-phone');
            if (phoneEl) phoneEl.value = result.phone || '';
          }
          if (result.operatingHours) document.getElementById('operating-hours-text').value = result.operatingHours;
          if (result.businessType) document.getElementById('business-type').value = result.businessType;
          if (result.systemPrompt) document.getElementById('system-prompt').value = result.systemPrompt;
          if (result.features && result.features.length > 0) {
            document.getElementById('ai-persona').value = result.features.join(', ');
          }
          if (result.menuData && result.menuData.length > 0) {
            const menuText = result.menuData.map(m => 
              \`\${m.name} - \${m.price}\${m.description ? ' (' + m.description + ')' : ''}\`
            ).join('\\n');
            document.getElementById('menu-data-text').value = menuText;
          }
          
          showToast('프롬프트가 자동 생성되었습니다! 확인 후 저장해주세요.', 'success');
          
          // 생성 결과 요약 표시
          const summary = \`매장명: \${result.storeName || '(미확인)'}\n업종: \${result.businessType || '(미확인)'}\n메뉴: \${result.menuData?.length || 0}개\`;
          console.log('AI 분석 결과:', result);
        } else {
          showToast('생성 실패: ' + (generateData.error || '알 수 없는 오류'), 'error');
        }
        
      } catch (err) {
        console.error('Generation error:', err);
        showToast('생성 중 오류 발생: ' + err.message, 'error');
      } finally {
        setTimeout(() => {
          statusDiv.classList.add('hidden');
          progressBar.style.width = '0%';
        }, 1000);
      }
    }
    
    // 드래그 앤 드롭
    const dropZone = document.querySelector('.border-dashed');
    if (dropZone) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
      });
      
      function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
          dropZone.classList.add('border-[#D4AF37]', 'bg-[#D4AF37]/5');
        });
      });
      
      ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
          dropZone.classList.remove('border-[#D4AF37]', 'bg-[#D4AF37]/5');
        });
      });
      
      dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        document.getElementById('file-upload').files = files;
        handleFileUpload({ target: { files } });
      });
    }
  </script>

</body>
</html>
`;
}
