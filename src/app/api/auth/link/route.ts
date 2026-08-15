import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createSessionToken } from '@/lib/session';

// Type from personnel API for reference
interface PersonnelRow {
  id: string;
  rank: string;
  firstName: string;
  lastName: string;
}

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
    const body = await request.json();
    const { lineUserId, firstName, lastName, displayName, pictureUrl } = body;

    if (!lineUserId || !firstName || !lastName) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Fetch Personnel
    const pRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Personnel!A2:E',
    });
    
    const rows = pRes.data.values || [];
    const searchFirst = firstName.trim().replace(/\s+/g, '');
    const searchLast = lastName.trim().replace(/\s+/g, '');

    // 2. Find matching personnel
    let matchedPersonnel: PersonnelRow | null = null;
    
    for (const row of rows) {
      if (!row[0]) continue;
      const rowFirst = (row[2] || '').trim().replace(/\s+/g, '');
      const rowLast = (row[3] || '').trim().replace(/\s+/g, '');
      
      if (rowFirst === searchFirst && rowLast === searchLast) {
        matchedPersonnel = {
          id: row[0],
          rank: row[1],
          firstName: row[2],
          lastName: row[3]
        };
        break;
      }
    }

    if (!matchedPersonnel) {
      return NextResponse.json({ error: 'ไม่พบชื่อและนามสกุลนี้ในระบบ กรุณาตรวจสอบการสะกด' }, { status: 404 });
    }

    // 3. Check if user already linked (prevent duplicate link)
    const uRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Users!A:B',
    });
    
    const userRows = uRes.data.values || [];
    const alreadyLinked = userRows.some(row => row[1] === matchedPersonnel!.id);
    
    if (alreadyLinked) {
      return NextResponse.json({ error: 'ชื่อนี้ถูกผูกบัญชีไปแล้ว ติดต่อแอดมินหากมีข้อผิดพลาด' }, { status: 400 });
    }

    // 4. Create User Row
    // Headers: ['lineUserId', 'personnelId', 'role', 'displayName', 'pictureUrl']
    const role = 'personnel'; // Default role for auto-link
    const nameToSave = `${matchedPersonnel.rank}${matchedPersonnel.firstName} ${matchedPersonnel.lastName}`;
    
    const newUserRow = [
      lineUserId,
      matchedPersonnel.id,
      role,
      displayName || nameToSave,
      pictureUrl || ''
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Users!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newUserRow] },
    });

    // 5. Create Session Cookie (log them in automatically)
    const token = await createSessionToken({
      lineUserId,
      personnelId: matchedPersonnel.id,
      role: role as any,
      displayName: nameToSave,
      pictureUrl: pictureUrl || '',
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
    console.error('Link Auth Error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}
