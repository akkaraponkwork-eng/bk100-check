import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createSessionToken } from '@/lib/session';
import { cookies } from 'next/headers';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { otp } = body;

    if (!otp) {
      return NextResponse.json({ error: 'กรุณากรอกรหัส OTP' }, { status: 400 });
    }

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    let adminOtp = '';
    let adminOtpExpiry = '';
    
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'BotSettings!A:B',
      });
      const rows = res.data.values || [];
      const settings: Record<string, string> = {};
      rows.forEach(row => { if (row[0] && row[1]) settings[row[0]] = row[1]; });
      
      adminOtp = settings['adminOtp'] || '';
      adminOtpExpiry = settings['adminOtpExpiry'] || '0';
    } catch (e: any) {
      console.error('Failed to get BotSettings', e);
      return NextResponse.json({ error: 'ไม่สามารถตรวจสอบ OTP ได้' }, { status: 500 });
    }

    // Check validity
    const now = Date.now();
    if (!adminOtp || adminOtp !== otp) {
      return NextResponse.json({ error: 'รหัส OTP ไม่ถูกต้อง' }, { status: 401 });
    }

    if (now > parseInt(adminOtpExpiry)) {
      return NextResponse.json({ error: 'รหัส OTP หมดอายุแล้ว' }, { status: 401 });
    }

    // Clear OTP after successful use
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'BotSettings!A5:B6',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['adminOtp', ''], ['adminOtpExpiry', '']] }
    });

    // Create session for Admin
    const adminUser = {
      lineUserId: 'SYSTEM_ADMIN',
      personnelId: 'ADMIN',
      displayName: 'System Admin',
      pictureUrl: '',
      role: 'admin' as any
    };

    const token = await createSessionToken(adminUser);
    
    // Set Cookie
    const cookieStore = await cookies();
    cookieStore.set('bk100_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return NextResponse.json({ success: true, redirectUrl: '/' });
  } catch (error: any) {
    console.error('Verify OTP Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
