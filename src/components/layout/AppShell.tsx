'use client';

import { useState } from 'react';

import Sidebar from './Sidebar';
import LogoutIcon from '@mui/icons-material/Logout';
import ShieldIcon from '@mui/icons-material/Shield';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationBell from './NotificationBell';
import type { UserRole } from '@/types';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import { usePathname } from 'next/navigation';

// Map path → page title shown in desktop top bar
const PAGE_TITLES: Record<string, string> = {
  '/': 'หน้าหลัก',
  '/duty': 'เวรยาม',
  '/calendar': 'ปฏิทิน',
  '/kanban': 'งาน',
  '/leave': 'การลา',
  '/personnel': 'กำลังพล',
  '/orgchart': 'ทำเนียบ',
  '/beds': 'ตรวจโรงนอน',
  '/reports': 'รายงาน',
  '/settings': 'ตั้งค่า',
};

function getPageTitle(pathname: string): string {
  if (pathname === '/') return PAGE_TITLES['/'];
  const match = Object.keys(PAGE_TITLES).find(
    key => key !== '/' && pathname.startsWith(key)
  );
  return match ? PAGE_TITLES[match] : 'BK100';
}

// Sidebar logo area height: p:2 top/bottom (32px) + icon 36px ≈ 68px → use 68px
const HEADER_HEIGHT = 68;

interface AppShellProps {
  children: React.ReactNode;
  userRole?: UserRole;
  userName?: string;
  userRank?: string;
  userPicture?: string;
}

export default function AppShell({ children, userRole, userName, userRank, userPicture }: AppShellProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ห้ามโชว์ AppShell ในหน้า Login และ Link Account
  if (pathname === '/login' || pathname === '/link-account') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    if (confirm('ต้องการออกจากระบบหรือไม่?')) {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar (Desktop Permanent, Mobile Temporary) */}
      <Sidebar 
        userRole={userRole} 
        userName={userName} 
        userRank={userRank} 
        userPicture={userPicture} 
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          pb: 0,
        }}
      >
        {/* ── Mobile top bar (shown on mobile only) ── */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            display: { xs: 'flex', lg: 'none' },
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          <Toolbar variant="dense" sx={{ justifyContent: 'space-between', minHeight: 52 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 0.5 }}>
                <MenuIcon />
              </IconButton>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {pageTitle}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <NotificationBell />
              <IconButton color="inherit" onClick={handleLogout} size="small">
                <LogoutIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>


        {/* Page Content */}
        <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3, lg: 4 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
