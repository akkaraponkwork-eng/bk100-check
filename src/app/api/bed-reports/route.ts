import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { requireRole } from '@/lib/auth-guard';
import { BedReport } from '@/types';

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

const RANGE = 'BedReports!A2:F';

function rowToBedReport(row: any[]): BedReport {
  return {
    id: row[0] || '',
    rawText: row[1] || '',
    status: (row[2] as 'pending' | 'processed') || 'pending',
    createdAt: row[3] || '',
    processedAt: row[4] || undefined,
    violations: row[5] || undefined,
  };
}

function bedReportToRow(r: BedReport): string[] {
  return [r.id, r.rawText, r.status, r.createdAt, r.processedAt || '', r.violations || ''];
}

// GET /api/bed-reports
// Requires Admin / Duty Officer
export async function GET(request: Request) {
  const nextRequest = request as any;
  const { error: roleError } = requireRole(nextRequest, ['admin', 'duty_officer']);
  if (roleError) return roleError;

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') || 'all';
    const monthParam = searchParams.get('month'); // e.g. "2026-08"

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    let rows: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: RANGE,
      });
      rows = (res.data.values || []).filter((r: any) => r[0]);
    } catch {
      // Create sheet if it doesn't exist
      await createSheetIfNotExists(sheets, sheetId, 'BedReports');
      return NextResponse.json({ reports: [] });
    }

    let reports: BedReport[] = rows.map(rowToBedReport).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (statusParam !== 'all') {
      reports = reports.filter(r => r.status === statusParam);
    }
    
    if (monthParam) {
      reports = reports.filter(r => r.createdAt.startsWith(monthParam));
    }

    return NextResponse.json({ reports });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/bed-reports
// Public (used by LINE Webhook)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rawText, violations } = body;

    if (!rawText) return NextResponse.json({ error: 'Missing rawText' }, { status: 400 });

    const newReport: BedReport = {
      id: crypto.randomUUID(),
      rawText,
      status: 'pending',
      createdAt: new Date().toISOString(),
      violations: violations || undefined,
    };

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const todayStr = new Date().toISOString().split('T')[0];
    let rows: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'BedReports!A2:F',
      });
      rows = res.data.values || [];
    } catch (e: any) {
      if (e.message?.includes('Unable to parse range')) {
        await createSheetIfNotExists(sheets, sheetId, 'BedReports');
      } else {
        throw e;
      }
    }

    const existingIndex = rows.findIndex(r => r[3]?.startsWith(todayStr));

    if (existingIndex !== -1) {
      // Update existing row
      const rowNum = existingIndex + 2;
      const existingId = rows[existingIndex][0];
      newReport.id = existingId;
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `BedReports!A${rowNum}:F${rowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [bedReportToRow(newReport)] },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'BedReports!A:F',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [bedReportToRow(newReport)] },
      });
    }

    return NextResponse.json({ success: true, report: newReport });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/bed-reports
// Requires Admin / Duty Officer
// Body: { id: string, status: 'processed' }
export async function PATCH(request: Request) {
  const nextRequest = request as any;
  const { error: roleError } = requireRole(nextRequest, ['admin', 'duty_officer']);
  if (roleError) return roleError;

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || status !== 'processed') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: RANGE });
    const rows = (res.data.values || []).filter((r: any) => r[0]);

    const reportIndex = rows.findIndex((r: any) => r[0] === id);
    if (reportIndex === -1) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    const rowNumber = reportIndex + 2; // +2 for header and 0-indexing

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `BedReports!C${rowNumber}:E${rowNumber}`, // Update status, createdAt, processedAt
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['processed', rows[reportIndex][3], new Date().toISOString()]] },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
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
    // Add headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${title}!A1:F1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['id', 'rawText', 'status', 'createdAt', 'processedAt', 'violations']] },
    });
  } catch (e: any) {
    // Ignore if already exists
    if (!e.message?.includes('already exists')) throw e;
  }
}
