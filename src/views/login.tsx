// XIVIX AI Core V1.0 - Login View
// Deep Black Theme with Glassmorphism

export function renderLogin(): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX - Login</title>
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
      <p class="text-white/40 mt-2">관리자 로그인</p>
    </div>
    
    <!-- Login Form -->
    <div class="glass rounded-2xl p-8 glow">
      <form id="loginForm" class="space-y-6">
        <div>
          <label class="block text-sm text-white/60 mb-2">이메일</label>
          <div class="relative">
            <i class="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-white/30"></i>
            <input 
              type="email" 
              name="email"
              placeholder="admin@xivix.kr"
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
              name="password"
              placeholder="••••••••"
              class="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#007AFF] transition-all"
              required
            >
          </div>
        </div>
        
        <div class="flex items-center justify-between text-sm">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" class="w-4 h-4 rounded border-white/20 bg-white/5 text-[#007AFF] focus:ring-[#007AFF] focus:ring-offset-0">
            <span class="text-white/60">로그인 상태 유지</span>
          </label>
          <a href="#" class="text-[#007AFF] hover:underline">비밀번호 찾기</a>
        </div>
        
        <button 
          type="submit"
          class="w-full bg-[#007AFF] hover:bg-[#0066DD] text-white font-semibold py-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2"
        >
          <span>로그인</span>
          <i class="fas fa-arrow-right"></i>
        </button>
      </form>
      
      <div class="mt-6 pt-6 border-t border-white/5 text-center">
        <p class="text-white/40 text-sm">
          계정이 없으신가요? 
          <a href="#" class="text-[#007AFF] hover:underline">문의하기</a>
        </p>
      </div>
    </div>
    
    <!-- 2FA Notice -->
    <div class="mt-4 glass rounded-xl p-4 flex items-start gap-3">
      <i class="fas fa-shield-alt text-[#007AFF] mt-0.5"></i>
      <div>
        <p class="text-sm font-medium">2단계 인증 (2FA)</p>
        <p class="text-xs text-white/40 mt-1">보안 강화를 위해 2단계 인증이 필수입니다.</p>
      </div>
    </div>
    
    <!-- Footer -->
    <p class="text-center text-white/30 text-xs mt-8">
      © 2024 XIVIX AI Core. All rights reserved.
    </p>
  </div>
  
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      
      // Demo: redirect to dashboard
      // In production: validate credentials via API
      window.location.href = '/dashboard';
    });
  </script>
</body>
</html>
  `;
}
