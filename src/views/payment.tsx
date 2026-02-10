// XIVIX AI Core V3.0 - 결제 페이지
// Steppay 구독 결제 + KG이니시스 일회성 결제

export function renderPaymentPage(storeId: number): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX AI - 결제</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Pretendard', -apple-system, sans-serif; }
    body { background: #050505; color: #fff; }
    .glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.06); }
    select { background-color: #1a1a1a !important; color: #ffffff !important; -webkit-appearance: none; -moz-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
    select option { background-color: #1a1a1a !important; color: #ffffff !important; padding: 8px 12px; }
    select option:hover, select option:focus, select option:checked { background-color: #2563eb !important; color: #ffffff !important; }
    input { color: #ffffff !important; background-color: rgba(255,255,255,0.05) !important; }
    input::placeholder { color: rgba(255,255,255,0.35); }
    .tab-active { border-color: #3b82f6; color: #3b82f6; background: rgba(59,130,246,0.1); }
    .tab-inactive { border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); }
    .badge-sub { background: linear-gradient(135deg, #3b82f6, #8b5cf6); }
    .badge-once { background: linear-gradient(135deg, #f59e0b, #ef4444); }
    .plan-card { transition: all 0.3s ease; cursor: pointer; }
    .plan-card:hover { border-color: rgba(59,130,246,0.5); transform: translateY(-2px); }
    .plan-card.selected { border-color: #3b82f6; background: rgba(59,130,246,0.08); box-shadow: 0 0 20px rgba(59,130,246,0.15); }
    .shimmer { background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-lg">
    <!-- 헤더 -->
    <div class="text-center mb-6">
      <h1 class="text-2xl font-bold mb-2">XIVIX AI <span class="text-blue-400">결제</span></h1>
      <p class="text-white/50 text-sm">안전한 자동 구독 결제</p>
    </div>

    <!-- 결제 유형 탭 -->
    <div class="flex gap-3 mb-6">
      <button onclick="switchTab('subscription')" id="tab-subscription" class="flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all tab-active flex items-center justify-center gap-2">
        <i class="fas fa-sync-alt"></i>월 구독 결제
      </button>
      <button onclick="switchTab('onetime')" id="tab-onetime" class="flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all tab-inactive flex items-center justify-center gap-2">
        <i class="fas fa-credit-card"></i>일회성 결제
      </button>
    </div>

    <!-- ═══════ 구독 결제 섹션 ═══════ -->
    <div id="section-subscription">
      <!-- 요금제 선택 -->
      <div class="glass rounded-2xl p-5 mb-4">
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <span class="badge-sub text-xs px-2 py-0.5 rounded-full text-white">구독</span>
          월 이용 요금제 선택
        </h3>
        
        <div class="space-y-3" id="plan-cards">
          <div class="plan-card glass rounded-xl p-4 flex justify-between items-center" data-plan="mini" onclick="selectPlan('mini')">
            <div>
              <div class="font-semibold text-sm">미니 <span class="text-white/40 text-xs ml-1">소상공인</span></div>
              <div class="text-white/40 text-xs mt-0.5">AI 500건 · SMS 50건</div>
            </div>
            <div class="text-right">
              <div class="text-blue-400 font-bold">29,000<span class="text-xs text-white/40">/월</span></div>
            </div>
          </div>
          
          <div class="plan-card glass rounded-xl p-4 flex justify-between items-center" data-plan="light" onclick="selectPlan('light')">
            <div>
              <div class="font-semibold text-sm">라이트</div>
              <div class="text-white/40 text-xs mt-0.5">AI 1,000건 · SMS 100건</div>
            </div>
            <div class="text-right">
              <div class="text-blue-400 font-bold">49,000<span class="text-xs text-white/40">/월</span></div>
            </div>
          </div>
          
          <div class="plan-card glass rounded-xl p-4 flex justify-between items-center selected" data-plan="standard" onclick="selectPlan('standard')">
            <div>
              <div class="font-semibold text-sm">스탠다드 <span class="text-xs text-blue-400 ml-1">인기</span></div>
              <div class="text-white/40 text-xs mt-0.5">AI 5,000건 · SMS 300건</div>
            </div>
            <div class="text-right">
              <div class="text-blue-400 font-bold">99,000<span class="text-xs text-white/40">/월</span></div>
            </div>
          </div>
          
          <div class="plan-card glass rounded-xl p-4 flex justify-between items-center" data-plan="premium" onclick="selectPlan('premium')">
            <div>
              <div class="font-semibold text-sm">프리미엄</div>
              <div class="text-white/40 text-xs mt-0.5">AI 10,000건 · SMS 1,000건</div>
            </div>
            <div class="text-right">
              <div class="text-blue-400 font-bold">149,000<span class="text-xs text-white/40">/월</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 셋팅비 옵션 -->
      <div class="glass rounded-2xl p-5 mb-4">
        <h3 class="font-semibold mb-3 text-sm"><i class="fas fa-cog text-yellow-400 mr-2"></i>초기 셋팅비 (일회성)</h3>
        <div class="space-y-2">
          <label class="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5">
            <input type="radio" name="setup" value="none" checked class="accent-blue-500" onchange="updateSubTotal()">
            <span class="text-sm text-white/60">셋팅비 없음 (기존 고객)</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5">
            <input type="radio" name="setup" value="basic" class="accent-blue-500" onchange="updateSubTotal()">
            <span class="text-sm">기본 셋팅비 <span class="text-yellow-400 font-semibold">300,000원</span></span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5">
            <input type="radio" name="setup" value="premium" class="accent-blue-500" onchange="updateSubTotal()">
            <span class="text-sm">프리미엄 셋팅비 <span class="text-yellow-400 font-semibold">500,000원</span></span>
          </label>
        </div>
      </div>

      <!-- 결제 금액 요약 -->
      <div class="glass rounded-2xl p-5 mb-4">
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-white/50">월 구독료</span>
            <span id="sub-monthly-fee">99,000원</span>
          </div>
          <div class="flex justify-between" id="sub-setup-row" style="display:none">
            <span class="text-white/50">셋팅비 (일회)</span>
            <span id="sub-setup-fee">0원</span>
          </div>
          <div class="flex justify-between">
            <span class="text-white/50">부가세 (10%)</span>
            <span id="sub-vat">9,900원</span>
          </div>
          <div class="border-t border-white/10 pt-2 mt-2 flex justify-between font-bold">
            <span>최초 결제 금액</span>
            <span class="text-blue-400 text-lg" id="sub-total">108,900원</span>
          </div>
          <div class="text-xs text-white/30 mt-1">
            <i class="fas fa-info-circle mr-1"></i>이후 매월 자동 결제됩니다
          </div>
        </div>
      </div>

      <!-- 결제자 정보 -->
      <div class="glass rounded-2xl p-5 mb-4">
        <h3 class="font-semibold mb-3 text-sm"><i class="fas fa-user text-blue-400 mr-2"></i>결제자 정보</h3>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-white/50">매장/업체명 *</label>
            <input type="text" id="sub-buyer-name" class="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1" placeholder="매장명 입력">
          </div>
          <div>
            <label class="text-xs text-white/50">이메일 * <span class="text-white/30">(결제 영수증 발송)</span></label>
            <input type="email" id="sub-buyer-email" class="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1" placeholder="email@example.com">
          </div>
          <div>
            <label class="text-xs text-white/50">연락처</label>
            <input type="tel" id="sub-buyer-phone" class="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1" placeholder="010-0000-0000">
          </div>
        </div>
      </div>

      <!-- 구독 결제 버튼 -->
      <button onclick="startSubscription()" id="sub-pay-button" class="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 text-white font-bold text-lg hover:from-blue-600 hover:to-violet-600 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
        <i class="fas fa-sync-alt"></i>
        <span id="sub-pay-text">월 구독 시작하기</span>
      </button>
      
      <div class="text-center mt-3 text-xs text-white/30 space-y-1">
        <p><i class="fas fa-lock mr-1"></i>Steppay 보안결제 · 언제든 해지 가능</p>
        <p>결제 문의: 010-3988-0124</p>
      </div>
    </div>

    <!-- ═══════ 일회성 결제 섹션 (KG이니시스) ═══════ -->
    <div id="section-onetime" style="display:none">
      <div class="glass rounded-2xl p-5 mb-4">
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <span class="badge-once text-xs px-2 py-0.5 rounded-full text-white">일회성</span>
          결제 유형 선택
        </h3>
        <select id="payment-type" onchange="updatePaymentInfo()" class="w-full border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" style="background-color:#1a1a1a;color:#fff;">
          <option value="setup_basic">기본 셋팅비 (300,000원)</option>
          <option value="setup_premium">프리미엄 셋팅비 (500,000원)</option>
          <option value="monthly_mini">월 이용료 - 미니 (29,000원)</option>
          <option value="monthly_light">월 이용료 - 라이트 (49,000원)</option>
          <option value="monthly_standard" selected>월 이용료 - 스탠다드 (99,000원)</option>
          <option value="monthly_premium">월 이용료 - 프리미엄 (149,000원)</option>
          <option value="sms_extra">SMS 초과분 결제</option>
        </select>
      </div>

      <div id="sms-extra-section" class="hidden glass rounded-2xl p-5 mb-4">
        <label class="text-sm text-white/60">SMS 초과 건수</label>
        <input type="number" id="sms-extra-count" value="0" min="0" class="w-full border border-white/10 rounded-xl px-4 py-3 text-sm mt-1" onchange="updatePaymentInfo()">
      </div>

      <div class="glass rounded-2xl p-5 mb-4">
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-white/50">공급가액</span>
            <span id="supply-amount">99,000원</span>
          </div>
          <div class="flex justify-between">
            <span class="text-white/50">부가세 (10%)</span>
            <span id="vat-amount">9,900원</span>
          </div>
          <div class="border-t border-white/10 pt-2 mt-2 flex justify-between font-bold">
            <span>총 결제 금액</span>
            <span class="text-blue-400 text-lg" id="total-amount">108,900원</span>
          </div>
        </div>
      </div>

      <div class="glass rounded-2xl p-5 mb-4">
        <h3 class="font-semibold mb-3 text-sm"><i class="fas fa-user text-blue-400 mr-2"></i>결제자 정보</h3>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-white/50">매장/업체명</label>
            <input type="text" id="buyer-name" class="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1" placeholder="매장명 입력">
          </div>
          <div>
            <label class="text-xs text-white/50">이메일</label>
            <input type="email" id="buyer-email" class="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1" placeholder="이메일 입력">
          </div>
          <div>
            <label class="text-xs text-white/50">연락처</label>
            <input type="tel" id="buyer-tel" class="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1" placeholder="010-0000-0000">
          </div>
        </div>
      </div>

      <button onclick="requestPayment()" id="pay-button" class="w-full py-4 rounded-2xl bg-yellow-500 text-black font-bold text-lg hover:bg-yellow-400 transition flex items-center justify-center gap-2">
        <i class="fas fa-credit-card"></i>
        <span id="pay-button-text">108,900원 결제하기</span>
      </button>

      <div class="text-center mt-3 text-xs text-white/30 space-y-1">
        <p>PG사: KG이니시스 | 사업자: XIVIX AI</p>
        <p>결제 문의: 010-3988-0124</p>
      </div>
    </div>

    <!-- 결제 상태 표시 -->
    <div id="payment-status" class="hidden mt-6 glass rounded-2xl p-6 text-center"></div>
  </div>

  <!-- KG이니시스 결제 모듈 (테스트) -->
  <script src="https://stdpay.inicis.com/stdjs/INIStdPay.js" charset="UTF-8"></script>

  <script>
    const STORE_ID = ${storeId};
    let selectedPlan = 'standard';
    
    // ── 탭 전환 ──
    function switchTab(tab) {
      const subTab = document.getElementById('tab-subscription');
      const onceTab = document.getElementById('tab-onetime');
      const subSection = document.getElementById('section-subscription');
      const onceSection = document.getElementById('section-onetime');
      
      if (tab === 'subscription') {
        subTab.className = subTab.className.replace('tab-inactive', 'tab-active');
        onceTab.className = onceTab.className.replace('tab-active', 'tab-inactive');
        subSection.style.display = '';
        onceSection.style.display = 'none';
      } else {
        onceTab.className = onceTab.className.replace('tab-inactive', 'tab-active');
        subTab.className = subTab.className.replace('tab-active', 'tab-inactive');
        onceSection.style.display = '';
        subSection.style.display = 'none';
      }
    }
    
    // ── 구독 요금제 선택 ──
    const PLAN_PRICES = {
      mini: 29000,
      light: 49000,
      standard: 99000,
      premium: 149000,
    };
    
    function selectPlan(plan) {
      selectedPlan = plan;
      document.querySelectorAll('.plan-card').forEach(el => {
        el.classList.toggle('selected', el.dataset.plan === plan);
      });
      updateSubTotal();
    }
    
    function updateSubTotal() {
      const monthlyFee = PLAN_PRICES[selectedPlan] || 99000;
      const setupValue = document.querySelector('input[name="setup"]:checked')?.value || 'none';
      const setupFee = setupValue === 'basic' ? 300000 : setupValue === 'premium' ? 500000 : 0;
      
      const firstPayment = monthlyFee + setupFee;
      const vat = Math.round(firstPayment * 0.1);
      const total = firstPayment + vat;
      
      document.getElementById('sub-monthly-fee').textContent = monthlyFee.toLocaleString() + '원';
      
      const setupRow = document.getElementById('sub-setup-row');
      if (setupFee > 0) {
        setupRow.style.display = 'flex';
        document.getElementById('sub-setup-fee').textContent = setupFee.toLocaleString() + '원';
      } else {
        setupRow.style.display = 'none';
      }
      
      document.getElementById('sub-vat').textContent = vat.toLocaleString() + '원';
      document.getElementById('sub-total').textContent = total.toLocaleString() + '원';
    }
    
    // ── 구독 결제 시작 (Steppay) ──
    async function startSubscription() {
      const buyerName = document.getElementById('sub-buyer-name').value.trim();
      const buyerEmail = document.getElementById('sub-buyer-email').value.trim();
      const buyerPhone = document.getElementById('sub-buyer-phone').value.trim();
      const setupValue = document.querySelector('input[name="setup"]:checked')?.value || 'none';
      
      if (!buyerName) { alert('매장/업체명을 입력해주세요'); return; }
      if (!buyerEmail) { alert('이메일을 입력해주세요'); return; }
      
      const btn = document.getElementById('sub-pay-button');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>결제 준비 중...';
      
      try {
        const res = await fetch('/api/steppay/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: STORE_ID,
            plan: selectedPlan,
            buyer_name: buyerName,
            buyer_email: buyerEmail,
            buyer_phone: buyerPhone,
            setup_type: setupValue !== 'none' ? setupValue : undefined,
          })
        });
        
        const data = await res.json();
        
        if (!data.success) {
          throw new Error(data.error || '구독 생성 실패');
        }
        
        // Steppay 결제 페이지로 이동
        if (data.data.payment_link) {
          window.location.href = data.data.payment_link;
        } else {
          throw new Error('결제 링크를 받지 못했습니다');
        }
        
      } catch (err) {
        alert('오류: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i><span id="sub-pay-text">월 구독 시작하기</span>';
      }
    }
    
    // ══════ 일회성 결제 (KG이니시스) ══════
    const PRICE_MAP = {
      setup_basic: { amount: 300000, type: 'setup', desc: '기본 셋팅비' },
      setup_premium: { amount: 500000, type: 'setup', desc: '프리미엄 셋팅비' },
      monthly_mini: { amount: 29000, type: 'monthly', desc: '월 이용료 (미니)' },
      monthly_light: { amount: 49000, type: 'monthly', desc: '월 이용료 (라이트)' },
      monthly_standard: { amount: 99000, type: 'monthly', desc: '월 이용료 (스탠다드)' },
      monthly_premium: { amount: 149000, type: 'monthly', desc: '월 이용료 (프리미엄)' },
      sms_extra: { amount: 0, type: 'sms_extra', desc: 'SMS 초과분' },
    };

    function updatePaymentInfo() {
      const type = document.getElementById('payment-type').value;
      const info = PRICE_MAP[type];
      
      document.getElementById('sms-extra-section').classList.toggle('hidden', type !== 'sms_extra');
      
      let amount = info.amount;
      if (type === 'sms_extra') {
        const count = parseInt(document.getElementById('sms-extra-count').value) || 0;
        amount = count * 25;
      }
      
      const vat = Math.round(amount * 0.1);
      const total = amount + vat;
      
      document.getElementById('supply-amount').textContent = amount.toLocaleString() + '원';
      document.getElementById('vat-amount').textContent = vat.toLocaleString() + '원';
      document.getElementById('total-amount').textContent = total.toLocaleString() + '원';
      document.getElementById('pay-button-text').textContent = total.toLocaleString() + '원 결제하기';
    }

    async function requestPayment() {
      const type = document.getElementById('payment-type').value;
      const info = PRICE_MAP[type];
      const buyerName = document.getElementById('buyer-name').value.trim();
      const buyerEmail = document.getElementById('buyer-email').value.trim();
      const buyerTel = document.getElementById('buyer-tel').value.trim();

      if (!buyerName) { alert('매장/업체명을 입력해주세요'); return; }

      let amount = info.amount;
      if (type === 'sms_extra') {
        const count = parseInt(document.getElementById('sms-extra-count').value) || 0;
        amount = count * 25;
        if (amount <= 0) { alert('SMS 초과 건수를 입력해주세요'); return; }
      }

      const btn = document.getElementById('pay-button');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>결제 준비 중...';

      try {
        const res = await fetch('/api/payment/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: STORE_ID,
            payment_type: info.type,
            amount: amount,
            description: info.desc,
            buyer_name: buyerName,
            buyer_email: buyerEmail,
            buyer_tel: buyerTel
          })
        });
        const data = await res.json();
        
        if (!data.success) {
          throw new Error(data.error || '결제 준비 실패');
        }

        const params = data.data;
        
        const form = document.createElement('form');
        form.id = 'ini_pay_form';
        form.method = 'POST';
        
        const fields = {
          gopaymethod: 'Card',
          mid: params.mid,
          oid: params.oid,
          price: String(params.price),
          goodname: params.goodname,
          buyername: buyerName,
          buyertel: buyerTel || '010-0000-0000',
          buyeremail: buyerEmail || '',
          currency: 'WON',
          acceptmethod: 'below1000:centerCd(Y)',
          returnUrl: params.pg_params.returnUrl,
          closeUrl: params.pg_params.closeUrl || '',
          mKey: params.mKey || '',
          signature: params.signature || '',
          timestamp: params.timestamp || '',
          version: '1.0',
          charset: 'UTF-8',
          format: 'JSON'
        };
        
        Object.entries(fields).forEach(([key, val]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = val;
          form.appendChild(input);
        });
        
        document.body.appendChild(form);
        
        if (typeof INIStdPay !== 'undefined') {
          INIStdPay.pay('ini_pay_form');
        } else {
          alert('결제 모듈 로딩 중... 잠시 후 다시 시도해주세요.');
        }

      } catch (err) {
        alert('결제 오류: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-credit-card mr-2"></i><span id="pay-button-text">' + document.getElementById('total-amount').textContent + ' 결제하기</span>';
      }
    }

    // 결제 완료 메시지 수신 (팝업에서)
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'PAYMENT_SUCCESS') {
        const statusDiv = document.getElementById('payment-status');
        statusDiv.classList.remove('hidden');
        statusDiv.innerHTML = '<div class="text-emerald-400"><i class="fas fa-check-circle text-4xl mb-3 block"></i><p class="text-lg font-bold">결제가 완료되었습니다!</p><p class="text-sm text-white/50 mt-2">승인번호: ' + (e.data.tid || '-') + '</p></div>';
      }
    });
    
    // URL 파라미터로 결제 완료 감지 (Steppay 리다이렉트 후)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('result') === 'success') {
      const statusDiv = document.getElementById('payment-status');
      statusDiv.classList.remove('hidden');
      statusDiv.innerHTML = '<div class="text-emerald-400"><i class="fas fa-check-circle text-4xl mb-3 block"></i><p class="text-lg font-bold">구독 결제가 완료되었습니다!</p><p class="text-sm text-white/50 mt-2">매월 자동으로 결제됩니다</p><a href="/admin/' + STORE_ID + '" class="inline-block mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-semibold transition">매장 관리로 이동 →</a></div>';
    }
    
    // 초기화
    updatePaymentInfo();
    updateSubTotal();
  </script>
</body>
</html>
  `;
}
