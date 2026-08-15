'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { IconButton, Badge, Menu, MenuItem, Typography, Box, Divider } from '@mui/material';
import type { AppNotification } from '@/app/api/notifications/route';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = async (id: string, link?: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      
      handleClose();
      if (link) {
        router.push(link);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick} size="small">
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{
          paper: {
            elevation: 3,
            sx: { width: 320, maxHeight: 400, mt: 1.5, borderRadius: 2 }
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} color="primary.main">
            การแจ้งเตือน
          </Typography>
        </Box>
        <Divider />
        
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">ไม่มีการแจ้งเตือนใหม่</Typography>
          </Box>
        ) : (
          notifications.map(n => (
            <MenuItem 
              key={n.id} 
              onClick={() => markAsRead(n.id, n.link)}
              sx={{ 
                flexDirection: 'column', 
                alignItems: 'flex-start',
                bgcolor: n.isRead ? 'transparent' : 'primary.50',
                borderBottom: '1px solid',
                borderColor: 'divider',
                whiteSpace: 'normal',
                py: 1.5
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }} color="text.primary">
                {n.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {n.message}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: th })}
              </Typography>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}
