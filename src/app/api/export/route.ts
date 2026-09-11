import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { requirePermission } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

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

// Function to safely compare overlapping date ranges
function isOverlapping(start1: string, end1: string, start2: string, end2: string) {
  return start1 <= end2 && start2 <= end1;
}

export async function GET(request: NextRequest) {
  // Requires Settings.read permission (Admin access)
  const { user, error: roleError } = await requirePermission(request, 'Settings.read');
  if (roleError) return roleError;

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const startDate = searchParams.get('startDate') || '1970-01-01';
  const endDate = searchParams.get('endDate') || '2100-12-31';

  if (!type || !['personnel', 'leave', 'duty'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  }

  try {
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    if (type === 'personnel') {
      const res = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges: ['Personnel!A2:H', 'Leave!A2:G'],
      });
      const personnelRows = res.data.valueRanges?.[0].values || [];
      const leaveRows = res.data.valueRanges?.[1].values || [];

      // Get today in local time
      const d = new Date();
      d.setHours(d.getHours() + 7);
      const today = d.toISOString().split('T')[0];

      const activeLeaves = leaveRows.filter(r => r[6] === 'approved' && r[3] <= today && r[4] >= today);

      const formattedData = personnelRows.filter(r => r[0]).map(row => {
        const id = row[0] || '';
        let status = row[6] || 'available';
        
        const activeLeave = activeLeaves.find(l => l[1] === id);
        if (activeLeave) {
          status = 'leave';
        }

        const statusText = status === 'available' ? 'ปกติ' 
                         : status === 'leave' ? 'ลา' 
                         : status === 'sick' ? 'ป่วย' 
                         : status === 'absent' ? 'ขาด' 
                         : status === 'training' ? 'อบรม/ราชการ' 
                         : status;

        return {
          'รหัสกำลังพล': id,
          'ยศ': row[1] || '',
          'ชื่อ': row[2] || '',
          'นามสกุล': row[3] || '',
          'ผลัด': row[4] || '',
          'สถานะ': statusText,
          'เบอร์โทร': row[5] || ''
        };
      });

      return NextResponse.json(formattedData);
    }

    if (type === 'leave') {
      const res = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges: ['Leave!A2:J', 'Personnel!A2:D'],
      });
      
      const leaveRows = res.data.valueRanges?.[0].values || [];
      const personnelRows = res.data.valueRanges?.[1].values || [];

      // Create lookup map for personnel details
      const personnelMap = new Map();
      personnelRows.forEach(p => {
        if (p[0]) {
          personnelMap.set(p[0], {
            rank: p[1] || '',
            firstName: p[2] || '',
            lastName: p[3] || ''
          });
        }
      });

      const formattedData = leaveRows
        .filter(row => row[0] && row[3] && row[4] && isOverlapping(row[3], row[4], startDate, endDate))
        .map(row => {
          const personnelId = row[1] || '';
          const pData = personnelMap.get(personnelId) || { rank: '', firstName: '', lastName: '' };
          
          const statusRaw = row[6] || '';
          const statusText = statusRaw === 'approved' ? 'อนุมัติ' 
                           : statusRaw === 'rejected' ? 'ปฏิเสธ' 
                           : statusRaw === 'pending' ? 'รออนุมัติ' 
                           : statusRaw;

          return {
            'รหัสการลา': row[0] || '',
            'รหัสกำลังพล': personnelId,
            'ยศ': pData.rank,
            'ชื่อ': pData.firstName,
            'นามสกุล': pData.lastName,
            'ประเภท': row[2] || '',
            'วันเริ่ม': row[3] || '',
            'วันสิ้นสุด': row[4] || '',
            'เหตุผล': row[5] || '',
            'สถานะ': statusText,
            'ผู้อนุมัติ': row[7] || '',
            'วันที่อนุมัติ': row[8] ? new Date(row[8]).toLocaleString('th-TH') : ''
          };
        });

      return NextResponse.json(formattedData);
    }

    if (type === 'duty') {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Tasks!A2:J',
      });
      const taskRows = res.data.values || [];

      const formattedData = taskRows
        .filter(row => row[1] && row[1] >= startDate && row[1] <= endDate)
        .map(row => {
          const statusRaw = row[8] || '';
          const statusText = statusRaw === 'todo' ? 'ต้องทำ' 
                           : statusRaw === 'in_progress' ? 'กำลังทำ' 
                           : statusRaw === 'done' ? 'เสร็จแล้ว' 
                           : statusRaw;

          return {
            'วันที่': row[1] || '',
            'ชื่องาน': row[2] || '',
            'หมวดหมู่': row[3] || '',
            'สถานที่': row[4] || '',
            'ยอดจัดรวม': row[5] || '',
            'ยอดจัด(พี่)': row[6] || '',
            'ยอดจัด(น้อง)': row[7] || '',
            'สถานะ': statusText,
            'หมายเหตุ': row[9] || ''
          };
        });

      // Sort by date ascending
      formattedData.sort((a, b) => a['วันที่'].localeCompare(b['วันที่']));

      return NextResponse.json(formattedData);
    }

  } catch (error: any) {
    console.error('Export API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
