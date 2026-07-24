import type { Metadata, Viewport } from 'next';
import { Sarabun } from 'next/font/google';
import './globals.css';
import BottomNav from '@/components/layout/BottomNav';

const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-sarabun',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BK100 — ระบบจัดการหน่วย',
  description: 'ระบบจัดการกำลังพล เวรยาม และภารกิจประจำวัน ร้อย.บก.พัน.บร.กบร.ศบบ.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BK100',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body>
        <main>{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
