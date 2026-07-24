import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { Personnel } from '@/types';

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

function rowToPersonnel(row: string[]): Personnel {
  return {
    id: row[0] || '',
    rank: row[1] || '',
    firstName: row[2] || '',
    lastName: row[3] || '',
    batch: Number(row[4]) || 0,
    phone: row[5] || undefined,
    status: (row[6] as Personnel['status']) || 'available',
    dutyCount: Number(row[7]) || 0,
    isNCOEligible: String(row[8]).toLowerCase() === 'true',
  };
}

function personnelToRow(p: Personnel): string[] {
  return [
    p.id, p.rank, p.firstName, p.lastName,
    String(p.batch), p.phone || '',
    p.status, String(p.dutyCount), String(p.isNCOEligible || false),
  ];
}

// GET /api/personnel
export async function GET() {
  try {
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Personnel!A2:I', // skip header row
    });
    const rows = (res.data.values || []).filter(r => r[0]);
    return NextResponse.json({ personnel: rows.map(rowToPersonnel) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/personnel — เพิ่มหรืออัปเดตทั้ง array (bulk upsert)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { personnel }: { personnel: Personnel[] } = body;

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Clear and rewrite
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: 'Personnel!A1:I',
    });

    const header = [['id', 'rank', 'firstName', 'lastName', 'batch', 'phone', 'status', 'dutyCount', 'isNCOEligible']];
    const values = [
      ...header,
      ...personnel.map(personnelToRow),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Personnel!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
