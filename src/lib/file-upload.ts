// XIVIX AI Core V1.0 - File Upload & AI Analysis
// 대용량 파일 업로드 (PDF ~50MB, 이미지 ~20MB) 및 AI 분석

import type { Env } from '../types';

// 지원하는 파일 타입
export const SUPPORTED_FILE_TYPES = {
  // 이미지 (최대 20MB)
  image: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'],
    maxSize: 20 * 1024 * 1024, // 20MB
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif']
  },
  // PDF 문서 (최대 50MB)
  pdf: {
    mimeTypes: ['application/pdf'],
    maxSize: 50 * 1024 * 1024, // 50MB
    extensions: ['.pdf']
  },
  // 텍스트 문서 (최대 10MB)
  document: {
    mimeTypes: ['text/plain', 'text/csv', 'application/json', 'text/html'],
    maxSize: 10 * 1024 * 1024, // 10MB
    extensions: ['.txt', '.csv', '.json', '.html']
  }
};

// 파일 타입 검증
export function validateFileType(mimeType: string, fileName: string): { valid: boolean; category: string; error?: string } {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  
  for (const [category, config] of Object.entries(SUPPORTED_FILE_TYPES)) {
    if (config.mimeTypes.includes(mimeType) || config.extensions.includes(ext)) {
      return { valid: true, category };
    }
  }
  
  return { 
    valid: false, 
    category: 'unknown',
    error: `지원하지 않는 파일 형식입니다. 지원 형식: 이미지(JPG, PNG, GIF, WebP), PDF, 텍스트 파일`
  };
}

// 파일 크기 검증
export function validateFileSize(size: number, category: string): { valid: boolean; error?: string } {
  const config = SUPPORTED_FILE_TYPES[category as keyof typeof SUPPORTED_FILE_TYPES];
  
  if (!config) {
    return { valid: false, error: '알 수 없는 파일 카테고리입니다.' };
  }
  
  if (size > config.maxSize) {
    const maxSizeMB = config.maxSize / (1024 * 1024);
    const fileSizeMB = (size / (1024 * 1024)).toFixed(2);
    return { 
      valid: false, 
      error: `파일 크기가 너무 큽니다. (${fileSizeMB}MB / 최대 ${maxSizeMB}MB)`
    };
  }
  
  return { valid: true };
}

// R2에 파일 업로드
export async function uploadFileToR2(
  r2: R2Bucket,
  fileData: ArrayBuffer,
  fileName: string,
  mimeType: string,
  storeId: number,
  category: string = 'uploads'
): Promise<{ key: string; url: string; size: number }> {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const ext = fileName.slice(fileName.lastIndexOf('.'));
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, '_').slice(0, 50);
  
  const key = `stores/${storeId}/${category}/${timestamp}-${randomId}-${sanitizedName}`;
  
  await r2.put(key, fileData, {
    httpMetadata: {
      contentType: mimeType,
      contentDisposition: `inline; filename="${encodeURIComponent(fileName)}"`
    },
    customMetadata: {
      originalName: fileName,
      uploadedAt: new Date().toISOString(),
      storeId: storeId.toString()
    }
  });
  
  return {
    key,
    url: `/api/files/${key}`,
    size: fileData.byteLength
  };
}

// R2에서 파일 조회
export async function getFileFromR2(
  r2: R2Bucket,
  key: string
): Promise<{ body: ReadableStream; contentType: string; metadata?: Record<string, string> } | null> {
  const object = await r2.get(key);
  
  if (!object) {
    return null;
  }
  
  return {
    body: object.body,
    contentType: object.httpMetadata?.contentType || 'application/octet-stream',
    metadata: object.customMetadata
  };
}

// Base64 인코딩 (AI 분석용)
export async function fileToBase64(fileData: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(fileData);
  let binary = '';
  const chunkSize = 32768; // 32KB chunks for memory efficiency
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  
  return btoa(binary);
}

// 매장 파일 목록 조회
export async function listStoreFiles(
  r2: R2Bucket,
  storeId: number,
  category?: string
): Promise<Array<{ key: string; name: string; size: number; uploadedAt: string }>> {
  const prefix = category 
    ? `stores/${storeId}/${category}/`
    : `stores/${storeId}/`;
  
  const listed = await r2.list({ prefix, limit: 100 });
  
  return listed.objects.map(obj => ({
    key: obj.key,
    name: obj.customMetadata?.originalName || obj.key.split('/').pop() || obj.key,
    size: obj.size,
    uploadedAt: obj.customMetadata?.uploadedAt || obj.uploaded.toISOString()
  }));
}

// 파일 삭제
export async function deleteFileFromR2(
  r2: R2Bucket,
  key: string
): Promise<boolean> {
  try {
    await r2.delete(key);
    return true;
  } catch (error) {
    console.error('File delete error:', error);
    return false;
  }
}

