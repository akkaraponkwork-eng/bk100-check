import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { NCODuty, NCOMonthlyRoster } from '@/types';

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

// GET /api/nco?month=2026-08
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // "2026-08"

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'NCO!A2:B', // Month, DutiesJSON
    });
    const rows = (res.data.values || []).filter(r => r[0]);

    const rosters: NCOMonthlyRoster[] = rows.map(r => {
      let duties: NCODuty[] = [];
      try { duties = JSON.parse(r[1] || '[]'); } catch (e) {}
      return { month: r[0], duties };
    });

    if (month) {
      const roster = rosters.find(r => r.month === month);
      return NextResponse.json({ duties: roster ? roster.duties : [] });
    }

    // Return flattened duties if no month specified
    const allDuties = rosters.flatMap(r => r.duties);
    return NextResponse.json({ duties: allDuties });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/nco — บันทึกตารางสิบเวรทั้งเดือน (bulk)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { month, duties }: { month: string; duties: NCODuty[] } = body;

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // อ่าน roster ที่มีอยู่
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'NCO!A2:B',
    });
    const existingRows = (res.data.values || []).filter(r => r[0]);
    const otherMonths = existingRows.filter(r => r[0] !== month);

    // รวม
    const allRows = [...otherMonths, [month, JSON.stringify(duties)]];

    // เขียนใหม่ทั้งหมด
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: 'NCO!A1:B',
    });

    const header = [['Month', 'DutiesJSON']];
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'NCO!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [...header, ...allRows] },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
