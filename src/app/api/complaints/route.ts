import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { pushLineMessage } from '@/lib/line';
import { requirePermission } from '@/lib/auth-guard';

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

async function ensureComplaintsSheet(sheets: any, sheetId: string) {
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Complaints!A1:G1',
    });
  } catch (e: any) {
    if (e.message && e.message.includes('Unable to parse range')) {
      // Create the missing sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: 'Complaints' } } }]
        }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'Complaints!A1:G1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['id', 'topic', 'detail', 'status', 'createdAt', 'senderName', 'senderId']] }
      });
    } else {
      throw e;
    }
  }
}

export async function GET(request: NextRequest) {
  // Only users with 'Complaints.read' can view complaints
  const { error: roleError } = await requirePermission(request, 'Complaints.read');
  if (roleError) return roleError;

  try {
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    await ensureComplaintsSheet(sheets, sheetId);
    
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Complaints!A2:G',
    });
    
    const rows = res.data.values || [];
    const complaints = rows.map(row => ({
      id: row[0] || '',
      topic: row[1] || '',
      detail: row[2] || '',
      status: row[3] || 'pending',
      createdAt: row[4] || '',
      senderName: row[5] || '',
      senderId: row[6] || '',
    })).filter(c => c.id !== ''); // Filter out empty rows
    
    return NextResponse.json({ complaints });
  } catch (error: any) {
    console.error('Error fetching complaints:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Only users with 'Complaints.submit' can submit complaints
  const { error: roleError } = await requirePermission(request, 'Complaints.submit');
  if (roleError) return roleError;

  try {
    const { topic, detail } = await request.json();

    if (!topic || !detail) {
      return NextResponse.json({ error: 'Missing topic or detail' }, { status: 400 });
    }

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    await ensureComplaintsSheet(sheets, sheetId);

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const status = 'pending'; // Initial status
    const senderId = request.headers.get('x-user-id') || '';
    const rawName = request.headers.get('x-user-name');
    const senderName = rawName ? decodeURIComponent(rawName) : '';

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Complaints!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[id, topic, detail, status, createdAt, senderName, senderId]]
      }
    });

    // Get group ID from bot settings for Line notification
    const origin = new URL(request.url).origin;
    const settingsRes = await fetch(`${origin}/api/bot-settings`, {
      headers: {
        'x-internal-token': process.env.INTERNAL_API_SECRET || ''
      }
    });
    const settings = await settingsRes.json();

    if (settings.groupId) {
      // Create a beautiful Flex Message
      const flexMessage = {
        type: 'flex',
        altText: '🚨 มีเรื่องร้องเรียนใหม่',
        contents: {
          type: 'bubble',
          size: 'mega',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#ef4444', // Red-500
            contents: [
              {
                type: 'text',
                text: '🚨 ร้องเรียน',
                weight: 'bold',
                color: '#ffffff',
                size: 'lg'
              }
            ]
          },
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: 'หัวข้อ',
                    color: '#ef4444',
                    size: 'sm',
                    weight: 'bold'
                  },
                  {
                    type: 'text',
                    text: topic,
                    wrap: true,
                    weight: 'bold',
                    size: 'md'
                  }
                ]
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: 'รายละเอียด',
                    color: '#666666',
                    size: 'sm',
                    weight: 'bold'
                  },
                  {
                    type: 'text',
                    text: detail,
                    wrap: true,
                    size: 'sm',
                    color: '#333333'
                  }
                ]
              }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: 'ส่งจากระบบร้องเรียน',
                size: 'xs',
                color: '#aaaaaa',
                align: 'center'
              }
            ]
          }
        }
      };

      try {
        await pushLineMessage(settings.groupId, [flexMessage]);
      } catch (e) {
        console.error('Failed to push line message', e);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Error handling complaint:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  // Only users with 'Complaints.read' can update complaints
  const { error: roleError } = await requirePermission(request, 'Complaints.read');
  if (roleError) return roleError;

  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Find the row with the given ID
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Complaints!A2:A',
    });
    
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);
    
    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }
    
    // Update the status column (D) which is the 4th column (index 3)
    // Range is 1-indexed, starting from row 2. So rowIndex + 2.
    const updateRange = `Complaints!D${rowIndex + 2}`;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[status]] }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating complaint:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Only users with 'Complaints.read' can delete complaints
  const { error: roleError } = await requirePermission(request, 'Complaints.read');
  if (roleError) return roleError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Complaints!A2:A',
    });
    
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);
    
    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }
    
    // Clear the row (this avoids needing to lookup the numeric sheetId to use batchUpdate for actual row deletion)
    const deleteRange = `Complaints!A${rowIndex + 2}:G${rowIndex + 2}`;
    
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: deleteRange,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting complaint:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
