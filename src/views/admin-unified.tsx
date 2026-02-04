// XIVIX AI Core V3.0 - 통합 관리자 페이지
// 모든 설정을 한 화면에서 관리 + 실시간 DB 반영

export function renderUnifiedAdmin(storeId: number): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX 통합 관리자 - V3.0</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; }
    body { background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%); min-height: 100vh; }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius: 4px; }
    .glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
    .gold { color: #D4AF37; }
    .gold-bg { background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%); }
    .section-card { background: rgba(0,0,0,0.4); border: 1px solid rgba(212,175,55,0.2); transition: all 0.3s; }
    .section-card:hover { border-color: rgba(212,175,55,0.5); }
    .input-field { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; }
    .input-field:focus { border-color: #D4AF37; outline: none; }
    .btn-gold { background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%); color: #000; font-weight: 600; }
    .btn-gold:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(212,175,55,0.4); }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; }
    .status-active { background: #22c55e; box-shadow: 0 0 10px #22c55e; }
    .status-paused { background: #ef4444; box-shadow: 0 0 10px #ef4444; }
    .model-card { cursor: pointer; transition: all 0.3s; }
    .model-card.selected { border-color: #D4AF37; background: rgba(212,175,55,0.1); }
    .industry-btn { transition: all 0.2s; }
    .industry-btn:hover { background: rgba(212,175,55,0.2); }
    .industry-btn.selected { background: rgba(212,175,55,0.3); border-color: #D4AF37; }
    textarea { resize: vertical; }
    .toast { position: fixed; bottom: 20px; right: 20px; z-index: 9999; }
  </style>
</head>
<body class="text-white p-4 lg:p-8">
  <div class="max-w-7xl mx-auto">
    
    <!-- 헤더 -->
    <header class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-4">
        <a href="/master" class="text-white/60 hover:text-white">
          <i class="fas fa-arrow-left text-xl"></i>
        </a>
        <div>
          <h1 class="text-2xl lg:text-3xl font-bold">
            <span class="gold">XIVIX</span> 통합 관리자
            <span class="text-sm bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-2 py-0.5 rounded-full ml-2">V3.0</span>
          </h1>
          <p class="text-white/60 text-sm mt-1">매장 ID: <span id="store-id-display">${storeId}</span> | <span id="store-name-display">로딩중...</span></p>
        </div>
      </div>
      
      <div class="flex items-center gap-4">
        <!-- 봇 상태 토글 -->
        <div class="flex items-center gap-3 glass rounded-xl px-4 py-2">
          <span class="text-sm text-white/60">봇 상태</span>
          <div id="bot-status" class="status-dot status-paused"></div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="bot-active-toggle" class="sr-only peer" onchange="toggleBotStatus()">
            <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
        
        <!-- 저장 버튼 -->
        <button onclick="saveAllSettings()" class="btn-gold px-6 py-3 rounded-xl flex items-center gap-2">
          <i class="fas fa-save"></i>
          <span>전체 저장</span>
        </button>
      </div>
    </header>
    
    <!-- 메인 그리드 - 3열 레이아웃 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- 왼쪽: 매장 정보 + AI 모델 -->
      <div class="space-y-6">
        
        <!-- 매장 기본 정보 -->
        <div class="section-card rounded-2xl p-6">
          <h2 class="text-lg font-bold gold mb-4 flex items-center gap-2">
            <i class="fas fa-store"></i>
            매장 정보
          </h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-white/60 mb-1">매장명</label>
              <input type="text" id="store-name" class="w-full input-field px-4 py-3 rounded-xl">
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-1">업종 선택</label>
              <select id="business-type" class="w-full input-field px-4 py-3 rounded-xl" onchange="onIndustryChange()">
                <option value="">-- 업종 선택 --</option>
                <option value="BEAUTY_HAIR_SMALL">1인 미용실</option>
                <option value="BEAUTY_HAIR_LARGE">대형 미용실</option>
                <option value="BEAUTY_SKIN">피부관리실</option>
                <option value="BEAUTY_NAIL">네일아트</option>
                <option value="MEDICAL_DENTAL">치과</option>
                <option value="MEDICAL_OBGYN">산부인과</option>
                <option value="MEDICAL_POSTPARTUM">산후조리원</option>
                <option value="FINANCE_INSURANCE">보험설계사</option>
                <option value="AUTO_USED">중고차딜러</option>
                <option value="AUTO_NEW">신차딜러</option>
                <option value="SERVICE_FREELANCER">프리랜서</option>
                <option value="FOOD_CHICKEN">치킨집</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-1">주소</label>
              <input type="text" id="store-address" class="w-full input-field px-4 py-3 rounded-xl" placeholder="매장 주소">
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-1">전화번호</label>
              <input type="text" id="store-phone" class="w-full input-field px-4 py-3 rounded-xl" placeholder="0507-0000-0000">
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-1">영업시간</label>
              <input type="text" id="operating-hours" class="w-full input-field px-4 py-3 rounded-xl" placeholder="10:00-19:00">
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-1">원장님 연락처 (SMS 알림용)</label>
              <input type="text" id="owner-phone" class="w-full input-field px-4 py-3 rounded-xl" placeholder="010-0000-0000">
            </div>
          </div>
        </div>
        
        <!-- AI 모델 선택 -->
        <div class="section-card rounded-2xl p-6">
          <h2 class="text-lg font-bold gold mb-4 flex items-center gap-2">
            <i class="fas fa-robot"></i>
            AI 모델 선택
          </h2>
          
          <div class="space-y-3">
            <!-- GPT-4o -->
            <div class="model-card p-4 rounded-xl border border-white/10" onclick="selectModel('gpt-4o')" data-model="gpt-4o">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <i class="fas fa-brain text-green-400"></i>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold">GPT-4o <span class="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full ml-1">추천</span></h3>
                  <p class="text-xs text-white/60">최고 품질 | 할루시네이션 최소</p>
                </div>
                <input type="radio" name="ai-model" value="gpt-4o" class="hidden">
                <i class="fas fa-check-circle text-green-400 opacity-0 check-icon"></i>
              </div>
            </div>
            
            <!-- Gemini 2.5 Pro -->
            <div class="model-card p-4 rounded-xl border border-white/10" onclick="selectModel('gemini-pro')" data-model="gemini-pro">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <i class="fas fa-gem text-blue-400"></i>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold">Gemini 2.5 Pro</h3>
                  <p class="text-xs text-white/60">고품질 | 긴 컨텍스트</p>
                </div>
                <input type="radio" name="ai-model" value="gemini-pro" class="hidden">
                <i class="fas fa-check-circle text-blue-400 opacity-0 check-icon"></i>
              </div>
            </div>
            
            <!-- Gemini Flash -->
            <div class="model-card p-4 rounded-xl border border-white/10" onclick="selectModel('gemini')" data-model="gemini">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <i class="fas fa-bolt text-yellow-400"></i>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold">Gemini Flash</h3>
                  <p class="text-xs text-white/60">빠른 응답 | 경제적</p>
                </div>
                <input type="radio" name="ai-model" value="gemini" class="hidden">
                <i class="fas fa-check-circle text-yellow-400 opacity-0 check-icon"></i>
              </div>
            </div>
          </div>
          
          <div class="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <p class="text-xs text-yellow-400">
              <i class="fas fa-lightbulb mr-1"></i>
              <strong>권장:</strong> GPT-4o (할루시네이션 최소, 정확한 가격 안내)
            </p>
          </div>
        </div>
        
        <!-- 네이버 연동 -->
        <div class="section-card rounded-2xl p-6">
          <h2 class="text-lg font-bold gold mb-4 flex items-center gap-2">
            <i class="fab fa-naver"></i>
            네이버 연동
          </h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-white/60 mb-1">톡톡 ID</label>
              <input type="text" id="naver-talktalk-id" class="w-full input-field px-4 py-3 rounded-xl" placeholder="XXXXXX">
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-1">예약 ID</label>
              <input type="text" id="naver-reservation-id" class="w-full input-field px-4 py-3 rounded-xl" placeholder="123456">
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-1">Authorization 토큰</label>
              <input type="text" id="naver-auth-token" class="w-full input-field px-4 py-3 rounded-xl" placeholder="네이버 파트너센터에서 발급">
            </div>
            
            <div class="p-3 bg-white/5 rounded-xl">
              <p class="text-xs text-white/60 mb-2">Webhook URL</p>
              <code class="text-xs text-green-400 break-all">https://xivix-ai-core.pages.dev/v1/naver/callback/${storeId}</code>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 중앙: 시스템 프롬프트 -->
      <div class="space-y-6">
        
        <!-- 프롬프트 자동 생성 -->
        <div class="section-card rounded-2xl p-6">
          <h2 class="text-lg font-bold gold mb-4 flex items-center gap-2">
            <i class="fas fa-magic"></i>
            프롬프트 자동 생성
            <span class="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">GPT-4o → Gemini 검증</span>
          </h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-white/60 mb-1">매장 정보 붙여넣기</label>
              <textarea id="paste-text" rows="4" class="w-full input-field px-4 py-3 rounded-xl text-sm"
                placeholder="네이버 플레이스에서 메뉴/가격/이벤트 정보를 복사해서 붙여넣으세요"></textarea>
            </div>
            
            <button onclick="generatePrompt()" class="w-full btn-gold py-3 rounded-xl flex items-center justify-center gap-2">
              <i class="fas fa-wand-magic-sparkles"></i>
              <span>AI 프롬프트 생성</span>
            </button>
            
            <div id="generate-status" class="hidden">
              <div class="flex items-center gap-2 text-sm">
                <div class="animate-spin w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
                <span id="generate-text">생성 중...</span>
              </div>
              <div class="w-full bg-white/10 rounded-full h-2 mt-2">
                <div id="generate-progress" class="bg-yellow-400 h-2 rounded-full transition-all" style="width: 0%"></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 시스템 프롬프트 -->
        <div class="section-card rounded-2xl p-6">
          <h2 class="text-lg font-bold gold mb-4 flex items-center gap-2">
            <i class="fas fa-code"></i>
            시스템 프롬프트
          </h2>
          
          <textarea id="system-prompt" rows="20" class="w-full input-field px-4 py-3 rounded-xl text-sm font-mono"
            placeholder="AI의 역할, 응대 방식, 주의사항 등을 입력하세요"></textarea>
          
          <div class="flex gap-2 mt-4">
            <button onclick="loadIndustryTemplate()" class="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm">
              <i class="fas fa-file-import mr-1"></i>업종 템플릿 불러오기
            </button>
            <button onclick="clearPrompt()" class="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 오른쪽: 메뉴 + 이벤트 + 테스트 -->
      <div class="space-y-6">
        
        <!-- 기본 메뉴/가격 -->
        <div class="section-card rounded-2xl p-6">
          <h2 class="text-lg font-bold gold mb-4 flex items-center gap-2">
            <i class="fas fa-list"></i>
            기본 메뉴/가격
            <span class="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">가격문의 시 표시</span>
          </h2>
          
          <textarea id="menu-data" rows="10" class="w-full input-field px-4 py-3 rounded-xl text-sm"
            placeholder="예시:
학생커트 - 15,000원
남성커트 - 18,000원
여성커트 - 22,000원
디지털펌 - 100,000원~"></textarea>
        </div>
        
        <!-- 이벤트/할인 -->
        <div class="section-card rounded-2xl p-6">
          <h2 class="text-lg font-bold gold mb-4 flex items-center gap-2">
            <i class="fas fa-gift"></i>
            이벤트/할인 정보
            <span class="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">이벤트문의 시 표시</span>
          </h2>
          
          <textarea id="events-data" rows="8" class="w-full input-field px-4 py-3 rounded-xl text-sm"
            placeholder="예시:
🎁 첫 방문 30% 할인

[원장님 이벤트]
- 펌 + 클리닉: 220,000원 → 190,000원
- 염색 + 트리트먼트: 150,000원 → 120,000원"></textarea>
        </div>
        
        <!-- 실시간 테스트 -->
        <div class="section-card rounded-2xl p-6">
          <h2 class="text-lg font-bold gold mb-4 flex items-center gap-2">
            <i class="fas fa-vial"></i>
            실시간 테스트
          </h2>
          
          <div class="space-y-3">
            <div class="flex gap-2">
              <input type="text" id="test-message" class="flex-1 input-field px-4 py-2 rounded-xl text-sm" placeholder="테스트 메시지 입력">
              <button onclick="testChat()" class="px-4 py-2 btn-gold rounded-xl">
                <i class="fas fa-paper-plane"></i>
              </button>
            </div>
            
            <div id="test-result" class="hidden p-4 bg-white/5 rounded-xl">
              <p class="text-xs text-white/60 mb-2">AI 응답:</p>
              <p id="test-response" class="text-sm"></p>
              <p class="text-xs text-white/40 mt-2">
                모델: <span id="test-model"></span> | 시간: <span id="test-time"></span>ms
              </p>
            </div>
            
            <div class="grid grid-cols-2 gap-2">
              <button onclick="quickTest('가격문의')" class="py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs">가격문의</button>
              <button onclick="quickTest('이벤트')" class="py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs">이벤트</button>
              <button onclick="quickTest('예약')" class="py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs">예약</button>
              <button onclick="quickTest('영업시간')" class="py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs">영업시간</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 하단: 고급 설정 -->
    <div class="mt-6 section-card rounded-2xl p-6">
      <h2 class="text-lg font-bold gold mb-4 flex items-center gap-2">
        <i class="fas fa-cog"></i>
        고급 설정
      </h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <label class="block text-sm text-white/60 mb-1">Temperature (창의성)</label>
          <input type="range" id="temperature" min="0" max="1" step="0.1" value="0.7" class="w-full" oninput="document.getElementById('temp-value').textContent = this.value">
          <div class="flex justify-between text-xs text-white/40 mt-1">
            <span>정확함 0</span>
            <span id="temp-value">0.7</span>
            <span>창의적 1</span>
          </div>
        </div>
        
        <div>
          <label class="block text-sm text-white/60 mb-1">Max Tokens</label>
          <input type="number" id="max-tokens" value="1024" class="w-full input-field px-4 py-2 rounded-xl">
        </div>
        
        <div>
          <label class="block text-sm text-white/60 mb-1">인사말</label>
          <input type="text" id="greeting-message" class="w-full input-field px-4 py-2 rounded-xl" placeholder="안녕하세요! 무엇을 도와드릴까요?">
        </div>
        
        <div>
          <label class="block text-sm text-white/60 mb-1">금지 키워드 (쉼표 구분)</label>
          <input type="text" id="forbidden-keywords" class="w-full input-field px-4 py-2 rounded-xl" placeholder="100%, 보장, 확실히">
        </div>
      </div>
    </div>
  </div>
  
  <!-- Toast 알림 -->
  <div id="toast-container" class="toast"></div>
  
  <script>
    const STORE_ID = ${storeId};
    let storeData = {};
    let selectedModel = 'gpt-4o';
    
    // 초기화
    document.addEventListener('DOMContentLoaded', () => {
      loadStoreData();
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
        showToast('데이터 로드 실패', 'error');
      }
    }
    
    // 폼에 데이터 채우기
    function populateForm(store) {
      document.getElementById('store-name-display').textContent = store.store_name || '새 매장';
      document.getElementById('store-name').value = store.store_name || '';
      document.getElementById('business-type').value = store.business_type || '';
      document.getElementById('store-address').value = store.address || '';
      document.getElementById('store-phone').value = store.phone || '';
      document.getElementById('operating-hours').value = store.operating_hours || '';
      document.getElementById('owner-phone').value = store.owner_phone || '';
      document.getElementById('system-prompt').value = store.system_prompt || '';
      document.getElementById('menu-data').value = store.menu_data || '';
      document.getElementById('events-data').value = store.events_data || '';
      document.getElementById('naver-talktalk-id').value = store.naver_talktalk_id || '';
      document.getElementById('naver-reservation-id').value = store.naver_reservation_id || '';
      document.getElementById('greeting-message').value = store.greeting_message || '';
      document.getElementById('forbidden-keywords').value = store.forbidden_keywords || '';
      document.getElementById('temperature').value = store.temperature || 0.7;
      document.getElementById('temp-value').textContent = store.temperature || 0.7;
      document.getElementById('max-tokens').value = store.max_tokens || 1024;
      
      // 봇 상태
      const isActive = store.is_active === 1 || store.is_active === true;
      document.getElementById('bot-active-toggle').checked = isActive;
      document.getElementById('bot-status').className = 'status-dot ' + (isActive ? 'status-active' : 'status-paused');
      
      // AI 모델
      selectModel(store.ai_model || 'gpt-4o');
      
      // 톡톡 토큰 로드
      loadNaverToken();
    }
    
    // 네이버 토큰 로드
    async function loadNaverToken() {
      try {
        const res = await fetch('/api/stores/' + STORE_ID + '/talktalk/config');
        const data = await res.json();
        if (data.success && data.data && data.data.accessToken) {
          document.getElementById('naver-auth-token').value = '●●●●●●●●●●●●';
        }
      } catch (err) {}
    }
    
    // AI 모델 선택
    function selectModel(model) {
      selectedModel = model;
      document.querySelectorAll('.model-card').forEach(card => {
        const isSelected = card.dataset.model === model;
        card.classList.toggle('selected', isSelected);
        card.querySelector('.check-icon').style.opacity = isSelected ? '1' : '0';
        card.querySelector('input[type="radio"]').checked = isSelected;
      });
    }
    
    // 봇 상태 토글
    async function toggleBotStatus() {
      const isActive = document.getElementById('bot-active-toggle').checked;
      document.getElementById('bot-status').className = 'status-dot ' + (isActive ? 'status-active' : 'status-paused');
      
      try {
        await fetch('/api/stores/' + STORE_ID + '/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: isActive ? 1 : 0 })
        });
        showToast(isActive ? '봇 활성화됨' : '봇 비활성화됨', 'success');
      } catch (err) {
        showToast('상태 변경 실패', 'error');
      }
    }
    
    // 전체 저장
    async function saveAllSettings() {
      const settings = {
        store_name: document.getElementById('store-name').value,
        business_type: document.getElementById('business-type').value,
        address: document.getElementById('store-address').value,
        phone: document.getElementById('store-phone').value,
        operating_hours: document.getElementById('operating-hours').value,
        owner_phone: document.getElementById('owner-phone').value,
        system_prompt: document.getElementById('system-prompt').value,
        menu_data: document.getElementById('menu-data').value,
        events_data: document.getElementById('events-data').value,
        naver_talktalk_id: document.getElementById('naver-talktalk-id').value,
        naver_reservation_id: document.getElementById('naver-reservation-id').value,
        greeting_message: document.getElementById('greeting-message').value,
        forbidden_keywords: document.getElementById('forbidden-keywords').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        max_tokens: parseInt(document.getElementById('max-tokens').value),
        ai_model: selectedModel
      };
      
      try {
        const res = await fetch('/api/stores/' + STORE_ID + '/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        });
        
        const data = await res.json();
        if (data.success) {
          showToast('저장 완료! 변경사항이 즉시 반영됩니다.', 'success');
          
          // 네이버 토큰 저장
          const authToken = document.getElementById('naver-auth-token').value;
          if (authToken && !authToken.includes('●')) {
            await saveNaverToken(authToken);
          }
        } else {
          showToast('저장 실패: ' + (data.error || '알 수 없는 오류'), 'error');
        }
      } catch (err) {
        showToast('저장 실패', 'error');
      }
    }
    
    // 네이버 토큰 저장
    async function saveNaverToken(token) {
      try {
        await fetch('/api/stores/' + STORE_ID + '/talktalk/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partner_id: document.getElementById('naver-talktalk-id').value,
            account_id: document.getElementById('naver-talktalk-id').value,
            access_token: token
          })
        });
      } catch (err) {}
    }
    
    // 프롬프트 자동 생성
    async function generatePrompt() {
      const text = document.getElementById('paste-text').value.trim();
      if (!text || text.length < 10) {
        showToast('매장 정보를 입력해주세요 (최소 10자)', 'error');
        return;
      }
      
      const statusDiv = document.getElementById('generate-status');
      const statusText = document.getElementById('generate-text');
      const progressBar = document.getElementById('generate-progress');
      
      statusDiv.classList.remove('hidden');
      statusText.textContent = '🤖 GPT-4o가 데이터 구조화 중...';
      progressBar.style.width = '30%';
      
      try {
        const res = await fetch('/api/stores/' + STORE_ID + '/generate-prompt-pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText: text,
            storeName: document.getElementById('store-name').value || '매장',
            businessType: document.getElementById('business-type').value
          })
        });
        
        statusText.textContent = '✨ Gemini 2.5 Pro가 검증 중...';
        progressBar.style.width = '70%';
        
        const responseText = await res.text();
        const data = JSON.parse(responseText);
        
        progressBar.style.width = '100%';
        
        if (data.success) {
          const result = data.data;
          if (result.systemPrompt) document.getElementById('system-prompt').value = result.systemPrompt;
          if (result.menuText) document.getElementById('menu-data').value = result.menuText;
          if (result.eventsText) document.getElementById('events-data').value = result.eventsText;
          
          statusText.textContent = '✅ 생성 완료!';
          showToast('프롬프트 생성 완료! [전체 저장]을 눌러 적용하세요.', 'success');
        } else {
          showToast('생성 실패: ' + (data.error || '알 수 없는 오류'), 'error');
        }
      } catch (err) {
        showToast('생성 실패: ' + err.message, 'error');
      } finally {
        setTimeout(() => {
          statusDiv.classList.add('hidden');
          progressBar.style.width = '0%';
        }, 2000);
      }
    }
    
    // 업종 템플릿 불러오기
    async function loadIndustryTemplate() {
      const businessType = document.getElementById('business-type').value;
      if (!businessType) {
        showToast('먼저 업종을 선택해주세요', 'error');
        return;
      }
      
      try {
        const res = await fetch('/api/templates/industry/' + businessType);
        const data = await res.json();
        if (data.success && data.data) {
          document.getElementById('system-prompt').value = data.data.system_prompt || '';
          showToast('업종 템플릿이 적용되었습니다', 'success');
        }
      } catch (err) {
        showToast('템플릿 로드 실패', 'error');
      }
    }
    
    // 업종 변경 시
    function onIndustryChange() {
      const businessType = document.getElementById('business-type').value;
      if (businessType && !document.getElementById('system-prompt').value) {
        loadIndustryTemplate();
      }
    }
    
    // 프롬프트 초기화
    function clearPrompt() {
      if (confirm('시스템 프롬프트를 초기화하시겠습니까?')) {
        document.getElementById('system-prompt').value = '';
        showToast('프롬프트가 초기화되었습니다', 'success');
      }
    }
    
    // 실시간 테스트
    async function testChat() {
      const message = document.getElementById('test-message').value.trim();
      if (!message) {
        showToast('테스트 메시지를 입력해주세요', 'error');
        return;
      }
      
      const resultDiv = document.getElementById('test-result');
      const responseEl = document.getElementById('test-response');
      const modelEl = document.getElementById('test-model');
      const timeEl = document.getElementById('test-time');
      
      responseEl.textContent = '응답 생성 중...';
      resultDiv.classList.remove('hidden');
      
      const startTime = Date.now();
      
      try {
        const res = await fetch('/api/chat/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: STORE_ID,
            message: message,
            ai_model: selectedModel
          })
        });
        
        const data = await res.json();
        const elapsed = Date.now() - startTime;
        
        if (data.response) {
          responseEl.textContent = data.response;
          modelEl.textContent = data.model || selectedModel;
          timeEl.textContent = elapsed;
        } else {
          responseEl.textContent = '응답 생성 실패';
        }
      } catch (err) {
        responseEl.textContent = '오류: ' + err.message;
      }
    }
    
    // 빠른 테스트
    function quickTest(keyword) {
      document.getElementById('test-message').value = keyword;
      testChat();
    }
    
    // 토스트 알림
    function showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      
      const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
      };
      
      toast.className = colors[type] + ' text-white px-6 py-3 rounded-xl shadow-lg mb-2 animate-pulse';
      toast.textContent = message;
      container.appendChild(toast);
      
      setTimeout(() => toast.remove(), 3000);
    }
  </script>
</body>
</html>
`;
}
