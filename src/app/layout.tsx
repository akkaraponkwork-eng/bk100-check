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
  themeColor: '#0EA5E9',
};

import ThemeRegistry from '@/components/ThemeRegistry';
import { cookies } from 'next/headers';
import type { AppUser } from '@/types';
import { verifySessionToken } from '@/lib/session';
import { ToastProvider } from '@/hooks/useToast';
import LiffProvider from '@/components/LiffProvider';
import { Prompt } from "next/font/google";
import { cn } from "@/lib/utils";

const promptFont = Prompt({
  subsets: ['latin', 'thai'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});


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
    <html lang="th" suppressHydrationWarning className={cn("font-sans", promptFont.variable)}>
      <body>
        {/* Inline script: runs before React hydrates — prevents white flash in LINE browser */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            if(typeof navigator!=='undefined' && navigator.userAgent.indexOf('Line/')!==-1){
              var el=document.createElement('div');
              el.id='liff-boot-overlay';
              el.style.cssText='position:fixed;inset:0;background:#fff;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px';
              el.innerHTML='<div style="width:48px;height:48px;border:4px solid #e5e7eb;border-top-color:#00B900;border-radius:50%;animation:liff-spin 0.8s linear infinite"></div><style>@keyframes liff-spin{to{transform:rotate(360deg)}}</style><p style="margin:0;color:#00B900;font-weight:600;font-size:15px">กำลังเชื่อมต่อกับ LINE...</p>';
              document.body.appendChild(el);
            }
          })()
        ` }} />
        <LiffProvider hasSession={!!user}>
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
