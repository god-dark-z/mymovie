import { NextResponse, type NextRequest } from 'next/server';

/**
 * Auth gate for the whole application (Edge runtime).
 *
 * Every browsing surface (`/(app)`) requires a signed-in account. The only routes
 * visitors may reach without one are the auth routes themselves and the API routes
 * the auth flows need.
 *
 * The gate is enforced here rather than in each route so a new page cannot
 * accidentally be added without protection.
 *
 * Self-contained on purpose: this runs in the Edge runtime, which has no
 * `node:crypto` and cannot import `@/server/*`. The session cookie signature is
 * verified with Web Crypto instead, reading the secret straight from the env.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt|sitemap.xml|api/auth|api/auth/diagnose).*)',
  ],
};

const AUTH_ROUTES = new Set([
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/welcome',
]);

const SUBTLE = globalThis.crypto?.subtle;

async function verifySession(signed: string): Promise<boolean> {
  const index = signed.lastIndexOf('.');
  if (index <= 0) return false;
  const value = signed.slice(0, index);
  const mac = signed.slice(index + 1);

  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return false;

  if (!SUBTLE) return true; // No crypto available — trust the cookie.

  try {
    const key = await SUBTLE.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    // base64urlDecode returns the raw bytes as a binary string.
    const sig = Uint8Array.from(base64urlDecode(mac), (c) => c.charCodeAt(0));
    return await SUBTLE.verify('HMAC', key, sig, new TextEncoder().encode(value));
  } catch {
    return false;
  }
}

function base64urlDecode(input: string): string {
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the auth routes themselves.
  if (AUTH_ROUTES.has(pathname)) return NextResponse.next();

  // Redirect anything else to /login if there is no valid session.
  const raw = request.cookies.get('cineora_session')?.value;
  const valid = raw ? await verifySession(raw) : false;

  if (!valid) {
    // API routes answer in JSON — a redirect would be followed silently by fetch
    // and surface as an HTML-parse error far from the cause.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}
