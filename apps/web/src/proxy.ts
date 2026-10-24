import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const APEX_HOST = 'professionalresume.co.ke';
const CANONICAL_HOST = 'www.professionalresume.co.ke';

export function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const requestHost = forwardedHost || request.headers.get('host') || request.nextUrl.host;
  const hostname = requestHost.split(',')[0].trim().split(':')[0].toLowerCase();

  if (hostname !== APEX_HOST) return NextResponse.next();

  const canonicalUrl = request.nextUrl.clone();
  canonicalUrl.protocol = 'https:';
  canonicalUrl.hostname = CANONICAL_HOST;
  canonicalUrl.port = '';
  return NextResponse.redirect(canonicalUrl, 308);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
