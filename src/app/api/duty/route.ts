import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { DutyShift } from '@/types';

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

// GET /api/duty?date=2026-07-24 or ?latest=true
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const latest = searchParams.get('latest') === 'true';

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Duty!A2:C',
    });
    const rows = (res.data.values || []).filter(r => r[0]);

    if (date) {
      const row = rows.find(r => r[0] === date);
      if (!row) return NextResponse.json({ shift: null });
      return NextResponse.json({ shift: JSON.parse(row[2] || 'null') });
    }

    if (latest && rows.length > 0) {
      const last = rows[rows.length - 1];
      return NextResponse.json({ shift: JSON.parse(last[2] || 'null') });
    }

    return NextResponse.json({
      shifts: rows.map(r => ({ date: r[0], location: r[1], shift: JSON.parse(r[2] || '{}') }))
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/duty
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shift }: { shift: DutyShift } = body;

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Duty!A:C',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[shift.date, shift.location, JSON.stringify(shift)]]
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
