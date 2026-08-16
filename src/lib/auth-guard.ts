import { NextRequest, NextResponse } from 'next/server';

export interface RequestUser {
  id: string;
  role: string;
  name: string;
}

export function getUserInfo(request: NextRequest): RequestUser {
  return {
    id: request.headers.get('x-user-id') || '',
    role: request.headers.get('x-user-role') || '',
    name: request.headers.get('x-user-name') || '',
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
