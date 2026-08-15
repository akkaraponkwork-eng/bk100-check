import React from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, List, ListItem, ListItemText } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { DutyShift, Personnel } from '@/types';

interface DutyDetailModalProps {
  open: boolean;
  onClose: () => void;
  todayShift: DutyShift | null;
  personnel: Personnel[];
}

export default function DutyDetailModal({ open, onClose, todayShift, personnel }: DutyDetailModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#10b981', fontWeight: 700 }}>
        <AccessTimeIcon /> เวรยามวันนี้ ({todayShift?.location})
        <IconButton onClick={onClose} sx={{ ml: 'auto' }} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <List disablePadding>
          {todayShift?.timeSlots.sort((a, b) => a.order - b.order).map((slot, i) => {
            const p = personnel.find(x => x.id === slot.personnelId);
            const name = p ? `${p.rank}${p.firstName} ${p.lastName}` : (slot.personnelId?.startsWith('CUSTOM:') ? slot.personnelId.slice(7) : 'ไม่ระบุ');
            return (
              <ListItem key={i} divider>
                <Box sx={{ width: 80, color: 'text.secondary', fontWeight: 600, fontSize: 13 }}>{slot.start}-{slot.end}</Box>
                <ListItemText primary={<Typography sx={{ fontWeight: 500 }}>{name}</Typography>} />
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
    </Dialog>
  );
}
