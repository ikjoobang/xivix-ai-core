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

// 네이버 플레이스 전체 크롤링 (기본정보 + 메뉴 + 디자이너/의사 + 이벤트 + 리뷰)
async function fetchNaverPlaceInfo(placeId: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    console.log(`[NaverPlace] 전체 크롤링 시작: ${placeId}`);
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9'
    };
    
    // 1. 기본 정보 페이지
    const homeUrl = `https://m.place.naver.com/place/${placeId}/home`;
    const homeResponse = await fetch(homeUrl, { headers });
    const homeHtml = homeResponse.ok ? await homeResponse.text() : '';
    
    // 2. 메뉴/가격 페이지 (미용실: menu, 식당: menu)
    const menuUrl = `https://m.place.naver.com/place/${placeId}/menu/list`;
    const menuResponse = await fetch(menuUrl, { headers });
    const menuHtml = menuResponse.ok ? await menuResponse.text() : '';
    
    // 3. 전문가/디자이너/의사 페이지 (미용실: stylist, 병원: doctor)
    const stylistUrl = `https://m.place.naver.com/place/${placeId}/stylist`;
    const stylistResponse = await fetch(stylistUrl, { headers });
    const stylistHtml = stylistResponse.ok ? await stylistResponse.text() : '';
    
    const doctorUrl = `https://m.place.naver.com/place/${placeId}/doctor`;
    const doctorResponse = await fetch(doctorUrl, { headers });
    const doctorHtml = doctorResponse.ok ? await doctorResponse.text() : '';
    
    // 4. 이벤트/쿠폰 페이지
    const eventUrl = `https://m.place.naver.com/place/${placeId}/event`;
    const eventResponse = await fetch(eventUrl, { headers });
    const eventHtml = eventResponse.ok ? await eventResponse.text() : '';
    
    // 5. 리뷰 페이지 (상위 10개)
    const reviewUrl = `https://m.place.naver.com/place/${placeId}/review/visitor`;
    const reviewResponse = await fetch(reviewUrl, { headers });
    const reviewHtml = reviewResponse.ok ? await reviewResponse.text() : '';
    
    // 6. 예약 정보 페이지
    const bookingUrl = `https://m.place.naver.com/place/${placeId}/booking`;
    const bookingResponse = await fetch(bookingUrl, { headers });
    const bookingHtml = bookingResponse.ok ? await bookingResponse.text() : '';
    
    // __NEXT_DATA__ 추출 함수
    const extractNextData = (html: string): any => {
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch {}
      }
      return null;
    };
    
    // JSON-LD 추출 함수
    const extractJsonLd = (html: string): any => {
      const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch {}
      }
      return null;
    };
    
    // 데이터 추출
    const homeNextData = extractNextData(homeHtml);
    const menuNextData = extractNextData(menuHtml);
    const stylistNextData = extractNextData(stylistHtml);
    const doctorNextData = extractNextData(doctorHtml);
    const eventNextData = extractNextData(eventHtml);
    const reviewNextData = extractNextData(reviewHtml);
    const bookingNextData = extractNextData(bookingHtml);
    const jsonLd = extractJsonLd(homeHtml);
    
    // 통합 데이터 구조 생성
    const combinedData = {
      jsonLd,
      html: homeHtml,
      pages: {
        home: homeNextData,
        menu: menuNextData,
        stylist: stylistNextData,
        doctor: doctorNextData,
        event: eventNextData,
        review: reviewNextData,
        booking: bookingNextData
      }
    };
    
    console.log(`[NaverPlace] 크롤링 완료 - 페이지: home=${!!homeNextData}, menu=${!!menuNextData}, stylist=${!!stylistNextData}, doctor=${!!doctorNextData}, event=${!!eventNextData}`);
    
    return { success: true, data: combinedData };
  } catch (error) {
    console.error('[NaverPlace] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '네이버 플레이스 정보 가져오기 실패'
    };
  }
}

