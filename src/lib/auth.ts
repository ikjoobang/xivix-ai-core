// XIVIX AI Core - Authentication Library
// 마스터/사장님 인증 시스템

import type { Env } from '../types';

// 세션 관련 타입
export interface Session {
  id: number;
  session_token: string;
  user_type: 'master' | 'owner';
  user_id: number;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
  created_at: string;
}

export interface MasterAccount {
  id: number;
  email: string;
  name: string;
  phone: string;
  password_hash: string;
  is_active: number;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OwnerAccount {
  id: number;
  email: string;
  name: string;
  phone?: string;
  password_hash: string;
  role: string;
  is_active: number;
  last_login_at?: string;
  login_attempts: number;
  locked_until?: string;
  created_at: string;
  updated_at: string;
}

// 간단한 비밀번호 해싱 (Cloudflare Workers용 - bcrypt 대신 Web Crypto API 사용)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const data = encoder.encode(saltHex + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `sha256:${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // bcrypt 해시 형식 지원 (기존 데이터 호환)
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    // bcrypt는 Workers에서 지원 안됨 - 첫 로그인 시 마이그레이션 필요
    // 임시로 평문 비교 (초기 셋업용)
    return false;
  }
  
  // sha256 해시 형식
  if (storedHash.startsWith('sha256:')) {
    const [, salt, hash] = storedHash.split(':');
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === hash;
  }
  
  return false;
}

// 세션 토큰 생성
export function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 세션 만료 시간 (24시간)
export function getSessionExpiry(): string {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry.toISOString();
}

