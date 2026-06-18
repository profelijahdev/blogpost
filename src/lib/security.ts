// Security utilities for the blog
// No auth required - just protection against common attacks

const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

const requestCounts = new Map<string, { count: number; startTime: number }>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCounts.entries()) {
    if (now - value.startTime > RATE_LIMIT_WINDOW * 2) {
      requestCounts.delete(key);
    }
  }
}, 300_000);

// Input sanitization - prevent XSS and injection
export function sanitizeInput(input: string, maxLength = 1000): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\0/g, '')
    .trim()
    .slice(0, maxLength);
}

// Sanitize for SQL - basic protection (Prisma handles parameterized queries, this is extra)
export function sanitizeForQuery(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '')
    .replace(/exec/gi, '')
    .replace(/union/gi, '')
    .replace(/select/gi, '')
    .replace(/insert/gi, '')
    .replace(/delete/gi, '')
    .replace(/drop/gi, '')
    .replace(/update/gi, '')
    .trim();
}

// Rate limiting check
export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now - record.startTime > RATE_LIMIT_WINDOW) {
    requestCounts.set(ip, { count: 1, startTime: now });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count };
}

// Check for common attack patterns in user input
export function detectMaliciousInput(input: string): { safe: boolean; reason?: string } {
  const maliciousPatterns = [
    { pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, reason: 'Script injection detected' },
    { pattern: /javascript:/gi, reason: 'JavaScript protocol detected' },
    { pattern: /on\w+\s*=/gi, reason: 'Event handler detected' },
    { pattern: /data:text\/html/gi, reason: 'Data URI detected' },
    { pattern: /vbscript:/gi, reason: 'VBScript detected' },
    { pattern: /expression\s*\(/gi, reason: 'CSS expression detected' },
    { pattern: /url\s*\(\s*javascript/gi, reason: 'URL injection detected' },
  ];

  for (const { pattern, reason } of maliciousPatterns) {
    if (pattern.test(input)) {
      return { safe: false, reason };
    }
  }

  return { safe: true };
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Generate a session ID for anonymous users (for likes)
export function generateSessionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Security headers for responses
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'",
  };
}
