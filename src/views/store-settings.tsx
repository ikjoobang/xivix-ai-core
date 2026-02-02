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
            <select id="ai-tone" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
              <option value="friendly">친근하고 따뜻한</option>
              <option value="professional">전문적이고 신뢰감 있는</option>
              <option value="casual">캐주얼하고 편한</option>
              <option value="formal">격식있고 정중한</option>
              <option value="energetic">활기차고 긍정적인</option>
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
              <select id="business-type" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                <option value="BEAUTY_HAIR">미용실/헤어숍</option>
                <option value="BEAUTY_SKIN">피부관리/에스테틱</option>
                <option value="BEAUTY_NAIL">네일아트/속눈썹</option>
                <option value="RESTAURANT">일반 식당/카페</option>
                <option value="FITNESS">피트니스/요가/PT</option>
                <option value="MEDICAL">병원/의원/치과</option>
                <option value="PROFESSIONAL_LEGAL">법률/세무/보험</option>
                <option value="EDUCATION">학원/교육/과외</option>
                <option value="PET_SERVICE">애견/반려동물</option>
                <option value="OTHER">기타</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-2">주소</label>
              <input type="text" id="store-address"
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                placeholder="예: 서울시 강남구 역삼동 123-45">
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-2">전화번호</label>
              <input type="text" id="store-phone"
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                placeholder="예: 02-1234-5678">
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
          
          <div id="menu-items" class="space-y-3">
            <!-- 메뉴 항목은 JS로 동적 생성 -->
          </div>
          
          <div class="mt-4">
            <label class="block text-sm text-white/60 mb-2">또는 텍스트로 직접 입력</label>
            <textarea id="menu-data-text" rows="8"
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white resize-none font-mono text-sm"
              placeholder="예:
[커트]
- 여성 커트: 30,000원 (30분)
- 남성 커트: 20,000원 (20분)

[펌]
- 디지털 펌: 150,000원 (2시간)
- 볼륨 펌: 120,000원 (2시간)"></textarea>
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
            <!-- Gemini -->
            <label class="block cursor-pointer">
              <div class="flex items-center gap-4 p-4 bg-white/5 rounded-xl border-2 border-transparent hover:border-white/20 transition-all model-option" data-model="gemini">
                <input type="radio" name="ai-model" value="gemini" class="hidden" checked>
                <div class="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <i class="fas fa-gem text-blue-400 text-xl"></i>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold">Google Gemini 2.5 Flash</h3>
                  <p class="text-sm text-white/60">빠른 응답, 멀티모달 지원, 한국어 우수</p>
                </div>
                <div class="w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center model-check">
                  <i class="fas fa-check text-xs hidden"></i>
                </div>
              </div>
            </label>
            
            <!-- OpenAI GPT-4 -->
            <label class="block cursor-pointer">
              <div class="flex items-center gap-4 p-4 bg-white/5 rounded-xl border-2 border-transparent hover:border-white/20 transition-all model-option" data-model="openai">
                <input type="radio" name="ai-model" value="openai" class="hidden">
                <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <i class="fas fa-robot text-green-400 text-xl"></i>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold">OpenAI GPT-4o</h3>
                  <p class="text-sm text-white/60">정확한 정보, 전문 분야 강점 (보험/법률)</p>
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
                  <h3 class="font-bold">Anthropic Claude 3.5</h3>
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
                  class="w-full" oninput="document.getElementById('temp-value').textContent=this.value">
              </div>
              
              <div>
                <label class="block text-sm text-white/60 mb-2">Max Tokens (최대 응답 길이)</label>
                <input type="number" id="max-tokens" value="1024"
                  class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
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
              (영수증, 메뉴판, 서류 등)
            </p>
            
            <div>
              <label class="block text-sm text-white/60 mb-2">OCR 후 AI 지침</label>
              <textarea id="ocr-instruction" rows="3"
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white resize-none"
                placeholder="예: 이미지에서 추출된 텍스트를 바탕으로 친절하게 답변해주세요."></textarea>
            </div>
          </div>
        </div>
        
        <!-- 네이버 연동 설정 -->
        <div class="glass rounded-2xl p-6">
          <h2 class="text-lg font-bold flex items-center gap-2 mb-4">
            <i class="fas fa-link gold"></i>
            네이버 연동
          </h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-white/60 mb-2">네이버 톡톡 ID</label>
              <input type="text" id="naver-talktalk-id"
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                placeholder="예: WC92CF">
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-2">네이버 예약 ID</label>
              <input type="text" id="naver-reservation-id"
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                placeholder="네이버 예약 시스템 연동 ID">
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
      document.getElementById('store-name').textContent = store.store_name || '매장 설정';
      document.getElementById('store-name-input').value = store.store_name || '';
      document.getElementById('ai-persona').value = store.ai_persona || '';
      document.getElementById('ai-tone').value = store.ai_tone || 'friendly';
      document.getElementById('greeting-message').value = store.greeting_message || '';
      document.getElementById('system-prompt').value = store.system_prompt || '';
      document.getElementById('business-type').value = store.business_type || 'OTHER';
      document.getElementById('operating-hours-text').value = store.operating_hours || '';
      document.getElementById('menu-data-text').value = store.menu_data || '';
      document.getElementById('naver-talktalk-id').value = store.naver_talktalk_id || '';
      document.getElementById('naver-reservation-id').value = store.naver_reservation_id || '';
      
      // AI 모델 선택
      if (store.ai_model) {
        selectModel(store.ai_model);
      }
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
    
    // 전체 저장
    async function saveAllSettings() {
      const settings = {
        store_name: document.getElementById('store-name-input').value,
        business_type: document.getElementById('business-type').value,
        ai_persona: document.getElementById('ai-persona').value,
        ai_tone: document.getElementById('ai-tone').value,
        greeting_message: document.getElementById('greeting-message').value,
        system_prompt: document.getElementById('system-prompt').value,
        operating_hours: document.getElementById('operating-hours-text').value,
        menu_data: document.getElementById('menu-data-text').value,
        ai_model: document.querySelector('input[name="ai-model"]:checked')?.value || 'gemini',
        naver_talktalk_id: document.getElementById('naver-talktalk-id').value,
        naver_reservation_id: document.getElementById('naver-reservation-id').value,
        ocr_enabled: document.getElementById('ocr-enabled').checked,
        temperature: parseFloat(document.getElementById('temperature').value),
        max_tokens: parseInt(document.getElementById('max-tokens').value)
      };
      
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
  </script>

</body>
</html>
`;
}
