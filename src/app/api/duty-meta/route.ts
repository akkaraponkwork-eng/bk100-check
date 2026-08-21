import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { PunishmentEntry, ExceptionEntry } from '@/types';
import { requireRole } from '@/lib/auth-guard';

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

// Headers: ['id', 'type', 'personnelId', 'shift_or_reason', 'startDate', 'endDate', 'createdAt', 'status', 'source', 'remark']
const RANGE = 'DutyMeta!A2:J';

// GET /api/duty-meta?type=punishment|exception
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); 

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    let rows: string[][] = [];
    let leaveRows: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges: [RANGE, 'Leave!A2:J'],
      });
      rows = (res.data.valueRanges?.[0].values || []).filter((r: any) => r[0]);
      leaveRows = (res.data.valueRanges?.[1].values || []).filter((r: any) => r[0]);
    } catch {
      return NextResponse.json({ punishments: [], exceptions: [] });
    }

    const punishments: PunishmentEntry[] = [];
    const exceptions: ExceptionEntry[] = [];

    // Process DutyMeta
    rows.forEach(row => {
      const rowType = row[1];
      if (rowType === 'punishment') {
        punishments.push({
          id: row[0],
          personnelId: row[2] || '',
          shift: Number(row[3]) || 0,
          startDate: row[4] || '',
          endDate: row[5] || '',
          status: (row[7] as any) || 'todo',
          source: (row[8] as any) || 'manual',
          remark: row[9] || '',
        });
      } else if (rowType === 'exception') {
        exceptions.push({
          personnelId: row[2] || '',
          reason: (row[3] as ExceptionEntry['reason']) || 'ป่วย',
          startDate: row[4] || '',
          endDate: row[5] || '',
        });
      }
    });

    // Process Leaves (append approved leaves as exceptions)
    leaveRows.forEach(row => {
      const status = row[6]; // 'pending', 'approved', 'rejected'
      if (status === 'approved') {
        exceptions.push({
          personnelId: row[1] || '',
          reason: 'ธุระการ', 
          startDate: row[3] || '',
          endDate: row[4] || '',
        });
      }
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
  const nextRequest = request as any;
  const { user, error: roleError } = requireRole(nextRequest, ['admin', 'duty_officer']);
  if (roleError) return roleError;

  try {
    const body = await request.json();
    const { type, data, overwrite = true } = body;

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    let rows: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: RANGE,
      });
      rows = (res.data.values || []).filter(r => r[0]);
    } catch {}

    // If overwrite is true, filter out rows of the SAME type (replace them). 
    // If overwrite is false, keep all rows (append).
    const otherRows = overwrite ? rows.filter(r => r[1] !== type) : rows;
    
    const now = new Date().toISOString();
    const newRows = data.map((item: any) => {
      const shiftOrReason = type === 'punishment' ? String(item.shift || 0) : item.reason;
      return [
        item.id || crypto.randomUUID(), // id
        type,
        item.personnelId,
        shiftOrReason,
        item.startDate,
        item.endDate,
        now,
        item.status || 'todo',
        item.source || 'manual',
        item.remark || ''
      ];
    });

    const allDataToSave = [...otherRows, ...newRows];

    // Clear and rewrite everything
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: 'DutyMeta!A2:J',
      });
    } catch {}

    if (allDataToSave.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'DutyMeta!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: allDataToSave },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
