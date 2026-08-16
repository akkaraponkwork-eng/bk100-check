import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createSessionToken } from '@/lib/session';

function getSheetAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!clientEmail || !privateKey || !sheetId) throw new Error('Missing credentials');
  
  const auth = new google.auth.JWT({
    email: clientEmail, key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return { auth, sheetId };
}

export async function POST(request: NextRequest) {
  try {
    const { lineUserId, displayName, pictureUrl } = await request.json();

    if (!lineUserId) {
      return NextResponse.json({ error: 'Missing lineUserId' }, { status: 400 });
    }

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Check if user is linked
    const uRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Users!A:E',
    });
    
    const userRows = uRes.data.values || [];
    const linkedUser = userRows.find(row => row[0] === lineUserId);
    
    if (!linkedUser) {
      // User not linked
      return NextResponse.json({ error: 'Not linked' }, { status: 404 });
    }

    // linkedUser: ['lineUserId', 'personnelId', 'role', 'displayName', 'pictureUrl']
    const personnelId = linkedUser[1];
    const role = linkedUser[2] || 'personnel';
    const storedName = linkedUser[3] || displayName;
    const storedPic = linkedUser[4] || pictureUrl;

    const token = await createSessionToken({
      lineUserId,
      personnelId,
      role: role as any,
      displayName: storedName,
      pictureUrl: storedPic,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: 'bk100_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('LIFF Auth Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
