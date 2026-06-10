import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BACKEND = process.env.HERMES_BACKEND_URL || 'http://localhost:8787';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const target = new URL(pathname + request.nextUrl.search, BACKEND);

  const headers = new Headers(request.headers);
  headers.set('Host', target.host);
  headers.set('X-Forwarded-Host', request.headers.get('Host') || target.host);
  headers.set('X-Forwarded-Proto', request.nextUrl.protocol.replace(':', ''));

  // Strip Origin & Referer so the backend treats this as a non-browser
  // request, bypassing CSRF origin/token checks entirely.
  headers.delete('Origin');
  headers.delete('Referer');

  return NextResponse.rewrite(target, { request: { headers } });
}

export const config = {
  matcher: '/api/:path*',
};
