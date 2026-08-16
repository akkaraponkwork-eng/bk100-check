import { NextResponse } from 'next/server';
import { unstable_cache, revalidateTag } from 'next/cache';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';
import type { NCODuty } from '@/types';
import { requireRole } from '@/lib/auth-guard';

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

const getCachedNCORows = unstable_cache(
  async () => {
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'NCO!A2:D', 
    });
    return res.data.values || [];
  },
  ['nco-data'],
  { tags: ['nco'], revalidate: 60 }
);

// GET /api/nco?month=2026-08
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // "2026-08"

    let rows = await getCachedNCORows();
    
    // Optional: filter by month if provided (date is YYYY-MM-DD)
    if (month) {
      rows = rows.filter(r => r[1]?.startsWith(month));
    }
    
    const duties: NCODuty[] = rows.map(r => ({
      id: r[0],
      date: r[1],
      personnelId: r[2],
      remark: r[3] || ''
    }));

    return NextResponse.json({ duties });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/nco — บันทึกตารางสิบเวรทั้งเดือน (bulk replace for a month)
export async function POST(request: Request) {
  const nextRequest = request as any;
  const { user, error: roleError } = requireRole(nextRequest, ['admin', 'duty_officer']);
  if (roleError) return roleError;

  try {
    const body = await request.json();
    const { month, duties }: { month: string; duties: NCODuty[] } = body;

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // อ่านข้อมูลที่มีอยู่
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'NCO!A2:D',
    });
    const existingRows = res.data.values || [];
    
    // เก็บแถวที่ไม่ใช่เดือนนี้ไว้
    const otherRows = existingRows.filter(r => !r[1]?.startsWith(month));

    // แปลง duties ใหม่เป็นแถว
    const newRows = duties.map(d => [d.id || crypto.randomUUID(), d.date, d.personnelId, d.remark || '']);

    // รวม
    const allRows = [...otherRows, ...newRows];

    // เคลียร์ของเก่า
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: 'NCO!A2:D',
    });

    // เขียนใหม่
    if (allRows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'NCO!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: allRows },
      });
    }

    // @ts-expect-error: Next.js types incorrectly expect 2 arguments
    revalidateTag('nco');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
