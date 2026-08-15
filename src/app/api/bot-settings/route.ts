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

export async function GET(request: NextRequest) {
  try {
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'BotSettings!A:B',
      });
      
      const rows = res.data.values || [];
      const settings: Record<string, string> = {};
      rows.forEach(row => {
        if (row[0] && row[1]) settings[row[0]] = row[1];
      });
      
      return NextResponse.json({
        groupId: settings['groupId'] || '',
        alertTimes: settings['alertTimes'] ? settings['alertTimes'].split(',') : []
      });
    } catch (e: any) {
      if (e.message && e.message.includes('Unable to parse range')) {
        return NextResponse.json({ groupId: '', alertTimes: [], error: 'Please create a sheet named "BotSettings"' });
      }
      throw e;
    }
  } catch (error: any) {
    console.error('Error fetching bot settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, alertTimes } = body;
    
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const values = [
      ['groupId', groupId || ''],
      ['alertTimes', Array.isArray(alertTimes) ? alertTimes.join(',') : '']
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'BotSettings!A1:B2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving bot settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
