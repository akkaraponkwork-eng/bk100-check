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

// GET /api/rbac
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requirePermission(request, 'Settings.read');
    if (error) return error;

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: ['BKFW_Roles!A2:C', 'BKFW_Permissions!A2:D', 'BKFW_RolePermissions!A2:C'],
    });

    const roles = (res.data.valueRanges?.[0].values || []).map(r => ({ id: r[0], key: r[1], name: r[2] }));
    const permissions = (res.data.valueRanges?.[1].values || []).map(p => ({ id: p[0], key: p[1], name: p[2], group: p[3] }));
    const rolePermissions = (res.data.valueRanges?.[2].values || []).map(rp => ({ id: rp[0], roleId: rp[1], permissionId: rp[2] }));

    return NextResponse.json({ roles, permissions, rolePermissions });
  } catch (err: any) {
    console.error('GET /api/rbac error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/rbac (Save all permissions)
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requirePermission(request, 'Settings.read');
    if (error) return error;

    const { mappings } = await request.json();
    if (!Array.isArray(mappings)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare new values
    const newValues = mappings.map(m => [crypto.randomUUID(), m.roleId, m.permissionId]);

    // Clear existing data (A2:C)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: 'BKFW_RolePermissions!A2:C',
    });
    
    // Insert new data if not empty
    if (newValues.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'BKFW_RolePermissions!A2:C',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: newValues }
      });
    }

    // Invalidate Cache
    revalidateTag('rbac');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('POST /api/rbac error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
