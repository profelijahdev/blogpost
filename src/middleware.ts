import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter
const requestCounts = new Map<string, { count: number; startTime: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

// Clean up old entries periodically
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return; // Clean every 5 min
  lastCleanup = now;
  for (const [key, value] of requestCounts.entries()) {
    if (now - value.startTime > WINDOW_MS * 2) {
      requestCounts.delete(key);
    }
  }
}

function isRateLimited(ip: string): boolean {
  cleanup();
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now - record.startTime > WINDOW_MS) {
    requestCounts.set(ip, { count: 1, startTime: now });
    return false;
  }

  if (record.count >= MAX_REQUESTS) {
    return true;
  }

  record.count++;
  return false;
}

// Blocked patterns for common attacks
const BLOCKED_PATTERNS = [
  /\.\.\//g,           // Path traversal
  /%2e%2e/gi,         // Encoded path traversal
  /<script/gi,         // XSS attempts
  /javascript:/gi,     // JS protocol
  /on\w+\s*=/gi,      // Event handlers
  /exec\s*\(/gi,      // Code execution
  /union\s+select/gi,  // SQL injection
  /drop\s+table/gi,    // SQL injection
  /wp-admin/gi,        // WordPress scan
  /phpmyadmin/gi,      // PHPMyAdmin scan
  /\.env/gi,           // Environment file access
  /\.git/gi,           // Git directory access
];

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const path = request.nextUrl.pathname;

  // 1. Rate limiting
  if (isRateLimited(ip)) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  // 2. Block malicious request patterns
  const fullPath = path + request.nextUrl.search;
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(fullPath)) {
      console.warn(`🚨 Blocked malicious request from ${ip}: ${fullPath}`);
      return new NextResponse('Not Found', { status: 404 });
    }
  }

  // 3. Block suspicious methods on API routes
  if (path.startsWith('/api/') && !['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) {
    return new NextResponse('Method Not Allowed', { status: 405 });
  }

  // 4. Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