// URL 콘텐츠 추출
export async function fetchUrlContent(url: string): Promise<{
  success: boolean;
  content?: string;
  title?: string;
  error?: string;
}> {
  try {
    // URL 검증
    const parsedUrl = new URL(url);
    
    // 지원하는 도메인 확인 (네이버, 인스타그램 등)
    const supportedDomains = [
      'naver.com', 'map.naver.com', 'place.naver.com', 
      'blog.naver.com', 'instagram.com', 'kakao.com'
    ];
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
      }
    });
    
    if (!response.ok) {
      return { success: false, error: `URL 접근 실패: ${response.status}` };
    }
    
    const html = await response.text();
    
    // 기본 HTML 파싱 (제목, 메타, 본문 추출)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // HTML 태그 제거하고 텍스트 추출
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50000); // 최대 50KB 텍스트
    
    return {
      success: true,
      content: textContent,
      title
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'URL 콘텐츠 추출 실패'
    };
  }
}

// Gemini를 이용한 파일 분석 (Gemini 2.5 Pro - 정확도 우선)
export async function analyzeWithGemini(
  apiKey: string,
  content: {
    type: 'text' | 'image' | 'pdf';
    data: string; // 텍스트 또는 base64
    mimeType?: string;
  },
  prompt: string
): Promise<{ success: boolean; result?: string; error?: string }> {
  try {
    // 전문 상담/분석에는 Gemini 2.5 Pro 사용 (느리지만 정확도 높음)
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-05-06:generateContent';
    
    let parts: any[] = [{ text: prompt }];
    
    if (content.type === 'image' || content.type === 'pdf') {
      parts.unshift({
        inlineData: {
          mimeType: content.mimeType || (content.type === 'pdf' ? 'application/pdf' : 'image/jpeg'),
          data: content.data
        }
      });
    } else {
      // 텍스트 분석
      parts = [{ text: `${prompt}\n\n분석할 내용:\n${content.data}` }];
    }
    
    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Gemini API 오류: ${errorText}` };
    }
    
    const data = await response.json() as any;
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!result) {
      return { success: false, error: 'AI 응답 없음' };
    }
    
    return { success: true, result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'AI 분석 실패'
    };
  }
}

// OpenAI를 이용한 파일 분석
export async function analyzeWithOpenAI(
  apiKey: string,
  content: {
    type: 'text' | 'image';
    data: string;
    mimeType?: string;
  },
  prompt: string
): Promise<{ success: boolean; result?: string; error?: string }> {
  try {
    const messages: any[] = [];
    
    if (content.type === 'image') {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${content.mimeType || 'image/jpeg'};base64,${content.data}`
            }
          }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: `${prompt}\n\n분석할 내용:\n${content.data}`
      });
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 4096,
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `OpenAI API 오류: ${errorText}` };
    }
    
    const data = await response.json() as any;
    const result = data.choices?.[0]?.message?.content;
    
    if (!result) {
      return { success: false, error: 'AI 응답 없음' };
    }
    
    return { success: true, result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'AI 분석 실패'
    };
  }
}

// URL 또는 파일에서 매장 정보 자동 추출
export async function extractStoreInfoFromContent(
  apiKey: string,
  content: string,
  model: 'gemini' | 'openai' = 'gemini'
): Promise<{
  success: boolean;
  data?: {
    storeName?: string;
    businessType?: string;
    address?: string;
    phone?: string;
    operatingHours?: string;
    menuData?: Array<{ name: string; price: string; description?: string }>;
    features?: string[];
    systemPrompt?: string;
  };
  error?: string;
}> {
  const extractPrompt = `다음 내용을 분석하여 매장 정보를 JSON 형식으로 추출해주세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명은 포함하지 마세요.

{
  "storeName": "매장명 (없으면 null)",
  "businessType": "업종 (예: BEAUTY_HAIR, RESTAURANT, FITNESS, MEDICAL 등)",
  "address": "주소 (없으면 null)",
  "phone": "전화번호 (없으면 null)",
  "operatingHours": "영업시간 (예: 10:00-20:00, 없으면 null)",
  "menuData": [
    {"name": "메뉴/서비스명", "price": "가격", "description": "설명"}
  ],
  "features": ["특징1", "특징2"],
  "systemPrompt": "이 매장의 AI 상담원이 알아야 할 핵심 정보와 응대 지침을 3-5문장으로 작성"
}

분석할 내용:
${content.slice(0, 30000)}`;

  try {
    let result: { success: boolean; result?: string; error?: string };
    
    if (model === 'openai') {
      result = await analyzeWithOpenAI(apiKey, { type: 'text', data: '' }, extractPrompt);
    } else {
      result = await analyzeWithGemini(apiKey, { type: 'text', data: content }, extractPrompt);
    }
    
    if (!result.success || !result.result) {
      return { success: false, error: result.error || 'AI 분석 실패' };
    }
    
    // JSON 파싱
    const jsonMatch = result.result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'JSON 응답 파싱 실패' };
    }
    
    const data = JSON.parse(jsonMatch[0]);
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '정보 추출 실패'
    };
  }
}