// 네이버 블로그 콘텐츠 추출
async function fetchNaverBlogContent(url: string): Promise<{
  success: boolean;
  content?: string;
  title?: string;
  error?: string;
}> {
  try {
    // 블로그 URL에서 blogId와 logNo 추출
    const blogIdMatch = url.match(/blog\.naver\.com\/([^\/\?]+)/);
    const logNoMatch = url.match(/\/(\d+)(?:\?|$)/);
    
    if (!blogIdMatch) {
      return { success: false, error: '블로그 ID를 찾을 수 없습니다' };
    }
    
    const blogId = blogIdMatch[1];
    const logNo = logNoMatch ? logNoMatch[1] : null;
    
    // 모바일 블로그 URL로 변환 (더 깔끔한 HTML)
    const mobileUrl = logNo 
      ? `https://m.blog.naver.com/${blogId}/${logNo}`
      : `https://m.blog.naver.com/${blogId}`;
    
    const response = await fetch(mobileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9'
      }
    });
    
    if (!response.ok) {
      return { success: false, error: `블로그 접근 실패: ${response.status}` };
    }
    
    const html = await response.text();
    
    // 제목 추출
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(' : 네이버 블로그', '').trim() : '';
    
    let content = `=== 네이버 블로그 ===\n`;
    content += `제목: ${title}\n`;
    content += `블로그 ID: ${blogId}\n`;
    if (logNo) content += `글 번호: ${logNo}\n`;
    
    // 본문 영역 추출 시도
    const contentAreaMatch = html.match(/<div[^>]*class="[^"]*se-main-container[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const postContentMatch = html.match(/<div[^>]*id="postViewArea"[^>]*>([\s\S]*?)<\/div>/i);
    
    let bodyContent = contentAreaMatch ? contentAreaMatch[1] : (postContentMatch ? postContentMatch[1] : '');
    
    // HTML 태그 제거
    bodyContent = bodyContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (bodyContent) {
      content += `\n=== 블로그 본문 ===\n${bodyContent.slice(0, 40000)}`;
    } else {
      // 전체 HTML에서 텍스트 추출
      const textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40000);
      content += `\n=== 페이지 내용 ===\n${textContent}`;
    }
    
    console.log(`[NaverBlog] 크롤링 완료 - 제목: ${title}, 콘텐츠 길이: ${content.length}자`);
    
    return { success: true, content, title };
  } catch (error) {
    console.error('[NaverBlog] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '블로그 콘텐츠 추출 실패'
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
        
        // JSON-LD에서 기본 정보 추출
        if (placeInfo.data.jsonLd) {
          const ld = placeInfo.data.jsonLd;
          title = ld.name || '';
          content = `=== 기본 정보 ===\n`;
          content += `매장명: ${ld.name || ''}\n`;
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
        
        // 홈 페이지에서 기본 정보 추출
        const homeData = placeInfo.data.pages?.home?.props?.pageProps;
        if (homeData?.initialState?.place?.basicInfo) {
          const basicInfo = homeData.initialState.place.basicInfo;
          title = title || basicInfo.name || '';
          content += `\n=== 상세 정보 ===\n`;
          content += `매장명: ${basicInfo.name || ''}\n`;
          content += `주소: ${basicInfo.address || ''}\n`;
          content += `도로명주소: ${basicInfo.roadAddress || ''}\n`;
          content += `전화번호: ${basicInfo.phone || ''}\n`;
          content += `카테고리: ${basicInfo.category || ''}\n`;
          if (basicInfo.businessHours) {
            content += `영업시간: ${JSON.stringify(basicInfo.businessHours)}\n`;
          }
          if (basicInfo.conveniences) {
            content += `편의시설: ${basicInfo.conveniences.join(', ')}\n`;
          }
          if (basicInfo.description) {
            content += `소개: ${basicInfo.description}\n`;
          }
        }
        
        // 메뉴/서비스 정보 추출
        const menuData = placeInfo.data.pages?.menu?.props?.pageProps;
        if (menuData?.initialState?.place?.menuInfo?.menuList) {
          content += `\n=== 메뉴/서비스 가격표 ===\n`;
          for (const menu of menuData.initialState.place.menuInfo.menuList) {
            const price = menu.price ? `${menu.price.toLocaleString()}원` : '가격문의';
            const desc = menu.description ? ` (${menu.description})` : '';
            content += `- ${menu.name}: ${price}${desc}\n`;
          }
        } else if (homeData?.initialState?.place?.menuInfo?.menuList) {
          // 홈에서 메뉴 정보 있으면 사용
          content += `\n=== 메뉴/서비스 가격표 ===\n`;
          for (const menu of homeData.initialState.place.menuInfo.menuList) {
            const price = menu.price ? `${menu.price.toLocaleString()}원` : '가격문의';
            content += `- ${menu.name}: ${price}\n`;
          }
        }
        
        // 디자이너/스타일리스트 정보 추출 (미용실)
        const stylistData = placeInfo.data.pages?.stylist?.props?.pageProps;
        if (stylistData?.initialState?.place?.stylistInfo?.stylistList) {
          content += `\n=== 디자이너/스타일리스트 ===\n`;
          for (const stylist of stylistData.initialState.place.stylistInfo.stylistList) {
            content += `\n[${stylist.name}]\n`;
            if (stylist.position) content += `  직책: ${stylist.position}\n`;
            if (stylist.introduction) content += `  소개: ${stylist.introduction}\n`;
            if (stylist.career) content += `  경력: ${stylist.career}\n`;
            if (stylist.specialties) content += `  전문분야: ${stylist.specialties.join(', ')}\n`;
            if (stylist.workingDays) content += `  근무일: ${stylist.workingDays.join(', ')}\n`;
            if (stylist.dayOff) content += `  휴무일: ${stylist.dayOff}\n`;
          }
        }
        
        // 의사/전문가 정보 추출 (병원)
        const doctorData = placeInfo.data.pages?.doctor?.props?.pageProps;
        if (doctorData?.initialState?.place?.doctorInfo?.doctorList) {
          content += `\n=== 의료진/전문가 ===\n`;
          for (const doctor of doctorData.initialState.place.doctorInfo.doctorList) {
            content += `\n[${doctor.name}]\n`;
            if (doctor.position) content += `  직책: ${doctor.position}\n`;
            if (doctor.department) content += `  진료과: ${doctor.department}\n`;
            if (doctor.career) content += `  경력: ${doctor.career}\n`;
            if (doctor.specialties) content += `  전문분야: ${doctor.specialties.join(', ')}\n`;
            if (doctor.education) content += `  학력: ${doctor.education}\n`;
            if (doctor.workingHours) content += `  진료시간: ${doctor.workingHours}\n`;
          }
        }
        
        // 이벤트/쿠폰 정보 추출
        const eventData = placeInfo.data.pages?.event?.props?.pageProps;
        if (eventData?.initialState?.place?.eventInfo?.eventList) {
          content += `\n=== 진행 중인 이벤트 ===\n`;
          for (const event of eventData.initialState.place.eventInfo.eventList) {
            content += `\n[${event.title}]\n`;
            if (event.description) content += `  내용: ${event.description}\n`;
            if (event.period) content += `  기간: ${event.period}\n`;
            if (event.discount) content += `  할인: ${event.discount}\n`;
          }
        }
        
        // 리뷰 요약 추출 (상위 키워드)
        const reviewData = placeInfo.data.pages?.review?.props?.pageProps;
        if (reviewData?.initialState?.place?.reviewInfo) {
          const reviewInfo = reviewData.initialState.place.reviewInfo;
          content += `\n=== 고객 리뷰 요약 ===\n`;
          if (reviewInfo.totalCount) content += `총 리뷰: ${reviewInfo.totalCount}개\n`;
          if (reviewInfo.averageRating) content += `평균 별점: ${reviewInfo.averageRating}점\n`;
          if (reviewInfo.keywords) {
            content += `자주 언급되는 키워드: ${reviewInfo.keywords.map((k: any) => k.text).join(', ')}\n`;
          }
        }
        
        // 예약 정보 추출
        const bookingData = placeInfo.data.pages?.booking?.props?.pageProps;
        if (bookingData?.initialState?.place?.bookingInfo) {
          const bookingInfo = bookingData.initialState.place.bookingInfo;
          content += `\n=== 예약 정보 ===\n`;
          if (bookingInfo.available) content += `네이버 예약: 가능\n`;
          if (bookingInfo.minAdvanceDay) content += `최소 예약일: ${bookingInfo.minAdvanceDay}일 전\n`;
          if (bookingInfo.cancellationPolicy) content += `취소 정책: ${bookingInfo.cancellationPolicy}\n`;
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
        
        console.log(`[fetchUrlContent] 추출 완료 - 콘텐츠 길이: ${content.length}자`);
        
        return {
          success: true,
          content,
          title,
          placeId
        };
      }
    }
    
    // 3. 네이버 블로그 URL 처리
    const parsedFinalUrl = new URL(finalUrl);
    if (parsedFinalUrl.hostname.includes('blog.naver.com')) {
      console.log('[fetchUrlContent] 네이버 블로그 감지');
      const blogContent = await fetchNaverBlogContent(finalUrl);
      if (blogContent.success) {
        return blogContent;
      }
    }
    
    // 4. 인스타그램 URL 처리
    if (parsedFinalUrl.hostname.includes('instagram.com')) {
      console.log('[fetchUrlContent] 인스타그램 감지 - 기본 크롤링 시도');
      // 인스타그램은 로그인 필요해서 제한적
    }
    
    // 5. 일반 URL 처리 (홈페이지 등)
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
    
    // 메타 정보 추출
    let content = `=== 웹사이트 정보 ===\n`;
    content += `제목: ${title}\n`;
    
    // Open Graph 메타 태그 추출
    const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
    const ogDescMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
    
    if (ogTitleMatch) content += `OG 제목: ${ogTitleMatch[1]}\n`;
    if (ogDescMatch) content += `OG 설명: ${ogDescMatch[1]}\n`;
    if (descMatch) content += `설명: ${descMatch[1]}\n`;
    
    // JSON-LD 구조화된 데이터 추출
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const jsonLd = JSON.parse(match[1]);
        content += `\n=== 구조화된 데이터 ===\n`;
        content += JSON.stringify(jsonLd, null, 2).slice(0, 5000) + '\n';
      } catch {}
    }
    
    // HTML 태그 제거하고 텍스트 추출
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40000);
    
    content += `\n=== 본문 내용 ===\n${textContent}`;
    
    return {
      success: true,
      content: content.slice(0, 50000),
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
