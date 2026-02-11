// XIVIX AI - 사장님용 사용설명서 (웹 가이드 페이지)
// 네이버 톡톡 매니저 등록 + 결제 흐름 스텝바이스텝

export function renderGuidePage(): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX AI 사용설명서 - 사장님 가이드</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fafafa; color: #1a1a1a; }
    
    /* Hero */
    .hero { background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #43A047 100%); }
    
    /* Accent Colors */
    .accent-green { color: #2E7D32; }
    .bg-accent { background: #2E7D32; }
    .border-accent { border-color: #2E7D32; }
    
    /* Step Card */
    .step-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      border: 1px solid #e8e8e8;
      transition: all 0.2s;
      overflow: hidden;
    }
    .step-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.1); transform: translateY(-2px); }
    
    /* Chapter Badge */
    .chapter-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 14px;
    }
    
    /* Click Target Highlight */
    .click-target {
      background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
      border: 2px solid #FF9800;
      border-radius: 12px;
      padding: 12px 16px;
      position: relative;
    }
    .click-target::before {
      content: '👆 여기를 클릭!';
      position: absolute;
      top: -12px;
      left: 16px;
      background: #FF9800;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 999px;
    }
    
    /* Warning Box */
    .warning-box {
      background: #FFF3E0;
      border-left: 4px solid #FF9800;
      border-radius: 0 12px 12px 0;
      padding: 16px 20px;
    }
    
    /* Important Box */
    .important-box {
      background: #E8F5E9;
      border-left: 4px solid #2E7D32;
      border-radius: 0 12px 12px 0;
      padding: 16px 20px;
    }
    
    /* Mock Screenshot */
    .mock-screen {
      background: #f5f5f5;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
    }
    .mock-browser-bar {
      background: #e8e8e8;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .mock-dot { width: 10px; height: 10px; border-radius: 50%; }
    .mock-url {
      flex: 1;
      background: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      color: #666;
    }
    .mock-content {
      padding: 20px;
      min-height: 200px;
    }
    
    /* Red circle annotation */
    .red-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: #E53935;
      color: white;
      border-radius: 50%;
      font-weight: 800;
      font-size: 16px;
      box-shadow: 0 2px 8px rgba(229,57,53,0.4);
    }
    
    /* Arrow pointer */
    .arrow-pointer {
      color: #E53935;
      font-size: 24px;
      animation: bounce-arrow 1s infinite;
    }
    @keyframes bounce-arrow {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(8px); }
    }
    
    /* Flow Connector */
    .flow-line {
      width: 3px;
      background: linear-gradient(to bottom, #2E7D32, #43A047);
      margin-left: 20px;
    }
    
    /* Progress */
    .progress-dot {
      width: 42px; height: 42px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 16px;
      flex-shrink: 0;
    }
    .progress-dot.active { background: #2E7D32; color: white; }
    .progress-dot.inactive { background: #e0e0e0; color: #999; }
    
    /* Nav Sticky */
    .nav-sticky {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(255,255,255,0.95);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid #e8e8e8;
    }
    
    /* Copy Button */
    .copy-btn {
      background: #2E7D32;
      color: white;
      border: none;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .copy-btn:hover { background: #1B5E20; }
    .copy-btn.copied { background: #E53935; }
    
    /* Smooth scroll */
    html { scroll-behavior: smooth; }
    
    /* FAQ Toggle */
    .faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
    .faq-item.open .faq-answer { max-height: 300px; }
    .faq-item.open .faq-arrow { transform: rotate(180deg); }
    .faq-arrow { transition: transform 0.3s; }
    
    /* Pricing Card */
    .plan-card { border: 2px solid #e8e8e8; border-radius: 16px; background: white; transition: all 0.2s; }
    .plan-card.recommended { border-color: #2E7D32; }
    .plan-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
    
    /* Phone mockup */
    .phone-mock {
      width: 260px;
      border: 3px solid #333;
      border-radius: 28px;
      padding: 8px;
      background: #333;
    }
    .phone-screen {
      background: white;
      border-radius: 20px;
      overflow: hidden;
      min-height: 400px;
    }
    .phone-notch {
      width: 100px;
      height: 20px;
      background: #333;
      border-radius: 0 0 12px 12px;
      margin: 0 auto;
    }
    
    @media (max-width: 768px) {
      .phone-mock { width: 100%; max-width: 300px; }
    }
  </style>
</head>
<body>

<!-- ============ HERO ============ -->
<div class="hero text-white py-12 md:py-20 px-4">
  <div class="max-w-4xl mx-auto text-center">
    <div class="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 text-sm font-semibold mb-6">
      <i class="fas fa-book-open"></i>
      사장님 전용 가이드
    </div>
    <h1 class="text-3xl md:text-5xl font-black mb-4 leading-tight">
      XIVIX AI<br class="md:hidden"> 사용설명서
    </h1>
    <p class="text-lg md:text-xl opacity-90 mb-3">
      네이버 톡톡 AI 자동응대 서비스
    </p>
    <p class="text-sm md:text-base opacity-75 max-w-xl mx-auto">
      사장님 아이디/비밀번호를 저희에게 알려주실 필요 없습니다!<br>
      아래 순서대로 따라하시면 <strong>15분</strong>이면 설정 완료!
    </p>
    
    <div class="mt-8 flex flex-wrap justify-center gap-3">
      <a href="#chapter1" class="bg-white text-green-800 font-bold px-6 py-3 rounded-full text-sm hover:bg-green-50 transition">
        <i class="fas fa-play mr-2"></i>바로 시작하기
      </a>
      <a href="tel:010-3988-0124" class="border-2 border-white/50 text-white font-bold px-6 py-3 rounded-full text-sm hover:bg-white/10 transition">
        <i class="fas fa-phone mr-2"></i>전화 도움 요청
      </a>
    </div>
  </div>
</div>

<!-- ============ QUICK FLOW ============ -->
<div class="bg-white border-b border-gray-200 py-8 px-4">
  <div class="max-w-4xl mx-auto">
    <h2 class="text-center text-lg font-bold mb-6 text-gray-700">
      <i class="fas fa-route mr-2 accent-green"></i>전체 진행 순서
    </h2>
    <div class="flex flex-wrap justify-center items-center gap-2 md:gap-3 text-sm">
      <a href="#chapter1" class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 hover:bg-green-100 transition cursor-pointer">
        <span class="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
        <span class="font-semibold text-green-800">톡톡 가입</span>
      </a>
      <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
      <a href="#chapter2" class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 hover:bg-green-100 transition cursor-pointer">
        <span class="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
        <span class="font-semibold text-green-800">매니저 초대</span>
      </a>
      <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
      <a href="#chapter3" class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 hover:bg-green-100 transition cursor-pointer">
        <span class="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
        <span class="font-semibold text-green-800">서비스 신청</span>
      </a>
      <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
      <a href="#chapter4" class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 hover:bg-green-100 transition cursor-pointer">
        <span class="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
        <span class="font-semibold text-green-800">결제</span>
      </a>
      <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
      <a href="#chapter5" class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 hover:bg-green-100 transition cursor-pointer">
        <span class="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
        <span class="font-semibold text-green-800">AI 확인</span>
      </a>
    </div>
  </div>
</div>

<!-- ============ PREPARATION ============ -->
<div class="max-w-4xl mx-auto px-4 py-10">
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
    <h2 class="text-xl font-bold mb-4">
      <i class="fas fa-clipboard-list mr-2 accent-green"></i>시작 전 준비물
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
        <div class="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <i class="fas fa-user text-green-700"></i>
        </div>
        <div>
          <p class="font-bold text-sm">네이버 아이디</p>
          <p class="text-xs text-gray-500 mt-1">사장님 본인 계정 (저희에게 알려줄 필요 없음!)</p>
        </div>
      </div>
      <div class="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
        <div class="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <i class="fas fa-building text-green-700"></i>
        </div>
        <div>
          <p class="font-bold text-sm">사업자등록증</p>
          <p class="text-xs text-gray-500 mt-1">사업자 계정 등록 시 필요</p>
        </div>
      </div>
      <div class="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
        <div class="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <i class="fas fa-mobile-alt text-green-700"></i>
        </div>
        <div>
          <p class="font-bold text-sm">휴대폰</p>
          <p class="text-xs text-gray-500 mt-1">본인 인증 & 결제 인증용</p>
        </div>
      </div>
      <div class="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
        <div class="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <i class="fas fa-laptop text-green-700"></i>
        </div>
        <div>
          <p class="font-bold text-sm">PC 또는 노트북</p>
          <p class="text-xs text-gray-500 mt-1">설정은 PC에서 하는 것이 편합니다</p>
        </div>
      </div>
    </div>
    
    <div class="important-box mt-6">
      <div class="flex items-start gap-3">
        <span class="text-2xl">🔒</span>
        <div>
          <p class="font-bold text-green-800">사장님의 네이버 아이디/비밀번호는 저희에게 알려주실 필요 없습니다!</p>
          <p class="text-sm text-green-700 mt-1">사장님이 직접 아래 과정을 따라하시면 됩니다. 어려우시면 전화(<a href="tel:010-3988-0124" class="underline font-bold">010-3988-0124</a>)로 화면 공유하며 도와드립니다.</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ============ CHAPTER 1: 톡톡 파트너센터 가입 ============ -->
<div id="chapter1" class="max-w-4xl mx-auto px-4 pb-10">
  <div class="mb-6">
    <div class="chapter-badge bg-green-100 text-green-800">
      <span class="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-black">1</span>
      네이버 톡톡 파트너센터 가입하기
    </div>
    <p class="text-sm text-gray-500 mt-2 ml-1">
      <i class="far fa-clock mr-1"></i>약 5분 + 검수 대기 (4시간~2일)
      <span class="ml-3 text-green-600 font-semibold"><i class="fas fa-signal mr-1"></i>난이도: 쉬움</span>
    </p>
  </div>

  <!-- Step 1-1 -->
  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">1</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">톡톡 파트너센터 접속</h3>
          <p class="text-gray-600 text-sm mb-4">PC 브라우저(크롬, 엣지 등)에서 아래 주소를 입력하거나, 네이버에서 <strong>'톡톡 파트너센터'</strong>를 검색하세요.</p>
          
          <div class="click-target mb-4">
            <div class="flex items-center gap-3">
              <i class="fas fa-globe text-orange-600 text-lg"></i>
              <a href="https://partner.talk.naver.com" target="_blank" class="font-mono font-bold text-orange-800 text-sm md:text-base break-all">
                partner.talk.naver.com
              </a>
              <button onclick="copyText('partner.talk.naver.com', this)" class="copy-btn ml-auto">
                <i class="fas fa-copy mr-1"></i>복사
              </button>
            </div>
          </div>
          
          <!-- Mock Screenshot -->
          <div class="mock-screen">
            <div class="mock-browser-bar">
              <div class="mock-dot" style="background:#ff5f56"></div>
              <div class="mock-dot" style="background:#ffbd2e"></div>
              <div class="mock-dot" style="background:#27ca40"></div>
              <div class="mock-url">
                <i class="fas fa-lock text-green-600 mr-1 text-xs"></i>
                partner.talk.naver.com
              </div>
            </div>
            <div class="mock-content bg-white p-6 text-center">
              <div class="inline-block mb-4">
                <div class="bg-green-500 text-white rounded-xl p-3 inline-block">
                  <i class="fas fa-comments text-3xl"></i>
                </div>
              </div>
              <h4 class="font-bold text-lg mb-2">네이버 톡톡 파트너센터</h4>
              <p class="text-sm text-gray-500 mb-6">비즈니스를 위한 톡톡 시작하기</p>
              <div class="inline-flex items-center gap-2 relative">
                <button class="bg-green-500 text-white font-bold px-8 py-3 rounded-lg text-base">
                  시작하기
                </button>
                <span class="arrow-pointer absolute -right-10"><i class="fas fa-arrow-left"></i></span>
              </div>
              <div class="absolute -right-2 top-1/2">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 1-2 -->
  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">2</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">네이버 로그인</h3>
          <p class="text-gray-600 text-sm mb-4">이미 네이버에 로그인되어 있으면 자동으로 넘어갑니다. 안 되어있으면 <strong>사장님 본인의 네이버 아이디/비밀번호</strong>로 로그인하세요.</p>
          
          <div class="mock-screen">
            <div class="mock-browser-bar">
              <div class="mock-dot" style="background:#ff5f56"></div>
              <div class="mock-dot" style="background:#ffbd2e"></div>
              <div class="mock-dot" style="background:#27ca40"></div>
              <div class="mock-url"><i class="fas fa-lock text-green-600 mr-1 text-xs"></i>nid.naver.com/nidlogin.login</div>
            </div>
            <div class="mock-content bg-white p-6">
              <div class="max-w-xs mx-auto">
                <div class="text-center mb-4">
                  <span class="text-green-500 font-black text-2xl">NAVER</span>
                </div>
                <div class="space-y-3">
                  <div class="border border-gray-300 rounded-lg p-3 text-sm text-gray-400 bg-gray-50">
                    <i class="fas fa-user mr-2"></i>아이디 입력
                  </div>
                  <div class="border border-gray-300 rounded-lg p-3 text-sm text-gray-400 bg-gray-50">
                    <i class="fas fa-lock mr-2"></i>비밀번호 입력
                  </div>
                  <div class="relative">
                    <button class="w-full bg-green-500 text-white font-bold py-3 rounded-lg">로그인</button>
                    <span class="arrow-pointer absolute -right-8 top-1/2 -translate-y-1/2"><i class="fas fa-arrow-left"></i></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 1-3 -->
  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">3</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">회원가입 & 약관 동의</h3>
          <p class="text-gray-600 text-sm mb-4">네이버 아이디와 자동 연동됩니다. 별도 가입은 필요 없고 <strong>약관만 동의</strong>하면 됩니다.</p>
          
          <div class="mock-screen">
            <div class="mock-browser-bar">
              <div class="mock-dot" style="background:#ff5f56"></div>
              <div class="mock-dot" style="background:#ffbd2e"></div>
              <div class="mock-dot" style="background:#27ca40"></div>
              <div class="mock-url"><i class="fas fa-lock text-green-600 mr-1 text-xs"></i>partner.talk.naver.com</div>
            </div>
            <div class="mock-content bg-white p-6">
              <h4 class="font-bold text-center mb-4">이용약관 동의</h4>
              <div class="space-y-3 max-w-sm mx-auto">
                <div class="flex items-center gap-3 bg-green-50 border-2 border-green-500 rounded-lg p-3 relative">
                  <div class="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-white text-xs"><i class="fas fa-check"></i></div>
                  <span class="font-bold text-sm">전체 동의</span>
                  <span class="arrow-pointer absolute -right-8"><i class="fas fa-arrow-left"></i></span>
                </div>
                <div class="flex items-center gap-3 rounded-lg p-3 border border-gray-200">
                  <div class="w-5 h-5 bg-green-500 rounded flex items-center justify-center text-white text-xs"><i class="fas fa-check"></i></div>
                  <span class="text-sm text-gray-600">서비스 이용약관 동의 (필수)</span>
                </div>
                <div class="flex items-center gap-3 rounded-lg p-3 border border-gray-200">
                  <div class="w-5 h-5 bg-green-500 rounded flex items-center justify-center text-white text-xs"><i class="fas fa-check"></i></div>
                  <span class="text-sm text-gray-600">개인정보 수집 및 이용 동의 (필수)</span>
                </div>
                <div class="relative">
                  <button class="w-full bg-green-500 text-white font-bold py-3 rounded-lg mt-2">동의</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 1-4 -->
  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">4</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">본인 인증 (휴대폰)</h3>
          <p class="text-gray-600 text-sm mb-3">사장님 본인 휴대폰 번호를 입력하고 인증번호를 받으세요.</p>
          
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
            <div class="flex items-center gap-2 mb-2">
              <i class="fas fa-mobile-alt text-blue-600"></i>
              <span class="font-bold text-blue-800">인증 순서</span>
            </div>
            <ol class="list-decimal list-inside space-y-1 text-blue-700">
              <li>휴대폰 번호 입력 (예: 010-1234-5678)</li>
              <li><strong>'인증번호 받기'</strong> 버튼 클릭</li>
              <li>문자로 온 인증번호 6자리 입력</li>
              <li><strong>'확인'</strong> 버튼 클릭</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 1-5 -->
  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">5</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">계정 정보 입력</h3>
          <p class="text-gray-600 text-sm mb-4">사업자인 경우 사업자등록증 정보를 입력합니다. 개인이면 개인으로 선택하세요.</p>
          
          <div class="bg-gray-50 rounded-xl p-4 space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-sm font-bold text-gray-600 w-28">계정 유형</span>
              <span class="text-sm">사업자 또는 개인 선택</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-bold text-gray-600 w-28">상호명</span>
              <span class="text-sm text-gray-500">예: 사업자등록증 상의 상호명</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-bold text-gray-600 w-28">사업자번호</span>
              <span class="text-sm text-gray-500">사업자등록증에 있는 번호</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-bold text-gray-600 w-28">대표자명</span>
              <span class="text-sm text-gray-500">사장님 성함</span>
            </div>
          </div>
          
          <div class="warning-box mt-4">
            <p class="text-sm"><i class="fas fa-lightbulb text-orange-500 mr-2"></i>사업자등록증을 첨부하면 검수가 더 빨리 됩니다!</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 1-6 -->
  <div class="step-card mb-4">
    <div class="bg-yellow-50 p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">6</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">
            <i class="fas fa-hourglass-half text-yellow-600 mr-2"></i>검수 대기 (자동)
          </h3>
          <p class="text-gray-600 text-sm mb-3">사용 신청이 완료되면 <strong>'검수중'</strong> 상태가 됩니다.</p>
          
          <div class="bg-white rounded-xl p-4 border border-yellow-200">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <i class="fas fa-clock text-yellow-600"></i>
              </div>
              <div>
                <p class="font-bold text-sm">검수 소요 시간: 보통 4시간 ~ 2일</p>
                <p class="text-xs text-gray-500">승인되면 문자로 알림이 옵니다</p>
              </div>
            </div>
          </div>
          
          <div class="important-box mt-4">
            <p class="text-sm font-bold text-green-800">
              <i class="fas fa-check-circle mr-1"></i>
              검수가 완료될 때까지 기다려주세요! 문자가 오면 다음 단계(매니저 초대)로 넘어갑니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ============ CHAPTER 2: 매니저 등록 (핵심!) ============ -->
<div id="chapter2" class="max-w-4xl mx-auto px-4 pb-10">
  <div class="mb-6">
    <div class="chapter-badge bg-blue-100 text-blue-800">
      <span class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-black">2</span>
      XIVIX AI를 매니저로 등록하기
    </div>
    <p class="text-sm text-gray-500 mt-2 ml-1">
      <i class="far fa-clock mr-1"></i>약 3분
      <span class="ml-3 text-green-600 font-semibold"><i class="fas fa-signal mr-1"></i>난이도: 쉬움</span>
      <span class="ml-3 text-red-600 font-semibold"><i class="fas fa-star mr-1"></i>가장 중요!</span>
    </p>
  </div>

  <div class="important-box mb-6">
    <div class="flex items-start gap-3">
      <span class="text-2xl">💡</span>
      <div>
        <p class="font-bold text-green-800 text-base">왜 매니저 등록을 해야 하나요?</p>
        <p class="text-sm text-green-700 mt-1">
          사장님의 네이버 아이디/비밀번호를 저희에게 주실 필요 없습니다!<br>
          대신 XIVIX AI를 <strong>'매니저'</strong>로 초대하면, AI가 사장님의 톡톡 메시지에 자동으로 응답할 수 있게 됩니다.
        </p>
      </div>
    </div>
  </div>

  <!-- Step 2-1 -->
  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">1</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">톡톡 파트너센터 로그인</h3>
          <p class="text-gray-600 text-sm mb-3">PC에서 톡톡 파트너센터에 접속하여 사장님 네이버 아이디로 로그인합니다.</p>
          <div class="click-target">
            <div class="flex items-center gap-3">
              <i class="fas fa-globe text-orange-600 text-lg"></i>
              <a href="https://partner.talk.naver.com" target="_blank" class="font-mono font-bold text-orange-800 text-sm md:text-base">
                partner.talk.naver.com
              </a>
              <button onclick="copyText('partner.talk.naver.com', this)" class="copy-btn ml-auto">
                <i class="fas fa-copy mr-1"></i>복사
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 2-2 -->
  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">2</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">'설정' 메뉴 찾기</h3>
          <p class="text-gray-600 text-sm mb-4">로그인 후 좌측 또는 상단 메뉴에서 <strong>'설정'</strong>을 찾아 클릭합니다.</p>
          
          <div class="mock-screen">
            <div class="mock-browser-bar">
              <div class="mock-dot" style="background:#ff5f56"></div>
              <div class="mock-dot" style="background:#ffbd2e"></div>
              <div class="mock-dot" style="background:#27ca40"></div>
              <div class="mock-url"><i class="fas fa-lock text-green-600 mr-1 text-xs"></i>partner.talk.naver.com</div>
            </div>
            <div class="mock-content bg-white flex" style="min-height: 250px;">
              <!-- Sidebar -->
              <div class="w-48 bg-gray-50 border-r border-gray-200 p-3 space-y-1 flex-shrink-0">
                <div class="text-xs font-bold text-gray-400 mb-3 px-2">메뉴</div>
                <div class="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer flex items-center gap-2">
                  <i class="fas fa-tachometer-alt w-4 text-center"></i> 대시보드
                </div>
                <div class="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer flex items-center gap-2">
                  <i class="fas fa-comments w-4 text-center"></i> 채팅
                </div>
                <div class="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer flex items-center gap-2">
                  <i class="fas fa-chart-bar w-4 text-center"></i> 통계
                </div>
                <div class="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer flex items-center gap-2">
                  <i class="fas fa-plug w-4 text-center"></i> 연결관리
                </div>
                <div class="px-3 py-2 rounded-lg text-sm bg-blue-100 text-blue-800 font-bold cursor-pointer flex items-center gap-2 border-2 border-blue-400 relative">
                  <i class="fas fa-cog w-4 text-center"></i> 설정
                  <span class="arrow-pointer absolute -right-7"><i class="fas fa-arrow-left"></i></span>
                </div>
              </div>
              <div class="flex-1 p-4 flex items-center justify-center text-gray-400 text-sm">
                ← 좌측 메뉴에서 <strong class="text-blue-600 mx-1">'설정'</strong> 클릭
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 2-3 -->
  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">3</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">'상담멤버관리' 클릭</h3>
          <p class="text-gray-600 text-sm mb-4">설정 페이지에서 <strong>'상담멤버관리'</strong> 항목을 찾아 클릭합니다.</p>
          
          <div class="mock-screen">
            <div class="mock-browser-bar">
              <div class="mock-dot" style="background:#ff5f56"></div>
              <div class="mock-dot" style="background:#ffbd2e"></div>
              <div class="mock-dot" style="background:#27ca40"></div>
              <div class="mock-url"><i class="fas fa-lock text-green-600 mr-1 text-xs"></i>partner.talk.naver.com/settings</div>
            </div>
            <div class="mock-content bg-white p-6">
              <h4 class="font-bold text-lg mb-4">⚙️ 설정</h4>
              <div class="space-y-2 max-w-md">
                <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 text-sm text-gray-600">
                  <i class="fas fa-info-circle w-5 text-center"></i> 기본 정보 설정
                </div>
                <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 text-sm text-gray-600">
                  <i class="fas fa-bell w-5 text-center"></i> 알림 설정
                </div>
                <div class="flex items-center gap-3 p-3 rounded-lg border-2 border-blue-400 bg-blue-50 text-sm text-blue-800 font-bold relative">
                  <i class="fas fa-users w-5 text-center"></i> 상담멤버관리
                  <span class="arrow-pointer absolute -right-8"><i class="fas fa-arrow-left"></i></span>
                </div>
                <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 text-sm text-gray-600">
                  <i class="fas fa-robot w-5 text-center"></i> 자동응답 설정
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 2-4 -->
  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">4</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">'새로운 멤버 초대하기' 버튼 클릭</h3>
          <p class="text-gray-600 text-sm mb-4">상담멤버관리 화면에서 <strong>'새로운 멤버 초대하기'</strong> 버튼을 클릭합니다.</p>
          
          <div class="mock-screen">
            <div class="mock-browser-bar">
              <div class="mock-dot" style="background:#ff5f56"></div>
              <div class="mock-dot" style="background:#ffbd2e"></div>
              <div class="mock-dot" style="background:#27ca40"></div>
              <div class="mock-url"><i class="fas fa-lock text-green-600 mr-1 text-xs"></i>partner.talk.naver.com/settings/members</div>
            </div>
            <div class="mock-content bg-white p-6">
              <div class="flex items-center justify-between mb-4">
                <h4 class="font-bold text-lg">👥 상담멤버관리</h4>
                <div class="relative">
                  <button class="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold">
                    + 새로운 멤버 초대하기
                  </button>
                  <span class="arrow-pointer absolute -right-8 top-1/2 -translate-y-1/2"><i class="fas fa-arrow-left"></i></span>
                </div>
              </div>
              <div class="border border-gray-200 rounded-lg p-4 text-center text-gray-400 text-sm">
                <i class="fas fa-users text-3xl mb-2 block text-gray-300"></i>
                현재 멤버: 사장님 (나) 1명
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 2-5 (핵심!) -->
  <div class="step-card mb-4 border-2 border-red-200">
    <div class="bg-red-50 px-5 py-3 border-b border-red-200">
      <span class="text-sm font-bold text-red-700"><i class="fas fa-exclamation-triangle mr-1"></i>가장 중요한 단계!</span>
    </div>
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">5</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">XIVIX AI 이메일 입력</h3>
          <p class="text-gray-600 text-sm mb-4">초대할 멤버 정보에 아래 내용을 <strong>정확히</strong> 입력하세요.</p>
          
          <!-- 핵심 정보 카드 -->
          <div class="bg-red-50 border-2 border-red-300 rounded-xl p-5 mb-4">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <i class="fas fa-envelope text-red-600 text-xl"></i>
              </div>
              <div>
                <p class="text-xs text-red-500 font-bold">복사해서 붙여넣기 하세요!</p>
                <div class="flex items-center gap-2">
                  <span class="text-xl font-black text-red-800">xivix.kr@gmail.com</span>
                  <button onclick="copyText('xivix.kr@gmail.com', this)" class="copy-btn text-base px-4 py-2">
                    <i class="fas fa-copy mr-1"></i>복사
                  </button>
                </div>
              </div>
            </div>
            
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-3 bg-white rounded-lg p-3">
                <span class="font-bold text-gray-600 w-16">이메일</span>
                <span class="font-mono font-bold text-red-700">xivix.kr@gmail.com</span>
              </div>
              <div class="flex items-center gap-3 bg-white rounded-lg p-3">
                <span class="font-bold text-gray-600 w-16">이름</span>
                <span class="font-bold">XIVIX AI</span>
              </div>
              <div class="flex items-center gap-3 bg-white rounded-lg p-3">
                <span class="font-bold text-gray-600 w-16">권한</span>
                <span class="font-bold">매니저 <span class="text-gray-400 font-normal">(또는 '상담원')</span></span>
              </div>
            </div>
          </div>
          
          <div class="mock-screen">
            <div class="mock-browser-bar">
              <div class="mock-dot" style="background:#ff5f56"></div>
              <div class="mock-dot" style="background:#ffbd2e"></div>
              <div class="mock-dot" style="background:#27ca40"></div>
              <div class="mock-url"><i class="fas fa-lock text-green-600 mr-1 text-xs"></i>partner.talk.naver.com/settings/members/invite</div>
            </div>
            <div class="mock-content bg-white p-6">
              <h4 class="font-bold mb-4">📧 새 멤버 초대</h4>
              <div class="space-y-4 max-w-md">
                <div>
                  <label class="text-sm font-bold text-gray-600 block mb-1">이메일 <span class="text-red-500">*</span></label>
                  <div class="border-2 border-red-400 rounded-lg p-3 bg-red-50 relative">
                    <span class="font-mono text-red-800 font-bold">xivix.kr@gmail.com</span>
                    <span class="absolute -right-24 top-1/2 -translate-y-1/2 text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold">
                      ← 정확히 입력!
                    </span>
                  </div>
                </div>
                <div>
                  <label class="text-sm font-bold text-gray-600 block mb-1">이름(별명)</label>
                  <div class="border border-gray-300 rounded-lg p-3">
                    <span class="text-gray-800">XIVIX AI</span>
                  </div>
                </div>
                <div>
                  <label class="text-sm font-bold text-gray-600 block mb-1">권한</label>
                  <div class="border border-gray-300 rounded-lg p-3">
                    <span class="text-gray-800">매니저 ▾</span>
                  </div>
                </div>
                <div class="relative">
                  <button class="w-full bg-blue-500 text-white font-bold py-3 rounded-lg">초대하기</button>
                  <span class="arrow-pointer absolute -right-8 top-1/2 -translate-y-1/2"><i class="fas fa-arrow-left"></i></span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="warning-box mt-4">
            <p class="text-sm font-bold text-orange-800">
              <i class="fas fa-exclamation-triangle mr-1"></i>
              이메일 주소를 틀리면 초대가 안 됩니다!<br>
              반드시 <strong>xivix.kr@gmail.com</strong>을 복사해서 붙여넣기 하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 2-6 -->
  <div class="step-card mb-4">
    <div class="bg-green-50 p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
          <i class="fas fa-check"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2 text-green-800">초대 완료! 🎉</h3>
          <p class="text-gray-600 text-sm mb-3">초대를 보내면 XIVIX 팀에서 수락 처리합니다.</p>
          <div class="bg-white rounded-xl p-4 border border-green-200">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <i class="fas fa-clock text-green-600"></i>
              </div>
              <div>
                <p class="font-bold text-sm">수락까지 보통 1시간 이내</p>
                <p class="text-xs text-gray-500">수락 완료되면 카톡 또는 문자로 알려드립니다</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ============ CHAPTER 3: 서비스 신청 ============ -->
<div id="chapter3" class="max-w-4xl mx-auto px-4 pb-10">
  <div class="mb-6">
    <div class="chapter-badge bg-purple-100 text-purple-800">
      <span class="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-black">3</span>
      AI 서비스 신청하기
    </div>
    <p class="text-sm text-gray-500 mt-2 ml-1">
      <i class="far fa-clock mr-1"></i>약 5분
      <span class="ml-3 text-green-600 font-semibold"><i class="fas fa-signal mr-1"></i>난이도: 쉬움</span>
    </p>
  </div>

  <!-- Step 3-1 -->
  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">1</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">서비스 신청 페이지 접속</h3>
          <p class="text-gray-600 text-sm mb-4">XIVIX 담당자가 보내준 링크를 클릭하거나, 아래 주소로 접속합니다.</p>
          <div class="click-target">
            <div class="flex items-center gap-3">
              <i class="fas fa-globe text-orange-600 text-lg"></i>
              <a href="https://studioaibotbot.com/connect" target="_blank" class="font-mono font-bold text-orange-800 text-sm md:text-base break-all">
                studioaibotbot.com/connect
              </a>
              <button onclick="copyText('studioaibotbot.com/connect', this)" class="copy-btn ml-auto">
                <i class="fas fa-copy mr-1"></i>복사
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 3-2 -->
  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">2</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">매장 정보 입력</h3>
          <p class="text-gray-600 text-sm mb-4">매장 이름, 업종, 연락처 등을 입력합니다. <strong>모든 정보가 AI 응답에 사용</strong>되므로 정확하게!</p>
          
          <div class="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div class="flex items-center gap-3 p-2 bg-white rounded-lg">
              <span class="text-red-500">*</span>
              <span class="font-bold text-gray-600 w-24">매장명</span>
              <span class="text-gray-500">예: 네이버플레이스 매장 이름</span>
            </div>
            <div class="flex items-center gap-3 p-2 bg-white rounded-lg">
              <span class="text-red-500">*</span>
              <span class="font-bold text-gray-600 w-24">업종 선택</span>
              <span class="text-gray-500">미용실, 음식점, 카페 등</span>
            </div>
            <div class="flex items-center gap-3 p-2 bg-white rounded-lg">
              <span class="text-red-500">*</span>
              <span class="font-bold text-gray-600 w-24">대표자 성함</span>
              <span class="text-gray-500">예: 홍길동</span>
            </div>
            <div class="flex items-center gap-3 p-2 bg-white rounded-lg">
              <span class="text-red-500">*</span>
              <span class="font-bold text-gray-600 w-24">연락처</span>
              <span class="text-gray-500">예: 010-1234-5678</span>
            </div>
            <div class="flex items-center gap-3 p-2 bg-white rounded-lg">
              <span class="text-red-500">*</span>
              <span class="font-bold text-gray-600 w-24">이메일</span>
              <span class="text-gray-500">예: shop@naver.com</span>
            </div>
            <div class="flex items-center gap-3 p-2 bg-white rounded-lg">
              <span class="text-red-500">*</span>
              <span class="font-bold text-gray-600 w-24">영업시간</span>
              <span class="text-gray-500">예: 10:00~21:00 (일요일 휴무)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 3-3 -->
  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">3</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">네이버 스마트플레이스 URL 입력 <span class="text-red-500">(중요!)</span></h3>
          <p class="text-gray-600 text-sm mb-4">이 URL을 입력하면 AI가 자동으로 매장의 메뉴, 가격, 사진, 리뷰를 분석합니다. 하나하나 입력할 필요 없어요!</p>
          
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p class="text-sm font-bold text-blue-800 mb-3"><i class="fas fa-search mr-1"></i>URL 찾는 방법</p>
            <div class="space-y-3">
              <div class="flex items-start gap-3">
                <span class="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <p class="text-sm">네이버에서 <strong>'매장이름'</strong> 검색 (예: '우리매장 강남')</p>
              </div>
              <div class="flex items-start gap-3">
                <span class="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <p class="text-sm">검색 결과에서 내 매장의 <strong>스마트플레이스</strong>가 나오면 클릭</p>
              </div>
              <div class="flex items-start gap-3">
                <span class="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <p class="text-sm">브라우저 주소창의 <strong>URL을 복사</strong>하여 붙여넣기</p>
              </div>
            </div>
          </div>
          
          <!-- 프리랜서/개인사업자 블로그·SNS 안내 -->
          <div class="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-4">
            <div class="flex items-center gap-2 mb-3">
              <i class="fas fa-user-circle text-purple-600"></i>
              <p class="text-sm font-bold text-purple-800">매장이 없는 프리랜서·개인사업자도 OK!</p>
            </div>
            <p class="text-sm text-purple-700 mb-3">네이버 플레이스가 없어도 괜찮아요. 아래 링크로도 AI가 자동 분석합니다:</p>
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-sm">
                <span class="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-white text-xs"><i class="fab fa-blogger-b"></i></span>
                <span class="text-gray-700"><strong>네이버 블로그</strong> — blog.naver.com/내블로그</span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <span class="w-6 h-6 bg-gradient-to-tr from-purple-600 to-pink-500 rounded flex items-center justify-center text-white text-xs"><i class="fab fa-instagram"></i></span>
                <span class="text-gray-700"><strong>인스타그램</strong> — instagram.com/내계정</span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <span class="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-white text-xs"><i class="fab fa-youtube"></i></span>
                <span class="text-gray-700"><strong>유튜브</strong> — youtube.com/내채널</span>
              </div>
            </div>
            <p class="text-xs text-purple-500 mt-3"><i class="fas fa-lightbulb mr-1"></i>출장 메이크업, 프리랜서 디자이너, 1인 강사 등 매장 없이 활동하는 분들에게 딱!</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 3-4: 요금제 선택 -->
  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">4</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-4">요금제 선택</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <!-- Mini -->
            <div class="plan-card recommended p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">추천</span>
                <h5 class="font-bold">미니</h5>
              </div>
              <div class="text-2xl font-black accent-green mb-1">29,000<span class="text-sm font-normal text-gray-500">원/월</span></div>
              <p class="text-xs text-gray-500 mb-1">셋팅비: <span style="text-decoration:line-through;color:#999">100,000원</span> <span style="color:#e91e63;font-weight:bold">→ 80,000원</span> <span style="background:#fce4ec;color:#c2185b;font-size:10px;padding:1px 4px;border-radius:4px">20%↓</span></p>
              <p class="text-xs text-gray-600">소규모 매장 · AI 500건/월</p>
            </div>
            <!-- Light -->
            <div class="plan-card p-4">
              <h5 class="font-bold mb-2">라이트</h5>
              <div class="text-2xl font-black accent-green mb-1">49,000<span class="text-sm font-normal text-gray-500">원/월</span></div>
              <p class="text-xs text-gray-500 mb-1">셋팅비: <span style="text-decoration:line-through;color:#999">300,000원</span> <span style="color:#e91e63;font-weight:bold">→ 240,000원</span> <span style="background:#fce4ec;color:#c2185b;font-size:10px;padding:1px 4px;border-radius:4px">20%↓</span></p>
              <p class="text-xs text-gray-600">미용실, 음식점 · AI 1,000건/월 · 다국어</p>
            </div>
            <!-- Standard -->
            <div class="plan-card p-4" style="border-color:#e91e63;position:relative">
              <div class="flex items-center gap-2 mb-2">
                <span style="background:#fce4ec;color:#c2185b;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:4px">🎁 첫달무료</span>
                <h5 class="font-bold">스탠다드</h5>
              </div>
              <div class="text-2xl font-black accent-green mb-1"><span style="text-decoration:line-through;color:#999;font-size:16px">99,000</span> <span style="color:#e91e63;font-weight:900">0원</span><span class="text-sm font-normal text-gray-500">/첫달</span></div>
              <p class="text-xs text-gray-400 mb-1">2개월차부터 99,000원/월</p>
              <p class="text-xs text-gray-500 mb-1">셋팅비: <span style="text-decoration:line-through;color:#999">300,000원</span> <span style="color:#e91e63;font-weight:bold">→ 240,000원</span> <span style="background:#fce4ec;color:#c2185b;font-size:10px;padding:1px 4px;border-radius:4px">20%↓</span></p>
              <p class="text-xs text-gray-600">병원, 학원, 프랜차이즈 · AI 5,000건/월</p>
            </div>
            <!-- Premium -->
            <div class="plan-card p-4" style="border-color:#e91e63;position:relative">
              <div class="flex items-center gap-2 mb-2">
                <span style="background:#fce4ec;color:#c2185b;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:4px">🎁 첫달무료</span>
                <h5 class="font-bold">프리미엄</h5>
              </div>
              <div class="text-2xl font-black accent-green mb-1"><span style="text-decoration:line-through;color:#999;font-size:16px">149,000</span> <span style="color:#e91e63;font-weight:900">0원</span><span class="text-sm font-normal text-gray-500">/첫달</span></div>
              <p class="text-xs text-gray-400 mb-1">2개월차부터 149,000원/월</p>
              <p class="text-xs text-gray-500 mb-1">셋팅비: <span style="text-decoration:line-through;color:#999">500,000원</span> <span style="color:#e91e63;font-weight:bold">→ 400,000원</span> <span style="background:#fce4ec;color:#c2185b;font-size:10px;padding:1px 4px;border-radius:4px">20%↓</span></p>
              <p class="text-xs text-gray-600">대형 병원, 본사 · AI 20,000건/월 · 전담 매니저</p>
            </div>
          </div>
          
          <!-- 프로모션 안내 박스 -->
          <div style="background:linear-gradient(135deg,#fff3e0,#fce4ec);border:2px solid #e91e63;border-radius:12px;padding:16px;margin-top:16px">
            <p style="font-weight:bold;color:#c2185b;margin-bottom:8px"><i class="fas fa-gift" style="margin-right:6px"></i>🎁 런칭 기념 프로모션</p>
            <div style="font-size:13px;color:#333;line-height:1.8">
              <p>✅ <strong>Standard/Premium</strong> 신규 신청 → <strong style="color:#c2185b">첫 달 월 구독료 무료!</strong></p>
              <p>✅ <strong>네이버 플레이스 인증</strong> 매장 → <strong style="color:#c2185b">셋팅비 20% 할인!</strong></p>
              <p>✅ <strong>무료 AI 도입 진단 상담</strong> 진행 중</p>
            </div>
            <p style="font-size:10px;color:#999;margin-top:8px">📅 별도 공지 시까지 · 프로모션 코드 없이 자동 적용</p>
          </div>
          
          <div class="important-box mt-4">
            <p class="text-sm"><i class="fas fa-info-circle mr-1 text-green-600"></i><strong>첫 결제</strong> = 월 구독료 + 셋팅비 | <strong>다음 달부터</strong> = 월 구독료만 자동결제</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 3-5 -->
  <div class="step-card mb-4">
    <div class="bg-green-50 p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
          <i class="fas fa-check"></i>
        </div>
        <div>
          <h3 class="font-bold text-lg mb-2 text-green-800">신청 완료! 🎉</h3>
          <p class="text-sm text-gray-600">모든 정보 입력 후 <strong>'신청하기'</strong> 버튼을 클릭하면 접수됩니다. XIVIX 팀에서 확인 후 <strong>결제 링크를 카톡/문자</strong>로 보내드립니다.</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ============ CHAPTER 4: 결제 ============ -->
<div id="chapter4" class="max-w-4xl mx-auto px-4 pb-10">
  <div class="mb-6">
    <div class="chapter-badge bg-orange-100 text-orange-800">
      <span class="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-black">4</span>
      결제하기
    </div>
    <p class="text-sm text-gray-500 mt-2 ml-1">
      <i class="far fa-clock mr-1"></i>약 2분
      <span class="ml-3 text-green-600 font-semibold"><i class="fas fa-signal mr-1"></i>난이도: 매우 쉬움</span>
    </p>
  </div>

  <!-- Step 4-1 -->
  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">1</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">결제 링크 클릭</h3>
          <p class="text-gray-600 text-sm mb-4">XIVIX 팀이 보내준 <strong>카카오톡 또는 문자</strong>의 결제 링크를 클릭합니다.</p>
          
          <!-- Mock Kakao Message -->
          <div class="max-w-xs mx-auto">
            <div class="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <div class="flex items-center gap-2 mb-3">
                <div class="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white text-xs font-bold">X</div>
                <span class="font-bold text-sm">XIVIX AI</span>
              </div>
              <div class="bg-white rounded-xl p-3 text-sm space-y-2">
                <p>안녕하세요! 😊</p>
                <p>서비스 신청이 접수되었습니다.</p>
                <p>아래 링크를 클릭하여 결제해주세요.</p>
                <div class="relative">
                  <a class="text-blue-600 underline text-xs break-all cursor-pointer block bg-blue-50 p-2 rounded-lg border border-blue-200">
                    https://api.steppay.kr/api/public/orders/order_XXXXX/pay
                  </a>
                  <span class="arrow-pointer absolute -right-8 top-1/2 -translate-y-1/2"><i class="fas fa-arrow-left text-sm"></i></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 4-2 -->
  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">2</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">결제 화면 확인</h3>
          <p class="text-gray-600 text-sm mb-4">결제 화면에서 상품 정보와 금액을 확인합니다.</p>
          
          <div class="mock-screen">
            <div class="mock-browser-bar">
              <div class="mock-dot" style="background:#ff5f56"></div>
              <div class="mock-dot" style="background:#ffbd2e"></div>
              <div class="mock-dot" style="background:#27ca40"></div>
              <div class="mock-url"><i class="fas fa-lock text-green-600 mr-1 text-xs"></i>api.steppay.kr</div>
            </div>
            <div class="mock-content bg-white p-6">
              <div class="text-center mb-4">
                <p class="text-sm text-gray-500">서비스명</p>
                <p class="font-bold text-lg">지빅스AI 'XIVIX AI'</p>
              </div>
              <div class="space-y-3 max-w-md mx-auto">
                <div class="border border-gray-200 rounded-lg p-3">
                  <div class="flex justify-between items-center">
                    <div>
                      <p class="text-sm font-bold">XIVIX AI 미니 (월간 구독)</p>
                      <p class="text-xs text-gray-500">매월 자동결제</p>
                    </div>
                    <span class="font-bold">29,000원</span>
                  </div>
                </div>
                <div class="border border-gray-200 rounded-lg p-3" style="border-color:#e91e63">
                  <div class="flex justify-between items-center">
                    <div>
                      <p class="text-sm font-bold">소상공인 셋팅비 <span style="background:#fce4ec;color:#c2185b;font-size:10px;padding:1px 4px;border-radius:4px">🎁 20%할인</span></p>
                      <p class="text-xs text-gray-500">1회 결제</p>
                    </div>
                    <div class="text-right">
                      <span style="text-decoration:line-through;color:#999;font-size:12px">100,000원</span>
                      <span class="font-bold" style="color:#c2185b;margin-left:4px">80,000원</span>
                    </div>
                  </div>
                </div>
                <div class="bg-green-50 border-2 border-green-500 rounded-lg p-3">
                  <div class="flex justify-between items-center">
                    <span class="font-bold text-green-800">총 결제 금액</span>
                    <div class="text-right">
                      <span style="text-decoration:line-through;color:#999;font-size:14px">129,000원</span>
                      <span class="text-xl font-black text-green-800" style="margin-left:4px">109,000원</span>
                    </div>
                  </div>
                  <p class="text-xs text-green-600 mt-1">※ 다음 달부터 29,000원만 자동결제</p>
                  <p class="text-xs mt-1" style="color:#c2185b">🎁 네이버 플레이스 인증 → 셋팅비 20% 자동 할인 적용!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 4-3 -->
  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">3</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-2">결제 수단 선택 & 결제</h3>
          <p class="text-gray-600 text-sm mb-4">원하는 결제 수단을 선택하고 결제합니다.</p>
          
          <div class="space-y-2">
            <div class="flex items-center gap-3 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-xl relative">
              <span class="text-2xl">💳</span>
              <div>
                <span class="font-bold text-sm">카카오페이</span>
                <span class="text-xs text-green-600 ml-2 font-bold">추천!</span>
                <p class="text-xs text-gray-500">카카오톡으로 간편 결제</p>
              </div>
              <span class="arrow-pointer absolute right-2"><i class="fas fa-arrow-left"></i></span>
            </div>
            <div class="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span class="text-2xl">💳</span>
              <div>
                <span class="font-bold text-sm">신용카드</span>
                <p class="text-xs text-gray-500">카드 번호 입력하여 결제</p>
              </div>
            </div>
            <div class="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span class="text-2xl">🏦</span>
              <div>
                <span class="font-bold text-sm">가상계좌</span>
                <p class="text-xs text-gray-500">계좌이체로 결제</p>
              </div>
            </div>
          </div>
          
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 text-sm">
            <p class="font-bold text-blue-800 mb-1"><i class="fas fa-info-circle mr-1"></i>정기결제 동의</p>
            <p class="text-blue-700">약관에 동의 체크 → <strong>'결제하기'</strong> 버튼 클릭 → 카카오페이면 카톡에서 비밀번호 입력하면 끝!</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 4-4 -->
  <div class="step-card mb-4">
    <div class="bg-green-50 p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
          <i class="fas fa-check"></i>
        </div>
        <div>
          <h3 class="font-bold text-lg mb-2 text-green-800">결제 완료! 🎉</h3>
          <p class="text-sm text-gray-600 mb-3">결제 완료 후 XIVIX 팀이 AI 셋팅을 시작합니다. <strong>보통 1~2영업일</strong> 이내에 완료!</p>
          <div class="bg-white rounded-xl p-3 border border-green-200 text-sm">
            <p><i class="fas fa-calendar mr-1 text-green-600"></i><strong>다음 결제일:</strong> 매월 같은 날 자동결제</p>
            <p class="mt-1"><i class="fas fa-bell mr-1 text-green-600"></i><strong>알림:</strong> AI 셋팅 완료 시 카톡으로 안내</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ============ CHAPTER 5: AI 동작 확인 ============ -->
<div id="chapter5" class="max-w-4xl mx-auto px-4 pb-10">
  <div class="mb-6">
    <div class="chapter-badge bg-teal-100 text-teal-800">
      <span class="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center font-black">5</span>
      AI 동작 확인하기
    </div>
    <p class="text-sm text-gray-500 mt-2 ml-1">
      <i class="far fa-clock mr-1"></i>약 2분
      <span class="ml-3 text-green-600 font-semibold"><i class="fas fa-signal mr-1"></i>난이도: 매우 쉬움</span>
    </p>
  </div>

  <div class="step-card mb-4">
    <div class="p-5 md:p-6">
      <div class="flex items-start gap-4">
        <div class="red-circle flex-shrink-0">1</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-3">내 톡톡으로 테스트 메시지 보내기</h3>
          <p class="text-gray-600 text-sm mb-4">네이버에서 내 매장을 검색 → <strong>'톡톡하기'</strong> 클릭 → 메시지를 보내보세요!</p>
          
          <!-- Phone mockup -->
          <div class="flex justify-center mb-4">
            <div class="phone-mock">
              <div class="phone-screen">
                <div class="phone-notch"></div>
                <div class="bg-green-500 text-white p-3 text-center">
                  <p class="font-bold text-sm">우리매장 톡톡</p>
                </div>
                <div class="p-3 space-y-3">
                  <!-- User message -->
                  <div class="flex justify-end">
                    <div class="bg-yellow-400 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[180px]">
                      <p class="text-sm">메뉴 알려주세요</p>
                    </div>
                  </div>
                  <!-- AI response -->
                  <div class="flex justify-start">
                    <div class="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[200px]">
                      <p class="text-xs mb-2">안녕하세요! OO매장입니다 😊</p>
                      <p class="text-xs"><strong>커트:</strong> 15,000원</p>
                      <p class="text-xs"><strong>펌:</strong> 60,000원~</p>
                      <p class="text-xs"><strong>염색:</strong> 50,000원~</p>
                      <p class="text-xs mt-2">예약 도와드릴까요?</p>
                    </div>
                  </div>
                  <!-- User message 2 -->
                  <div class="flex justify-end">
                    <div class="bg-yellow-400 rounded-2xl rounded-tr-sm px-4 py-2">
                      <p class="text-sm">영업시간?</p>
                    </div>
                  </div>
                  <!-- AI response 2 -->
                  <div class="flex justify-start">
                    <div class="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[200px]">
                      <p class="text-xs">⏰ 영업시간 안내</p>
                      <p class="text-xs">월~토: 10:00~21:00</p>
                      <p class="text-xs">일요일: 휴무</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="bg-gray-50 rounded-xl p-4">
            <p class="text-sm font-bold mb-3">💬 이런 메시지를 보내보세요:</p>
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-3 bg-white p-2 rounded-lg">
                <span class="text-green-500"><i class="fas fa-check-circle"></i></span>
                <span>"안녕하세요" → AI가 인사 + 매장 소개</span>
              </div>
              <div class="flex items-center gap-3 bg-white p-2 rounded-lg">
                <span class="text-green-500"><i class="fas fa-check-circle"></i></span>
                <span>"메뉴 알려주세요" → 메뉴와 가격 안내</span>
              </div>
              <div class="flex items-center gap-3 bg-white p-2 rounded-lg">
                <span class="text-green-500"><i class="fas fa-check-circle"></i></span>
                <span>"영업시간?" → 영업시간 안내</span>
              </div>
              <div class="flex items-center gap-3 bg-white p-2 rounded-lg">
                <span class="text-green-500"><i class="fas fa-check-circle"></i></span>
                <span>"예약하고 싶어요" → 예약 안내</span>
              </div>
            </div>
          </div>
          
          <div class="warning-box mt-4">
            <p class="text-sm">
              <i class="fas fa-exclamation-circle text-orange-500 mr-1"></i>
              <strong>응답이 안 오나요?</strong> XIVIX 담당자에게 연락해주세요. 
              <a href="tel:010-3988-0124" class="underline font-bold">010-3988-0124</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ============ FAQ ============ -->
<div id="faq" class="max-w-4xl mx-auto px-4 pb-10">
  <div class="mb-6">
    <div class="chapter-badge bg-gray-100 text-gray-800">
      <span class="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center font-black">?</span>
      자주 묻는 질문 (FAQ)
    </div>
  </div>

  <div class="space-y-3">
    <div class="faq-item step-card cursor-pointer" onclick="toggleFaq(this)">
      <div class="p-4 flex items-center justify-between">
        <span class="font-bold text-sm"><i class="fas fa-utensils mr-2 text-green-600"></i>메뉴/가격이 바뀌면?</span>
        <i class="fas fa-chevron-down faq-arrow text-gray-400"></i>
      </div>
      <div class="faq-answer px-4">
        <div class="pb-4 text-sm text-gray-600">담당자에게 카톡이나 전화(<a href="tel:010-3988-0124" class="underline text-green-700">010-3988-0124</a>)로 알려주세요. 보통 당일 내 AI 응답에 반영됩니다.</div>
      </div>
    </div>
    
    <div class="faq-item step-card cursor-pointer" onclick="toggleFaq(this)">
      <div class="p-4 flex items-center justify-between">
        <span class="font-bold text-sm"><i class="fas fa-robot mr-2 text-green-600"></i>AI가 이상한 답변을 하면?</span>
        <i class="fas fa-chevron-down faq-arrow text-gray-400"></i>
      </div>
      <div class="faq-answer px-4">
        <div class="pb-4 text-sm text-gray-600">대화 내용을 캡처해서 담당자에게 보내주세요. 즉시 AI 응답을 수정합니다.</div>
      </div>
    </div>

    <div class="faq-item step-card cursor-pointer" onclick="toggleFaq(this)">
      <div class="p-4 flex items-center justify-between">
        <span class="font-bold text-sm"><i class="fas fa-exchange-alt mr-2 text-green-600"></i>요금제를 바꾸고 싶으면?</span>
        <i class="fas fa-chevron-down faq-arrow text-gray-400"></i>
      </div>
      <div class="faq-answer px-4">
        <div class="pb-4 text-sm text-gray-600">담당자에게 변경할 요금제를 말씀해주세요. 업그레이드는 즉시 적용, 다운그레이드는 다음 결제일부터 적용됩니다.</div>
      </div>
    </div>

    <div class="faq-item step-card cursor-pointer" onclick="toggleFaq(this)">
      <div class="p-4 flex items-center justify-between">
        <span class="font-bold text-sm"><i class="fas fa-times-circle mr-2 text-green-600"></i>서비스를 해지하고 싶으면?</span>
        <i class="fas fa-chevron-down faq-arrow text-gray-400"></i>
      </div>
      <div class="faq-answer px-4">
        <div class="pb-4 text-sm text-gray-600">위약금 없이 언제든 해지 가능합니다. 담당자에게 알려주시면 다음 결제일 전에 처리됩니다.</div>
      </div>
    </div>

    <div class="faq-item step-card cursor-pointer" onclick="toggleFaq(this)">
      <div class="p-4 flex items-center justify-between">
        <span class="font-bold text-sm"><i class="fas fa-credit-card mr-2 text-green-600"></i>결제가 실패했을 때?</span>
        <i class="fas fa-chevron-down faq-arrow text-gray-400"></i>
      </div>
      <div class="faq-answer px-4">
        <div class="pb-4 text-sm text-gray-600">카드 한도, 잔액을 확인해주세요. 카드 변경이 필요하면 담당자에게 연락하시면 새 결제 링크를 보내드립니다.</div>
      </div>
    </div>

    <div class="faq-item step-card cursor-pointer" onclick="toggleFaq(this)">
      <div class="p-4 flex items-center justify-between">
        <span class="font-bold text-sm"><i class="fas fa-envelope mr-2 text-green-600"></i>매니저 초대가 안 될 때?</span>
        <i class="fas fa-chevron-down faq-arrow text-gray-400"></i>
      </div>
      <div class="faq-answer px-4">
        <div class="pb-4 text-sm text-gray-600">이메일 주소를 다시 확인해주세요. 반드시 <strong>xivix.kr@gmail.com</strong>으로 초대해주세요. 오타가 있으면 초대가 안 됩니다.</div>
      </div>
    </div>
  </div>
</div>

<!-- ============ FOOTER: 도움 필요 ============ -->
<div class="bg-gray-900 text-white py-12 px-4">
  <div class="max-w-4xl mx-auto text-center">
    <h2 class="text-xl font-bold mb-2">도움이 필요하시면 언제든!</h2>
    <p class="text-gray-400 text-sm mb-6">화면 공유로 직접 도와드립니다</p>
    <div class="flex flex-wrap justify-center gap-4">
      <a href="tel:010-3988-0124" class="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-xl text-sm transition flex items-center gap-2">
        <i class="fas fa-phone"></i>
        010-3988-0124
      </a>
      <a href="mailto:xivix.kr@gmail.com" class="border border-gray-600 hover:bg-gray-800 text-white font-bold px-8 py-3 rounded-xl text-sm transition flex items-center gap-2">
        <i class="fas fa-envelope"></i>
        xivix.kr@gmail.com
      </a>
    </div>
    <div class="mt-8 pt-6 border-t border-gray-800">
      <p class="text-gray-500 text-xs">© 2026 XIVIX AI (지빅스AI). All rights reserved.</p>
      <a href="https://xivix.kr" target="_blank" class="text-gray-500 text-xs hover:text-gray-300">xivix.kr</a>
    </div>
  </div>
</div>

<script>
// Copy text
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check mr-1"></i>복사됨!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove('copied');
    }, 2000);
  });
}

// FAQ toggle
function toggleFaq(el) {
  el.classList.toggle('open');
}

// Smooth scroll offset for sticky nav
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function(e) {
    e.preventDefault();
    const id = this.getAttribute('href');
    const el = document.querySelector(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset - 20;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  });
});
</script>

</body>
</html>
  `;
}
