import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { LeaveRequest, LeaveStatus } from '@/types';
import { pushLineMessage } from '@/lib/line';

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
function getUserInfo(request: NextRequest) {
  return {
    id: request.headers.get('x-user-id') || '',
    role: request.headers.get('x-user-role') || '',
    name: request.headers.get('x-user-name') || '',
  };
}

// GET: ดึงประวัติการลา
export async function GET(request: NextRequest) {
  try {
    const user = getUserInfo(request);
    if (!user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // ดึงข้อมูล Leave ทั้งหมด (ข้าม Header แถวที่ 1)
    const leaveRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Leave!A2:J',
    });
    
    const leaveRows = leaveRes.data.values || [];
    let requests: LeaveRequest[] = leaveRows.map(row => ({
      id: row[0],
      personnelId: row[1],
      type: row[2] as 'เยี่ยมญาติ',
      startDate: row[3],
      endDate: row[4],
      reason: row[5] || '',
      status: row[6] as LeaveStatus,
      approvedBy: row[7] || undefined,
      approvedAt: row[8] || undefined,
      createdAt: row[9] || '',
    }));

    const myRequests = requests.filter(r => r.personnelId === user.id);
    
    const adminRoles = ['admin', 'commander', 'duty_officer'];
    const pendingRequests = adminRoles.includes(user.role) 
      ? requests.filter(r => r.status === 'pending')
      : [];

    const allRequests = adminRoles.includes(user.role) ? requests : [];

    return NextResponse.json({ 
      myRequests, 
      pendingRequests, 
      allRequests,
      userRole: user.role 
    });
  } catch (error: any) {
    console.error('GET Leave Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: ยื่นลาใหม่
export async function POST(request: NextRequest) {
  try {
    const user = getUserInfo(request);
    if (!user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { startDate, endDate, reason } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Missing start or end date' }, { status: 400 });
    }

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const newLeave: LeaveRequest = {
      id: crypto.randomUUID(),
      personnelId: user.id,
      type: 'เยี่ยมญาติ',
      startDate,
      endDate,
      reason: reason || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const rowData = [
      newLeave.id, newLeave.personnelId, newLeave.type,
      newLeave.startDate, newLeave.endDate, newLeave.reason,
      newLeave.status, '', '', newLeave.createdAt
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Leave!A:J',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [rowData] },
    });

    // ---------------------------------------------------------
    // Create notifications for Admins & Commanders
    // ---------------------------------------------------------
    try {
      const uRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Users!A:E' });
      const userRows = uRes.data.values || [];
      const admins = userRows.filter(r => r[2] === 'admin' || r[2] === 'commander');
      
      const adminPersonnelIds = admins.map(r => r[1]);
      const adminLineIds = admins.filter(r => r[0]).map(r => r[0]);
      
      const notifications = adminPersonnelIds.map(adminId => [
        crypto.randomUUID(), adminId, 'มีคำขอลาใหม่', 
        `คำขอลาเยี่ยมญาติจากกำลังพล รอการอนุมัติ`, 'leave_request', '/leave', 'false', new Date().toISOString()
      ]);

      if (notifications.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: 'Notifications!A:H',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: notifications },
        });
      }

      /* ปิดฟีเจอร์ 2 ไว้ชั่วคราว
      // LINE Push Notification
      if (adminLineIds.length > 0) {
        adminLineIds.forEach(lineId => {
          pushLineMessage(lineId, [{ 
            type: 'text', 
            text: `📢 **มีคำขอลาใหม่**\nคำขอลาเยี่ยมญาติจากกำลังพล รบกวนตรวจสอบและอนุมัติในระบบครับ` 
          }]).catch(console.error);
        });
      }
      */

    } catch (notifErr) {
      console.error('Failed to send notifications:', notifErr);
    }

    return NextResponse.json({ success: true, request: newLeave });
  } catch (error: any) {
    console.error('POST Leave Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: อนุมัติ / ปฏิเสธการลา
export async function PATCH(request: NextRequest) {
  try {
    const user = getUserInfo(request);
    const adminRoles = ['admin', 'commander', 'duty_officer'];
    
    if (!user.id || !adminRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized or insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body; // status: 'approved' | 'rejected'

    if (!id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // หา Row ที่ตรงกับ ID
    const leaveRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Leave!A:J',
    });
    
    const leaveRows = leaveRes.data.values || [];
    const rowIndex = leaveRows.findIndex(row => row[0] === id);
    
    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    // อัปเดตสถานะ (Column G = index 6)
    // อัปเดตผู้อนุมัติ (Column H = index 7)
    // อัปเดตเวลาอนุมัติ (Column I = index 8)
    const rowNum = rowIndex + 1; // 1-indexed for Sheets
    const approvedAt = new Date().toISOString();

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Leave!G${rowNum}:I${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[status, user.id, approvedAt]]
      }
    });

    // Auto-sync Personnel status is no longer needed since it's dynamically calculated in GET /api/personnel

    // ---------------------------------------------------------
    // Create notification for the requester
    // ---------------------------------------------------------
    try {
      const personnelId = leaveRows[rowIndex][1];
      const notification = [
        crypto.randomUUID(), personnelId, 'อัปเดตสถานะการลา',
        `ใบลาของคุณถูก ${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'} แล้ว`, 'leave_result', '/leave', 'false', new Date().toISOString()
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Notifications!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [notification] },
      });

      /* ปิดฟีเจอร์ 2 ไว้ชั่วคราว
      // LINE Push Notification
      const uRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Users!A:E' });
      const userRows = uRes.data.values || [];
      const requester = userRows.find(r => r[1] === personnelId);
      
      if (requester && requester[0]) {
        await pushLineMessage(requester[0], [{ 
          type: 'text', 
          text: `📢 **อัปเดตสถานะการลา**\nใบลาของคุณถูก ${status === 'approved' ? '✅ อนุมัติ' : '❌ ปฏิเสธ'} แล้วครับ` 
        }]).catch(console.error);
      }
      */

    } catch (notifErr) {
      console.error('Failed to send requester notification:', notifErr);
    }

    return NextResponse.json({ success: true, id, status, approvedBy: user.id, approvedAt });
  } catch (error: any) {
    console.error('PATCH Leave Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
