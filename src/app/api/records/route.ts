import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

function getSheetAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !sheetId) {
    console.error('DEBUG ENV:', { clientEmail: !!clientEmail, privateKey: !!privateKey, sheetId: !!sheetId });
    throw new Error('Missing Google Sheets API credentials');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return { auth, sheetId };
}

// GET /api/records?latest=true — ดึง record ล่าสุด หรือทั้งหมด
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latest = searchParams.get('latest') === 'true';
    const date = searchParams.get('date');

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Records!A2:E',
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return NextResponse.json({ record: null });
    }

    if (date) {
      // ค้นหา record ตามวันที่
      const row = [...rows].reverse().find(r => r[0] === date);
      if (!row) return NextResponse.json({ record: null });
      return NextResponse.json({
        record: {
          date: row[0],
          totalCompany: Number(row[1]) || 0,
          totalDistributed: Number(row[2]) || 0,
          remaining: Number(row[3]) || 0,
          tasks: row[4] ? JSON.parse(row[4]) : [],
        }
      });
    }

    if (latest) {
      // ดึง record ล่าสุด
      const last = rows[rows.length - 1];
      return NextResponse.json({
        record: {
          date: last[0],
          totalCompany: Number(last[1]) || 0,
          totalDistributed: Number(last[2]) || 0,
          remaining: Number(last[3]) || 0,
          tasks: last[4] ? JSON.parse(last[4]) : [],
        }
      });
    }

    return NextResponse.json({ records: rows.map(row => ({
      date: row[0],
      totalCompany: Number(row[1]) || 0,
      totalDistributed: Number(row[2]) || 0,
      remaining: Number(row[3]) || 0,
    }))});
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('GET /api/records error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/records — บันทึก record ใหม่
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, totalCompany, totalDistributed, remaining, tasks } = body;

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Records!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[date, totalCompany, totalDistributed, remaining, JSON.stringify(tasks)]]
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('POST /api/records error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
