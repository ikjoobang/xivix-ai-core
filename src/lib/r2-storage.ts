// XIVIX AI Core V1.0 - R2 Storage Integration
// 이미지 저장 및 분석을 위한 파이프라인

import type { Env } from '../types';

// 이미지 업로드 (Base64 -> R2)
export async function uploadImage(
  r2: R2Bucket,
  base64Data: string,
  mimeType: string,
  prefix: string = 'uploads'
): Promise<{ key: string; url: string }> {
  // Generate unique key
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const extension = mimeType.split('/')[1] || 'jpg';
  const key = `${prefix}/${timestamp}-${randomId}.${extension}`;
  
  // Decode base64
  const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  
  // Upload to R2
  await r2.put(key, binaryData, {
    httpMetadata: {
      contentType: mimeType
    }
  });
  
  return {
    key,
    url: `/api/images/${key}`
  };
}

// 이미지 URL에서 업로드
export async function uploadImageFromUrl(
  r2: R2Bucket,
  imageUrl: string,
  prefix: string = 'uploads'
): Promise<{ key: string; base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      console.error('Failed to fetch image:', imageUrl);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    
    // Convert to base64
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );
    
    // Generate key and upload
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const extension = contentType.split('/')[1] || 'jpg';
    const key = `${prefix}/${timestamp}-${randomId}.${extension}`;
    
    await r2.put(key, arrayBuffer, {
      httpMetadata: {
        contentType
      }
    });
    
    return {
      key,
      base64,
      mimeType: contentType
    };
  } catch (error) {
    console.error('Image upload error:', error);
    return null;
  }
}

// 이미지 조회
export async function getImage(
  r2: R2Bucket,
  key: string
): Promise<{ body: ReadableStream; contentType: string } | null> {
  const object = await r2.get(key);
  
  if (!object) {
    return null;
  }
  
  return {
    body: object.body,
    contentType: object.httpMetadata?.contentType || 'image/jpeg'
  };
}

// 이미지 삭제
export async function deleteImage(
  r2: R2Bucket,
  key: string
): Promise<boolean> {
  try {
    await r2.delete(key);
    return true;
  } catch {
    return false;
  }
}

// 오래된 이미지 정리 (24시간 이상)
export async function cleanupOldImages(
  r2: R2Bucket,
  prefix: string = 'uploads',
  maxAgeHours: number = 24
): Promise<number> {
  const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
  let deletedCount = 0;
  
  const listed = await r2.list({ prefix });
  
  for (const object of listed.objects) {
    // Parse timestamp from key
    const match = object.key.match(/\/(\d+)-/);
    if (match) {
      const uploadTime = parseInt(match[1], 10);
      if (uploadTime < cutoffTime) {
        await r2.delete(object.key);
        deletedCount++;
      }
    }
  }
  
  return deletedCount;
}

// 이미지 리사이징 정보 생성 (Cloudflare Image Resizing 활용)
export function getResizedImageUrl(
  originalUrl: string,
  options: {
    width?: number;
    height?: number;
    fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
    quality?: number;
  }
): string {
  const params = new URLSearchParams();
  
  if (options.width) params.set('width', options.width.toString());
  if (options.height) params.set('height', options.height.toString());
  if (options.fit) params.set('fit', options.fit);
  if (options.quality) params.set('quality', options.quality.toString());
  
  const queryString = params.toString();
  return queryString ? `${originalUrl}?${queryString}` : originalUrl;
}
