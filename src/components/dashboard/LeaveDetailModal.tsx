import React from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Typography, List, ListItem, ListItemText } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import type { Personnel } from '@/types';

interface LeaveDetailModalProps {
  open: boolean;
  onClose: () => void;
  leaveCount: number;
  personnel: Personnel[];
}

export default function LeaveDetailModal({ open, onClose, leaveCount, personnel }: LeaveDetailModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ef4444', fontWeight: 700 }}>
        <DirectionsWalkIcon /> ทหารที่ลาพัก ({leaveCount} นาย)
        <IconButton onClick={onClose} sx={{ ml: 'auto' }} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <List disablePadding>
          {personnel.filter(p => p.status === 'leave').map((p, i) => (
            <ListItem key={i} divider>
              <ListItemText 
                primary={<Typography sx={{ fontWeight: 500 }}>{`${p.rank}${p.firstName} ${p.lastName}`}</Typography>} 
                secondary={p.dutyCount ? `เข้าเวรสะสม: ${p.dutyCount}` : null} 
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
