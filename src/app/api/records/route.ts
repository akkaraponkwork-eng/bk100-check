import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, totalCompany, totalDistributed, remaining, tasks } = body;

    // Validate env variables
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!clientEmail || !privateKey || !sheetId) {
      console.error("Missing Google Sheets API credentials in .env");
      return NextResponse.json({ error: 'Server configuration error: Missing credentials' }, { status: 500 });
    }

    // Auth client
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Append to the sheet
    // Assumes the sheet name is 'Records' and starts at A1
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Records!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            date,
            totalCompany,
            totalDistributed,
            remaining,
            JSON.stringify(tasks)
          ]
        ]
      }
    });

    return NextResponse.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error("Google Sheets API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
