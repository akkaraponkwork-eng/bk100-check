import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { Mission, MissionStatus } from '@/types';
import { pushLineMessage } from '@/lib/line';
import { requireRole, getUserInfo } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

function getSheetAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!clientEmail || !privateKey || !sheetId) throw new Error('Missing Google credentials');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return { auth, sheetId };
}

// Ensure the 'Missions' tab exists with header
async function ensureMissionsSheet(sheets: any, sheetId: string) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const exists = meta.data.sheets?.some(
      (s: any) => s.properties?.title?.toLowerCase() === 'missions'
    );
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: 'Missions' } } }],
        },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'Missions!A1:L1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            'ID', 'Title', 'Date', 'StartTime', 'EndTime', 'Location',
            'AssignedPersonnelIds', 'Status', 'Remark', 'CreatedBy', 'CreatedAt', 'UpdatedAt'
          ]],
        },
      });
    }
  } catch (err) {
    console.error('ensureMissionsSheet error:', err);
  }
}

// GET /api/missions?month=2026-08 or ?date=2026-08-16 or ?year=2026 or ?personnelId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM
    const date = searchParams.get('date');   // YYYY-MM-DD
    const year = searchParams.get('year');   // YYYY
    const personnelId = searchParams.get('personnelId');

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    await ensureMissionsSheet(sheets, sheetId);

    let rows: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Missions!A2:L',
      });
      rows = (res.data.values || []).filter(r => r && r[0]);
    } catch (e) {
      console.warn('Could not read Missions sheet, returning empty list');
    }

    let missions: Mission[] = rows.map(r => ({
      id: r[0] || '',
      title: r[1] || '',
      date: r[2] || '',
      startTime: r[3] || '',
      endTime: r[4] || '',
      location: r[5] || '',
      assignedPersonnelIds: r[6] ? r[6].split(',').map(s => s.trim()).filter(Boolean) : [],
      status: (r[7] as MissionStatus) || 'pending',
      remark: r[8] || '',
      createdBy: r[9] || '',
      createdAt: r[10] || '',
      updatedAt: r[11] || '',
    }));

    if (date) {
      missions = missions.filter(m => m.date === date);
    } else if (month) {
      missions = missions.filter(m => m.date.startsWith(month));
    } else if (year) {
      missions = missions.filter(m => m.date.startsWith(year));
    }

    if (personnelId) {
      missions = missions.filter(
        m => m.assignedPersonnelIds.length === 0 || m.assignedPersonnelIds.includes(personnelId)
      );
    }

    // Sort by date ascending, then startTime
    missions.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    return NextResponse.json({ missions });
  } catch (error: any) {
    console.error('GET /api/missions error:', error);
    return NextResponse.json({ error: error.message, missions: [] }, { status: 500 });
  }
}

// POST /api/missions - Create new mission
export async function POST(request: NextRequest) {
  try {
    const user = getUserInfo(request);
    const allowedRoles = ['admin', 'commander', 'duty_officer', 'nco'];
    if (user.id && user.role && !allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์ในการสร้างภารกิจ' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      date,
      startTime = '',
      endTime = '',
      location = '',
      assignedPersonnelIds = [],
      status = 'pending',
      remark = '',
    } = body;

    if (!title || !date) {
      return NextResponse.json({ error: 'กรุณาระบุชื่องานและวันที่' }, { status: 400 });
    }

    const id = `mission-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const createdBy = user.name || user.id || 'สิบเวร/ผู้บังคับบัญชา';

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    await ensureMissionsSheet(sheets, sheetId);

    const newRow = [
      id,
      title,
      date,
      startTime,
      endTime,
      location,
      Array.isArray(assignedPersonnelIds) ? assignedPersonnelIds.join(',') : '',
      status,
      remark,
      createdBy,
      now,
      now,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Missions!A2:L',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newRow] },
    });

    // Notify assigned personnel via LINE if mapped
    try {
      if (Array.isArray(assignedPersonnelIds) && assignedPersonnelIds.length > 0) {
        const usersRes = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: 'Users!A2:B',
        });
        const userRows = usersRes.data.values || [];
        const lineMap: Record<string, string> = {};
        userRows.forEach(u => {
          if (u[0] && u[1]) lineMap[u[1]] = u[0]; // personnelId -> lineUserId
        });

        const targetLineIds = assignedPersonnelIds
          .map(pid => lineMap[pid])
          .filter(Boolean);

        for (const lineId of targetLineIds) {
          const timeText = startTime ? `เวลา ${startTime}${endTime ? ' - ' + endTime : ''} น.` : 'ตลอดวัน';
          const locText = location ? `\n📍 สถานที่: ${location}` : '';
          const msg = `📢 มอบหมายภารกิจใหม่!\n📌 ${title}\n📅 วันที่: ${date} (${timeText})${locText}\n👤 โดย: ${createdBy}`;
          await pushLineMessage(lineId, [{ type: 'text', text: msg }]);
        }
      }
    } catch (notifyErr) {
      console.warn('Mission LINE notify error:', notifyErr);
    }

    const createdMission: Mission = {
      id,
      title,
      date,
      startTime,
      endTime,
      location,
      assignedPersonnelIds: Array.isArray(assignedPersonnelIds) ? assignedPersonnelIds : [],
      status,
      remark,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ success: true, mission: createdMission });
  } catch (error: any) {
    console.error('POST /api/missions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/missions - Update existing mission
export async function PUT(request: NextRequest) {
  try {
    const user = getUserInfo(request);
    const allowedRoles = ['admin', 'commander', 'duty_officer', 'nco'];
    if (user.id && user.role && !allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์ในการแก้ไขภารกิจ' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing mission id' }, { status: 400 });
    }

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Missions!A2:L',
    });

    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === id);

    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    const currentRow = rows[rowIndex];
    const now = new Date().toISOString();

    const updatedRow = [
      id,
      updates.title !== undefined ? updates.title : currentRow[1],
      updates.date !== undefined ? updates.date : currentRow[2],
      updates.startTime !== undefined ? updates.startTime : currentRow[3],
      updates.endTime !== undefined ? updates.endTime : currentRow[4],
      updates.location !== undefined ? updates.location : currentRow[5],
      updates.assignedPersonnelIds !== undefined
        ? (Array.isArray(updates.assignedPersonnelIds) ? updates.assignedPersonnelIds.join(',') : updates.assignedPersonnelIds)
        : currentRow[6],
      updates.status !== undefined ? updates.status : currentRow[7],
      updates.remark !== undefined ? updates.remark : currentRow[8],
      currentRow[9] || user.name || user.id,
      currentRow[10] || now,
      now,
    ];

    const sheetRowNumber = rowIndex + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Missions!A${sheetRowNumber}:L${sheetRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [updatedRow] },
    });

    return NextResponse.json({ success: true, updated: updatedRow });
  } catch (error: any) {
    console.error('PUT /api/missions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/missions?id=...
export async function DELETE(request: NextRequest) {
  try {
    const user = getUserInfo(request);
    const allowedRoles = ['admin', 'commander', 'duty_officer', 'nco'];
    if (user.id && user.role && !allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์ในการลบภารกิจ' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing mission id' }, { status: 400 });
    }

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Missions!A2:L',
    });

    const rows = res.data.values || [];
    const filtered = rows.filter(r => r[0] !== id);

    // Clear and rewrite
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: 'Missions!A2:L',
    });

    if (filtered.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'Missions!A2:L',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: filtered },
      });
    }

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/missions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
