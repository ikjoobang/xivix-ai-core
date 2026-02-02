// XIVIX AI Core V2.0 - Login View
// 마스터/사장님 인증 시스템

export function renderLogin(): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX - 로그인</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; }
    body { background: #050505; }
    .glass {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .glow {
      box-shadow: 0 0 60px rgba(0, 122, 255, 0.15);
    }
    .gradient-text {
      background: linear-gradient(135deg, #007AFF 0%, #00D4FF 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    input:-webkit-autofill {
      -webkit-box-shadow: 0 0 0 30px #0a0a0a inset !important;
      -webkit-text-fill-color: white !important;
    }
    .tab-active {
      background: rgba(0, 122, 255, 0.2);
      border-color: #007AFF;
    }
    .loading {
      pointer-events: none;
      opacity: 0.7;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .animate-spin {
      animation: spin 1s linear infinite;
    }
  </style>
</head>
<body class="min-h-screen text-white flex items-center justify-center p-4">
  <!-- Background Elements -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none">
    <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
  </div>
  
  <!-- Login Card -->
  <div class="w-full max-w-md relative z-10">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass glow mb-4">
        <i class="fas fa-brain text-2xl text-[#007AFF]"></i>
      </div>
      <h1 class="text-3xl font-bold">
        <span class="gradient-text">XIVIX</span>
        <span class="text-white/80"> AI</span>
      </h1>
      <p class="text-white/40 mt-2">AI 자동 상담 시스템</p>
    </div>
    
    <!-- Login Type Tabs -->
    <div class="flex mb-6 gap-2">
      <button 
        id="tab-owner" 
        onclick="switchTab('owner')"
        class="flex-1 py-3 px-4 rounded-xl border border-white/10 text-sm font-medium transition-all tab-active"
      >
        <i class="fas fa-store mr-2"></i>사장님 로그인
      </button>
      <button 
        id="tab-master" 
        onclick="switchTab('master')"
        class="flex-1 py-3 px-4 rounded-xl border border-white/10 text-sm font-medium transition-all text-white/60 hover:text-white"
      >
        <i class="fas fa-crown mr-2"></i>마스터 로그인
      </button>
    </div>
    
    <!-- Login Form -->
    <div class="glass rounded-2xl p-8 glow">
      <!-- Error Message -->
      <div id="errorMessage" class="hidden mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
        <i class="fas fa-exclamation-circle mr-2"></i>
        <span id="errorText"></span>
      </div>
      
      <form id="loginForm" class="space-y-6">
        <input type="hidden" id="loginType" value="owner">
        
        <div>
          <label class="block text-sm text-white/60 mb-2">이메일</label>
          <div class="relative">
            <i class="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-white/30"></i>
            <input 
              type="email" 
              id="email"
              name="email"
              placeholder="email@example.com"
              class="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#007AFF] transition-all"
              required
            >
          </div>
        </div>
        
        <div>
          <label class="block text-sm text-white/60 mb-2">비밀번호</label>
          <div class="relative">
            <i class="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-white/30"></i>
            <input 
              type="password" 
              id="password"
              name="password"
              placeholder="••••••••"
              class="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#007AFF] transition-all"
              required
            >
            <button 
              type="button" 
              onclick="togglePassword()"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              <i id="passwordIcon" class="fas fa-eye"></i>
            </button>
          </div>
        </div>
        
        <div class="flex items-center justify-between text-sm">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="rememberMe" class="w-4 h-4 rounded border-white/20 bg-white/5 text-[#007AFF] focus:ring-[#007AFF] focus:ring-offset-0">
            <span class="text-white/60">로그인 상태 유지</span>
          </label>
        </div>
        
        <button 
          type="submit"
          id="submitBtn"
          class="w-full bg-[#007AFF] hover:bg-[#0066DD] text-white font-semibold py-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2"
        >
          <span id="submitText">로그인</span>
          <i id="submitIcon" class="fas fa-arrow-right"></i>
        </button>
      </form>
      
      <!-- Register Link (사장님 전용) -->
      <div id="registerLink" class="mt-6 pt-6 border-t border-white/5 text-center">
        <p class="text-white/40 text-sm">
          계정이 없으신가요? 
          <a href="/connect" class="text-[#007AFF] hover:underline">매장 연동 신청</a>
        </p>
      </div>
    </div>
    
    <!-- Info Notice -->
    <div class="mt-4 glass rounded-xl p-4 flex items-start gap-3">
      <i class="fas fa-info-circle text-[#007AFF] mt-0.5"></i>
      <div>
        <p class="text-sm font-medium">XIVIX AI Core V2.0</p>
        <p class="text-xs text-white/40 mt-1">네이버 톡톡 AI 자동 상담 시스템</p>
      </div>
    </div>
    
    <!-- Footer -->
    <p class="text-center text-white/30 text-xs mt-8">
      © 2026 XIVIX AI Core. All rights reserved.
    </p>
  </div>
  
  <script>
    let currentTab = 'owner';
    
    function switchTab(tab) {
      currentTab = tab;
      document.getElementById('loginType').value = tab;
      
      // Update tab styles
      const ownerTab = document.getElementById('tab-owner');
      const masterTab = document.getElementById('tab-master');
      const registerLink = document.getElementById('registerLink');
      
      if (tab === 'owner') {
        ownerTab.classList.add('tab-active');
        ownerTab.classList.remove('text-white/60');
        masterTab.classList.remove('tab-active');
        masterTab.classList.add('text-white/60');
        registerLink.classList.remove('hidden');
      } else {
        masterTab.classList.add('tab-active');
        masterTab.classList.remove('text-white/60');
        ownerTab.classList.remove('tab-active');
        ownerTab.classList.add('text-white/60');
        registerLink.classList.add('hidden');
      }
      
      hideError();
    }
    
    function togglePassword() {
      const passwordInput = document.getElementById('password');
      const passwordIcon = document.getElementById('passwordIcon');
      
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordIcon.classList.remove('fa-eye');
        passwordIcon.classList.add('fa-eye-slash');
      } else {
        passwordInput.type = 'password';
        passwordIcon.classList.remove('fa-eye-slash');
        passwordIcon.classList.add('fa-eye');
      }
    }
    
    function showError(message) {
      const errorDiv = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      errorText.textContent = message;
      errorDiv.classList.remove('hidden');
    }
    
    function hideError() {
      document.getElementById('errorMessage').classList.add('hidden');
    }
    
    function setLoading(isLoading) {
      const form = document.getElementById('loginForm');
      const submitBtn = document.getElementById('submitBtn');
      const submitText = document.getElementById('submitText');
      const submitIcon = document.getElementById('submitIcon');
      
      if (isLoading) {
        form.classList.add('loading');
        submitBtn.disabled = true;
        submitText.textContent = '로그인 중...';
        submitIcon.classList.remove('fa-arrow-right');
        submitIcon.classList.add('fa-spinner', 'animate-spin');
      } else {
        form.classList.remove('loading');
        submitBtn.disabled = false;
        submitText.textContent = '로그인';
        submitIcon.classList.remove('fa-spinner', 'animate-spin');
        submitIcon.classList.add('fa-arrow-right');
      }
    }
    
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();
      setLoading(true);
      
      const loginType = document.getElementById('loginType').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const rememberMe = document.getElementById('rememberMe').checked;
      
      try {
        const endpoint = loginType === 'master' 
          ? '/api/auth/master/login' 
          : '/api/auth/owner/login';
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
          // 토큰 저장
          const storage = rememberMe ? localStorage : sessionStorage;
          storage.setItem('xivix_token', result.data.token);
          storage.setItem('xivix_user_type', result.data.userType);
          storage.setItem('xivix_user', JSON.stringify(result.data.user));
          
          if (result.data.storeId) {
            storage.setItem('xivix_store_id', result.data.storeId);
          }
          
          // 리다이렉트
          if (loginType === 'master') {
            window.location.href = '/master';
          } else {
            const storeId = result.data.storeId || 1;
            window.location.href = '/dashboard/' + storeId;
          }
        } else {
          showError(result.error || '로그인에 실패했습니다.');
        }
      } catch (error) {
        console.error('Login error:', error);
        showError('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setLoading(false);
      }
    });
    
    // 이미 로그인된 경우 리다이렉트
    document.addEventListener('DOMContentLoaded', () => {
      const token = localStorage.getItem('xivix_token') || sessionStorage.getItem('xivix_token');
      if (token) {
        // 토큰 유효성 검증
        fetch('/api/auth/verify', {
          headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            const userType = localStorage.getItem('xivix_user_type') || sessionStorage.getItem('xivix_user_type');
            if (userType === 'master') {
              window.location.href = '/master';
            } else {
              const storeId = localStorage.getItem('xivix_store_id') || sessionStorage.getItem('xivix_store_id') || 1;
              window.location.href = '/dashboard/' + storeId;
            }
          }
        })
        .catch(() => {
          // 토큰 검증 실패 - 로그인 페이지 유지
          localStorage.removeItem('xivix_token');
          sessionStorage.removeItem('xivix_token');
        });
      }
    });
  </script>
</body>
</html>
  `;
}
