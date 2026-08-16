import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'BK100 — ระบบจัดการหน่วย',
  description: 'ระบบ ERP สำหรับจัดการกำลังพล เวรยาม การลา และภารกิจประจำวัน',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BK100',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0EA5E9',
};

import ThemeRegistry from '@/components/ThemeRegistry';
import { cookies } from 'next/headers';
import type { AppUser } from '@/types';
import { verifySessionToken } from '@/lib/session';
import { ToastProvider } from '@/hooks/useToast';
import LiffProvider from '@/components/LiffProvider';

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('bk100_session')?.value;
  let user: AppUser | null = null;
  
  if (sessionToken) {
    user = await verifySessionToken(sessionToken);
  }

  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <LiffProvider>
          <ThemeRegistry>
            <ToastProvider>
              <AppShell
                userRole={user?.role || 'personnel'}
                userName={user?.displayName || 'ไม่ได้เข้าสู่ระบบ'}
                userRank=""
                userPicture={user?.pictureUrl}
              >
                {children}
              </AppShell>
            </ToastProvider>
          </ThemeRegistry>
        </LiffProvider>
      </body>
    </html>
  );
}
