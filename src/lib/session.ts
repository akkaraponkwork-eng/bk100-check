import { SignJWT, jwtVerify } from 'jose';
import type { AppUser } from '@/types';

function getJwtSecretKey() {
  const secret = process.env.JWT_SECRET || process.env.LINE_CHANNEL_SECRET || 'fallback_secret_for_dev_only_12345';
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: AppUser): Promise<string> {
  const payload = { ...user };
  
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecretKey());
    
  return token;
}

export async function verifySessionToken(token: string): Promise<AppUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as unknown as AppUser;
  } catch (error) {
    return null;
  }
}
