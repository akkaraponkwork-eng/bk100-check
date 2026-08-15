import { NextResponse } from 'next/server';
import { unstable_cache, revalidateTag } from 'next/cache';
import { google } from 'googleapis';
import type { KanbanTask } from '@/types';

export const dynamic = 'force-dynamic';

function getSheetAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !sheetId) {
    throw new Error('Missing Google Sheets API credentials');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return { auth, sheetId };
}

const getCachedRecords = unstable_cache(
  async () => {
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch Records
    let recordRows: string[][] = [];
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Records!A2:D',
      });
      recordRows = response.data.values || [];
    } catch {}

    // Fetch Tasks
    let taskRows: string[][] = [];
    try {
      const taskRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Tasks!A2:K',
      });
      taskRows = taskRes.data.values || [];
    } catch {}

    return { recordRows, taskRows };
  },
  ['records-data'],
  { tags: ['records'], revalidate: 60 }
);

// GET /api/records?latest=true — ดึง record ล่าสุด หรือทั้งหมด
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latest = searchParams.get('latest') === 'true';
    const date = searchParams.get('date');

    const { recordRows, taskRows } = await getCachedRecords();

    if (recordRows.length === 0) {
      return NextResponse.json({ record: null, records: [] });
    }

    const parseTasks = (targetDate: string): KanbanTask[] => {
      return taskRows
        .filter(r => r[1] === targetDate) // Column B is Date
        .map(r => ({
          id: r[0] || crypto.randomUUID(),
          date: r[1],
          title: r[2] || '',
          category: (r[3] as KanbanTask['category']) || 'งานนอก/อื่นๆ',
          location: r[4] || '',
          count: r[5] ? Number(r[5]) : '',
          countSenior: r[6] ? Number(r[6]) : '',
          countJunior: r[7] ? Number(r[7]) : '',
          status: (r[8] as KanbanTask['status']) || 'todo',
          remark: r[9] || '',
          isFixed: String(r[10]).toLowerCase() === 'true',
        }));
    };

    if (date) {
      const row = [...recordRows].reverse().find(r => r[0] === date);
      if (!row) return NextResponse.json({ record: null });
      return NextResponse.json({
        record: {
          date: row[0],
          totalCompany: Number(row[1]) || 0,
          totalDistributed: Number(row[2]) || 0,
          remaining: Number(row[3]) || 0,
          tasks: parseTasks(row[0]),
        }
      });
    }

    if (latest) {
      const last = recordRows[recordRows.length - 1];
      return NextResponse.json({
        record: {
          date: last[0],
          totalCompany: Number(last[1]) || 0,
          totalDistributed: Number(last[2]) || 0,
          remaining: Number(last[3]) || 0,
          tasks: parseTasks(last[0]),
        }
      });
    }

    return NextResponse.json({ 
      records: recordRows.map(row => ({
        date: row[0],
        totalCompany: Number(row[1]) || 0,
        totalDistributed: Number(row[2]) || 0,
        remaining: Number(row[3]) || 0,
        // Optional: Include tasks in the full list if needed, but usually not needed for the list view
        // tasks: parseTasks(row[0]) 
      }))
    });
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

    // 1. Update Records Sheet
    const recordRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Records!A2:D',
    });
    const recordRows = recordRes.data.values || [];
    const recordIndex = recordRows.findIndex(r => r[0] === date);
    
    const recordData = [date, totalCompany, totalDistributed, remaining];
    
    if (recordIndex !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `Records!A${recordIndex + 2}:D${recordIndex + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [recordData] }
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Records!A:D',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [recordData] }
      });
    }

    // 2. Update Tasks Sheet (Overwrite all tasks for this date)
    let taskRows: string[][] = [];
    try {
      const taskRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Tasks!A2:K',
      });
      taskRows = taskRes.data.values || [];
    } catch {}

    const otherTasks = taskRows.filter(r => r[1] !== date); // Keep tasks from other dates
    
    const newTasks = (tasks || []).map((t: KanbanTask) => [
      t.id || crypto.randomUUID(),
      date,
      t.title,
      t.category,
      t.location,
      t.count !== undefined ? String(t.count) : '',
      t.countSenior !== undefined ? String(t.countSenior) : '',
      t.countJunior !== undefined ? String(t.countJunior) : '',
      t.status,
      t.remark || '',
      String(t.isFixed || false)
    ]);

    const allTasksToSave = [...otherTasks, ...newTasks];

    // Clear and rewrite Tasks
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: 'Tasks!A2:K',
      });
    } catch {}

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'Tasks!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: allTasksToSave }
      });

    // @ts-expect-error: Next.js types incorrectly expect 2 arguments
    revalidateTag('records');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('POST /api/records error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
