import { SignJWT, jwtVerify } from 'jose';
import type { AppUser } from '@/types';

function getJwtSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set. Refusing to start with an insecure fallback.');
  }
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
