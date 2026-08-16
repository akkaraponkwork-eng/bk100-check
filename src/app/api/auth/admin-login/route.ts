import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/session';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Check hardcoded credentials
    if (username !== 'bk100' || password !== 'bk100admin') {
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
