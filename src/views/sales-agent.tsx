// XIVIX AI Core V3.0 - 영업사원 수수료 정산 대시보드
// 마스터 전용 영업사원 관리 + 수수료 계산/정산

export function renderSalesAgentDashboard(): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX AI - 영업사원 수수료 정산</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Pretendard', -apple-system, sans-serif; }
    body { background: #050505; color: #fff; }
    .glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.06); }
    .glass:hover { border-color: rgba(255,255,255,0.12); }
    .accent { color: #007AFF; }
    .accent-bg { background: #007AFF; }
    .accent-bg:hover { background: #0066DD; }
    .green-text { color: #30D158; }
    .yellow-text { color: #FFD60A; }
    .red-text { color: #FF453A; }
    .stat-glow { box-shadow: 0 0 30px rgba(0,122,255,0.1); }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    .tab-active { background: rgba(0,122,255,0.2); border-color: #007AFF; color: #007AFF; }
    .modal-overlay { background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); }
    .badge-pending { background: rgba(255,214,10,0.15); color: #FFD60A; }
    .badge-paid { background: rgba(48,209,88,0.15); color: #30D158; }
    .badge-confirmed { background: rgba(0,122,255,0.15); color: #007AFF; }
    .badge-cancelled { background: rgba(255,69,58,0.15); color: #FF453A; }
    input:focus, select:focus { outline: none; border-color: #007AFF; }
    select, select option { background: #1a1a1a; color: #ffffff; }
    select option:checked { background: #007AFF; color: #ffffff; }
    input { color: #ffffff; }
    input::placeholder { color: rgba(255,255,255,0.35); }
  </style>
</head>
<body class="min-h-screen">

<!-- 상단 네비게이션 -->
<nav class="border-b border-white/5 px-6 py-4">
  <div class="max-w-7xl mx-auto flex items-center justify-between">
    <div class="flex items-center gap-4">
      <a href="/master" class="text-white/40 hover:text-white/70 transition text-sm">
        <i class="fas fa-arrow-left mr-1"></i> 마스터 대시보드
      </a>
      <span class="text-white/20">|</span>
      <h1 class="text-lg font-bold">
        <i class="fas fa-handshake accent mr-2"></i>영업사원 수수료 정산
      </h1>
    </div>
    <div class="flex items-center gap-3">
      <span id="current-period" class="text-white/50 text-sm"></span>
      <button onclick="calculateMonthlyCommissions()" class="accent-bg text-white text-sm px-4 py-2 rounded-xl hover:opacity-90 transition">
        <i class="fas fa-calculator mr-1"></i> 이번달 수수료 계산
      </button>
    </div>
  </div>
</nav>

<!-- 요약 카드 -->
<div class="max-w-7xl mx-auto px-6 py-6">
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
    <div class="glass rounded-2xl p-5 stat-glow">
      <div class="flex items-center justify-between mb-3">
        <span class="text-white/50 text-sm">총 영업사원</span>
        <i class="fas fa-users accent"></i>
      </div>
      <div id="stat-total-agents" class="text-3xl font-bold">0</div>
      <div id="stat-active-agents" class="text-white/40 text-sm mt-1">활성: 0명</div>
    </div>
    <div class="glass rounded-2xl p-5 stat-glow">
      <div class="flex items-center justify-between mb-3">
        <span class="text-white/50 text-sm">배정 매장</span>
        <i class="fas fa-store accent"></i>
      </div>
      <div id="stat-total-stores" class="text-3xl font-bold">0</div>
      <div class="text-white/40 text-sm mt-1">영업사원별 평균</div>
    </div>
    <div class="glass rounded-2xl p-5 stat-glow">
      <div class="flex items-center justify-between mb-3">
        <span class="text-white/50 text-sm">미지급 수수료</span>
        <i class="fas fa-clock yellow-text"></i>
      </div>
      <div id="stat-pending-amount" class="text-3xl font-bold yellow-text">₩0</div>
      <div id="stat-pending-count" class="text-white/40 text-sm mt-1">0건 대기중</div>
    </div>
    <div class="glass rounded-2xl p-5 stat-glow">
      <div class="flex items-center justify-between mb-3">
        <span class="text-white/50 text-sm">이번달 지급 완료</span>
        <i class="fas fa-check-circle green-text"></i>
      </div>
      <div id="stat-paid-amount" class="text-3xl font-bold green-text">₩0</div>
      <div id="stat-paid-count" class="text-white/40 text-sm mt-1">0건 완료</div>
    </div>
  </div>

  <!-- 탭 네비게이션 -->
  <div class="flex gap-2 mb-6 border-b border-white/5 pb-4">
    <button onclick="switchTab('agents')" id="tab-agents" class="tab-active px-5 py-2.5 rounded-xl text-sm font-medium border border-white/10 transition">
      <i class="fas fa-users mr-1"></i> 영업사원 관리
    </button>
    <button onclick="switchTab('commissions')" id="tab-commissions" class="px-5 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-white/50 hover:text-white/80 transition">
      <i class="fas fa-receipt mr-1"></i> 수수료 정산
    </button>
    <button onclick="switchTab('simulation')" id="tab-simulation" class="px-5 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-white/50 hover:text-white/80 transition">
      <i class="fas fa-chart-line mr-1"></i> 수익 시뮬레이션
    </button>
  </div>

  <!-- ==================== 영업사원 관리 탭 ==================== -->
  <div id="section-agents">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">영업사원 목록</h2>
      <button onclick="openModal('add-agent')" class="accent-bg text-white text-sm px-4 py-2 rounded-xl">
        <i class="fas fa-plus mr-1"></i> 영업사원 등록
      </button>
    </div>
    <div id="agents-list" class="space-y-3">
      <div class="glass rounded-xl p-6 text-center text-white/30">
        <i class="fas fa-spinner fa-spin mr-2"></i> 로딩 중...
      </div>
    </div>
  </div>

  <!-- ==================== 수수료 정산 탭 ==================== -->
  <div id="section-commissions" class="hidden">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">수수료 정산 현황</h2>
      <div class="flex gap-2">
        <select id="commission-period" onchange="loadCommissions()" class="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm">
        </select>
        <button onclick="bulkPay()" class="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-xl transition">
          <i class="fas fa-money-bill-wave mr-1"></i> 선택 일괄 지급
        </button>
      </div>
    </div>
    
    <!-- 정산 요약 -->
    <div id="commission-summary" class="glass rounded-xl p-5 mb-4 hidden">
      <div class="grid grid-cols-3 gap-4">
        <div>
          <span class="text-white/50 text-sm">총 정산 금액</span>
          <div id="summary-total" class="text-xl font-bold accent mt-1">₩0</div>
        </div>
        <div>
          <span class="text-white/50 text-sm">미지급</span>
          <div id="summary-pending" class="text-xl font-bold yellow-text mt-1">₩0</div>
        </div>
        <div>
          <span class="text-white/50 text-sm">지급 완료</span>
          <div id="summary-paid" class="text-xl font-bold green-text mt-1">₩0</div>
        </div>
      </div>
    </div>

    <div id="commissions-list" class="space-y-2">
      <div class="glass rounded-xl p-6 text-center text-white/30">
        정산 기간을 선택해 주세요
      </div>
    </div>
  </div>

  <!-- ==================== 수익 시뮬레이션 탭 ==================== -->
  <div id="section-simulation" class="hidden">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">수익 시뮬레이션</h2>
      <select id="sim-agent-select" onchange="loadSimulation()" class="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm">
        <option value="">영업사원 선택</option>
      </select>
    </div>
    <div id="simulation-result" class="hidden">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="glass rounded-xl p-5">
          <span class="text-white/50 text-sm">월간 수수료</span>
          <div id="sim-monthly" class="text-2xl font-bold accent mt-2">₩0</div>
          <div id="sim-rate" class="text-white/40 text-sm mt-1">수수료율: 0%</div>
        </div>
        <div class="glass rounded-xl p-5">
          <span class="text-white/50 text-sm">연간 예상 수수료</span>
          <div id="sim-annual" class="text-2xl font-bold green-text mt-2">₩0</div>
        </div>
        <div class="glass rounded-xl p-5">
          <span class="text-white/50 text-sm">배정 매장</span>
          <div id="sim-stores" class="text-2xl font-bold mt-2">0개</div>
          <div id="sim-note" class="text-xs mt-1"></div>
        </div>
      </div>
      <div id="sim-store-list" class="glass rounded-xl p-5">
        <h3 class="font-semibold mb-3">매장별 수수료 내역</h3>
        <div id="sim-stores-detail" class="space-y-2"></div>
      </div>
    </div>
    <div id="simulation-empty" class="glass rounded-xl p-8 text-center text-white/30">
      <i class="fas fa-chart-pie text-4xl mb-3"></i>
      <p>영업사원을 선택하면 수익 시뮬레이션을 확인할 수 있습니다</p>
    </div>
  </div>
</div>

<!-- ==================== 영업사원 등록/수정 모달 ==================== -->
<div id="modal-add-agent" class="hidden fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4">
  <div class="glass rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
    <div class="flex justify-between items-center mb-6">
      <h3 id="modal-title" class="text-lg font-bold"><i class="fas fa-user-plus accent mr-2"></i>영업사원 등록</h3>
      <button onclick="closeModal('add-agent')" class="text-white/30 hover:text-white"><i class="fas fa-times"></i></button>
    </div>
    <input type="hidden" id="edit-agent-id" value="">
    <div class="space-y-4">
      <div>
        <label class="text-sm text-white/60 block mb-1">이름 <span class="red-text">*</span></label>
        <input type="text" id="agent-name" placeholder="홍길동" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm">
      </div>
      <div>
        <label class="text-sm text-white/60 block mb-1">연락처 <span class="red-text">*</span></label>
        <input type="text" id="agent-phone" placeholder="010-1234-5678" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm">
      </div>
      <div>
        <label class="text-sm text-white/60 block mb-1">이메일</label>
        <input type="email" id="agent-email" placeholder="example@email.com" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm">
      </div>
      <div class="border-t border-white/5 pt-4">
        <h4 class="text-sm font-medium mb-3"><i class="fas fa-university accent mr-1"></i> 정산 계좌 정보</h4>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm text-white/60 block mb-1">은행</label>
            <select id="agent-bank" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm">
              <option value="">선택</option>
              <option value="국민은행">국민은행</option>
              <option value="신한은행">신한은행</option>
              <option value="우리은행">우리은행</option>
              <option value="하나은행">하나은행</option>
              <option value="농협은행">농협은행</option>
              <option value="기업은행">기업은행</option>
              <option value="카카오뱅크">카카오뱅크</option>
              <option value="토스뱅크">토스뱅크</option>
              <option value="새마을금고">새마을금고</option>
            </select>
          </div>
          <div>
            <label class="text-sm text-white/60 block mb-1">예금주</label>
            <input type="text" id="agent-bank-holder" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm">
          </div>
        </div>
        <div class="mt-3">
          <label class="text-sm text-white/60 block mb-1">계좌번호</label>
          <input type="text" id="agent-bank-account" placeholder="계좌번호 (숫자만)" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm">
        </div>
      </div>
      <div class="border-t border-white/5 pt-4">
        <h4 class="text-sm font-medium mb-3"><i class="fas fa-percent accent mr-1"></i> 수수료율 설정</h4>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm text-white/60 block mb-1">셋팅비 수수료율 (%)</label>
            <input type="number" id="agent-rate-setup" value="30" min="0" max="100" step="5" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm">
          </div>
          <div>
            <label class="text-sm text-white/60 block mb-1">월이용료 수수료율 (%)</label>
            <input type="number" id="agent-rate-monthly" value="20" min="0" max="100" step="5" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm">
          </div>
        </div>
      </div>
      <div>
        <label class="text-sm text-white/60 block mb-1">비고</label>
        <textarea id="agent-notes" rows="2" placeholder="메모 (선택)" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-none"></textarea>
      </div>
      <button onclick="saveAgent()" class="w-full accent-bg text-white font-medium py-3 rounded-xl hover:opacity-90 transition">
        <i class="fas fa-save mr-1"></i> <span id="save-btn-text">등록하기</span>
      </button>
    </div>
  </div>
</div>

<!-- ==================== 매장 배정 모달 ==================== -->
<div id="modal-assign-store" class="hidden fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4">
  <div class="glass rounded-2xl w-full max-w-md p-6">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-bold"><i class="fas fa-link accent mr-2"></i>매장 배정</h3>
      <button onclick="closeModal('assign-store')" class="text-white/30 hover:text-white"><i class="fas fa-times"></i></button>
    </div>
    <input type="hidden" id="assign-agent-id" value="">
    <div class="space-y-4">
      <div>
        <label class="text-sm text-white/60 block mb-1">배정할 매장 선택</label>
        <select id="assign-store-id" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm">
          <option value="">매장 선택...</option>
        </select>
      </div>
      <button onclick="assignStore()" class="w-full accent-bg text-white font-medium py-3 rounded-xl hover:opacity-90 transition">
        <i class="fas fa-link mr-1"></i> 배정하기
      </button>
    </div>
  </div>
</div>

<!-- 토스트 알림 -->
<div id="toast" class="hidden fixed bottom-6 right-6 z-50 glass rounded-xl px-5 py-3 text-sm shadow-lg transition-all">
</div>

<script>
const API_BASE = '/api';
let allAgents = [];
let allStores = [];

// ==================== 초기화 ====================
document.addEventListener('DOMContentLoaded', () => {
  // 현재 기간 표시
  const now = new Date();
  const period = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('current-period').textContent = period + ' 정산';
  
  // 기간 셀렉트 옵션 생성 (최근 6개월)
  const periodSelect = document.getElementById('commission-period');
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    periodSelect.appendChild(opt);
  }
  
  loadAgents();
  loadAllStores();
});

// ==================== 탭 전환 ====================
function switchTab(tab) {
  ['agents', 'commissions', 'simulation'].forEach(t => {
    document.getElementById('section-' + t).classList.toggle('hidden', t !== tab);
    const btn = document.getElementById('tab-' + t);
    if (t === tab) {
      btn.classList.add('tab-active');
      btn.classList.remove('text-white/50');
    } else {
      btn.classList.remove('tab-active');
      btn.classList.add('text-white/50');
    }
  });
  
  if (tab === 'commissions') loadCommissions();
}

// ==================== 영업사원 목록 ====================
async function loadAgents() {
  try {
    const res = await fetch(API_BASE + '/agents');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    
    allAgents = data.data || [];
    renderAgents(allAgents);
    updateStats(allAgents);
    updateSimAgentSelect(allAgents);
  } catch (e) {
    showToast('영업사원 목록 로딩 실패: ' + e.message, 'error');
  }
}

function renderAgents(agents) {
  const container = document.getElementById('agents-list');
  if (!agents || agents.length === 0) {
    container.innerHTML = '<div class="glass rounded-xl p-8 text-center text-white/30"><i class="fas fa-user-slash text-4xl mb-3"></i><p>등록된 영업사원이 없습니다</p></div>';
    return;
  }
  
  container.innerHTML = agents.map(a => {
    const statusBadge = a.status === 'active' 
      ? '<span class="badge-paid px-2 py-0.5 rounded-full text-xs">활성</span>'
      : a.status === 'suspended'
        ? '<span class="badge-pending px-2 py-0.5 rounded-full text-xs">정지</span>'
        : '<span class="badge-cancelled px-2 py-0.5 rounded-full text-xs">해지</span>';
    
    return \`
      <div class="glass rounded-xl p-5 transition hover:border-blue-500/30">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <span class="text-lg font-semibold">\${a.name}</span>
              \${statusBadge}
              <span class="text-white/30 text-xs">#\${a.id}</span>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span class="text-white/40">연락처</span>
                <div class="mt-0.5">\${a.phone || '-'}</div>
              </div>
              <div>
                <span class="text-white/40">배정매장</span>
                <div class="mt-0.5 font-medium accent">\${a.active_stores || 0}개</div>
              </div>
              <div>
                <span class="text-white/40">미지급 수수료</span>
                <div class="mt-0.5 font-medium yellow-text">₩\${(a.pending_amount || 0).toLocaleString()}</div>
              </div>
              <div>
                <span class="text-white/40">누적 지급</span>
                <div class="mt-0.5 font-medium green-text">₩\${(a.total_paid || 0).toLocaleString()}</div>
              </div>
            </div>
            <div class="mt-2 text-xs text-white/30">
              셋팅비 \${Math.round((a.commission_rate_setup || 0.3) * 100)}% · 월이용료 \${Math.round((a.commission_rate_monthly || 0.2) * 100)}%
              \${a.bank_name ? ' · ' + a.bank_name + ' ' + (a.bank_holder || '') : ''}
            </div>
          </div>
          <div class="flex gap-2 ml-4">
            <button onclick="openAssignModal(\${a.id})" class="text-white/30 hover:text-blue-400 transition p-2" title="매장 배정">
              <i class="fas fa-link"></i>
            </button>
            <button onclick="editAgent(\${a.id})" class="text-white/30 hover:text-white transition p-2" title="수정">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="viewAgentDetail(\${a.id})" class="text-white/30 hover:text-white transition p-2" title="상세보기">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </div>
      </div>
    \`;
  }).join('');
}

function updateStats(agents) {
  const total = agents.length;
  const active = agents.filter(a => a.status === 'active').length;
  const totalStores = agents.reduce((s, a) => s + (a.active_stores || 0), 0);
  const pendingAmount = agents.reduce((s, a) => s + (a.pending_amount || 0), 0);
  const paidAmount = agents.reduce((s, a) => s + (a.total_paid || 0), 0);
  
  document.getElementById('stat-total-agents').textContent = total;
  document.getElementById('stat-active-agents').textContent = '활성: ' + active + '명';
  document.getElementById('stat-total-stores').textContent = totalStores;
  document.getElementById('stat-pending-amount').textContent = '₩' + pendingAmount.toLocaleString();
  document.getElementById('stat-paid-amount').textContent = '₩' + paidAmount.toLocaleString();
}

// ==================== 매장 목록 로드 ====================
async function loadAllStores() {
  try {
    const res = await fetch(API_BASE + '/stores');
    const data = await res.json();
    if (data.success) allStores = data.data || [];
  } catch (e) {
    console.error('매장 목록 로딩 실패:', e);
  }
}

// ==================== 영업사원 등록/수정 ====================
function openModal(id) {
  document.getElementById('modal-' + id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById('modal-' + id).classList.add('hidden');
}

async function saveAgent() {
  const editId = document.getElementById('edit-agent-id').value;
  const body = {
    name: document.getElementById('agent-name').value.trim(),
    phone: document.getElementById('agent-phone').value.trim(),
    email: document.getElementById('agent-email').value.trim() || undefined,
    bank_name: document.getElementById('agent-bank').value || undefined,
    bank_account: document.getElementById('agent-bank-account').value.trim() || undefined,
    bank_holder: document.getElementById('agent-bank-holder').value.trim() || undefined,
    commission_rate_setup: parseFloat(document.getElementById('agent-rate-setup').value) / 100,
    commission_rate_monthly: parseFloat(document.getElementById('agent-rate-monthly').value) / 100,
    notes: document.getElementById('agent-notes').value.trim() || undefined
  };
  
  if (!body.name || !body.phone) {
    showToast('이름과 연락처는 필수입니다', 'error');
    return;
  }
  
  try {
    let res;
    if (editId) {
      res = await fetch(API_BASE + '/agents/' + editId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } else {
      res = await fetch(API_BASE + '/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }
    
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    
    showToast(editId ? '영업사원 정보가 수정되었습니다' : '영업사원이 등록되었습니다', 'success');
    closeModal('add-agent');
    resetAgentForm();
    loadAgents();
  } catch (e) {
    showToast('저장 실패: ' + e.message, 'error');
  }
}

function resetAgentForm() {
  document.getElementById('edit-agent-id').value = '';
  document.getElementById('agent-name').value = '';
  document.getElementById('agent-phone').value = '';
  document.getElementById('agent-email').value = '';
  document.getElementById('agent-bank').value = '';
  document.getElementById('agent-bank-account').value = '';
  document.getElementById('agent-bank-holder').value = '';
  document.getElementById('agent-rate-setup').value = '30';
  document.getElementById('agent-rate-monthly').value = '20';
  document.getElementById('agent-notes').value = '';
  document.getElementById('modal-title').innerHTML = '<i class="fas fa-user-plus accent mr-2"></i>영업사원 등록';
  document.getElementById('save-btn-text').textContent = '등록하기';
}

async function editAgent(agentId) {
  try {
    const res = await fetch(API_BASE + '/agents/' + agentId);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    
    const a = data.data.agent;
    document.getElementById('edit-agent-id').value = a.id;
    document.getElementById('agent-name').value = a.name || '';
    document.getElementById('agent-phone').value = a.phone || '';
    document.getElementById('agent-email').value = a.email || '';
    document.getElementById('agent-bank').value = a.bank_name || '';
    document.getElementById('agent-bank-account').value = a.bank_account || '';
    document.getElementById('agent-bank-holder').value = a.bank_holder || '';
    document.getElementById('agent-rate-setup').value = Math.round((a.commission_rate_setup || 0.3) * 100);
    document.getElementById('agent-rate-monthly').value = Math.round((a.commission_rate_monthly || 0.2) * 100);
    document.getElementById('agent-notes').value = a.notes || '';
    document.getElementById('modal-title').innerHTML = '<i class="fas fa-edit accent mr-2"></i>영업사원 수정';
    document.getElementById('save-btn-text').textContent = '수정하기';
    
    openModal('add-agent');
  } catch (e) {
    showToast('정보 로딩 실패: ' + e.message, 'error');
  }
}

// ==================== 영업사원 상세 ====================
async function viewAgentDetail(agentId) {
  try {
    const res = await fetch(API_BASE + '/agents/' + agentId);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    
    const d = data.data;
    const a = d.agent;
    const stores = d.stores || [];
    const commissions = d.commissions || [];
    
    let detailHtml = '<div class="glass rounded-xl p-5 mb-4">';
    detailHtml += '<h3 class="font-semibold mb-3">' + a.name + ' 상세 정보</h3>';
    detailHtml += '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">';
    detailHtml += '<div><span class="text-white/40">연락처</span><div>' + (a.phone || '-') + '</div></div>';
    detailHtml += '<div><span class="text-white/40">이메일</span><div>' + (a.email || '-') + '</div></div>';
    detailHtml += '<div><span class="text-white/40">정산계좌</span><div>' + (a.bank_name ? a.bank_name + ' ' + (a.bank_holder || '') : '미설정') + '</div></div>';
    detailHtml += '<div><span class="text-white/40">등록일</span><div>' + (a.created_at ? new Date(a.created_at).toLocaleDateString('ko-KR') : '-') + '</div></div>';
    detailHtml += '</div>';
    
    if (stores.length > 0) {
      detailHtml += '<h4 class="text-sm font-medium mb-2 mt-4"><i class="fas fa-store accent mr-1"></i> 배정 매장 (' + stores.length + ')</h4>';
      detailHtml += '<div class="space-y-1">';
      stores.forEach(s => {
        detailHtml += '<div class="flex justify-between bg-white/3 rounded-lg px-3 py-2 text-sm">';
        detailHtml += '<span>' + s.store_name + '</span>';
        detailHtml += '<span class="text-white/40">' + (s.plan || 'light') + ' · ₩' + (s.monthly_fee || 49000).toLocaleString() + '/월</span>';
        detailHtml += '</div>';
      });
      detailHtml += '</div>';
    }
    
    if (commissions.length > 0) {
      detailHtml += '<h4 class="text-sm font-medium mb-2 mt-4"><i class="fas fa-receipt accent mr-1"></i> 최근 수수료 이력</h4>';
      detailHtml += '<div class="space-y-1">';
      commissions.slice(0, 10).forEach(co => {
        const badge = co.status === 'paid' ? 'badge-paid' : co.status === 'pending' ? 'badge-pending' : 'badge-confirmed';
        detailHtml += '<div class="flex justify-between bg-white/3 rounded-lg px-3 py-2 text-sm">';
        detailHtml += '<span>' + co.period + ' · ' + co.store_name + '</span>';
        detailHtml += '<span><span class="' + badge + ' px-2 py-0.5 rounded-full text-xs mr-2">' + co.status + '</span>₩' + (co.commission_amount || 0).toLocaleString() + '</span>';
        detailHtml += '</div>';
      });
      detailHtml += '</div>';
    }
    
    detailHtml += '</div>';
    
    // 모달처럼 agents-list에 인라인 표시
    const existing = document.getElementById('agent-detail-inline');
    if (existing) existing.remove();
    
    const div = document.createElement('div');
    div.id = 'agent-detail-inline';
    div.innerHTML = detailHtml + '<button onclick="this.parentElement.remove()" class="text-sm text-white/40 hover:text-white mb-4 block"><i class="fas fa-times mr-1"></i>닫기</button>';
    document.getElementById('agents-list').prepend(div);
    
  } catch (e) {
    showToast('상세 조회 실패: ' + e.message, 'error');
  }
}

// ==================== 매장 배정 ====================
function openAssignModal(agentId) {
  document.getElementById('assign-agent-id').value = agentId;
  const select = document.getElementById('assign-store-id');
  select.innerHTML = '<option value="">매장 선택...</option>';
  allStores.forEach(s => {
    select.innerHTML += '<option value="' + s.id + '">' + s.store_name + ' (' + (s.plan || 'light') + ')</option>';
  });
  openModal('assign-store');
}

async function assignStore() {
  const agentId = document.getElementById('assign-agent-id').value;
  const storeId = document.getElementById('assign-store-id').value;
  if (!storeId) {
    showToast('매장을 선택해 주세요', 'error');
    return;
  }
  
  try {
    const res = await fetch(API_BASE + '/agents/' + agentId + '/assign-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: parseInt(storeId) })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    
    showToast('매장이 배정되었습니다', 'success');
    closeModal('assign-store');
    loadAgents();
  } catch (e) {
    showToast('배정 실패: ' + e.message, 'error');
  }
}

// ==================== 수수료 정산 ====================
async function loadCommissions() {
  const period = document.getElementById('commission-period').value;
  if (!period) return;
  
  try {
    const res = await fetch(API_BASE + '/commissions?period=' + period);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    
    const commissions = data.data.commissions || [];
    const summary = data.data.summary || {};
    
    // 요약 표시
    const summaryEl = document.getElementById('commission-summary');
    summaryEl.classList.remove('hidden');
    document.getElementById('summary-total').textContent = '₩' + (summary.total_amount || 0).toLocaleString();
    document.getElementById('summary-pending').textContent = '₩' + (summary.pending_amount || 0).toLocaleString();
    document.getElementById('summary-paid').textContent = '₩' + (summary.paid_amount || 0).toLocaleString();
    
    document.getElementById('stat-pending-count').textContent = (summary.pending_count || 0) + '건 대기중';
    document.getElementById('stat-paid-count').textContent = (summary.paid_count || 0) + '건 완료';
    
    renderCommissions(commissions);
  } catch (e) {
    showToast('정산 로딩 실패: ' + e.message, 'error');
  }
}

function renderCommissions(commissions) {
  const container = document.getElementById('commissions-list');
  if (!commissions || commissions.length === 0) {
    container.innerHTML = '<div class="glass rounded-xl p-8 text-center text-white/30"><i class="fas fa-inbox text-4xl mb-3"></i><p>해당 기간의 정산 내역이 없습니다</p><p class="text-xs mt-2">"이번달 수수료 계산" 버튼으로 자동 계산하세요</p></div>';
    return;
  }
  
  container.innerHTML = commissions.map(co => {
    const badge = co.status === 'paid' ? 'badge-paid'
      : co.status === 'confirmed' ? 'badge-confirmed'
      : co.status === 'cancelled' ? 'badge-cancelled'
      : 'badge-pending';
    const statusText = co.status === 'paid' ? '지급완료' : co.status === 'confirmed' ? '확인됨' : co.status === 'cancelled' ? '취소' : '미지급';
    
    return \`
      <div class="glass rounded-xl p-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <input type="checkbox" value="\${co.id}" class="commission-check accent-blue-500 w-4 h-4" \${co.status !== 'pending' ? 'disabled' : ''}>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-medium">\${co.agent_name || '영업사원'}</span>
              <span class="text-white/30 text-xs">\${co.store_name || ''}</span>
            </div>
            <div class="text-sm text-white/40 mt-0.5">
              \${co.commission_type === 'setup' ? '셋팅비' : '월이용료'} · 
              기준액 ₩\${(co.base_amount || 0).toLocaleString()} × \${Math.round((co.commission_rate || 0) * 100)}%
            </div>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-lg font-bold accent">₩\${(co.commission_amount || 0).toLocaleString()}</span>
          <span class="\${badge} px-3 py-1 rounded-full text-xs font-medium">\${statusText}</span>
          \${co.status === 'pending' ? '<button onclick="payCommission(' + co.id + ')" class="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg transition"><i class="fas fa-check mr-1"></i>지급</button>' : ''}
        </div>
      </div>
    \`;
  }).join('');
}

async function payCommission(commissionId) {
  if (!confirm('해당 수수료를 지급 처리하시겠습니까?')) return;
  
  try {
    const res = await fetch(API_BASE + '/commissions/' + commissionId + '/pay', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method: '계좌이체' })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    
    showToast('지급 처리 완료', 'success');
    loadCommissions();
    loadAgents();
  } catch (e) {
    showToast('지급 실패: ' + e.message, 'error');
  }
}

async function bulkPay() {
  const checked = Array.from(document.querySelectorAll('.commission-check:checked')).map(el => parseInt(el.value));
  if (checked.length === 0) {
    showToast('지급할 항목을 선택해 주세요', 'error');
    return;
  }
  
  if (!confirm(checked.length + '건을 일괄 지급하시겠습니까?')) return;
  
  try {
    const res = await fetch(API_BASE + '/commissions/bulk-pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commission_ids: checked, payment_method: '계좌이체' })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    
    showToast(data.data.message, 'success');
    loadCommissions();
    loadAgents();
  } catch (e) {
    showToast('일괄 지급 실패: ' + e.message, 'error');
  }
}

// ==================== 월별 수수료 자동 계산 ====================
async function calculateMonthlyCommissions() {
  const now = new Date();
  const period = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  
  if (!confirm(period + ' 월별 수수료를 자동 계산하시겠습니까?\\n(이미 계산된 건은 중복 생성되지 않습니다)')) return;
  
  try {
    const res = await fetch(API_BASE + '/commissions/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    
    showToast(data.data.message || '수수료 계산 완료', 'success');
    loadCommissions();
    loadAgents();
  } catch (e) {
    showToast('계산 실패: ' + e.message, 'error');
  }
}

// ==================== 수익 시뮬레이션 ====================
function updateSimAgentSelect(agents) {
  const select = document.getElementById('sim-agent-select');
  select.innerHTML = '<option value="">영업사원 선택</option>';
  agents.forEach(a => {
    select.innerHTML += '<option value="' + a.id + '">' + a.name + ' (' + (a.active_stores || 0) + '매장)</option>';
  });
}

async function loadSimulation() {
  const agentId = document.getElementById('sim-agent-select').value;
  if (!agentId) {
    document.getElementById('simulation-result').classList.add('hidden');
    document.getElementById('simulation-empty').classList.remove('hidden');
    return;
  }
  
  try {
    const res = await fetch(API_BASE + '/agents/' + agentId + '/simulation');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    
    const sim = data.data;
    document.getElementById('simulation-result').classList.remove('hidden');
    document.getElementById('simulation-empty').classList.add('hidden');
    
    document.getElementById('sim-monthly').textContent = '₩' + (sim.monthly_commission || 0).toLocaleString();
    document.getElementById('sim-annual').textContent = '₩' + (sim.annual_commission || 0).toLocaleString();
    document.getElementById('sim-stores').textContent = (sim.active_stores || 0) + '개';
    document.getElementById('sim-rate').textContent = '수수료율: ' + Math.round((sim.monthly_rate || 0) * 100) + '%';
    document.getElementById('sim-note').innerHTML = sim.note ? '<span class="yellow-text">' + sim.note + '</span>' : '<span class="green-text">정상 수수료율 적용 중</span>';
    
    const storeDetail = document.getElementById('sim-stores-detail');
    storeDetail.innerHTML = (sim.stores || []).map(s => \`
      <div class="flex justify-between bg-white/3 rounded-lg px-4 py-3 text-sm">
        <div>
          <span class="font-medium">\${s.name}</span>
          <span class="text-white/30 ml-2">\${s.plan || 'light'}</span>
        </div>
        <div>
          <span class="text-white/40">₩\${(s.fee || 0).toLocaleString()}/월</span>
          <span class="accent font-medium ml-3">→ ₩\${(s.commission || 0).toLocaleString()}</span>
        </div>
      </div>
    \`).join('');
    
  } catch (e) {
    showToast('시뮬레이션 실패: ' + e.message, 'error');
  }
}

// ==================== 토스트 ====================
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  const colors = {
    success: 'border-l-4 border-green-500',
    error: 'border-l-4 border-red-500',
    info: 'border-l-4 border-blue-500'
  };
  toast.className = 'fixed bottom-6 right-6 z-50 glass rounded-xl px-5 py-3 text-sm shadow-lg ' + (colors[type] || colors.info);
  toast.innerHTML = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}
</script>
</body>
</html>
`;
}
