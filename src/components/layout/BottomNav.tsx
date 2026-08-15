'use client';

import { usePathname, useRouter } from 'next/navigation';
import HomeIcon from '@mui/icons-material/Home';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import SettingsIcon from '@mui/icons-material/Settings';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import type { UserRole } from '@/types';
import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  roles?: UserRole[];
}

import GroupIcon from '@mui/icons-material/Group';

const allNavItems: NavItem[] = [
  { href: '/',          icon: <HomeIcon />,          label: 'หน้าหลัก' },
  { href: '/duty',      icon: <AccessTimeIcon />,    label: 'เวรยาม', roles: ['admin'] },
  { href: '/calendar',  icon: <CalendarMonthIcon />, label: 'ปฏิทิน', roles: ['admin', 'commander', 'duty_officer', 'personnel', 'nco'] },
  { href: '/kanban',    icon: <AssignmentIcon />,    label: 'งาน', roles: ['admin', 'commander', 'duty_officer', 'nco'] },
  { href: '/leave',     icon: <BeachAccessIcon />,   label: 'การลา', roles: ['admin', 'commander', 'nco', 'personnel'] },
  { href: '/personnel', icon: <GroupIcon />,         label: 'กำลังพล', roles: ['admin', 'commander', 'nco'] },
  { href: '/orgchart',  icon: <AccountTreeIcon />,   label: 'ทำเนียบ' },
  { href: '/reports',   icon: <BarChartIcon />,      label: 'รายงาน', roles: ['admin', 'commander', 'duty_officer', 'nco'] },
  { href: '/settings',  icon: <SettingsIcon />,      label: 'ตั้งค่า', roles: ['admin', 'commander'] },
];

interface BottomNavProps {
  userRole?: UserRole;
}

export default function BottomNav({ userRole = 'personnel' }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const items = allNavItems
    .filter(item => !item.roles || item.roles.includes(userRole));

  const activeHref = items.find(i => 
    i.href === '/' ? pathname === '/' : pathname.startsWith(i.href)
  )?.href || items[0].href;

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        zIndex: 50,
        display: { xs: 'block', lg: 'none' } 
      }} 
      elevation={3}
    >
      <BottomNavigation
        showLabels
        value={activeHref}
        onChange={(event, newValue) => {
          router.push(newValue);
        }}
        sx={{ 
          height: 72,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            padding: '6px 0',
          },
          '& .Mui-selected': {
            color: 'primary.main'
          }
        }}
      >
        {items.map((item) => (
          <BottomNavigationAction 
            key={item.href}
            value={item.href}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
