// XIVIX AI Core - 설정 변경 요청 페이지
// 사장님이 마스터에게 설정 변경을 요청하는 간단한 폼

export function renderRequestPage(): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>설정 변경 요청 - XIVIX</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; }
    body { background: #0a0a0a; }
    .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .gold { color: #D4AF37; }
    .gold-bg { background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%); }
    .input-field {
      width: 100%;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: white;
      font-size: 15px;
      transition: all 0.2s;
    }
    .input-field:focus {
      outline: none;
      border-color: #D4AF37;
      background: rgba(255, 255, 255, 0.08);
    }
    .input-field::placeholder { color: rgba(255, 255, 255, 0.3); }
    textarea.input-field { resize: none; min-height: 120px; }
    .btn-primary {
      background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%);
      color: #000;
      font-weight: 600;
      padding: 14px 24px;
      border-radius: 12px;
      transition: all 0.2s;
    }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .request-type-btn {
      padding: 12px 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.03);
      color: rgba(255, 255, 255, 0.6);
      transition: all 0.2s;
      cursor: pointer;
    }
    .request-type-btn:hover { border-color: rgba(212, 175, 55, 0.3); }
    .request-type-btn.active {
      border-color: #D4AF37;
      background: rgba(212, 175, 55, 0.1);
      color: #D4AF37;
    }
  </style>
</head>
<body class="min-h-screen text-white">

  <!-- Header -->
  <header class="glass border-b border-white/10">
    <div class="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
      <a href="/" class="text-white/60 hover:text-white">
        <i class="fas fa-arrow-left"></i>
      </a>
      <div class="w-10 h-10 rounded-xl gold-bg flex items-center justify-center">
        <i class="fas fa-paper-plane text-black"></i>
      </div>
      <div>
        <h1 class="text-xl font-bold">설정 변경 요청</h1>
        <p class="text-xs text-white/40">XIVIX AI 설정 변경 요청</p>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-2xl mx-auto px-6 py-8">
    
    <!-- Step 1: 본인 확인 -->
    <div id="step-1" class="glass rounded-2xl p-6 mb-6">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-8 h-8 rounded-full gold-bg flex items-center justify-center text-black font-bold text-sm">1</div>
        <h2 class="text-lg font-bold">본인 확인</h2>
      </div>
      
      <p class="text-white/60 text-sm mb-4">
        등록된 매장 정보로 본인 확인을 진행합니다.
      </p>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-white/60 mb-2">
            <i class="fas fa-comment-dots mr-1"></i>네이버 톡톡 ID
          </label>
          <input type="text" id="talktalk-id" class="input-field" placeholder="예: @더본라이프">
        </div>
        
        <div class="text-center text-white/40 text-sm">또는</div>
        
        <div>
          <label class="block text-sm text-white/60 mb-2">
            <i class="fas fa-phone mr-1"></i>등록된 전화번호
          </label>
          <input type="tel" id="owner-phone" class="input-field" placeholder="010-0000-0000">
        </div>
        
        <button onclick="verifyOwner()" id="verify-btn" class="w-full btn-primary flex items-center justify-center gap-2">
          <i class="fas fa-search"></i>
          매장 찾기
        </button>
      </div>
      
      <!-- 매장 확인 결과 -->
      <div id="store-result" class="hidden mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
        <div class="flex items-center gap-3">
          <i class="fas fa-check-circle text-green-400 text-xl"></i>
          <div>
            <p class="font-medium" id="store-name-display">매장명</p>
            <p class="text-sm text-white/60" id="store-info-display">업종 · 상태</p>
          </div>
        </div>
      </div>
      
      <!-- 매장 없음 -->
      <div id="store-not-found" class="hidden mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
        <div class="flex items-center gap-3">
          <i class="fas fa-exclamation-circle text-red-400 text-xl"></i>
          <div>
            <p class="font-medium">매장을 찾을 수 없습니다</p>
            <p class="text-sm text-white/60">톡톡 ID 또는 전화번호를 확인해주세요</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Step 2: 요청 내용 (매장 확인 후 표시) -->
    <div id="step-2" class="glass rounded-2xl p-6 mb-6 opacity-50 pointer-events-none">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold text-sm" id="step-2-badge">2</div>
        <h2 class="text-lg font-bold">요청 내용</h2>
      </div>
      
      <!-- 요청 유형 선택 -->
      <div class="mb-6">
        <label class="block text-sm text-white/60 mb-3">요청 유형</label>
        <div class="grid grid-cols-2 gap-3" id="request-types">
          <button type="button" class="request-type-btn" data-type="prompt" onclick="selectRequestType('prompt')">
            <i class="fas fa-robot mr-2"></i>AI 응대 변경
          </button>
          <button type="button" class="request-type-btn" data-type="hours" onclick="selectRequestType('hours')">
            <i class="fas fa-clock mr-2"></i>영업시간 수정
          </button>
          <button type="button" class="request-type-btn" data-type="menu" onclick="selectRequestType('menu')">
            <i class="fas fa-utensils mr-2"></i>메뉴/가격 변경
          </button>
          <button type="button" class="request-type-btn" data-type="info" onclick="selectRequestType('info')">
            <i class="fas fa-info-circle mr-2"></i>매장 정보 수정
          </button>
          <button type="button" class="request-type-btn" data-type="pause" onclick="selectRequestType('pause')">
            <i class="fas fa-pause mr-2"></i>AI 일시 중지
          </button>
          <button type="button" class="request-type-btn" data-type="other" onclick="selectRequestType('other')">
            <i class="fas fa-ellipsis-h mr-2"></i>기타 요청
          </button>
        </div>
      </div>
      
      <!-- 요청 상세 내용 -->
      <div class="mb-6">
        <label class="block text-sm text-white/60 mb-2">
          <i class="fas fa-edit mr-1"></i>상세 내용 <span class="text-red-400">*</span>
        </label>
        <textarea id="request-content" class="input-field" placeholder="변경하고 싶은 내용을 자세히 적어주세요.

