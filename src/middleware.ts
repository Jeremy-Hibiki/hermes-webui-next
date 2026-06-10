import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BACKEND = process.env.HERMES_BACKEND_URL || 'http://localhost:8787';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only proxy /api/* requests
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const target = new URL(pathname + request.nextUrl.search, BACKEND);

  // Build headers - forward most, but replace Host and add X-Forwarded-* so
  // the backend's CSRF check accepts the cross-origin request.
  const headers = new Headers(request.headers);
  headers.set('Host', target.host);
  headers.set('X-Forwarded-Host', request.headers.get('Host') || target.host);
  headers.set('X-Forwarded-Proto', request.nextUrl.protocol.replace(':', ''));
  headers.set('X-Real-IP', request.headers.get('x-real-ip') || '');

  // Replace the browser's Origin with the backend's own origin so CSRF
  // same-origin check passes.
  headers.set('Origin', target.origin);

  return NextResponse.rewrite(target, { request: { headers } });
}

export const config = {
  matcher: '/api/:path*',
};
