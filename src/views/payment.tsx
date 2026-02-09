// XIVIX AI Core V3.0 - KG이니시스 결제 페이지
// 웹표준 결제(INIStdPay) 연동

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
    select, select option { background: #1a1a1a; color: #ffffff; }
    select option:checked { background: #2563eb; color: #ffffff; }
    input { color: #ffffff; }
    input::placeholder { color: rgba(255,255,255,0.35); }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-lg">
    <!-- 헤더 -->
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold mb-2">XIVIX AI <span class="text-blue-400">결제</span></h1>
      <p class="text-white/50 text-sm">안전한 KG이니시스 결제</p>
    </div>

    <!-- 결제 정보 카드 -->
    <div class="glass rounded-2xl p-6 mb-6">
      <h3 class="font-semibold mb-4"><i class="fas fa-receipt text-blue-400 mr-2"></i>결제 정보</h3>
      
      <!-- 결제 유형 선택 -->
      <div class="space-y-3 mb-6">
        <label class="text-sm text-white/60">결제 유형</label>
        <select id="payment-type" onchange="updatePaymentInfo()" class="w-full bg-[#1a1a1a] text-white border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500">
          <option value="setup_basic">기본 셋팅비 (300,000원)</option>
          <option value="setup_premium">프리미엄 셋팅비 (500,000원)</option>
          <option value="monthly_mini">월 이용료 - 미니 (29,000원)</option>
          <option value="monthly_light">월 이용료 - 라이트 (49,000원)</option>
          <option value="monthly_standard">월 이용료 - 스탠다드 (99,000원)</option>
          <option value="monthly_premium">월 이용료 - 프리미엄 (149,000원)</option>
          <option value="sms_extra">SMS 초과분 결제</option>
        </select>
      </div>

      <!-- SMS 초과분 입력 (조건부) -->
      <div id="sms-extra-section" class="hidden mb-6">
        <label class="text-sm text-white/60">SMS 초과 건수</label>
        <input type="number" id="sms-extra-count" value="0" min="0" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 mt-1" onchange="updatePaymentInfo()">
      </div>

      <!-- 결제 금액 표시 -->
      <div class="bg-white/5 rounded-xl p-4 space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-white/60">공급가액</span>
          <span id="supply-amount">300,000원</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-white/60">부가세 (10%)</span>
          <span id="vat-amount">30,000원</span>
        </div>
        <div class="border-t border-white/10 pt-2 mt-2 flex justify-between font-bold">
          <span>총 결제 금액</span>
          <span class="text-blue-400 text-lg" id="total-amount">330,000원</span>
        </div>
      </div>
    </div>

    <!-- 결제자 정보 -->
    <div class="glass rounded-2xl p-6 mb-6">
      <h3 class="font-semibold mb-4"><i class="fas fa-user text-blue-400 mr-2"></i>결제자 정보</h3>
      <div class="space-y-3">
        <div>
          <label class="text-sm text-white/60">매장/업체명</label>
          <input type="text" id="buyer-name" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm mt-1" placeholder="매장명 입력">
        </div>
        <div>
          <label class="text-sm text-white/60">이메일</label>
          <input type="email" id="buyer-email" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm mt-1" placeholder="이메일 입력">
        </div>
        <div>
          <label class="text-sm text-white/60">연락처</label>
          <input type="tel" id="buyer-tel" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm mt-1" placeholder="010-0000-0000">
        </div>
      </div>
    </div>

    <!-- 결제 버튼 -->
    <button onclick="requestPayment()" id="pay-button" class="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold text-lg hover:bg-blue-600 transition flex items-center justify-center gap-2">
      <i class="fas fa-credit-card"></i>
      <span id="pay-button-text">330,000원 결제하기</span>
    </button>

    <!-- 안내 -->
    <div class="text-center mt-4 text-xs text-white/30 space-y-1">
      <p>PG사: KG이니시스 | 사업자: XIVIX AI</p>
      <p>결제 문의: 010-4845-3065</p>
    </div>

    <!-- 결제 상태 표시 -->
    <div id="payment-status" class="hidden mt-6 glass rounded-2xl p-6 text-center"></div>
  </div>

  <!-- KG이니시스 결제 모듈 (테스트) -->
  <script src="https://stdpay.inicis.com/stdjs/INIStdPay.js" charset="UTF-8"></script>

  <script>
    const STORE_ID = ${storeId};
    
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
      
      // SMS 초과분 섹션 표시/숨기기
      document.getElementById('sms-extra-section').classList.toggle('hidden', type !== 'sms_extra');
      
      let amount = info.amount;
      if (type === 'sms_extra') {
        const count = parseInt(document.getElementById('sms-extra-count').value) || 0;
        amount = count * 25; // 기본 단가 25원
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

      // 결제 버튼 비활성화
      const btn = document.getElementById('pay-button');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>결제 준비 중...';

      try {
        // 1. 서버에서 결제 파라미터 준비
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
        
        // 2. 결제 폼 생성 및 INIStdPay 호출
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
        
        // INIStdPay 결제 호출
        if (typeof INIStdPay !== 'undefined') {
          INIStdPay.pay('ini_pay_form');
        } else {
          // 테스트 모드: INIStdPay 로드 안 된 경우
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
  </script>
</body>
</html>
  `;
}
