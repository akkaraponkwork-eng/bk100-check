import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { google } from 'googleapis';

export interface RequestUser {
  id: string;
  role: string;
  name: string;
}

export function getUserInfo(request: NextRequest): RequestUser {
  return {
    id: request.headers.get('x-user-id') || '',
    role: request.headers.get('x-user-role') || '',
    name: decodeURIComponent(request.headers.get('x-user-name') || ''),
  };
}

/**
 * Check if the user is logged in and has the required role.
 * Returns { user: null, error: NextResponse } if it fails.
 * Returns { user: RequestUser, error: null } if it succeeds.
 */
export function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): { user: RequestUser; error: null } | { user: null; error: NextResponse } {
  const user = getUserInfo(request);

  if (!user.id) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!allowedRoles.includes(user.role)) {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user, error: null };
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

// Cached fetch for RBAC Matrix
export const getCachedPermissions = unstable_cache(
  async () => {
    try {
      const { auth, sheetId } = getSheetAuth();
      const sheets = google.sheets({ version: 'v4', auth });
      const res = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges: ['BKFW_Roles!A2:C', 'BKFW_Permissions!A2:D', 'BKFW_RolePermissions!A2:C'],
      });

      const roles = res.data.valueRanges?.[0].values || [];
      const perms = res.data.valueRanges?.[1].values || [];
      const rolePerms = res.data.valueRanges?.[2].values || [];

      // Build Map: Role Key -> Array of Permission Keys
      const roleKeyMap = new Map(roles.map(r => [r[0], r[1]]));
      const permKeyMap = new Map(perms.map(p => [p[0], p[1]]));

      const rolePermissionMatrix: Record<string, string[]> = {};
      
      for (const rp of rolePerms) {
        const roleKey = roleKeyMap.get(rp[1]);
        const permKey = permKeyMap.get(rp[2]);
        if (roleKey && permKey) {
          if (!rolePermissionMatrix[roleKey]) rolePermissionMatrix[roleKey] = [];
          rolePermissionMatrix[roleKey].push(permKey);
        }
      }

      return rolePermissionMatrix;
    } catch (e) {
      console.error('Failed to fetch RBAC Matrix, fallback to empty:', e);
      return {};
    }
  },
  ['rbac-matrix'],
  { tags: ['rbac'], revalidate: 60 } // Default cache 60s, revalidated manually on save
);

/**
 * Check if the user is logged in and has the required permission via RBAC.
 */
export async function requirePermission(
  request: NextRequest,
  permissionString: string
): Promise<{ user: RequestUser; error: null } | { user: null; error: NextResponse }> {
  const user = getUserInfo(request);

  if (!user.id) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const role = user.role || 'personnel';
  const compatibilityMap = await getCachedPermissions();
  const rolePermissions = compatibilityMap[role] || [];
  
  if (!rolePermissions.includes(permissionString)) {
    return { user: null, error: NextResponse.json({ error: `Forbidden: requires ${permissionString}` }, { status: 403 }) };
  }
  
  return { user, error: null };
}
