import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/session';
import { cookies } from 'next/headers';
import { google } from 'googleapis';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Instead of plaintext validEnvPassword, we expect ADMIN_PASSWORD to be either plain or hashed
    const validEnvUsername = process.env.ADMIN_USERNAME || 'bk100';
    const validEnvPassword = process.env.ADMIN_PASSWORD || 'bk100admin';

    let isAuthenticated = false;

    // Check Google Sheet first
    try {
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const sheetId = process.env.GOOGLE_SHEET_ID;
      
      if (clientEmail && privateKey && sheetId) {
        const auth = new google.auth.JWT({
          email: clientEmail, key: privateKey,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({ version: 'v4', auth });
        
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: 'AdminAccounts!A:B',
        });
        
        const rows = res.data.values || [];
        const sheetUser = rows.find(r => r[0] === username);
        if (sheetUser) {
          const storedPassword = sheetUser[1] || '';
          const isValid = await bcrypt.compare(password, storedPassword);
          if (isValid) {
            isAuthenticated = true;
          }
        }
      }
    } catch (e: any) {
      console.log('AdminAccounts sheet not found or accessible, falling back to ENV.');
    }

    // Fallback to ENV if not found in sheet
    if (!isAuthenticated && username === validEnvUsername) {
      if (validEnvPassword.startsWith('$2a$') || validEnvPassword.startsWith('$2b$')) {
        const isValid = await bcrypt.compare(password, validEnvPassword);
        if (isValid) {
          isAuthenticated = true;
        }
      } else {
        if (password === validEnvPassword) {
          isAuthenticated = true;
        }
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    // Create session for Admin directly
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
    console.error('Admin Login Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