예시:
- AI 인사말을 '안녕하세요! OO입니다'로 변경해주세요
- 영업시간을 10:00~22:00으로 수정해주세요
- 새 메뉴 '아메리카노 4,500원' 추가해주세요"></textarea>
        <p class="text-xs text-white/40 mt-2">
          <i class="fas fa-lightbulb mr-1"></i>
          구체적으로 적어주시면 빠른 처리가 가능합니다
        </p>
      </div>
      
      <!-- 연락 가능 시간 (선택) -->
      <div class="mb-6">
        <label class="block text-sm text-white/60 mb-2">
          <i class="fas fa-phone-alt mr-1"></i>연락 가능 시간 (선택)
        </label>
        <input type="text" id="contact-time" class="input-field" placeholder="예: 오후 2시~6시 / 언제든 가능">
      </div>
      
      <!-- 제출 버튼 -->
      <button onclick="submitRequest()" id="submit-btn" class="w-full btn-primary flex items-center justify-center gap-2" disabled>
        <i class="fas fa-paper-plane"></i>
        요청 보내기
      </button>
    </div>
    
    <!-- 완료 메시지 (제출 후 표시) -->
    <div id="success-message" class="hidden glass rounded-2xl p-8 text-center">
      <div class="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
        <i class="fas fa-check text-4xl text-green-400"></i>
      </div>
      <h2 class="text-2xl font-bold mb-2">요청이 전송되었습니다!</h2>
      <p class="text-white/60 mb-6">
        담당자가 확인 후 빠르게 처리해드리겠습니다.<br>
        보통 <strong class="gold">24시간 이내</strong>에 처리됩니다.
      </p>
      <div class="flex gap-3 justify-center">
        <a href="/" class="px-6 py-3 bg-white/10 rounded-xl hover:bg-white/15 transition-all">
          <i class="fas fa-home mr-2"></i>홈으로
        </a>
        <button onclick="resetForm()" class="px-6 py-3 bg-white/10 rounded-xl hover:bg-white/15 transition-all">
          <i class="fas fa-plus mr-2"></i>추가 요청
        </button>
      </div>
    </div>
    
    <!-- 안내 문구 -->
    <div class="text-center text-white/40 text-sm mt-8">
      <p>급한 문의는 <a href="tel:010-3988-0124" class="gold hover:underline">010-3988-0124</a>로 연락주세요</p>
    </div>
    
  </main>

  <script>
    let verifiedStore = null;
    let selectedRequestType = null;
    
    // 매장 찾기
    async function verifyOwner() {
      const talktalkId = document.getElementById('talktalk-id').value.trim();
      const ownerPhone = document.getElementById('owner-phone').value.trim();
      
      if (!talktalkId && !ownerPhone) {
        alert('톡톡 ID 또는 전화번호를 입력해주세요.');
        return;
      }
      
      const btn = document.getElementById('verify-btn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>확인 중...';
      
      try {
        const res = await fetch('/api/request/verify-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            talktalk_id: talktalkId,
            phone: ownerPhone
          })
        });
        
        const data = await res.json();
        
        if (data.success && data.data) {
          verifiedStore = data.data;
          
          // 매장 정보 표시
          document.getElementById('store-name-display').textContent = data.data.store_name;
          document.getElementById('store-info-display').textContent = 
            (data.data.business_type_name || '매장') + ' · ' + (data.data.is_active ? '운영 중' : '준비 중');
          
          document.getElementById('store-result').classList.remove('hidden');
          document.getElementById('store-not-found').classList.add('hidden');
          
          // Step 2 활성화
          const step2 = document.getElementById('step-2');
          step2.classList.remove('opacity-50', 'pointer-events-none');
          document.getElementById('step-2-badge').classList.remove('bg-white/10', 'text-white/60');
          document.getElementById('step-2-badge').classList.add('gold-bg', 'text-black');
          
        } else {
          document.getElementById('store-result').classList.add('hidden');
          document.getElementById('store-not-found').classList.remove('hidden');
          verifiedStore = null;
        }
      } catch (err) {
        alert('오류가 발생했습니다. 다시 시도해주세요.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-search mr-2"></i>매장 찾기';
      }
    }
    
    // 요청 유형 선택
    function selectRequestType(type) {
      selectedRequestType = type;
      
      document.querySelectorAll('.request-type-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      document.querySelector(\`[data-type="\${type}"]\`).classList.add('active');
      
      updateSubmitButton();
    }
    
    // 제출 버튼 상태 업데이트
    function updateSubmitButton() {
      const content = document.getElementById('request-content').value.trim();
      const btn = document.getElementById('submit-btn');
      btn.disabled = !verifiedStore || !selectedRequestType || !content;
    }
    
    // 요청 제출
    async function submitRequest() {
      if (!verifiedStore || !selectedRequestType) {
        alert('매장 확인과 요청 유형 선택을 완료해주세요.');
        return;
      }
      
      const content = document.getElementById('request-content').value.trim();
      if (!content) {
        alert('요청 내용을 입력해주세요.');
        return;
      }
      
      const btn = document.getElementById('submit-btn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>전송 중...';
      
      try {
        const res = await fetch('/api/request/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: verifiedStore.id,
            store_name: verifiedStore.store_name,
            request_type: selectedRequestType,
            content: content,
            contact_time: document.getElementById('contact-time').value.trim()
          })
        });
        
        const data = await res.json();
        
        if (data.success) {
          // 성공 화면 표시
          document.getElementById('step-1').classList.add('hidden');
          document.getElementById('step-2').classList.add('hidden');
          document.getElementById('success-message').classList.remove('hidden');
        } else {
          alert('요청 전송에 실패했습니다: ' + (data.error || '알 수 없는 오류'));
        }
      } catch (err) {
        alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>요청 보내기';
      }
    }
    
    // 폼 초기화
    function resetForm() {
      verifiedStore = null;
      selectedRequestType = null;
      
      document.getElementById('talktalk-id').value = '';
      document.getElementById('owner-phone').value = '';
      document.getElementById('request-content').value = '';
      document.getElementById('contact-time').value = '';
      
      document.getElementById('store-result').classList.add('hidden');
      document.getElementById('store-not-found').classList.add('hidden');
      
      const step2 = document.getElementById('step-2');
      step2.classList.add('opacity-50', 'pointer-events-none');
      document.getElementById('step-2-badge').classList.add('bg-white/10', 'text-white/60');
      document.getElementById('step-2-badge').classList.remove('gold-bg', 'text-black');
      
      document.querySelectorAll('.request-type-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      
      document.getElementById('step-1').classList.remove('hidden');
      document.getElementById('step-2').classList.remove('hidden');
      document.getElementById('success-message').classList.add('hidden');
      
      updateSubmitButton();
    }
    
    // 내용 입력 감지
    document.getElementById('request-content').addEventListener('input', updateSubmitButton);
  </script>

</body>
</html>
`;
}
