'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import HomeIcon from '@mui/icons-material/Home';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import ShieldIcon from '@mui/icons-material/Shield';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

import type { UserRole } from '@/types';
import { 
  Drawer, Box, Typography, List, ListItem, ListItemButton, 
  ListItemIcon, ListItemText, Divider, Avatar, IconButton 
} from '@mui/material';

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { href: '/',          icon: <HomeIcon />,          label: 'หน้าหลัก' },
  { href: '/duty',      icon: <AccessTimeIcon />,    label: 'เวรยาม', roles: ['admin'] },
  { href: '/calendar',  icon: <CalendarMonthIcon />, label: 'ปฏิทิน', roles: ['admin', 'commander', 'duty_officer', 'personnel', 'nco'] },
  { href: '/kanban',    icon: <AssignmentIcon />,    label: 'งาน', roles: ['admin', 'commander', 'duty_officer', 'nco'] },
  { href: '/leave',     icon: <BeachAccessIcon />,   label: 'การลา', roles: ['admin', 'commander', 'nco', 'personnel'] },
  { href: '/personnel', icon: <GroupIcon />,         label: 'กำลังพล', roles: ['admin', 'commander', 'nco'] },
  { href: '/orgchart',  icon: <AccountTreeIcon />,   label: 'ทำเนียบ' },
  { href: '/reports',   icon: <BarChartIcon />,      label: 'รายงาน', roles: ['admin', 'commander', 'duty_officer', 'nco'] },
];

const adminItems: NavItem[] = [
  { href: '/settings', icon: <SettingsIcon />, label: 'ตั้งค่า', roles: ['admin', 'commander'] },
];

interface SidebarProps {
  userRole?: UserRole;
  userName?: string;
  userRank?: string;
  userPicture?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ userRole = 'personnel', userName = 'ผู้ใช้งาน', userRank = '', userPicture, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [leaveEnabled, setLeaveEnabled] = useState(true); // default true

  useEffect(() => {
    fetch('/api/bot-settings')
      .then(res => res.json())
      .then(data => {
        if (data.leaveEnabled === false) setLeaveEnabled(false);
      })
      .catch(console.error);
  }, []);

  const visibleNavItems = navItems.filter(item => {
    if (!leaveEnabled && item.href === '/leave' && userRole !== 'admin' && userRole !== 'commander') return false;
    return !item.roles || item.roles.includes(userRole);
  });
  const visibleAdminItems = adminItems.filter(item => !item.roles || item.roles.includes(userRole));
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  const getRoleLabel = (role: UserRole) => {
    switch(role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'commander': return 'ผู้บังคับบัญชา';
      case 'duty_officer': return 'นายเวร';
      case 'nco': return 'นายสิบเวร';
      default: return 'กำลังพล';
    }
  };

