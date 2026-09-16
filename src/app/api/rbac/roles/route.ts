import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { requirePermission } from '@/lib/auth-guard';
import { revalidateTag } from 'next/cache';

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

// POST: Create a new role
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requirePermission(request, 'Settings.read');
    if (error) return error;

    const { key, name } = await request.json();
    if (!key || !name) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Validate key format (alphanumeric and underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      return NextResponse.json({ error: 'Role Key ต้องประกอบด้วยภาษาอังกฤษ ตัวเลข หรือขีดล่าง (_) เท่านั้น' }, { status: 400 });
    }

    // Check if key already exists
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'BKFW_Roles!A:C',
    });
    const rows = res.data.values || [];
    const exists = rows.some(r => r[1] === key);
    if (exists) {
      return NextResponse.json({ error: 'Role Key นี้มีอยู่ในระบบแล้ว' }, { status: 400 });
    }

    const newRoleId = crypto.randomUUID();

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'BKFW_Roles!A:C',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[newRoleId, key, name]] }
    });

    revalidateTag('rbac', undefined as any);
    return NextResponse.json({ success: true, role: { id: newRoleId, key, name } });
  } catch (err: any) {
    console.error('POST /api/rbac/roles error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Update a role's name
export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await requirePermission(request, 'Settings.read');
    if (error) return error;

    const { id, name } = await request.json();
    if (!id || !name) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    // Protect system roles
    const systemRoles = ['admin', 'personnel'];
    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'BKFW_Roles!A:C',
    });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === id);
    if (rowIndex === -1) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    
    const roleKey = rows[rowIndex][1];
    if (systemRoles.includes(roleKey)) {
      return NextResponse.json({ error: `ไม่สามารถแก้ไขชื่อ Role พื้นฐานของระบบ (${roleKey}) ได้` }, { status: 403 });
    }

    const rowNum = rowIndex + 1; // 1-indexed for Sheets

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `BKFW_Roles!C${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[name]] }
    });

    revalidateTag('rbac', undefined as any);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('PATCH /api/rbac/roles error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete a role
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await requirePermission(request, 'Settings.read');
    if (error) return error;

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Get Roles
    const rolesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'BKFW_Roles!A:C',
    });
    const rolesRows = rolesRes.data.values || [];
    const roleIndex = rolesRows.findIndex(r => r[0] === id);
    if (roleIndex === -1) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

    const roleKey = rolesRows[roleIndex][1];
    
    // Protect system roles
    const systemRoles = ['admin', 'personnel'];
    if (systemRoles.includes(roleKey)) {
      return NextResponse.json({ error: `ไม่อนุญาตให้ลบ Role พื้นฐานของระบบ (${roleKey})` }, { status: 403 });
    }

    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const roleSheet = sheetMetadata.data.sheets?.find(s => s.properties?.title === 'BKFW_Roles');
    const roleSheetIdNum = roleSheet?.properties?.sheetId;

    if (roleSheetIdNum === undefined) throw new Error('Could not find BKFW_Roles sheet ID');

    // Delete role row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: roleSheetIdNum,
                dimension: 'ROWS',
                startIndex: roleIndex,
                endIndex: roleIndex + 1
              }
            }
          }
        ]
      }
    });

    revalidateTag('rbac', undefined as any);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/rbac/roles error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
