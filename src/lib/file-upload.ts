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

// 네이버 단축 URL 해결 (naver.me → 실제 URL)
async function resolveNaverShortUrl(shortUrl: string): Promise<string> {
  try {
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const location = response.headers.get('location');
    if (location) {
      // 2차 리다이렉트 확인
      if (location.includes('naver.com') || location.includes('naver.me')) {
        const response2 = await fetch(location, {
          method: 'HEAD',
          redirect: 'manual',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        const location2 = response2.headers.get('location');
        return location2 || location;
      }
      return location;
    }
    return shortUrl;
  } catch {
    return shortUrl;
  }
}

// 네이버 플레이스 ID 추출
function extractNaverPlaceId(url: string): string | null {
  // 다양한 네이버 플레이스 URL 패턴 처리
  const patterns = [
    /place\/(\d+)/,                    // /place/12345
    /restaurant\/(\d+)/,               // /restaurant/12345
    /hairshop\/(\d+)/,                 // /hairshop/12345
    /beauty\/(\d+)/,                   // /beauty/12345
    /hospital\/(\d+)/,                 // /hospital/12345
    /cafe\/(\d+)/,                     // /cafe/12345
    /m\.place\.naver\.com\/(\w+)\/(\d+)/, // 모바일 URL
    /pcmap\.place\.naver\.com.*?\/(\d+)/, // PC 지도 URL
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      // 마지막 캡처 그룹이 플레이스 ID
      return match[match.length - 1];
    }
  }
  
  return null;
}

// 네이버 플레이스 API로 매장 정보 가져오기
async function fetchNaverPlaceInfo(placeId: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    // 네이버 플레이스 API (비공식 - 웹에서 사용하는 API)
    const apiUrl = `https://map.naver.com/p/api/search/allSearch?query=${placeId}&type=all&searchCoord=&boundary=`;
    
    // 먼저 상세 페이지 HTML에서 정보 추출 시도
    const detailUrl = `https://m.place.naver.com/place/${placeId}/home`;
    const response = await fetch(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9'
      }
    });
    
    if (!response.ok) {
      return { success: false, error: `네이버 플레이스 접근 실패: ${response.status}` };
    }
    
    const html = await response.text();
    
    // JSON-LD 데이터 추출 시도
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        return { success: true, data: { jsonLd, html } };
      } catch {}
    }
    
    // __NEXT_DATA__ 추출 시도
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        return { success: true, data: { nextData, html } };
      } catch {}
    }
    
    // HTML 직접 반환
    return { success: true, data: { html } };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '네이버 플레이스 정보 가져오기 실패'
    };
  }
}

// URL 콘텐츠 추출
export async function fetchUrlContent(url: string): Promise<{
  success: boolean;
  content?: string;
  title?: string;
  placeId?: string;
  error?: string;
}> {
  try {
    // URL 검증
    let finalUrl = url;
    const parsedUrl = new URL(url);
    
    // 1. naver.me 단축 URL 처리
    if (parsedUrl.hostname === 'naver.me') {
      console.log('[fetchUrlContent] 네이버 단축 URL 감지, 해결 중...');
      finalUrl = await resolveNaverShortUrl(url);
      console.log('[fetchUrlContent] 해결된 URL:', finalUrl);
    }
    
    // 2. 네이버 플레이스 URL인지 확인
    const placeId = extractNaverPlaceId(finalUrl);
    if (placeId) {
      console.log('[fetchUrlContent] 네이버 플레이스 ID:', placeId);
      const placeInfo = await fetchNaverPlaceInfo(placeId);
      
      if (placeInfo.success && placeInfo.data) {
        let content = '';
        let title = '';
        
        // JSON-LD에서 정보 추출
        if (placeInfo.data.jsonLd) {
          const ld = placeInfo.data.jsonLd;
          title = ld.name || '';
          content = `매장명: ${ld.name || ''}\n`;
          content += `주소: ${ld.address?.streetAddress || ''}\n`;
          content += `전화번호: ${ld.telephone || ''}\n`;
          content += `업종: ${ld['@type'] || ''}\n`;
          if (ld.openingHours) {
            content += `영업시간: ${Array.isArray(ld.openingHours) ? ld.openingHours.join(', ') : ld.openingHours}\n`;
          }
          if (ld.description) {
            content += `설명: ${ld.description}\n`;
          }
        }
        
        // __NEXT_DATA__에서 정보 추출
        if (placeInfo.data.nextData?.props?.pageProps) {
          const pageProps = placeInfo.data.nextData.props.pageProps;
          if (pageProps.initialState?.place?.basicInfo) {
            const basicInfo = pageProps.initialState.place.basicInfo;
            title = title || basicInfo.name || '';
            content += `\n[상세정보]\n`;
            content += `매장명: ${basicInfo.name || ''}\n`;
            content += `주소: ${basicInfo.address || ''}\n`;
            content += `전화번호: ${basicInfo.phone || ''}\n`;
            content += `카테고리: ${basicInfo.category || ''}\n`;
            
            // 메뉴 정보
            if (pageProps.initialState?.place?.menuInfo?.menuList) {
              content += `\n[메뉴]\n`;
              for (const menu of pageProps.initialState.place.menuInfo.menuList) {
                content += `- ${menu.name}: ${menu.price}원\n`;
              }
            }
          }
        }
        
        // HTML에서 텍스트 추출 (fallback)
        if (!content && placeInfo.data.html) {
          const html = placeInfo.data.html;
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          title = titleMatch ? titleMatch[1].trim() : '';
          
          content = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 50000);
        }
        
        return {
          success: true,
          content,
          title,
          placeId
        };
      }
    }
    
    // 3. 일반 URL 처리
    const response = await fetch(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
      },
      redirect: 'follow'
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
    console.error('[fetchUrlContent] Error:', error);
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
    // Gemini 2.0 Flash 사용 (빠른 분석용)
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    
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
