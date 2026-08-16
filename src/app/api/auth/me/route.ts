import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    id: request.headers.get('x-user-id') || '',
    role: request.headers.get('x-user-role') || 'personnel',
    name: request.headers.get('x-user-name') || '',
  });
}
