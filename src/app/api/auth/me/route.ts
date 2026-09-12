import { NextRequest, NextResponse } from 'next/server';
import { getCachedPermissions } from '@/lib/auth-guard';

export async function GET(request: NextRequest) {
  const role = request.headers.get('x-user-role') || 'personnel';
  const compatibilityMap = await getCachedPermissions();
  const permissions = compatibilityMap[role] || [];

  return NextResponse.json({
    id: request.headers.get('x-user-id') || '',
    role,
    name: decodeURIComponent(request.headers.get('x-user-name') || ''),
    personnelId: request.headers.get('x-user-id') || '', // x-user-id IS personnelId (set by proxy.ts)
    permissions,
  });
}
