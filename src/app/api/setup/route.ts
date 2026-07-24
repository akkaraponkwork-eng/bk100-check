import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const REQUIRED_SHEETS = [
  { name: 'Records', headers: ['Date', 'TotalCompany', 'TotalDistributed', 'Remaining', 'TasksJSON'] },
  { name: 'Personnel', headers: ['ID', 'Rank', 'FirstName', 'LastName', 'Batch', 'Phone', 'Status', 'DutyCount', 'IsNCOEligible'] },
  { name: 'Duty', headers: ['Date', 'Location', 'ShiftJSON'] },
  { name: 'NCO', headers: ['ID', 'Date', 'PersonnelID', 'Remark'] },
];

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

export async function GET() {
  try {
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Get existing sheets
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const existingSheetNames = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

    // 2. Add missing sheets
    const missingSheets = REQUIRED_SHEETS.filter(s => !existingSheetNames.includes(s.name));
    if (missingSheets.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: missingSheets.map(s => ({
            addSheet: { properties: { title: s.name } }
          }))
        }
      });
    }

    // 3. Write headers for all required sheets
    const dataToUpdate = REQUIRED_SHEETS.map(s => {
      // Calculate column letter (e.g. 5 columns -> E)
      const endCol = String.fromCharCode(65 + s.headers.length - 1);
      return {
        range: `${s.name}!A1:${endCol}1`,
        values: [s.headers]
      };
    });

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: dataToUpdate,
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Setup complete. Added ${missingSheets.length} missing sheets and initialized headers.`,
      addedSheets: missingSheets.map(s => s.name)
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
