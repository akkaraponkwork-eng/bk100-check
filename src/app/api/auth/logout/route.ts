import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear the session cookie
  response.cookies.set({
    name: 'bk100_session',
    value: '',
    maxAge: 0,
    path: '/',
  });
  
  return response;
}
