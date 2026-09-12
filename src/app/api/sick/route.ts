import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { requirePermission, getUserInfo, getCachedPermissions } from '@/lib/auth-guard';
import type { SickRecord } from '@/types';

function getSheetAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!clientEmail || !privateKey || !sheetId) throw new Error('Missing Google credentials');
  const auth = new google.auth.JWT({
    email: clientEmail, key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return { auth, sheetId };
}

function rowToSickRecord(row: string[]): SickRecord {
  return {
    id: row[0] || '',
    personnelId: row[1] || '',
    symptoms: row[2] || '',
    hospital: row[3] || '',
    startDate: row[4] || '',
    expectedReturnDate: row[5] || '',
    isReturned: String(row[6]).toLowerCase() === 'true',
    status: (row[7] as any) || 'approved',
  };
}

function sickRecordToRow(record: SickRecord): string[] {
  return [
    record.id,
    record.personnelId,
    record.symptoms,
    record.hospital,
    record.startDate,
    record.expectedReturnDate,
    String(record.isReturned),
    record.status || 'approved'
  ];
}

// GET: Fetch all sick records
export async function GET(request: NextRequest) {
  try {
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Ensure sheet exists or just read
    let res;
    try {
      res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'SickLog!A2:H',
      });
    } catch (e: any) {
      if (e.message.includes('Unable to parse range')) {
        // Create sheet if it doesn't exist
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [{
              addSheet: { properties: { title: 'SickLog' } }
            }]
          }
        });
        
        // Add headers
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: 'SickLog!A1:H1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['id', 'personnelId', 'symptoms', 'hospital', 'startDate', 'expectedReturnDate', 'isReturned', 'status']]
          }
        });
        
        return NextResponse.json({ records: [] });
      }
      throw e;
    }
    
    const rows = res.data.values || [];
    const records = rows.filter(r => r[0]).map(rowToSickRecord);
    
    return NextResponse.json({ records });
  } catch (error: any) {
    console.error('Failed to fetch sick log:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add new sick record
export async function POST(request: NextRequest) {
  const user = getUserInfo(request as any);
  if (!user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = user.role || 'personnel';
  const compatibilityMap = await getCachedPermissions();
  const rolePermissions = compatibilityMap[role] || [];
  const canManage = rolePermissions.includes('Sick.manage');

  try {
    const body = await request.json();
    
    let status = body.status || 'pending';
    if (!canManage) {
      status = 'pending'; // Normal users can only submit pending requests
    }

    const record: SickRecord = {
      id: crypto.randomUUID(),
      personnelId: body.personnelId,
      symptoms: body.symptoms || '',
      hospital: body.hospital || '',
      startDate: body.startDate || new Date().toISOString().split('T')[0],
      expectedReturnDate: body.expectedReturnDate || '',
      isReturned: body.isReturned || false,
      status,
    };

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'SickLog!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [sickRecordToRow(record)] },
    });
    
    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    console.error('Failed to add sick record:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update a sick record
export async function PUT(request: NextRequest) {
  const authRes = await requirePermission(request as any, 'Sick.manage');
  if (authRes.error) return authRes.error;

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'SickLog!A2:H',
    });
    
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === id);
    
    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    const currentRecord = rowToSickRecord(rows[rowIndex]);
    const newRecord = { ...currentRecord, ...updates };
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `SickLog!A${rowIndex + 2}:H${rowIndex + 2}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [sickRecordToRow(newRecord)] },
    });
    
    return NextResponse.json({ success: true, record: newRecord });
  } catch (error: any) {
    console.error('Failed to update sick record:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a sick record
export async function DELETE(request: NextRequest) {
  const authRes = await requirePermission(request as any, 'Sick.manage');
  if (authRes.error) return authRes.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'SickLog!A2:H',
    });
    
    const rows = res.data.values || [];
    const records = rows.filter(r => r[0]).map(rowToSickRecord);
    const updatedRecords = records.filter(r => r.id !== id);
    
    // Clear and rewrite
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: 'SickLog!A2:H',
    });
    
    if (updatedRecords.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `SickLog!A2:H${updatedRecords.length + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: updatedRecords.map(sickRecordToRow) },
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete sick record:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
