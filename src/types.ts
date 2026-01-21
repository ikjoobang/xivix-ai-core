// XIVIX AI Core V1.0 - Type Definitions

// Cloudflare Bindings
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  GEMINI_API_KEY: string;
  NAVER_CLIENT_ID: string;
  NAVER_CLIENT_SECRET: string;
  NAVER_ACCESS_TOKEN?: string;
  XIVIX_VERSION: string;
  AI_MODEL: string;
  IS_TEST_MODE?: string; // 테스트 모드 (true일 때 솔라피 API 호출 차단)
}

// Database Models
export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  password_hash: string;
  role: 'admin' | 'owner' | 'staff';
  api_key?: string;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: number;
  user_id: number;
  store_name: string;
  business_type: string;
  address?: string;
  phone?: string;
  operating_hours: string;
  menu_data: string; // JSON string
  ai_persona: string;
  ai_tone: string;
  naver_talktalk_id?: string;
  naver_reservation_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationLog {
  id: number;
  store_id: number;
  customer_id: string;
  message_type: 'text' | 'image' | 'mixed';
  customer_message: string;
  ai_response: string;
  image_url?: string;
  response_time_ms: number;
  converted_to_reservation: boolean;
  created_at: string;
}

export interface Reservation {
  id: number;
  store_id: number;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  service_name: string;
  reservation_date: string;
  reservation_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_by: 'ai' | 'manual';
  created_at: string;
  updated_at: string;
}

// Naver TalkTalk Types
export interface NaverTalkTalkMessage {
  event: 'send' | 'open' | 'leave' | 'friend' | 'profile';
  user: string;
  textContent?: {
    text: string;
  };
  imageContent?: {
    imageUrl: string;
  };
  options?: {
    inflow?: string;
    referer?: string;
  };
}

export interface NaverTalkTalkResponse {
  success: boolean;
  resultCode: string;
  resultMessage?: string;
}

// Gemini API Types
export interface GeminiMessage {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64
  };
}

export interface GeminiRequest {
  contents: GeminiMessage[];
  systemInstruction?: {
    parts: { text: string }[];
  };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  };
}

export interface GeminiStreamResponse {
  candidates: {
    content: {
      parts: { text: string }[];
      role: string;
    };
    finishReason?: string;
  }[];
}

// KV Context Types
export interface ConversationContext {
  store_id: number;
  customer_id: string;
  messages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }[];
  last_updated: number;
}

// Dashboard Stats
export interface DashboardStats {
  total_conversations: number;
  today_conversations: number;
  conversion_rate: number;
  avg_response_time_ms: number;
  total_reservations: number;
  today_reservations: number;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}
