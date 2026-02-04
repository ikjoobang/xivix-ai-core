// XIVIX AI Core - 고객 관리 페이지 V2
// 복붙으로 고객 데이터 일괄 등록 + AI 파싱 + AI 템플릿 생성

export function renderCustomerManagement(storeId: number): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>고객 관리 - XIVIX</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body { background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%); }
    .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); }
    .gold { color: #FFD700; }
    .btn-primary { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #000; font-weight: 600; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(255,215,0,0.4); }
    .btn-secondary { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; }
    .btn-secondary:hover { background: rgba(255,255,255,0.2); }
    .paste-area {
      min-height: 200px;
      border: 2px dashed rgba(255,215,0,0.3);
      transition: all 0.3s ease;
    }
    .paste-area:focus {
      border-color: #FFD700;
      box-shadow: 0 0 20px rgba(255,215,0,0.2);
    }
    .paste-area.dragover {
      border-color: #FFD700;
      background: rgba(255,215,0,0.1);
    }
    .customer-row:hover { background: rgba(255,255,255,0.08); }
    .customer-row.selected { background: rgba(255,215,0,0.15); border-color: rgba(255,215,0,0.5); }
    .status-pending { color: #FFA500; }
    .status-sent { color: #22C55E; }
    .status-failed { color: #EF4444; }
    .tab-active { border-bottom: 2px solid #FFD700; color: #FFD700; }
    
    /* 체크박스 스타일 */
    .custom-checkbox {
      appearance: none;
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .custom-checkbox:checked {
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
      border-color: #FFD700;
    }
    .custom-checkbox:checked::after {
      content: '✓';
      display: flex;
      justify-content: center;
      align-items: center;
      color: #000;
      font-size: 12px;
      font-weight: bold;
    }
    
    /* 월별 그룹 */
    .month-group { border-left: 3px solid #FFD700; }
    
    /* AI 챗봇 스타일 */
    .ai-chat-container {
      display: flex;
      flex-direction: column;
      height: 400px;
    }
    .ai-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    .ai-message {
      background: rgba(255,215,0,0.1);
      border-radius: 12px 12px 12px 0;
      padding: 12px;
      margin-bottom: 8px;
      max-width: 85%;
    }
    .user-message {
      background: rgba(255,255,255,0.1);
      border-radius: 12px 12px 0 12px;
      padding: 12px;
      margin-bottom: 8px;
      max-width: 85%;
      margin-left: auto;
    }
  </style>
</head>
<body class="min-h-screen text-white">
  <!-- Header -->
  <header class="glass sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <a href="/store/${storeId}/settings" class="text-white/60 hover:text-white">
          <i class="fas fa-arrow-left"></i>
        </a>
        <div>
          <h1 class="text-xl font-bold">고객 관리</h1>
          <p class="text-sm text-white/60">Store ID: ${storeId}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button onclick="showTab('import')" class="px-4 py-2 btn-secondary rounded-xl text-sm tab-btn" data-tab="import">
          <i class="fas fa-file-import mr-2"></i>고객 등록
        </button>
        <button onclick="showTab('list')" class="px-4 py-2 btn-secondary rounded-xl text-sm tab-btn" data-tab="list">
          <i class="fas fa-users mr-2"></i>고객 목록
        </button>
        <button onclick="showTab('templates')" class="px-4 py-2 btn-secondary rounded-xl text-sm tab-btn" data-tab="templates">
          <i class="fas fa-envelope mr-2"></i>메시지 템플릿
        </button>
        <button onclick="showTab('logs')" class="px-4 py-2 btn-secondary rounded-xl text-sm tab-btn" data-tab="logs">
          <i class="fas fa-history mr-2"></i>발송 내역
        </button>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 py-8">
    
    <!-- Tab 1: 고객 등록 (복붙 영역) -->
    <div id="tab-import" class="tab-content">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- 붙여넣기 영역 -->
        <div class="glass rounded-2xl p-6">
          <h2 class="text-lg font-bold flex items-center gap-2 mb-4">
            <i class="fas fa-paste gold"></i>
            고객 데이터 붙여넣기
          </h2>
          
          <div class="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
            <p class="text-sm text-blue-400">
              <i class="fas fa-lightbulb mr-2"></i>
              <strong>사용법:</strong> 네이버 플레이스, CRM 프로그램에서 고객 데이터를 복사해서 아래에 붙여넣기 하세요. AI가 자동으로 정리합니다!
            </p>
          </div>
          
          <textarea id="paste-input" 
            class="paste-area w-full px-4 py-4 bg-white/5 rounded-xl text-white resize-none focus:outline-none"
            rows="12"
            placeholder="여기에 고객 데이터를 붙여넣기 하세요...

예시 형식 (자유롭게 입력 가능):
김미영 010-1234-5678 미라클필링 2024.02.03
박서연 010-9876-5432 매직팟고주파 2024.02.01
이지은 01055556666 토닝케어 24.1.28

또는 탭/콤마로 구분된 형식:
김미영	010-1234-5678	미라클필링	2024-02-03
박서연,010-9876-5432,매직팟고주파,2024-02-01"></textarea>
          
          <div class="flex gap-3 mt-4">
            <button onclick="parseCustomerData()" class="flex-1 py-3 btn-primary rounded-xl font-medium">
              <i class="fas fa-magic mr-2"></i>AI로 분석하기
            </button>
            <button onclick="clearPasteArea()" class="px-6 py-3 btn-secondary rounded-xl">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        <!-- 파싱 결과 미리보기 -->
        <div class="glass rounded-2xl p-6">
          <h2 class="text-lg font-bold flex items-center gap-2 mb-4">
            <i class="fas fa-table gold"></i>
            분석 결과 미리보기
            <span id="parsed-count" class="text-sm bg-white/10 px-2 py-1 rounded-full ml-2">0명</span>
          </h2>
          
          <div id="parse-result" class="space-y-2 max-h-[400px] overflow-y-auto">
            <div class="text-center text-white/40 py-12">
              <i class="fas fa-paste text-4xl mb-3 block"></i>
              <p>데이터를 붙여넣고 분석하면<br>여기에 결과가 표시됩니다</p>
            </div>
          </div>
          
          <div id="save-section" class="hidden mt-4 pt-4 border-t border-white/10">
            <div class="flex items-center gap-4 mb-4">
              <label class="text-sm text-white/60">재방문 알림 주기:</label>
              <select id="followup-cycle" class="px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white">
                <option value="7">7일</option>
                <option value="14" selected>14일 (권장)</option>
                <option value="21">21일</option>
                <option value="30">30일</option>
                <option value="60">60일</option>
              </select>
            </div>
            <button onclick="saveCustomers()" class="w-full py-3 btn-primary rounded-xl font-medium">
              <i class="fas fa-save mr-2"></i>고객 저장하기
            </button>
          </div>
        </div>
      </div>
      
      <!-- 업종별 기본 주기 안내 -->
      <div class="glass rounded-2xl p-6 mt-6">
        <h3 class="font-bold mb-4 flex items-center gap-2">
          <i class="fas fa-info-circle gold"></i>
          업종별 권장 재방문 주기
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div class="bg-white/5 rounded-xl p-3 text-center">
            <i class="fas fa-spa text-pink-400 text-xl mb-2"></i>
            <p class="text-sm font-medium">피부관리</p>
            <p class="text-xs text-white/60">14일</p>
          </div>
          <div class="bg-white/5 rounded-xl p-3 text-center">
            <i class="fas fa-cut text-purple-400 text-xl mb-2"></i>
            <p class="text-sm font-medium">헤어샵</p>
            <p class="text-xs text-white/60">30일</p>
          </div>
          <div class="bg-white/5 rounded-xl p-3 text-center">
            <i class="fas fa-hand-sparkles text-red-400 text-xl mb-2"></i>
            <p class="text-sm font-medium">네일아트</p>
            <p class="text-xs text-white/60">21일</p>
          </div>
          <div class="bg-white/5 rounded-xl p-3 text-center">
            <i class="fas fa-tooth text-blue-400 text-xl mb-2"></i>
            <p class="text-sm font-medium">치과</p>
            <p class="text-xs text-white/60">180일</p>
          </div>
          <div class="bg-white/5 rounded-xl p-3 text-center">
            <i class="fas fa-dumbbell text-green-400 text-xl mb-2"></i>
            <p class="text-sm font-medium">피트니스</p>
            <p class="text-xs text-white/60">7일</p>
          </div>
          <div class="bg-white/5 rounded-xl p-3 text-center">
            <i class="fas fa-paw text-yellow-400 text-xl mb-2"></i>
            <p class="text-sm font-medium">애견미용</p>
            <p class="text-xs text-white/60">30일</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tab 2: 고객 목록 (개선됨) -->
    <div id="tab-list" class="tab-content hidden">
      <div class="glass rounded-2xl p-6">
        <!-- 상단 헤더: 검색 + 필터 + 일괄 작업 -->
        <div class="flex flex-col gap-4 mb-6">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold flex items-center gap-2">
              <i class="fas fa-users gold"></i>
              등록된 고객
              <span id="customer-count" class="text-sm bg-white/10 px-2 py-1 rounded-full ml-2">0명</span>
            </h2>
            
            <!-- 일괄 작업 버튼 (선택 시 활성화) -->
            <div id="bulk-actions" class="hidden flex items-center gap-2">
              <span id="selected-count" class="text-sm text-white/60 mr-2">0명 선택</span>
              <button onclick="bulkSendMessage()" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
                <i class="fas fa-paper-plane mr-2"></i>메시지 발송
              </button>
              <button onclick="bulkDelete()" class="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg text-sm font-medium transition-colors">
                <i class="fas fa-trash mr-2"></i>삭제
              </button>
            </div>
          </div>
          
          <!-- 필터 영역 -->
          <div class="flex flex-wrap items-center gap-3">
            <input type="text" id="search-customer" placeholder="이름, 연락처, 시술로 검색..." 
              class="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm w-64"
              onkeyup="filterCustomers()">
            
            <select id="filter-month" class="px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-sm" onchange="filterCustomers()">
              <option value="all">📅 전체 월</option>
              <option value="2026-02">2026년 2월</option>
              <option value="2026-01">2026년 1월</option>
              <option value="2025-12">2025년 12월</option>
            </select>
            
            <select id="filter-service" class="px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-sm" onchange="filterCustomers()">
              <option value="all">💆 전체 시술</option>
            </select>
            
            <select id="filter-status" class="px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-sm" onchange="filterCustomers()">
              <option value="all">🔔 전체 상태</option>
              <option value="upcoming">알림 예정 (3일 내)</option>
              <option value="overdue">알림 지남 ⚠️</option>
              <option value="sent">발송 완료 ✓</option>
            </select>
            
            <button onclick="refreshCustomers()" class="px-3 py-2 btn-secondary rounded-lg text-sm">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>
        
        <!-- 고객 목록 테이블 (컴팩트) -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-white/60 border-b border-white/10">
                <th class="pb-3 pl-2 w-8">
                  <input type="checkbox" id="select-all" class="custom-checkbox" onclick="toggleSelectAll()">
                </th>
                <th class="pb-3 w-32">고객</th>
                <th class="pb-3 w-28">연락처</th>
                <th class="pb-3">최근 시술</th>
                <th class="pb-3 w-24">방문일</th>
                <th class="pb-3 w-24">다음 알림</th>
                <th class="pb-3 w-16 text-center">횟수</th>
                <th class="pb-3 w-28 text-center">관리</th>
              </tr>
            </thead>
            <tbody id="customer-table-body">
              <tr>
                <td colspan="8" class="text-center text-white/40 py-12">
                  <i class="fas fa-users text-4xl mb-3 block"></i>
                  <p>등록된 고객이 없습니다</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Tab 3: 메시지 템플릿 (AI 챗봇 추가) -->
    <div id="tab-templates" class="tab-content hidden">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- 왼쪽: AI 챗봇으로 템플릿 생성 -->
        <div class="glass rounded-2xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold flex items-center gap-2">
              <i class="fas fa-robot gold"></i>
              AI 템플릿 생성 봇
            </h2>
            <span class="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
              <i class="fas fa-circle text-[8px] mr-1 animate-pulse"></i>온라인
            </span>
          </div>
          
          <!-- AI 챗봇 영역 -->
          <div class="ai-chat-container bg-white/5 rounded-xl">
            <div id="ai-chat-messages" class="ai-chat-messages">
              <div class="ai-message">
                <p class="text-sm">안녕하세요! 👋 메시지 템플릿 생성을 도와드릴게요.</p>
                <p class="text-sm mt-2">원하시는 템플릿 유형을 말씀해주세요:</p>
                <div class="flex flex-wrap gap-2 mt-3">
                  <button onclick="aiSuggest('재방문 안내')" class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs transition-colors">재방문 안내</button>
                  <button onclick="aiSuggest('이벤트 홍보')" class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs transition-colors">이벤트 홍보</button>
                  <button onclick="aiSuggest('생일 축하')" class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs transition-colors">생일 축하</button>
                  <button onclick="aiSuggest('시술 후 케어')" class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs transition-colors">시술 후 케어</button>
                </div>
              </div>
            </div>
            
            <!-- 입력 영역 -->
            <div class="p-4 border-t border-white/10">
              <div class="flex gap-2">
                <input type="text" id="ai-chat-input" 
                  class="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                  placeholder="원하는 템플릿을 설명해주세요..."
                  onkeypress="if(event.key==='Enter')sendAiMessage()">
                <button onclick="sendAiMessage()" class="px-4 py-2 btn-primary rounded-xl">
                  <i class="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
          
          <!-- 생성된 템플릿 미리보기 -->
          <div id="ai-generated-template" class="hidden mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-green-400 font-medium">✨ AI가 생성한 템플릿</span>
              <button onclick="applyAiTemplate()" class="px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors">
                <i class="fas fa-check mr-1"></i>적용하기
              </button>
            </div>
            <p id="ai-template-preview" class="text-sm text-white/80 whitespace-pre-wrap"></p>
          </div>
        </div>
        
        <!-- 오른쪽: 저장된 템플릿 목록 + 적용 대상 설명 -->
        <div class="space-y-6">
          <!-- 템플릿 적용 가이드 -->
          <div class="glass rounded-2xl p-6">
            <h3 class="font-bold flex items-center gap-2 mb-4">
              <i class="fas fa-info-circle gold"></i>
              템플릿 적용 가이드
            </h3>
            <div class="space-y-3 text-sm">
              <div class="flex items-start gap-3 p-3 bg-blue-500/10 rounded-xl">
                <span class="text-2xl">📱</span>
                <div>
                  <p class="font-medium text-blue-400">발송 채널: 네이버 톡톡</p>
                  <p class="text-white/60">고객에게 톡톡 메시지로 자동 발송됩니다</p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="p-3 bg-white/5 rounded-xl">
                  <p class="font-medium text-yellow-400">7일 템플릿</p>
                  <p class="text-xs text-white/60">피트니스, 단기 관리 고객용</p>
                </div>
                <div class="p-3 bg-white/5 rounded-xl">
                  <p class="font-medium text-green-400">14일 템플릿</p>
                  <p class="text-xs text-white/60">피부관리, 정기 관리 고객용</p>
                </div>
                <div class="p-3 bg-white/5 rounded-xl">
                  <p class="font-medium text-blue-400">30일 템플릿</p>
                  <p class="text-xs text-white/60">미용실, 네일샵 고객용</p>
                </div>
                <div class="p-3 bg-white/5 rounded-xl">
                  <p class="font-medium text-purple-400">60일+ 템플릿</p>
                  <p class="text-xs text-white/60">치과, 장기 관리 고객용</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 저장된 템플릿 목록 -->
          <div class="glass rounded-2xl p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold flex items-center gap-2">
                <i class="fas fa-envelope gold"></i>
                저장된 템플릿
              </h2>
            </div>
            
            <div id="template-list" class="space-y-3 max-h-[300px] overflow-y-auto">
              <div class="text-center text-white/40 py-8">
                <i class="fas fa-envelope text-3xl mb-2 block"></i>
                <p>템플릿을 불러오는 중...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 템플릿 편집 모달 (간소화) -->
      <div id="template-modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="glass rounded-2xl p-6 w-full max-w-lg mx-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-lg">템플릿 편집</h3>
            <button onclick="closeTemplateModal()" class="text-white/60 hover:text-white">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-white/60 mb-2">템플릿 이름</label>
              <input type="text" id="template-name" 
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                placeholder="예: 피부관리 재방문 안내">
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-2">발송 시점 (방문 후 며칠?)</label>
              <div class="flex items-center gap-3">
                <input type="number" id="template-days" value="14" min="1" max="365"
                  class="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center">
                <span class="text-white/60">일 후 발송</span>
              </div>
            </div>
            
            <div>
              <label class="block text-sm text-white/60 mb-2">메시지 내용</label>
              <textarea id="template-content" rows="5"
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white resize-none"
                placeholder="안녕하세요 {고객명}님! 
{매장명}입니다.
{시술명} 시술 후 {경과일}일이 지났네요."></textarea>
              <p class="text-xs text-white/40 mt-2">
                사용 가능한 변수: {고객명}, {매장명}, {시술명}, {경과일}, {방문일}
              </p>
            </div>
            
            <button onclick="saveTemplate()" class="w-full py-3 btn-primary rounded-xl font-medium">
              <i class="fas fa-save mr-2"></i>템플릿 저장
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tab 4: 발송 내역 -->
    <div id="tab-logs" class="tab-content hidden">
      <div class="glass rounded-2xl p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-bold flex items-center gap-2">
            <i class="fas fa-history gold"></i>
            메시지 발송 내역
          </h2>
          <div class="flex items-center gap-3">
            <select id="log-filter" class="px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-sm" onchange="filterLogs()">
              <option value="all">전체</option>
              <option value="sent">발송 완료</option>
              <option value="pending">대기 중</option>
              <option value="failed">실패</option>
            </select>
          </div>
        </div>
        
        <div id="log-list" class="space-y-2">
          <div class="text-center text-white/40 py-12">
            <i class="fas fa-history text-4xl mb-3 block"></i>
            <p>발송 내역이 없습니다</p>
          </div>
        </div>
      </div>
    </div>
    
  </main>

  <!-- Toast -->
  <div id="toast" class="fixed bottom-4 right-4 px-6 py-3 rounded-xl text-white font-medium transform translate-y-20 opacity-0 transition-all duration-300 z-50"></div>

  <script>
    const STORE_ID = ${storeId};
    let parsedCustomers = [];
    let allCustomers = [];
    let currentTemplateId = null;
    let selectedCustomerIds = new Set();
    let aiGeneratedTemplate = '';
    
    // 고객 이름별 색상 맵
    const customerColorMap = {};
    const colorPalette = [
      'from-yellow-500 to-orange-500',
      'from-pink-500 to-rose-500',
      'from-blue-500 to-cyan-500',
      'from-green-500 to-emerald-500',
      'from-purple-500 to-violet-500',
      'from-red-500 to-pink-500',
      'from-teal-500 to-green-500',
      'from-indigo-500 to-blue-500',
    ];
    
    function getCustomerColor(name) {
      if (!customerColorMap[name]) {
        const existingColors = Object.values(customerColorMap);
        const availableColors = colorPalette.filter(c => !existingColors.includes(c));
        customerColorMap[name] = availableColors.length > 0 
          ? availableColors[0] 
          : colorPalette[Object.keys(customerColorMap).length % colorPalette.length];
      }
      return customerColorMap[name];
    }
    
    // 탭 전환
    function showTab(tabName) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('tab-active'));
      
      document.getElementById('tab-' + tabName).classList.remove('hidden');
      document.querySelector('[data-tab="' + tabName + '"]').classList.add('tab-active');
      
      if (tabName === 'list') loadCustomers();
      if (tabName === 'templates') loadTemplates();
      if (tabName === 'logs') loadLogs();
    }
    
    // 초기화
    document.addEventListener('DOMContentLoaded', () => {
      showTab('import');
      
      const pasteArea = document.getElementById('paste-input');
      pasteArea.addEventListener('paste', (e) => {
        setTimeout(() => parseCustomerData(), 100);
      });
    });
    
    // AI로 고객 데이터 파싱
    async function parseCustomerData() {
      const input = document.getElementById('paste-input').value.trim();
      if (!input) {
        showToast('데이터를 입력해주세요', 'error');
        return;
      }
      
      showToast('AI가 데이터를 분석 중...', 'info');
      
      try {
        const res = await fetch('/api/customers/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw_data: input, store_id: STORE_ID })
        });
        
        const data = await res.json();
        if (data.success && data.data.customers) {
          parsedCustomers = data.data.customers;
          renderParsedCustomers(parsedCustomers);
          showToast(parsedCustomers.length + '명의 고객 정보를 분석했습니다!', 'success');
        } else {
          showToast('분석 실패: ' + (data.error || '알 수 없는 오류'), 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('네트워크 오류', 'error');
      }
    }
    
    function renderParsedCustomers(customers) {
      const container = document.getElementById('parse-result');
      const countEl = document.getElementById('parsed-count');
      const saveSection = document.getElementById('save-section');
      
      countEl.textContent = customers.length + '명';
      
      if (customers.length === 0) {
        container.innerHTML = '<div class="text-center text-white/40 py-8">분석된 고객이 없습니다</div>';
        saveSection.classList.add('hidden');
        return;
      }
      
      saveSection.classList.remove('hidden');
      
      container.innerHTML = customers.map((c, i) => \`
        <div class="flex items-center gap-3 p-3 bg-white/5 rounded-xl customer-row" data-index="\${i}">
          <div class="w-8 h-8 rounded-full bg-gradient-to-r \${getCustomerColor(c.customer_name)} flex items-center justify-center text-black font-bold text-sm">
            \${c.customer_name?.charAt(0) || '?'}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">\${c.customer_name || '이름 없음'}</p>
            <p class="text-sm text-white/60">\${c.phone || '-'} · \${c.last_service || '-'}</p>
          </div>
          <div class="text-sm text-white/60">
            \${c.last_visit_date || '-'}
          </div>
          <button onclick="removeParsedCustomer(\${i})" class="text-white/40 hover:text-red-400 px-2">
            <i class="fas fa-times"></i>
          </button>
        </div>
      \`).join('');
    }
    
    function removeParsedCustomer(index) {
      parsedCustomers.splice(index, 1);
      renderParsedCustomers(parsedCustomers);
    }
    
    function clearPasteArea() {
      document.getElementById('paste-input').value = '';
      parsedCustomers = [];
      renderParsedCustomers([]);
    }
    
    async function saveCustomers() {
      if (parsedCustomers.length === 0) {
        showToast('저장할 고객이 없습니다', 'error');
        return;
      }
      
      const followupCycle = parseInt(document.getElementById('followup-cycle').value);
      
      try {
        const res = await fetch('/api/customers/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: STORE_ID,
            customers: parsedCustomers,
            followup_cycle_days: followupCycle
          })
        });
        
        const data = await res.json();
        if (data.success) {
          showToast(data.data.inserted + '명의 고객이 저장되었습니다!', 'success');
          clearPasteArea();
        } else {
          showToast('저장 실패: ' + (data.error || '알 수 없는 오류'), 'error');
        }
      } catch (err) {
        showToast('네트워크 오류', 'error');
      }
    }
    
    // 고객 목록 로드
    async function loadCustomers() {
      try {
        const res = await fetch('/api/stores/' + STORE_ID + '/customers');
        const data = await res.json();
        
        if (data.success) {
          allCustomers = data.data;
          updateServiceFilter(allCustomers);
          updateMonthFilter(allCustomers);
          renderCustomerTable(allCustomers);
          document.getElementById('customer-count').textContent = data.data.length + '명';
        }
      } catch (err) {
        console.error(err);
      }
    }
    
    function refreshCustomers() {
      loadCustomers();
      showToast('새로고침 완료', 'success');
    }
    
    // 시술 필터 업데이트
    function updateServiceFilter(customers) {
      const services = [...new Set(customers.map(c => c.last_service).filter(Boolean))];
      const select = document.getElementById('filter-service');
      select.innerHTML = '<option value="all">💆 전체 시술</option>' + 
        services.map(s => \`<option value="\${s}">\${s}</option>\`).join('');
    }
    
    // 월별 필터 업데이트
    function updateMonthFilter(customers) {
      const months = [...new Set(customers.map(c => {
        if (!c.last_visit_date) return null;
        return c.last_visit_date.substring(0, 7);
      }).filter(Boolean))].sort().reverse();
      
      const select = document.getElementById('filter-month');
      select.innerHTML = '<option value="all">📅 전체 월</option>' + 
        months.map(m => {
          const [y, mon] = m.split('-');
          return \`<option value="\${m}">\${y}년 \${parseInt(mon)}월</option>\`;
        }).join('');
    }
    
    // 필터링
    function filterCustomers() {
      const search = document.getElementById('search-customer').value.toLowerCase();
      const month = document.getElementById('filter-month').value;
      const service = document.getElementById('filter-service').value;
      const status = document.getElementById('filter-status').value;
      
      const today = new Date().toISOString().split('T')[0];
      const threeDaysLater = new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0];
      
      const filtered = allCustomers.filter(c => {
        // 검색 필터
        const matchSearch = !search || 
          (c.customer_name || '').toLowerCase().includes(search) ||
          (c.phone || '').includes(search) ||
          (c.last_service || '').toLowerCase().includes(search);
        
        // 월별 필터
        const matchMonth = month === 'all' || (c.last_visit_date && c.last_visit_date.startsWith(month));
        
        // 시술 필터
        const matchService = service === 'all' || c.last_service === service;
        
        // 상태 필터
        let matchStatus = true;
        if (status === 'upcoming') {
          matchStatus = c.next_followup_date && c.next_followup_date <= threeDaysLater && c.next_followup_date >= today;
        } else if (status === 'overdue') {
          matchStatus = c.next_followup_date && c.next_followup_date < today;
        } else if (status === 'sent') {
          matchStatus = c.last_message_sent_at != null;
        }
        
        return matchSearch && matchMonth && matchService && matchStatus;
      });
      
      renderCustomerTable(filtered);
    }
    
    // 고객 테이블 렌더링 (컴팩트 버전)
    function renderCustomerTable(customers) {
      const tbody = document.getElementById('customer-table-body');
      
      if (customers.length === 0) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="8" class="text-center text-white/40 py-12">
              <i class="fas fa-users text-4xl mb-3 block"></i>
              <p>조건에 맞는 고객이 없습니다</p>
            </td>
          </tr>
        \`;
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      const threeDays = new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0];
      
      tbody.innerHTML = customers.map(c => {
        const isOverdue = c.next_followup_date && c.next_followup_date < today;
        const isUpcoming = c.next_followup_date && c.next_followup_date <= threeDays && c.next_followup_date >= today;
        const isSelected = selectedCustomerIds.has(c.id);
        const colorClass = getCustomerColor(c.customer_name);
        
        return \`
          <tr class="border-b border-white/5 customer-row \${isSelected ? 'selected' : ''}" data-id="\${c.id}">
            <td class="py-2 pl-2">
              <input type="checkbox" class="custom-checkbox customer-checkbox" 
                data-id="\${c.id}" 
                \${isSelected ? 'checked' : ''}
                onchange="toggleCustomerSelect(\${c.id})">
            </td>
            <td class="py-2">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-gradient-to-r \${colorClass} flex items-center justify-center text-black font-bold text-xs flex-shrink-0">
                  \${c.customer_name?.charAt(0) || '?'}
                </div>
                <span class="font-medium truncate max-w-[80px]" title="\${c.customer_name}">\${c.customer_name}</span>
              </div>
            </td>
            <td class="py-2 text-white/70 text-xs">\${formatPhone(c.phone)}</td>
            <td class="py-2 truncate max-w-[150px]" title="\${c.last_service || '-'}">
              <span class="px-2 py-1 bg-white/10 rounded text-xs">\${c.last_service || '-'}</span>
            </td>
            <td class="py-2 text-white/60 text-xs">\${formatDate(c.last_visit_date)}</td>
            <td class="py-2">
              <span class="text-xs px-2 py-1 rounded \${isOverdue ? 'bg-red-500/20 text-red-400' : isUpcoming ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-white/60'}">
                \${formatDate(c.next_followup_date)}
                \${isOverdue ? ' ⚠️' : ''}
              </span>
            </td>
            <td class="py-2 text-center">
              <span class="text-xs bg-white/10 px-2 py-1 rounded-full">\${c.total_visits || 1}회</span>
            </td>
            <td class="py-2 text-center">
              <div class="flex items-center justify-center gap-1">
                <button onclick="sendSingleMessage(\${c.id})" class="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded transition-colors" title="메시지 발송">
                  <i class="fas fa-paper-plane text-xs"></i>
                </button>
                <button onclick="editCustomer(\${c.id})" class="p-1.5 text-white/40 hover:bg-white/10 rounded transition-colors" title="수정">
                  <i class="fas fa-edit text-xs"></i>
                </button>
                <button onclick="deleteCustomer(\${c.id})" class="p-1.5 text-white/40 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors" title="삭제">
                  <i class="fas fa-trash text-xs"></i>
                </button>
              </div>
            </td>
          </tr>
        \`;
      }).join('');
    }
    
    function formatPhone(phone) {
      if (!phone) return '-';
      const clean = phone.replace(/[^0-9]/g, '');
      if (clean.length === 11) {
        return clean.replace(/(\\d{3})(\\d{4})(\\d{4})/, '$1-$2-$3');
      }
      return phone;
    }
    
    function formatDate(dateStr) {
      if (!dateStr) return '-';
      const [y, m, d] = dateStr.split('-');
      return \`\${m}/\${d}\`;
    }
    
    // 선택 관련
    function toggleSelectAll() {
      const selectAll = document.getElementById('select-all');
      const checkboxes = document.querySelectorAll('.customer-checkbox');
      
      checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
        const id = parseInt(cb.dataset.id);
        if (selectAll.checked) {
          selectedCustomerIds.add(id);
        } else {
          selectedCustomerIds.delete(id);
        }
      });
      
      updateBulkActions();
    }
    
    function toggleCustomerSelect(id) {
      if (selectedCustomerIds.has(id)) {
        selectedCustomerIds.delete(id);
      } else {
        selectedCustomerIds.add(id);
      }
      updateBulkActions();
    }
    
    function updateBulkActions() {
      const bulkActions = document.getElementById('bulk-actions');
      const selectedCount = document.getElementById('selected-count');
      
      if (selectedCustomerIds.size > 0) {
        bulkActions.classList.remove('hidden');
        selectedCount.textContent = selectedCustomerIds.size + '명 선택';
      } else {
        bulkActions.classList.add('hidden');
      }
    }
    
    // 일괄 작업
    async function bulkSendMessage() {
      if (selectedCustomerIds.size === 0) {
        showToast('고객을 선택해주세요', 'error');
        return;
      }
      
      if (!confirm(selectedCustomerIds.size + '명에게 메시지를 발송하시겠습니까?')) return;
      
      showToast(selectedCustomerIds.size + '명에게 메시지 발송 중...', 'info');
      
      try {
        const res = await fetch('/api/stores/' + STORE_ID + '/send-bulk-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_ids: Array.from(selectedCustomerIds) })
        });
        
        const data = await res.json();
        if (data.success) {
          showToast('발송 완료! (성공: ' + data.data.sent + ', 실패: ' + data.data.failed + ')', 'success');
          selectedCustomerIds.clear();
          updateBulkActions();
          loadCustomers();
        } else {
          showToast('발송 실패: ' + data.error, 'error');
        }
      } catch (err) {
        showToast('네트워크 오류', 'error');
      }
    }
    
    async function bulkDelete() {
      if (selectedCustomerIds.size === 0) {
        showToast('고객을 선택해주세요', 'error');
        return;
      }
      
      if (!confirm(selectedCustomerIds.size + '명의 고객을 삭제하시겠습니까?\\n이 작업은 되돌릴 수 없습니다.')) return;
      
      try {
        const res = await fetch('/api/stores/' + STORE_ID + '/customers/bulk-delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_ids: Array.from(selectedCustomerIds) })
        });
        
        const data = await res.json();
        if (data.success) {
          showToast(data.data.deleted + '명 삭제 완료', 'success');
          selectedCustomerIds.clear();
          updateBulkActions();
          loadCustomers();
        } else {
          showToast('삭제 실패: ' + data.error, 'error');
        }
      } catch (err) {
        showToast('네트워크 오류', 'error');
      }
    }
    
    function sendSingleMessage(id) {
      selectedCustomerIds.clear();
      selectedCustomerIds.add(id);
      bulkSendMessage();
    }
    
    function editCustomer(id) {
      // TODO: 고객 수정 모달
      showToast('고객 수정 기능 준비 중', 'info');
    }
    
    async function deleteCustomer(id) {
      if (!confirm('정말 삭제하시겠습니까?')) return;
      
      try {
        const res = await fetch('/api/customers/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          showToast('삭제되었습니다', 'success');
          loadCustomers();
        }
      } catch (err) {
        showToast('삭제 실패', 'error');
      }
    }
    
    // ========== 템플릿 관련 ==========
    
    // AI 챗봇
    function aiSuggest(type) {
      document.getElementById('ai-chat-input').value = type + ' 메시지 템플릿 만들어줘';
      sendAiMessage();
    }
    
    async function sendAiMessage() {
      const input = document.getElementById('ai-chat-input');
      const message = input.value.trim();
      if (!message) return;
      
      const chatContainer = document.getElementById('ai-chat-messages');
      
      // 사용자 메시지 추가
      chatContainer.innerHTML += \`
        <div class="user-message">
          <p class="text-sm">\${message}</p>
        </div>
      \`;
      
      input.value = '';
      chatContainer.scrollTop = chatContainer.scrollHeight;
      
      // AI 응답 로딩
      chatContainer.innerHTML += \`
        <div class="ai-message" id="ai-loading">
          <p class="text-sm"><i class="fas fa-spinner fa-spin mr-2"></i>템플릿 생성 중...</p>
        </div>
      \`;
      chatContainer.scrollTop = chatContainer.scrollHeight;
      
      try {
        const res = await fetch('/api/stores/' + STORE_ID + '/generate-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: message })
        });
        
        const data = await res.json();
        
        // 로딩 제거
        document.getElementById('ai-loading')?.remove();
        
        if (data.success && data.data.template) {
          aiGeneratedTemplate = data.data.template;
          
          // AI 응답 추가
          chatContainer.innerHTML += \`
            <div class="ai-message">
              <p class="text-sm">✨ 템플릿을 생성했어요!</p>
              <p class="text-sm text-white/60 mt-2">아래에서 확인하고 적용해주세요.</p>
            </div>
          \`;
          
          // 미리보기 표시
          document.getElementById('ai-generated-template').classList.remove('hidden');
          document.getElementById('ai-template-preview').textContent = aiGeneratedTemplate;
        } else {
          chatContainer.innerHTML += \`
            <div class="ai-message">
              <p class="text-sm text-red-400">죄송해요, 템플릿 생성에 실패했어요. 다시 시도해주세요.</p>
            </div>
          \`;
        }
      } catch (err) {
        document.getElementById('ai-loading')?.remove();
        chatContainer.innerHTML += \`
          <div class="ai-message">
            <p class="text-sm text-red-400">네트워크 오류가 발생했어요.</p>
          </div>
        \`;
      }
      
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    function applyAiTemplate() {
      if (!aiGeneratedTemplate) return;
      
      document.getElementById('template-content').value = aiGeneratedTemplate;
      document.getElementById('template-name').value = '새 템플릿 ' + new Date().toLocaleDateString('ko');
      
      openTemplateModal();
      
      showToast('템플릿이 적용되었습니다. 저장해주세요!', 'success');
    }
    
    function openTemplateModal() {
      document.getElementById('template-modal').classList.remove('hidden');
    }
    
    function closeTemplateModal() {
      document.getElementById('template-modal').classList.add('hidden');
    }
    
    // 템플릿 목록 로드
    async function loadTemplates() {
      try {
        const res = await fetch('/api/stores/' + STORE_ID + '/templates');
        const data = await res.json();
        
        if (data.success) {
          renderTemplateList(data.data);
        }
      } catch (err) {
        console.error(err);
      }
    }
    
    function renderTemplateList(templates) {
      const container = document.getElementById('template-list');
      
      if (templates.length === 0) {
        container.innerHTML = \`
          <div class="text-center text-white/40 py-8">
            <i class="fas fa-envelope text-3xl mb-2 block"></i>
            <p>등록된 템플릿이 없습니다</p>
            <p class="text-sm mt-2">AI 봇에게 만들어달라고 해보세요!</p>
          </div>
        \`;
        return;
      }
      
      container.innerHTML = templates.map(t => {
        const dayLabel = t.trigger_days <= 7 ? 'text-yellow-400' : 
                        t.trigger_days <= 14 ? 'text-green-400' : 
                        t.trigger_days <= 30 ? 'text-blue-400' : 'text-purple-400';
        
        return \`
          <div class="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-medium text-sm truncate flex-1 mr-2">\${t.template_name}</h3>
              <span class="text-xs \${dayLabel} bg-white/10 px-2 py-1 rounded-full flex-shrink-0">\${t.trigger_days}일</span>
            </div>
            <p class="text-xs text-white/60 line-clamp-2 mb-3">\${t.message_content}</p>
            <div class="flex gap-2">
              <button onclick="editTemplate(\${t.id})" class="flex-1 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                <i class="fas fa-edit mr-1"></i>수정
              </button>
              <button onclick="deleteTemplate(\${t.id})" class="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 rounded-lg transition-colors">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        \`;
      }).join('');
    }
    
    async function saveTemplate() {
      const name = document.getElementById('template-name').value.trim();
      const days = parseInt(document.getElementById('template-days').value);
      const content = document.getElementById('template-content').value.trim();
      
      if (!name || !content) {
        showToast('템플릿 이름과 내용을 입력해주세요', 'error');
        return;
      }
      
      try {
        const res = await fetch('/api/templates' + (currentTemplateId ? '/' + currentTemplateId : ''), {
          method: currentTemplateId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: STORE_ID,
            template_name: name,
            trigger_type: 'after_visit',
            trigger_days: days,
            message_content: content
          })
        });
        
        const data = await res.json();
        if (data.success) {
          showToast('템플릿이 저장되었습니다!', 'success');
          closeTemplateModal();
          loadTemplates();
          clearTemplateForm();
        } else {
          showToast('저장 실패: ' + data.error, 'error');
        }
      } catch (err) {
        showToast('네트워크 오류', 'error');
      }
    }
    
    async function editTemplate(id) {
      currentTemplateId = id;
      
      try {
        const res = await fetch('/api/templates/' + id);
        const data = await res.json();
        
        if (data.success) {
          document.getElementById('template-name').value = data.data.template_name;
          document.getElementById('template-days').value = data.data.trigger_days;
          document.getElementById('template-content').value = data.data.message_content;
          openTemplateModal();
        }
      } catch (err) {
        showToast('템플릿 로드 실패', 'error');
      }
    }
    
    async function deleteTemplate(id) {
      if (!confirm('템플릿을 삭제하시겠습니까?')) return;
      
      try {
        const res = await fetch('/api/templates/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          showToast('삭제되었습니다', 'success');
          loadTemplates();
        }
      } catch (err) {
        showToast('삭제 실패', 'error');
      }
    }
    
    function clearTemplateForm() {
      currentTemplateId = null;
      document.getElementById('template-name').value = '';
      document.getElementById('template-days').value = '14';
      document.getElementById('template-content').value = '';
    }
    
    // 발송 내역 로드
    async function loadLogs() {
      try {
        const res = await fetch('/api/stores/' + STORE_ID + '/followup-logs');
        const data = await res.json();
        
        if (data.success) {
          renderLogs(data.data);
        }
      } catch (err) {
        console.error(err);
      }
    }
    
    function filterLogs() {
      loadLogs();
    }
    
    function renderLogs(logs) {
      const container = document.getElementById('log-list');
      const filter = document.getElementById('log-filter').value;
      
      const filtered = filter === 'all' ? logs : logs.filter(l => l.status === filter);
      
      if (filtered.length === 0) {
        container.innerHTML = \`
          <div class="text-center text-white/40 py-12">
            <i class="fas fa-history text-4xl mb-3 block"></i>
            <p>발송 내역이 없습니다</p>
          </div>
        \`;
        return;
      }
      
      container.innerHTML = filtered.map(l => \`
        <div class="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
          <div class="w-10 h-10 rounded-full flex items-center justify-center \${l.status === 'sent' ? 'bg-green-500/20 text-green-400' : l.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}">
            <i class="fas \${l.status === 'sent' ? 'fa-check' : l.status === 'failed' ? 'fa-times' : 'fa-clock'}"></i>
          </div>
          <div class="flex-1">
            <p class="font-medium">\${l.customer_name || '고객'}</p>
            <p class="text-sm text-white/60 truncate">\${l.message_content?.substring(0, 50)}...</p>
          </div>
          <div class="text-sm text-white/60">
            \${new Date(l.sent_at).toLocaleString('ko-KR')}
          </div>
        </div>
      \`).join('');
    }
    
    // Toast 메시지
    function showToast(message, type = 'info') {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = 'fixed bottom-4 right-4 px-6 py-3 rounded-xl text-white font-medium transform transition-all duration-300 z-50 ' + 
        (type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500');
      toast.classList.remove('translate-y-20', 'opacity-0');
      
      setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
      }, 3000);
    }
  </script>
</body>
</html>
`;
}
