import { NextResponse } from 'next/server';

// LINE OAuth — redirect to LINE authorization page
export async function GET() {
  const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`;

  if (!channelId) {
    return NextResponse.json(
      { error: 'LINE_CHANNEL_ID ไม่ถูกตั้งค่า กรุณาเพิ่มใน .env.local' },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID(); // CSRF protection
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: 'profile openid',
  });

  const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?${params}`;

  // Store state in cookie for CSRF check
  const response = NextResponse.redirect(lineAuthUrl);
  response.cookies.set('line_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
