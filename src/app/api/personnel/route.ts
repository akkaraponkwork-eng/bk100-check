import { NextResponse } from 'next/server';
import { unstable_cache, revalidateTag } from 'next/cache';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';
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
    num: Number(row[9]) || 0,
  };
}

function personnelToRow(p: Personnel): string[] {
  return [
    p.id, p.rank, p.firstName, p.lastName,
    String(p.batch), p.phone || '',
    p.status, String(p.dutyCount), String(p.isNCOEligible || false),
    String(p.num || 0)
  ];
}

const getCachedPersonnel = unstable_cache(
  async () => {
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: ['Personnel!A2:J', 'Leave!A2:J', 'DutyMeta!A2:G'],
    });
    
    const personnelRows = res.data.valueRanges?.[0].values || [];
    const leaveRows = res.data.valueRanges?.[1].values || [];
    const metaRows = res.data.valueRanges?.[2].values || [];

    const personnelList = personnelRows.filter(r => r[0]).map(rowToPersonnel);
    return { personnelList, leaveRows, metaRows };
  },
  ['personnel-data'],
  { tags: ['personnel'], revalidate: 60 }
);

// GET /api/personnel
export async function GET() {
  try {
    const { personnelList, leaveRows, metaRows } = await getCachedPersonnel();
    
    // Create a deep copy to avoid mutating cached object
    const personnelListCopy = JSON.parse(JSON.stringify(personnelList)) as Personnel[];
    
    // Get today in local time (UTC+7 for Thailand)
    const d = new Date();
    d.setHours(d.getHours() + 7);
    const today = d.toISOString().split('T')[0];

    // Compute dynamic status
    for (const p of personnelListCopy) {
      // Find active leave
      const activeLeave = leaveRows.find((l: any) => 
        l[1] === p.id && 
        l[6] === 'approved' && 
        l[3] <= today && l[4] >= today
      );
      
      if (activeLeave) {
        p.status = 'leave';
        continue;
      }
      
      // Find active DutyMeta exception
      const activeMeta = metaRows.find((m: any) => 
        m[1] === 'exception' && 
        m[2] === p.id && 
        m[4] <= today && m[5] >= today
      );
      
      if (activeMeta) {
        if (activeMeta[3] === 'ป่วย') p.status = 'sick';
        else p.status = 'leave'; // ธุระการ, งดเวร
        continue;
      }
      
      // Do not overwrite native status if they are manually marked as leave or sick in the sheet.
      if (!p.status) p.status = 'available';
    }

    return NextResponse.json({ personnel: personnelListCopy });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    console.error('Personnel GET Error:', msg);
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
      range: 'Personnel!A1:J',
    });

    const header = [['id', 'rank', 'firstName', 'lastName', 'batch', 'phone', 'status', 'dutyCount', 'isNCOEligible', 'num']];
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

    // @ts-expect-error: Next.js types incorrectly expect 2 arguments
    revalidateTag('personnel');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
