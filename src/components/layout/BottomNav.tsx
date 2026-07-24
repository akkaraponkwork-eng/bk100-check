'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import HomeIcon from '@mui/icons-material/Home';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';

const navItems = [
  { href: '/',           icon: <HomeIcon fontSize="inherit" />, label: 'หน้าหลัก' },
  { href: '/kanban',     icon: <AssignmentIcon fontSize="inherit" />, label: 'งาน' },
  { href: '/calendar',   icon: <CalendarMonthIcon fontSize="inherit" />, label: 'ปฏิทิน' },
  { href: '/duty',       icon: <AccessTimeIcon fontSize="inherit" />, label: 'เวร' },
  { href: '/personnel',  icon: <GroupIcon fontSize="inherit" />, label: 'กำลังพล' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" role="navigation" aria-label="เมนูหลัก">
      <div className="bottom-nav-items">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${isActive ? ' active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="nav-item-icon" style={{ display: 'flex' }}>{item.icon}</span>
              <span className="nav-item-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
