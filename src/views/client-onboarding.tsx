// XIVIX AI Core V1.0 - 고객용 30초 연동 페이지
// Zero-Touch Onboarding: 사장님은 클릭 한 번만!

export function renderClientOnboarding(storeId?: number): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX - AI 지배인 연동</title>
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
    .step-card:hover { transform: translateY(-2px); }
    .step-card.active { border-color: #D4AF37; background: rgba(212, 175, 55, 0.05); }
    .step-card.completed { border-color: #10B981; background: rgba(16, 185, 129, 0.05); }
    .progress-bar { transition: width 0.5s ease; }
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
      <p class="text-white/60">30초만에 AI 상담사를 매장에 배치하세요</p>
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
      
      <!-- Step 1: 매니저 초대 안내 -->
      <div id="step-1" class="step-content">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/20 mb-4">
            <i class="fas fa-user-plus text-2xl text-green-400"></i>
          </div>
          <h2 class="text-xl font-bold mb-2">매니저 초대하기</h2>
          <p class="text-white/60 text-sm">네이버 톡톡에서 XIVIX를 매니저로 초대해주세요</p>
        </div>
        
        <!-- 초대 계정 -->
        <div class="glass rounded-xl p-4 mb-4">
          <p class="text-xs text-white/40 mb-2">초대할 XIVIX 계정</p>
          <div class="flex items-center gap-3">
            <div class="flex-1 bg-white/5 rounded-lg px-4 py-3 font-mono text-lg gold">
              partner@xivix.kr
            </div>
            <button onclick="copyAccount()" class="px-4 py-3 gold-bg text-black rounded-lg font-medium hover:opacity-90 transition-all" id="copy-btn">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
        
        <!-- 간단 가이드 -->
        <div class="glass rounded-xl p-4 mb-6">
          <p class="text-xs text-white/40 mb-3">초대 방법</p>
          <div class="space-y-2 text-sm">
            <div class="flex items-start gap-3">
              <span class="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0">1</span>
              <span class="text-white/70">네이버 톡톡 파트너센터 접속</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0">2</span>
              <span class="text-white/70">설정 → 매니저 관리 메뉴</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0">3</span>
              <span class="text-white/70">위 계정을 매니저로 초대</span>
            </div>
          </div>
        </div>
        
        <button onclick="goToStep(2)" class="w-full py-4 gold-bg text-black rounded-xl font-bold text-lg hover:opacity-90 transition-all">
          초대 완료했어요 <i class="fas fa-arrow-right ml-2"></i>
        </button>
        
        <a href="https://partner.talk.naver.com" target="_blank" class="block text-center text-sm text-white/40 hover:text-white/60 mt-4">
          <i class="fas fa-external-link-alt mr-1"></i>
          파트너센터 바로가기
        </a>
      </div>
      
      <!-- Step 2: 매장 정보 입력 (최소한만) -->
      <div id="step-2" class="step-content hidden">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 mb-4">
            <i class="fas fa-store text-2xl text-blue-400"></i>
          </div>
          <h2 class="text-xl font-bold mb-2">매장 정보</h2>
          <p class="text-white/60 text-sm">AI가 손님을 응대할 때 사용할 기본 정보예요</p>
        </div>
        
        <div class="space-y-4 mb-6">
          <div>
            <label class="block text-sm text-white/60 mb-2">매장 이름 <span class="text-red-400">*</span></label>
            <input type="text" id="store-name" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37] transition-all" placeholder="예: 뷰티플 헤어샵">
          </div>
          <div>
            <label class="block text-sm text-white/60 mb-2">사장님 성함 <span class="text-red-400">*</span></label>
            <input type="text" id="owner-name" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37] transition-all" placeholder="예: 홍길동">
          </div>
          <div>
            <label class="block text-sm text-white/60 mb-2">연락처 <span class="text-red-400">*</span></label>
            <input type="tel" id="owner-phone" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37] transition-all" placeholder="예: 010-1234-5678">
          </div>
          <div>
            <label class="block text-sm text-white/60 mb-2">업종</label>
            <select id="business-type" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-all">
              <option value="beauty">미용실/헤어샵</option>
              <option value="skincare">피부관리/에스테틱</option>
              <option value="nail">네일샵</option>
              <option value="restaurant">음식점/카페</option>
              <option value="fitness">피트니스/요가</option>
              <option value="medical">병원/의원</option>
              <option value="other">기타</option>
            </select>
          </div>
        </div>
        
        <div class="flex gap-3">
          <button onclick="goToStep(1)" class="flex-1 py-4 glass rounded-xl font-medium hover:bg-white/5 transition-all">
            <i class="fas fa-arrow-left mr-2"></i> 이전
          </button>
          <button onclick="goToStep(3)" class="flex-[2] py-4 gold-bg text-black rounded-xl font-bold hover:opacity-90 transition-all">
            다음 <i class="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>
      
      <!-- Step 3: 연동 요청 -->
      <div id="step-3" class="step-content hidden">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/20 mb-4 pulse-gold">
            <i class="fas fa-magic text-2xl text-purple-400"></i>
          </div>
          <h2 class="text-xl font-bold mb-2">연동 요청하기</h2>
          <p class="text-white/60 text-sm">버튼 하나면 끝! XIVIX 전문가가 30분 내에 세팅해드립니다</p>
        </div>
        
        <!-- 입력 정보 요약 -->
        <div class="glass rounded-xl p-4 mb-6">
          <p class="text-xs text-white/40 mb-3">입력하신 정보</p>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-white/60">매장명</span>
              <span class="font-medium" id="summary-store"></span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/60">사장님</span>
              <span class="font-medium" id="summary-owner"></span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/60">연락처</span>
              <span class="font-medium" id="summary-phone"></span>
            </div>
          </div>
        </div>
        
        <!-- 안내 문구 -->
        <div class="glass rounded-xl p-4 mb-6 border border-emerald-500/30 bg-emerald-500/5">
          <div class="flex items-start gap-3">
            <i class="fas fa-check-circle text-emerald-400 mt-0.5"></i>
            <div class="text-sm">
              <p class="text-white/80 mb-1">연동 요청 후 진행 과정</p>
              <p class="text-white/50">XIVIX 전문가가 매니저 권한을 확인하고, AI 상담사를 매장에 맞게 세팅한 뒤 카카오톡으로 완료 안내를 드립니다.</p>
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
      
      <!-- Step 4: 완료 (요청 후) -->
      <div id="step-4" class="step-content hidden">
        <div class="text-center py-8">
          <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 mb-6">
            <i class="fas fa-check text-4xl text-emerald-400"></i>
          </div>
          <h2 class="text-2xl font-bold mb-3">연동 요청 완료!</h2>
          <p class="text-white/60 mb-6">XIVIX 전문가가 곧 연락드릴게요<br>보통 30분 이내에 세팅이 완료됩니다</p>
          
          <!-- 진행 상태 -->
          <div class="glass rounded-xl p-4 mb-6">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-white/60">진행 상태</span>
              <span class="text-sm gold" id="status-text">대기 중</span>
            </div>
            <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div class="progress-bar h-full gold-bg rounded-full" style="width: 10%" id="progress-bar"></div>
            </div>
            <p class="text-xs text-white/40 mt-2" id="status-detail">XIVIX 지배인이 매장에 접속 준비 중...</p>
          </div>
          
          <div class="glass rounded-xl p-4">
            <p class="text-sm text-white/60 mb-2">문의가 필요하시면</p>
            <a href="tel:010-0000-0000" class="text-lg gold font-medium">
              <i class="fas fa-phone mr-2"></i>010-0000-0000
            </a>
          </div>
        </div>
      </div>
      
    </div>
    
    <!-- Footer -->
    <p class="text-center text-white/30 text-sm mt-6">
      © 2026 XIVIX. AI가 매장을 관리합니다.
    </p>
    
  </div>
  
  <script>
    let currentStep = 1;
    
    function goToStep(step) {
      // Validate before moving forward
      if (step === 3 && currentStep === 2) {
        const storeName = document.getElementById('store-name').value.trim();
        const ownerName = document.getElementById('owner-name').value.trim();
        const ownerPhone = document.getElementById('owner-phone').value.trim();
        
        if (!storeName || !ownerName || !ownerPhone) {
          alert('모든 필수 항목을 입력해주세요.');
          return;
        }
        
        // Update summary
        document.getElementById('summary-store').textContent = storeName;
        document.getElementById('summary-owner').textContent = ownerName;
        document.getElementById('summary-phone').textContent = ownerPhone;
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
      document.getElementById('step-label').textContent = step + ' / 3 단계';
    }
    
    function copyAccount() {
      navigator.clipboard.writeText('partner@xivix.kr').then(() => {
        const btn = document.getElementById('copy-btn');
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.classList.add('bg-emerald-500');
        setTimeout(() => {
          btn.innerHTML = '<i class="fas fa-copy"></i>';
          btn.classList.remove('bg-emerald-500');
        }, 2000);
      });
    }
    
    async function submitRequest() {
      const btn = document.getElementById('submit-btn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 요청 중...';
      
      const data = {
        store_name: document.getElementById('store-name').value.trim(),
        owner_name: document.getElementById('owner-name').value.trim(),
        owner_phone: document.getElementById('owner-phone').value.trim(),
        business_type: document.getElementById('business-type').value,
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
          
          // Simulate progress
          simulateProgress();
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
    
    function simulateProgress() {
      const steps = [
        { progress: 20, text: '대기 중', detail: 'XIVIX 전문가에게 알림을 보냈습니다...' },
        { progress: 40, text: '확인 중', detail: 'XIVIX 전문가가 요청을 확인하고 있습니다...' },
      ];
      
      let i = 0;
      const interval = setInterval(() => {
        if (i < steps.length) {
          document.getElementById('progress-bar').style.width = steps[i].progress + '%';
          document.getElementById('status-text').textContent = steps[i].text;
          document.getElementById('status-detail').textContent = steps[i].detail;
          i++;
        } else {
          clearInterval(interval);
        }
      }, 3000);
    }
  </script>
</body>
</html>
  `;
}