  const drawerWidth = isCollapsed ? 80 : 240;

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${drawerWidth}px`);
  }, [drawerWidth]);

  const drawerContent = (
    <>
      {/* Logo — height must match AppShell desktop top bar (68px) */}
      <Box sx={{
        minHeight: 68,
        px: isCollapsed ? 0 : 2,
        display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: 1.5, color: 'primary.main',
        borderBottom: '1px solid', borderColor: 'divider',
        position: 'relative'
      }}>
        <Box sx={{ 
          width: 36, height: 36, borderRadius: 2, 
          background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
          flexShrink: 0,
        }}>
          <ShieldIcon fontSize="small" />
        </Box>
        {!isCollapsed && (
          <Box sx={{ flexGrow: 1, minWidth: 0, opacity: 1, transition: 'opacity 0.2s' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1 }} noWrap>BK100</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>ระบบจัดการหน่วย</Typography>
          </Box>
        )}
      </Box>

      {/* Floating Toggle Button */}
      <IconButton
        onClick={() => setIsCollapsed(!isCollapsed)}
        size="small"
        sx={{
          display: { xs: 'none', lg: 'flex' },
          position: 'absolute',
          right: -14,
          top: 17, // 34px (center) - 17px (half button height)
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'var(--shadow-sm)',
          zIndex: 10,
          '&:hover': { bgcolor: 'action.hover' }
        }}
      >
        <ChevronLeftIcon 
          fontSize="small" 
          sx={{ 
            transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }} 
        />
      </IconButton>

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <List sx={{ px: 1.5, py: 2 }}>
          {!isCollapsed && <Typography variant="overline" sx={{ px: 2, color: 'text.secondary', fontWeight: 600 }}>เมนูหลัก</Typography>}
          {visibleNavItems.map(item => (
            <ListItem 
              key={item.href} 
              disablePadding 
              sx={{ 
                mb: 0.5, 
                display: item.href === '/reports' ? { xs: 'none', lg: 'block' } : 'block' 
              }}
            >
              <ListItemButton 
                component={Link} 
                href={item.href}
                onClick={onMobileClose}
                selected={isActive(item.href)}
                sx={{ 
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': { 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
                  },
                  '&.Mui-selected:hover': { bgcolor: 'primary.dark' },
                  '&:not(.Mui-selected):hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: 40, 
                  justifyContent: isCollapsed ? 'center' : 'flex-start', 
                  color: isActive(item.href) ? 'white' : 'text.secondary' 
                }}>
                  {item.icon}
                </ListItemIcon>
                {!isCollapsed && (
                  <ListItemText primary={<Typography sx={{ fontSize: 14, fontWeight: isActive(item.href) ? 600 : 500 }} noWrap>{item.label}</Typography>} />
                )}
              </ListItemButton>
            </ListItem>
          ))}

          {visibleAdminItems.length > 0 && (
            <>
              {!isCollapsed && <Typography variant="overline" sx={{ px: 2, color: 'text.secondary', fontWeight: 600, mt: 2, display: 'block' }}>ระบบ</Typography>}
              {visibleAdminItems.map(item => (
                <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton 
                    component={Link} 
                    href={item.href}
                    onClick={onMobileClose}
                    selected={isActive(item.href)}
                    sx={{ 
                      borderRadius: 2,
                      '&.Mui-selected': { 
                        bgcolor: 'primary.main', 
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
                      },
                      '&.Mui-selected:hover': { bgcolor: 'primary.dark' },
                      '&:not(.Mui-selected):hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                    }}
                  >
                    <ListItemIcon sx={{ 
                      minWidth: 40, 
                      justifyContent: isCollapsed ? 'center' : 'flex-start', 
                      color: isActive(item.href) ? 'white' : 'text.secondary' 
                    }}>
                      {item.icon}
                    </ListItemIcon>
                    {!isCollapsed && <ListItemText primary={<Typography sx={{ fontSize: 14, fontWeight: isActive(item.href) ? 600 : 500 }} noWrap>{item.label}</Typography>} />}
                  </ListItemButton>
                </ListItem>
              ))}
            </>
          )}
        </List>
      </Box>

      <Divider />

      {/* User Footer */}
      <Box sx={{ p: isCollapsed ? 2 : 2, display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: 1.5 }}>
        <Avatar src={userPicture} sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 16, fontWeight: 600, flexShrink: 0 }}>
          {!userPicture && (userName.charAt(0) || 'U')}
        </Avatar>
        {!isCollapsed && (
          <>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{userRank}{userName}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{getRoleLabel(userRole)}</Typography>
            </Box>
            <IconButton 
              color="error" 
              size="small"
              onClick={async () => {
                if (confirm('ต้องการออกจากระบบหรือไม่?')) {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  window.location.href = '/login';
                }
              }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </Box>
    </>
  );

  return (
    <Box component="nav" sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }}>
      {/* Mobile Temporary Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }} // Better open performance on mobile.
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280, bgcolor: 'var(--color-surface)' },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Permanent Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': { 
            width: drawerWidth, 
            boxSizing: 'border-box', 
            borderRight: '1px solid', 
            borderColor: 'divider',
            bgcolor: 'var(--color-surface)',
            transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'visible'
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
