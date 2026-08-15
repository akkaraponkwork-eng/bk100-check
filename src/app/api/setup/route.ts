import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const REQUIRED_SHEETS = [
  // Core Data
  { name: 'Personnel',     headers: ['id', 'rank', 'firstName', 'lastName', 'batch', 'phone', 'status', 'dutyCount', 'isNCOEligible', 'num'] },
  
  // Normalized Duty
  { name: 'Duty',          headers: ['Date', 'Location'] },
  { name: 'DutySlots',     headers: ['id', 'Date', 'start', 'end', 'personnelId', 'customName', 'order', 'isPunishment'] },
  { name: 'DutyMeta',      headers: ['id', 'type', 'personnelId', 'shift_or_reason', 'startDate', 'endDate', 'createdAt'] },
  { name: 'NCO',           headers: ['id', 'Date', 'personnelId', 'remark'] },
  
  // Normalized Records/Tasks
  { name: 'Records',       headers: ['Date', 'TotalCompany', 'TotalDistributed', 'Remaining'] },
  { name: 'Tasks',         headers: ['id', 'Date', 'title', 'category', 'location', 'count', 'countSenior', 'countJunior', 'status', 'remark', 'isFixed'] },
  
  // ERP v2
  { name: 'Users',         headers: ['lineUserId', 'personnelId', 'role', 'displayName', 'pictureUrl'] },
  { name: 'Leave',         headers: ['id', 'personnelId', 'type', 'startDate', 'endDate', 'reason', 'status', 'approvedBy', 'approvedAt', 'createdAt'] },
  { name: 'Notifications', headers: ['id', 'userId', 'title', 'message', 'type', 'link', 'isRead', 'createdAt'] },
  { name: 'OrgChart',      headers: ['id', 'rank', 'name', 'position', 'imageUrl', 'level', 'order'] },
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
