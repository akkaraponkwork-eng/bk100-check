import React from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, List, ListItem, ListItemText } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GroupIcon from '@mui/icons-material/Group';
import type { Personnel } from '@/types';

interface PersonnelDetailModalProps {
  open: boolean;
  onClose: () => void;
  personnel: Personnel[];
  ncosCount: number;
  privatesCount: number;
}

export default function PersonnelDetailModal({ open, onClose, personnel, ncosCount, privatesCount }: PersonnelDetailModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#3b82f6', fontWeight: 700 }}>
        <GroupIcon /> กำลังพลทั้งหมด ({personnel.length} นาย)
        <IconButton onClick={onClose} sx={{ ml: 'auto' }} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ p: 2, bgcolor: 'var(--color-surface-2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#ffffff', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>นายสิบ</Typography>
            <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>{ncosCount}</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#ffffff', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>พลทหาร</Typography>
            <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>{privatesCount}</Typography>
          </Box>
        </Box>
        <List disablePadding>
          {personnel.map((p, i) => {
            const statusColors = {
              available: '#10b981',
              on_duty: '#3b82f6',
              leave: '#f59e0b',
              sick: '#ef4444'
            };
            const statusLabels = {
              available: 'ประจำการ',
              on_duty: 'เข้าเวร',
              leave: 'ลา',
              sick: 'ป่วย'
            };
            return (
              <ListItem key={i} divider>
                <Box sx={{ width: 6, height: 40, borderRadius: 1, bgcolor: statusColors[p.status] || '#ccc', mr: 2 }} />
                <ListItemText
                  primary={<Typography sx={{ fontWeight: 500 }}>{`${p.rank}${p.firstName} ${p.lastName}`}</Typography>}
                  secondary={`สถานะ: ${statusLabels[p.status] || 'ไม่ทราบ'}`}
                />
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
    </Dialog>
  );
}
