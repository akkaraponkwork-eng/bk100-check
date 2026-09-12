import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { requirePermission } from '@/lib/auth-guard';
import { unstable_cache, revalidateTag } from 'next/cache';

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

const getCachedBotSettings = unstable_cache(
  async () => {
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
      
      return {
        groupId: settings['groupId'] || '',
        alertTimes: settings['alertTimes'] ? settings['alertTimes'].split(',') : [],
        leaveEnabled: String(settings['leaveEnabled']).toLowerCase() !== 'false',
        combineKanbanCounts: String(settings['combineKanbanCounts']).toLowerCase() === 'true',
        adminEmail: settings['adminEmail'] || ''
      };
    } catch (e: any) {
      if (e.message && e.message.includes('Unable to parse range')) {
        return { groupId: '', alertTimes: [], leaveEnabled: true, combineKanbanCounts: false, adminEmail: '', error: 'Please create a sheet named "BotSettings"' };
      }
      throw e;
    }
  },
  ['bot-settings'],
  { tags: ['bot-settings'], revalidate: 300 }
);

export async function GET(request: NextRequest) {
  try {
    const settings = await getCachedBotSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error fetching bot settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { user, error: roleError } = await requirePermission(request, 'Settings.read');
  if (roleError) return roleError;

  try {
    const body = await request.json();
    const { groupId, alertTimes, leaveEnabled, combineKanbanCounts, adminEmail } = body;
    
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Fetch existing first to merge
    let existingSettings: Record<string, string> = {};
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'BotSettings!A:B',
      });
      const rows = res.data.values || [];
      rows.forEach(row => {
        if (row[0] && row[1]) existingSettings[row[0]] = row[1];
      });
    } catch (e) {
      // Ignore if sheet doesn't exist yet
    }
    
    const finalGroupId = groupId !== undefined ? groupId : (existingSettings['groupId'] || '');
    const finalAlertTimes = alertTimes !== undefined ? (Array.isArray(alertTimes) ? alertTimes.join(',') : alertTimes) : (existingSettings['alertTimes'] || '');
    const finalLeaveEnabled = leaveEnabled !== undefined ? String(leaveEnabled) : (existingSettings['leaveEnabled'] || 'true');
    const finalCombineKanbanCounts = combineKanbanCounts !== undefined ? String(combineKanbanCounts) : (existingSettings['combineKanbanCounts'] || 'false');
    const finalAdminEmail = adminEmail !== undefined ? adminEmail : (existingSettings['adminEmail'] || '');

    const values = [
      ['groupId', finalGroupId],
      ['alertTimes', finalAlertTimes],
      ['leaveEnabled', finalLeaveEnabled],
      ['combineKanbanCounts', finalCombineKanbanCounts],
      ['adminEmail', finalAdminEmail],
    ];

    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'BotSettings!A1:B5',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values }
      });
    } catch (updateError: any) {
      if (updateError.message && updateError.message.includes('Unable to parse range')) {
        // Create the missing sheet
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: 'BotSettings' } } }]
          }
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: 'BotSettings!A1:B5',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values }
        });
      } else {
        throw updateError;
      }
    }

    revalidateTag('bot-settings');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving bot settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
