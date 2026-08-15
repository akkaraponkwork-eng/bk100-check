import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

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

function getUserInfo(request: NextRequest) {
  return {
    id: request.headers.get('x-user-id') || '',
    role: request.headers.get('x-user-role') || '',
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserInfo(request);
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Read Users sheet
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Users!A2:E',
    });
    
    const rows = res.data.values || [];
    const users = rows.map(r => ({
      lineUserId: r[0] || '',
      personnelId: r[1] || '',
      role: r[2] || 'personnel',
      displayName: r[3] || '',
      pictureUrl: r[4] || ''
    }));

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('GET Users Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getUserInfo(request);
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { lineUserId, newRole } = body;
    
    if (!lineUserId || !newRole) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Get current data to find the row index
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Users!A:C', // We just need A (lineUserId) to find row, and C (role) to update
    });

    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === lineUserId);

    if (rowIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Update the role (Column C = index 2)
    // Add 1 because sheets are 1-indexed (and rowIndex is 0-indexed)
    const rowNum = rowIndex + 1;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Users!C${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[newRole]] },
    });

    return NextResponse.json({ success: true, lineUserId, newRole });
  } catch (error: any) {
    console.error('PATCH Users Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
