// XIVIX AI Core V1.0 - 고객용 30초 연동 페이지
// Zero-Touch Onboarding: 사장님은 클릭 한 번만!
// 최종 설계서 v2026.01.21 반영

export function renderClientOnboarding(storeId?: number): string {
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
    .step-card:hover { transform: translateY(-2px); }
    .step-card.active { border-color: #D4AF37; background: rgba(212, 175, 55, 0.05); }
    .step-card.completed { border-color: #10B981; background: rgba(16, 185, 129, 0.05); }
    .progress-bar { transition: width 0.5s ease; }
    .guide-image { 
      border: 2px solid rgba(212, 175, 55, 0.3); 
      border-radius: 12px; 
      background: rgba(0, 0, 0, 0.3);
    }
    .highlight-box {
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%);
      border: 1px solid rgba(212, 175, 55, 0.3);
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
      <p class="text-white/60">3단계 간편 연동으로 AI 상담사를 바로 배치하세요</p>
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
              <p class="font-mono text-sm">partner@xivix.kr</p>
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
              <div>
                <span class="text-white/80"><strong>설정</strong> 메뉴 클릭</span>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <span class="w-6 h-6 rounded-full gold-bg text-black flex items-center justify-center text-xs shrink-0 font-bold">2</span>
              <div>
                <span class="text-white/80"><strong>상담 멤버관리</strong> 선택</span>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <span class="w-6 h-6 rounded-full gold-bg text-black flex items-center justify-center text-xs shrink-0 font-bold">3</span>
              <div>
                <span class="text-white/80"><strong class="gold">+ 새로운 멤버 초대하기</strong> 클릭</span>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <span class="w-6 h-6 rounded-full gold-bg text-black flex items-center justify-center text-xs shrink-0 font-bold">4</span>
              <div>
                <span class="text-white/80">이름에 <strong>XIVIX 지배인</strong></span><br>
                <span class="text-white/80">이메일에 <strong class="gold">partner@xivix.kr</strong> 입력</span>
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
      <!-- Step 3: 연동 요청 (매장정보 + 최종확인) -->
      <!-- ================================================ -->
      <div id="step-3" class="step-content hidden">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/20 mb-4 pulse-gold">
            <i class="fas fa-magic text-2xl text-purple-400"></i>
          </div>
          <h2 class="text-xl font-bold mb-2">연동 요청하기</h2>
          <p class="text-white/60 text-sm">매장 정보를 입력하고 버튼만 누르면 끝!</p>
        </div>
        
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
        
        <!-- 입력 요약 -->
        <div class="glass rounded-xl p-4 mb-4">
          <p class="text-xs text-white/40 mb-3">연동 정보 확인</p>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-white/60">톡톡 ID</span>
              <span class="font-mono gold" id="summary-talktalk">@-</span>
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
              <p class="text-white/80 mb-1">연동 요청 후 진행 과정</p>
              <p class="text-white/50">XIVIX 전문가가 <strong>30분 이내</strong> 설정을 완료하고, 카카오톡으로 완료 안내를 드립니다.</p>
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
            <p class="text-xs text-white/40 mt-2" id="status-detail">XIVIX 지배인이 매장에 접속 준비 중...</p>
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
    let talktalkId = '';
    
    function goToStep(step) {
      // Step 1 → 2: 톡톡 ID 검증
      if (step === 2 && currentStep === 1) {
        const id = document.getElementById('talktalk-id').value.trim().toUpperCase();
        if (!id || id.length < 4) {
          alert('톡톡 계정 ID를 입력해주세요.\\n(파트너센터 좌측 상단 프로필 아래 6자리 코드)');
          return;
        }
        talktalkId = id;
      }
      
      // Step 2 → 3: 요약 업데이트
      if (step === 3 && currentStep === 2) {
        document.getElementById('summary-talktalk').textContent = '@' + talktalkId;
      }
      
      // Step 3 → Submit: 폼 검증
      if (step === 3) {
        // 포커스 이동 없이 그냥 진행
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
    
    function copyInviteEmail() {
      const email = 'partner@xivix.kr';
      
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
    
    async function submitRequest() {
      const storeName = document.getElementById('store-name').value.trim();
      const ownerName = document.getElementById('owner-name').value.trim();
      const ownerPhone = document.getElementById('owner-phone').value.trim();
      const businessType = document.getElementById('business-type').value;
      
      // 필수 입력 검증
      if (!storeName || !ownerName || !ownerPhone) {
        alert('매장 이름, 사장님 성함, 연락처를 모두 입력해주세요.');
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
      
      const data = {
        store_name: storeName,
        owner_name: ownerName,
        owner_phone: ownerPhone,
        business_type: businessType,
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
        { progress: 20, text: '요청 접수', detail: 'XIVIX 전문가에게 알림을 보냈습니다...' },
        { progress: 30, text: '확인 중', detail: 'XIVIX 전문가가 요청을 확인하고 있습니다...' },
        { progress: 40, text: '준비 중', detail: '매니저 권한을 확인하고 있습니다...' },
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
    
    // Auto uppercase for talktalk ID input
    document.addEventListener('DOMContentLoaded', function() {
      const talktalkInput = document.getElementById('talktalk-id');
      if (talktalkInput) {
        talktalkInput.addEventListener('input', function(e) {
          e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
      }
    });
  </script>
</body>
</html>
  `;
}
