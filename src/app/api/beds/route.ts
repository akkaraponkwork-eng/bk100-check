import { NextResponse } from 'next/server';
import { unstable_cache, revalidateTag } from 'next/cache';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';
import type { BedEntry } from '@/types';
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

function rowToBed(row: string[]): BedEntry {
  return {
    bedNo: row[0] || '',
    personnelId: row[1] || undefined,
    ownerName: row[2] || undefined,
  };
}

function bedToRow(b: BedEntry): string[] {
  return [
    b.bedNo,
    b.personnelId || '',
    b.ownerName || '',
  ];
}

const getCachedBeds = unstable_cache(
  async () => {
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Beds!A2:C',
      });
      const rows = res.data.values || [];
      return rows.filter(r => r[0]).map(rowToBed);
    } catch (e: any) {
      // If sheet does not exist, return empty
      if (e.message?.includes('Unable to parse range')) {
        return [];
      }
      throw e;
    }
  },
  ['beds-data'],
  { tags: ['beds'], revalidate: 60 }
);

// GET /api/beds
export async function GET() {
  try {
    const bedsList = await getCachedBeds();
    return NextResponse.json({ beds: bedsList });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    console.error('Beds GET Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/beds — Bulk upsert (replace all)
export async function POST(request: Request) {
  const nextRequest = request as any;
  const { user, error: roleError } = requireRole(nextRequest, ['admin', 'commander', 'nco', 'duty_officer']);
  if (roleError) return roleError;

  try {
    const body = await request.json();
    const { beds }: { beds: BedEntry[] } = body;

    if (!beds || !Array.isArray(beds)) {
      return NextResponse.json({ error: 'Invalid beds format' }, { status: 400 });
    }

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Ensure sheet exists or handle clear
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: 'Beds!A1:C',
      });
    } catch (e: any) {
       if (e.message?.includes('Unable to parse range')) {
          await createSheetIfNotExists(sheets, sheetId, 'Beds');
       } else {
         throw e;
       }
    }

    const header = [['bedNo', 'personnelId', 'ownerName']];
    const values = [
      ...header,
      ...beds.map(bedToRow),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Beds!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    // @ts-expect-error: Next.js cache revalidateTag
    revalidateTag('beds');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    console.error('Beds POST Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/beds?bedNo=36
export async function DELETE(request: Request) {
  const nextRequest = request as any;
  const { user, error: roleError } = requireRole(nextRequest, ['admin', 'commander', 'nco', 'duty_officer']);
  if (roleError) return roleError;

  try {
    const { searchParams } = new URL(request.url);
    const bedNo = searchParams.get('bedNo');

    if (!bedNo) {
      return NextResponse.json({ error: 'Missing bedNo' }, { status: 400 });
    }

    const bedsList = await getCachedBeds();
    const updatedBeds = bedsList.filter(b => b.bedNo !== bedNo);

    if (updatedBeds.length === bedsList.length) {
       return NextResponse.json({ success: true, message: 'Bed not found' });
    }

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: 'Beds!A1:C',
    });

    const header = [['bedNo', 'personnelId', 'ownerName']];
    const values = [
      ...header,
      ...updatedBeds.map(bedToRow),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Beds!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    // @ts-expect-error: Next.js cache revalidateTag
    revalidateTag('beds');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    console.error('Beds DELETE Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function createSheetIfNotExists(sheets: any, spreadsheetId: string, title: string) {
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title },
            },
          },
        ],
      },
    });
  } catch (e: any) {
    if (!e.message?.includes('already exists')) throw e;
  }
}
