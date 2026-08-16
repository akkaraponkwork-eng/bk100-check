import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getUserInfo } from '@/lib/auth-guard';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

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

// getUserInfo is imported from auth-guard

// GET: Fetch notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const user = getUserInfo(request);
    if (!user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Notifications!A2:H',
    });

    const rows = res.data.values || [];
    // Filter for current user and map
    const notifications: AppNotification[] = rows
      .filter(r => r[1] === user.id) // Column B is userId
      .map(r => ({
        id: r[0],
        userId: r[1],
        title: r[2],
        message: r[3],
        type: r[4],
        link: r[5] || '',
        isRead: String(r[6]).toLowerCase() === 'true',
        createdAt: r[7]
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Newest first

    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error('GET Notifications Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const user = getUserInfo(request);
    if (!user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { notificationId } = body;

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Notifications!A:G', // Up to isRead
    });

    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === notificationId && r[1] === user.id);

    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const rowNum = rowIndex + 1;

    // Update isRead (Column G = index 6)
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Notifications!G${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['true']] }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PATCH Notifications Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
