import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { AppUser, UserRole } from '@/types';
import { createSessionToken } from '@/lib/session';

function getSheetAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!clientEmail || !privateKey || !sheetId) throw new Error('Missing Google credentials');
  const auth = new google.auth.JWT({
    email: clientEmail, key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return { auth, sheetId };
}

// Exchange code for token and get LINE profile
async function getLineProfile(code: string, redirectUri: string) {
  const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID!;
  const channelSecret = process.env.LINE_CHANNEL_SECRET!;

  // 1. Exchange code for access token
  const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });

  if (!tokenRes.ok) throw new Error('Failed to get LINE token');
  const tokenData = await tokenRes.json();

  // 2. Get profile
  const profileRes = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!profileRes.ok) throw new Error('Failed to get LINE profile');
  return profileRes.json();
}

// Find user in Google Sheets Users tab
async function findUserByLineId(lineUserId: string): Promise<AppUser | null> {
  try {
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Users!A2:E',
    });

    const rows = res.data.values || [];
    const row = rows.find(r => r[0] === lineUserId);
    if (!row) return null;

    return {
      lineUserId: row[0],
      personnelId: row[1],
      role: (row[2] as UserRole) || 'personnel',
      displayName: row[3] || '',
      pictureUrl: row[4] || undefined,
    };
  } catch {
    return null;
  }
}

// Session creation moved to @/lib/session

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle LINE errors (e.g., user cancelled)
  if (error) {
    return NextResponse.redirect(new URL('/login?error=cancelled', request.url));
  }

  // CSRF state check
  const storedState = request.cookies.get('line_state')?.value;
  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`;
    const profile = await getLineProfile(code, redirectUri);
    const lineUserId: string = profile.userId;

    // Look up user in Google Sheets
    let appUser = await findUserByLineId(lineUserId);

    if (!appUser) {
      // User not registered — redirect to link-account page with profile data
      const linkUrl = new URL(`/link-account`, request.url);
      linkUrl.searchParams.set('lineUserId', lineUserId);
      if (profile.displayName) linkUrl.searchParams.set('displayName', profile.displayName);
      if (profile.pictureUrl) linkUrl.searchParams.set('pictureUrl', profile.pictureUrl);
      
      return NextResponse.redirect(linkUrl);
    }

    // Update display name & picture from LINE
    appUser = {
      ...appUser,
      displayName: profile.displayName || appUser.displayName,
      pictureUrl: profile.pictureUrl || appUser.pictureUrl,
    };

    // Create session
    const token = await createSessionToken(appUser);
    const response = NextResponse.redirect(new URL('/', request.url));

    response.cookies.set('bk100_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
      sameSite: 'lax',
    });

    // Clear CSRF state
    response.cookies.delete('line_state');

    return response;
  } catch (err) {
    console.error('[Auth Callback Error]', err);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