// 세션 생성
export async function createSession(
  db: D1Database,
  userType: 'master' | 'owner',
  userId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const sessionToken = generateSessionToken();
  const expiresAt = getSessionExpiry();
  
  await db.prepare(`
    INSERT INTO xivix_sessions (session_token, user_type, user_id, ip_address, user_agent, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(sessionToken, userType, userId, ipAddress || null, userAgent || null, expiresAt).run();
  
  // 인증 로그 기록
  await logAuthAction(db, userType, userId, 'login', ipAddress, userAgent);
  
  return sessionToken;
}

// 세션 검증
export async function validateSession(
  db: D1Database,
  sessionToken: string
): Promise<Session | null> {
  const session = await db.prepare(`
    SELECT * FROM xivix_sessions 
    WHERE session_token = ? AND expires_at > datetime('now')
  `).bind(sessionToken).first<Session>();
  
  return session || null;
}

// 세션 삭제 (로그아웃)
export async function deleteSession(
  db: D1Database,
  sessionToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const session = await validateSession(db, sessionToken);
  
  if (session) {
    await db.prepare('DELETE FROM xivix_sessions WHERE session_token = ?')
      .bind(sessionToken).run();
    
    await logAuthAction(db, session.user_type, session.user_id, 'logout', ipAddress, userAgent);
  }
}

// 만료된 세션 정리
export async function cleanupExpiredSessions(db: D1Database): Promise<number> {
  const result = await db.prepare(`
    DELETE FROM xivix_sessions WHERE expires_at < datetime('now')
  `).run();
  
  return result.meta.changes || 0;
}

// 인증 로그 기록
export async function logAuthAction(
  db: D1Database,
  userType: 'master' | 'owner',
  userId: number | null,
  action: 'login' | 'logout' | 'login_failed' | 'password_reset' | 'session_expired',
  ipAddress?: string,
  userAgent?: string,
  details?: string
): Promise<void> {
  await db.prepare(`
    INSERT INTO xivix_auth_logs (user_type, user_id, action, ip_address, user_agent, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(userType, userId, action, ipAddress || null, userAgent || null, details || null).run();
}

// 마스터 로그인
export async function masterLogin(
  db: D1Database,
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; token?: string; error?: string; user?: MasterAccount }> {
  const master = await db.prepare(`
    SELECT * FROM xivix_master_accounts WHERE email = ? AND is_active = 1
  `).bind(email).first<MasterAccount>();
  
  if (!master) {
    await logAuthAction(db, 'master', null, 'login_failed', ipAddress, userAgent, `Email not found: ${email}`);
    return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  }
  
  const isValid = await verifyPassword(password, master.password_hash);
  if (!isValid) {
    await logAuthAction(db, 'master', master.id, 'login_failed', ipAddress, userAgent, 'Wrong password');
    return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  }
  
  // 세션 생성
  const token = await createSession(db, 'master', master.id, ipAddress, userAgent);
  
  // 마지막 로그인 시간 업데이트
  await db.prepare(`
    UPDATE xivix_master_accounts SET last_login_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).bind(master.id).run();
  
  return { 
    success: true, 
    token,
    user: { ...master, password_hash: '' } // 비밀번호 해시 제외
  };
}

// 사장님 로그인
export async function ownerLogin(
  db: D1Database,
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; token?: string; error?: string; user?: OwnerAccount; storeId?: number }> {
  const owner = await db.prepare(`
    SELECT * FROM xivix_users WHERE email = ? AND is_active = 1
  `).bind(email).first<OwnerAccount>();
  
  if (!owner) {
    await logAuthAction(db, 'owner', null, 'login_failed', ipAddress, userAgent, `Email not found: ${email}`);
    return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  }
  
  // 계정 잠금 확인
  if (owner.locked_until && new Date(owner.locked_until) > new Date()) {
    return { success: false, error: '계정이 일시적으로 잠겼습니다. 나중에 다시 시도해주세요.' };
  }
  
  const isValid = await verifyPassword(password, owner.password_hash);
  if (!isValid) {
    // 로그인 실패 횟수 증가
    const newAttempts = (owner.login_attempts || 0) + 1;
    let lockedUntil = null;
    
    if (newAttempts >= 5) {
      // 5회 실패 시 30분 잠금
      const lockTime = new Date();
      lockTime.setMinutes(lockTime.getMinutes() + 30);
      lockedUntil = lockTime.toISOString();
    }
    
    await db.prepare(`
      UPDATE xivix_users SET login_attempts = ?, locked_until = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(newAttempts, lockedUntil, owner.id).run();
    
    await logAuthAction(db, 'owner', owner.id, 'login_failed', ipAddress, userAgent, `Attempt ${newAttempts}`);
    
    if (newAttempts >= 5) {
      return { success: false, error: '로그인 시도 횟수를 초과했습니다. 30분 후 다시 시도해주세요.' };
    }
    
    return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  }
  
  // 로그인 성공 - 실패 횟수 초기화
  await db.prepare(`
    UPDATE xivix_users SET login_attempts = 0, locked_until = NULL, last_login_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).bind(owner.id).run();
  
  // 세션 생성
  const token = await createSession(db, 'owner', owner.id, ipAddress, userAgent);
  
  // 사장님의 매장 ID 조회
  const store = await db.prepare(`
    SELECT id FROM xivix_stores WHERE user_id = ? AND is_active = 1 LIMIT 1
  `).bind(owner.id).first<{ id: number }>();
  
  await logAuthAction(db, 'owner', owner.id, 'login', ipAddress, userAgent);
  
  return { 
    success: true, 
    token,
    user: { ...owner, password_hash: '' },
    storeId: store?.id
  };
}

// 사장님 회원가입
export async function registerOwner(
  db: D1Database,
  email: string,
  password: string,
  name: string,
  phone?: string
): Promise<{ success: boolean; userId?: number; error?: string }> {
  // 이메일 중복 확인
  const existing = await db.prepare(`
    SELECT id FROM xivix_users WHERE email = ?
  `).bind(email).first();
  
  if (existing) {
    return { success: false, error: '이미 사용중인 이메일입니다.' };
  }
  
  // 비밀번호 해싱
  const passwordHash = await hashPassword(password);
  
  // 사용자 생성
  const result = await db.prepare(`
    INSERT INTO xivix_users (email, name, phone, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, 'owner', 1)
  `).bind(email, name, phone || null, passwordHash).run();
  
  return { 
    success: true, 
    userId: result.meta.last_row_id as number 
  };
}

// 현재 세션 사용자 정보 조회
export async function getCurrentUser(
  db: D1Database,
  sessionToken: string
): Promise<{ userType: 'master' | 'owner'; user: MasterAccount | OwnerAccount; storeId?: number } | null> {
  const session = await validateSession(db, sessionToken);
  if (!session) return null;
  
  if (session.user_type === 'master') {
    const master = await db.prepare(`
      SELECT * FROM xivix_master_accounts WHERE id = ?
    `).bind(session.user_id).first<MasterAccount>();
    
    if (!master) return null;
    return { userType: 'master', user: { ...master, password_hash: '' } };
  } else {
    const owner = await db.prepare(`
      SELECT * FROM xivix_users WHERE id = ?
    `).bind(session.user_id).first<OwnerAccount>();
    
    if (!owner) return null;
    
    const store = await db.prepare(`
      SELECT id FROM xivix_stores WHERE user_id = ? AND is_active = 1 LIMIT 1
    `).bind(owner.id).first<{ id: number }>();
    
    return { 
      userType: 'owner', 
      user: { ...owner, password_hash: '' },
      storeId: store?.id
    };
  }
}

// 비밀번호 변경
export async function changePassword(
  db: D1Database,
  userType: 'master' | 'owner',
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const table = userType === 'master' ? 'xivix_master_accounts' : 'xivix_users';
  
  const user = await db.prepare(`
    SELECT password_hash FROM ${table} WHERE id = ?
  `).bind(userId).first<{ password_hash: string }>();
  
  if (!user) {
    return { success: false, error: '사용자를 찾을 수 없습니다.' };
  }
  
  const isValid = await verifyPassword(oldPassword, user.password_hash);
  if (!isValid) {
    return { success: false, error: '현재 비밀번호가 올바르지 않습니다.' };
  }
  
  const newHash = await hashPassword(newPassword);
  await db.prepare(`
    UPDATE ${table} SET password_hash = ?, updated_at = datetime('now') WHERE id = ?
  `).bind(newHash, userId).run();
  
  return { success: true };
}
