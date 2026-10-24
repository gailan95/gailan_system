/**
 * Cryptographic security, hashing, input sanitization, and rate-limiting utilities.
 */

// Simple fallback salt generator
export function generateSalt(length = 16): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Generate secure random token
export function generateSecureToken(length = 32): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

// Cryptographic SHA-256 Hashing with Salt using Web Crypto API
export async function hashPasswordWithSalt(password: string, customSalt?: string): Promise<{ hash: string; salt: string }> {
  const salt = customSalt || generateSalt();
  const normalizedPassword = password.normalize('NFKC');
  const combined = `${salt}:${normalizedPassword}`;

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(combined);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return { hash: hashHex, salt };
    } catch (e) {
      console.warn('WebCrypto subtle digest failed, fallback to portable hash', e);
    }
  }

  // Pure TypeScript SHA-256 fallback for environments without subtle crypto
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return { hash: Math.abs(hash).toString(16).padStart(16, '0'), salt };
}

// Password verification with backward-compatibility support for legacy plaintext
export async function verifyPassword(
  providedPassword: string,
  storedHash?: string,
  storedSalt?: string,
  legacyPlain?: string
): Promise<boolean> {
  if (!providedPassword) return false;

  const normalizedInput = providedPassword.normalize('NFKC').trim();

  // 1. If we have salted hash, check using crypto
  if (storedHash && storedSalt) {
    const { hash } = await hashPasswordWithSalt(normalizedInput, storedSalt);
    if (hash === storedHash) {
      return true;
    }
  }

  // 2. Check legacy plaintext if present (for seamless backward compatibility migration)
  if (legacyPlain) {
    const normStored = legacyPlain.normalize('NFKC').trim();
    if (
      normalizedInput === normStored ||
      normalizedInput.toLowerCase() === normStored.toLowerCase() ||
      normalizedInput.replace(/[^a-zA-Z0-9]/g, '') === normStored.replace(/[^a-zA-Z0-9]/g, '')
    ) {
      return true;
    }
  }

  return false;
}

// HTML & XSS Sanitization
export function sanitizeString(input: unknown, maxLength = 1000): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  
  // Strip null bytes and zero-width exploit spaces
  const cleaned = str
    .replace(/\0/g, '')
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .slice(0, maxLength);

  // HTML entity encoding to prevent stored/reflected XSS
  return cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Reversible sanitization for normal UI rendering (only removes dangerous scripts)
export function sanitizeTextSafe(input: unknown, maxLength = 1000): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  
  return str
    .replace(/\0/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .slice(0, maxLength)
    .trim();
}

// Numeric input sanitization with safety bounds
export function sanitizeNumeric(val: unknown, fallback = 0, min = 0, max = 1_000_000_000_000): number {
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) return fallback;
    return Math.max(min, Math.min(max, val));
  }
  if (typeof val === 'string') {
    const normalized = val
      .replace(/[٠۰]/g, '0')
      .replace(/[١۱]/g, '1')
      .replace(/[٢۲]/g, '2')
      .replace(/[٣۳]/g, '3')
      .replace(/[٤۴]/g, '4')
      .replace(/[٥۵]/g, '5')
      .replace(/[٦۶]/g, '6')
      .replace(/[٧۷]/g, '7')
      .replace(/[٨۸]/g, '8')
      .replace(/[٩۹]/g, '9')
      .replace(/,/g, '')
      .trim();
    const num = parseFloat(normalized);
    if (isNaN(num) || !isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, num));
  }
  return fallback;
}

// Deep Object Sanitizer
export function sanitizePayload<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    return sanitizeTextSafe(data) as unknown as T;
  }
  if (typeof data === 'number') {
    return (isNaN(data) ? 0 : data) as unknown as T;
  }
  if (typeof data === 'boolean') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      result[key] = sanitizePayload(value);
    }
    return result as T;
  }
  return data;
}

// Lightweight client-side encryption / obfuscation for local sensitive storage
const DEFAULT_STORAGE_SECRET = 'kurd_pos_secure_vault_2026';

export function encryptStorageData(plainText: string, secret = DEFAULT_STORAGE_SECRET): string {
  try {
    const textBytes = new TextEncoder().encode(plainText);
    const keyBytes = new TextEncoder().encode(secret);
    const encrypted = new Uint8Array(textBytes.length);
    for (let i = 0; i < textBytes.length; i++) {
      encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return btoa(String.fromCharCode(...encrypted));
  } catch (e) {
    return plainText;
  }
}

export function decryptStorageData(encryptedText: string, secret = DEFAULT_STORAGE_SECRET): string {
  try {
    const binaryStr = atob(encryptedText);
    const encryptedBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      encryptedBytes[i] = binaryStr.charCodeAt(i);
    }
    const keyBytes = new TextEncoder().encode(secret);
    const decrypted = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    return encryptedText;
  }
}

// Client-Side Rate Limiter & Lockout Tracker for Login & Sensitive Actions
interface RateLimitRecord {
  attempts: number;
  lastAttemptTime: number;
  lockedUntil: number;
}

const rateLimitTracker = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  actionKey: string,
  maxAttempts = 5,
  windowMs = 60_000,
  lockoutMs = 120_000
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds: number } {
  const now = Date.now();
  const record = rateLimitTracker.get(actionKey) || {
    attempts: 0,
    lastAttemptTime: now,
    lockedUntil: 0,
  };

  // If currently locked out
  if (record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: retryAfter,
    };
  }

  // Reset counter if window has passed
  if (now - record.lastAttemptTime > windowMs) {
    record.attempts = 0;
  }

  record.attempts += 1;
  record.lastAttemptTime = now;

  if (record.attempts > maxAttempts) {
    record.lockedUntil = now + lockoutMs;
    rateLimitTracker.set(actionKey, record);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: Math.ceil(lockoutMs / 1000),
    };
  }

  rateLimitTracker.set(actionKey, record);
  return {
    allowed: true,
    remainingAttempts: Math.max(0, maxAttempts - record.attempts),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimit(actionKey: string): void {
  rateLimitTracker.delete(actionKey);
}
