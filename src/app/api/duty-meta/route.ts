import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

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

const RANGE = 'DutyMeta!A1:B';

// GET /api/duty-meta?type=punishment|exception
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'punishment' | 'exception'

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Try to get data, handle sheet not existing
    let rows: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: RANGE,
      });
      rows = (res.data.values || []).filter(r => r[0]);
    } catch {
      // Sheet might not exist yet
      return NextResponse.json({ punishments: [], exceptions: [] });
    }

    let punishments: object[] = [];
    let exceptions: object[] = [];

    rows.forEach(row => {
      if (!row[1]) return;
      try {
        const data = JSON.parse(row[1]);
        if (row[0] === 'punishment') punishments = data;
        if (row[0] === 'exception') exceptions = data;
      } catch {}
    });

    if (type === 'punishment') return NextResponse.json({ punishments });
    if (type === 'exception') return NextResponse.json({ exceptions });

    return NextResponse.json({ punishments, exceptions });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/duty-meta
// body: { type: 'punishment'|'exception', data: [...] }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Read existing
    let rows: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: RANGE,
      });
      rows = (res.data.values || []).filter(r => r[0]);
    } catch {}

    // Update the matching type row
    const otherRows = rows.filter(r => r[0] !== type && r[0] !== 'Type');
    const newRows = [...otherRows, [type, JSON.stringify(data)]];

    // Clear and rewrite
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: RANGE,
      });
    } catch {}

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'DutyMeta!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Type', 'DataJSON'], ...newRows] },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
