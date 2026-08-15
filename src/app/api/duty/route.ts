import { NextResponse } from 'next/server';
import { unstable_cache, revalidateTag } from 'next/cache';
import { google } from 'googleapis';
import type { DutyShift, ShiftSlot } from '@/types';

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

const getCachedDuty = unstable_cache(
  async () => {
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Fetch Duty
    let dutyRows: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Duty!A2:B',
      });
      dutyRows = (res.data.values || []).filter(r => r[0]);
    } catch {}

    // Fetch DutySlots
    let slotRows: string[][] = [];
    try {
      const slotRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'DutySlots!A2:H',
      });
      slotRows = (slotRes.data.values || []).filter(r => r[0]);
    } catch {}

    return { dutyRows, slotRows };
  },
  ['duty-data'],
  { tags: ['duty'], revalidate: 60 }
);

// GET /api/duty?date=2026-07-24 or ?latest=true
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const latest = searchParams.get('latest') === 'true';

    const { dutyRows, slotRows } = await getCachedDuty();

    const parseShift = (targetDate: string, location: string): DutyShift => {
      const slots = slotRows
        .filter(r => r[1] === targetDate)
        .sort((a, b) => Number(a[6]) - Number(b[6])) // Sort by order
        .map((r, i) => ({
          id: r[0] || crypto.randomUUID(),
          start: r[2] || '',
          end: r[3] || '',
          personnelId: r[4] || '',
          customName: r[5] || '',
          order: Number(r[6]) || i + 1,
          isPunishment: String(r[7]).toLowerCase() === 'true',
        }));
      
      // Ensure there are always 6 slots if empty
      const defaultSlots: ShiftSlot[] = Array(6).fill(null).map((_, i) => {
        const h = i * 4;
        const startH = h.toString().padStart(2, '0') + ':00';
        const endH = (h + 4).toString().padStart(2, '0') + ':00';
        return { 
          id: crypto.randomUUID(), 
          start: startH, 
          end: endH, 
          personnelId: '', 
          order: i + 1 
        };
      });

      return {
        id: targetDate, // Use date as fallback ID or generate one
        date: targetDate,
        location: location || 'กองร้อยทหารปืนใหญ่',
        timeSlots: slots.length > 0 ? slots : defaultSlots,
        batchMode: 'mixed'
      };
    };

    if (date) {
      const row = [...dutyRows].reverse().find(r => r[0] === date);
      if (!row) return NextResponse.json({ shift: null });
      return NextResponse.json({ shift: parseShift(row[0], row[1]) });
    }

    if (latest && dutyRows.length > 0) {
      const last = dutyRows[dutyRows.length - 1];
      return NextResponse.json({ shift: parseShift(last[0], last[1]) });
    }

    return NextResponse.json({
      shifts: dutyRows.map(r => parseShift(r[0], r[1]))
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

    // 1. Update Duty Sheet
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Duty!A2:B',
    });
    const dutyRows = res.data.values || [];
    const rowIndex = dutyRows.findIndex(r => r[0] === shift.date);

    if (rowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `Duty!A${rowIndex + 2}:B${rowIndex + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[shift.date, shift.location]] }
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Duty!A:B',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[shift.date, shift.location]] }
      });
    }

    // 2. Update DutySlots Sheet
    let slotRows: string[][] = [];
    try {
      const slotRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'DutySlots!A2:H',
      });
      slotRows = slotRes.data.values || [];
    } catch {}

    const otherSlots = slotRows.filter(r => r[1] !== shift.date);
    const newSlots = shift.timeSlots.map((slot, index) => [
      crypto.randomUUID(), // id
      shift.date,
      slot.start,
      slot.end,
      slot.personnelId,
      slot.customName || '',
      String(index), // order
      String(slot.isPunishment || false)
    ]);

    const allSlotsToSave = [...otherSlots, ...newSlots];

    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: 'DutySlots!A2:H',
      });
    } catch {}

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'DutySlots!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: allSlotsToSave }
      });

    // @ts-expect-error: Next.js types incorrectly expect 2 arguments
    revalidateTag('duty');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
