import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { requireRole, getUserInfo } from '@/lib/auth-guard';

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

// Helper: Get user info from headers (set by middleware)
// Now imported from auth-guard

// GET /api/orgchart
export async function GET(request: NextRequest) {
  try {
    const { role } = getUserInfo(request);
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Read A2:B2 (A2 = imageUrl, B2 = imgbbApiKey)
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'OrgChart!A2:B2',
    });
    
    const row = res.data.values?.[0] || [];
    const imageUrl = row[0] || '';
    const imgbbApiKey = role === 'admin' ? (row[1] || '') : '';
    
    return NextResponse.json({ imageUrl, imgbbApiKey, userRole: role });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/orgchart
export async function POST(request: NextRequest) {
  const { user, error: roleError } = requireRole(request, ['admin']);
  if (roleError) return roleError;

  try {

    const { imageUrl, imgbbApiKey } = await request.json();
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Read existing to allow partial update
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'OrgChart!A2:B2',
    });
    const existingRow = existing.data.values?.[0] || [];
    
    const finalImageUrl = imageUrl !== undefined ? imageUrl : (existingRow[0] || '');
    const finalApiKey = imgbbApiKey !== undefined ? imgbbApiKey : (existingRow[1] || '');

    // Update A2:B2 with merged data
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'OrgChart!A2:B2',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[finalImageUrl, finalApiKey]],
      },
    });

    return NextResponse.json({ success: true, imageUrl: finalImageUrl, imgbbApiKey: finalApiKey });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
