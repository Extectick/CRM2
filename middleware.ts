import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateTelegramData } from './lib/telegram';

const protectedRoutes = [
  '/task',
  '/appeal',
  '/profile',
  '/appeal/create',
  '/appeal/[id]'
];

export async function middleware(request: NextRequest) {
  // Skip middleware for static files and public API routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/departments') ||
    request.nextUrl.pathname.includes('.') ||
    !protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))
  ) {
    return NextResponse.next();
  }

  // Check for Telegram auth with multiple fallbacks
  let initData: string | null = request.headers.get('x-telegram-init-data');
  
  if (!initData) {
    // Try getting from cookies
    const cookieData = request.cookies.get('telegram_init_data')?.value;
    console.log('Cookie initData:', cookieData ? 'found' : 'not found');
    initData = cookieData || null;
  }

  if (!initData) {
    // Try getting from query params
    const paramData = request.nextUrl.searchParams.get('telegram_init_data');
    console.log('Query param initData:', paramData ? 'found' : 'not found');
    initData = paramData;
  }

  if (!initData) {
    // Try getting from sessionStorage via header
    const sessionData = request.headers.get('x-session-telegram-data');
    console.log('SessionStorage initData:', sessionData ? 'found' : 'not found');
    initData = sessionData;
  }

  // Log all headers for debugging
  console.log('All request headers:', Array.from(request.headers.entries()));

  console.log('Middleware auth check for path:', request.nextUrl.pathname);
  console.log('InitData sources checked - present:', !!initData);
  console.log('All request cookies:', request.cookies.getAll());

  if (!initData) {
    console.log('No initData found - redirecting to /');
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Validate Telegram data with detailed error reporting
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  try {
    console.log('Validating Telegram data...');
    const telegramData = await validateTelegramData(initData, botToken);
    
    if (!telegramData) {
      console.error('Telegram validation failed - invalid initData:', initData);
      return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
    }

    console.log('Telegram validation successful for user:', telegramData.user.id);
    
    // Create response with security headers and user info
    const response = NextResponse.next();
    response.headers.set('x-telegram-user-id', telegramData.user.id.toString());
    response.headers.set('X-Frame-Options', 'ALLOWALL');
    response.headers.set('Content-Security-Policy', 
      "frame-ancestors 'self' https://web.telegram.org https://telegram.org;"
    );
    return response;
    
  } catch (error) {
    console.error('Error validating Telegram data:', error);
    return NextResponse.redirect(new URL('/?error=auth_error', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
