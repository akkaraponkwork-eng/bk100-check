import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import bcrypt from 'bcryptjs';
import { requireRole } from '@/lib/auth-guard';

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

// requireRole is imported from auth-guard

export async function GET(request: NextRequest) {
  const { error: roleError } = requireRole(request, ['admin']);
  if (roleError) return roleError;

  try {
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    let rows: any[] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'AdminAccounts!A:B',
      });
      rows = res.data.values || [];
    } catch (e: any) {
      if (e.message && e.message.includes('Unable to parse range')) {
        return NextResponse.json({ accounts: [] });
      }
      throw e;
    }
    
    const accounts = rows
      .filter(r => r[0] && r[0] !== 'Username')
      .map(r => ({ username: r[0] }));
      
    return NextResponse.json({ accounts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error: roleError } = requireRole(request, ['admin']);
  if (roleError) return roleError;

  try {
    const { username, password } = await request.json();
    if (!username || !password) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    try {
      await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'AdminAccounts!A1' });
    } catch (e: any) {
      if (e.message && e.message.includes('Unable to parse range')) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: { requests: [{ addSheet: { properties: { title: 'AdminAccounts' } } }] }
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: 'AdminAccounts!A1:B1',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['Username', 'Password']] }
        });
      }
    }

    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'AdminAccounts!A:B' });
    const rows = res.data.values || [];
    const exists = rows.some(r => r[0] === username);
    if (exists) return NextResponse.json({ error: 'มีบัญชีนี้อยู่ในระบบแล้ว' }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'AdminAccounts!A:B',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[username, hashedPassword]] }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { error: roleError } = requireRole(request, ['admin']);
  if (roleError) return roleError;

  try {
    const { username } = await request.json();
    if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 });

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'AdminAccounts!A:B' });
    const rows = res.data.values || [];
    
    const newRows = rows.filter(r => r[0] !== username);
    if (newRows.length === rows.length) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: 'AdminAccounts!A:B' });
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'AdminAccounts!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: newRows }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
