import React from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, List, ListItem, ListItemText } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import type { Personnel } from '@/types';

interface NcoDetailModalProps {
  open: boolean;
  onClose: () => void;
  ncoPersonnel: Personnel | null;
  todayAssistants: (Personnel | undefined)[];
}

export default function NcoDetailModal({ open, onClose, ncoPersonnel, todayAssistants }: NcoDetailModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#f59e0b', fontWeight: 700 }}>
        <PersonIcon /> รายละเอียดสิบเวร
        <IconButton onClick={onClose} sx={{ ml: 'auto' }} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2, p: 2, bgcolor: 'var(--color-surface-2)', borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">สิบเวรประจำวัน</Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>{ncoPersonnel ? `${ncoPersonnel.rank}${ncoPersonnel.firstName} ${ncoPersonnel.lastName}` : 'ยังไม่ระบุ'}</Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'var(--color-surface-2)', borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">ผู้ช่วยสิบเวร ({todayAssistants.length} นาย)</Typography>
          {todayAssistants.length > 0 ? (
            <List dense disablePadding sx={{ mt: 1 }}>
              {todayAssistants.map((a, i) => (
                <ListItem key={i} disableGutters>
                  <ListItemText primary={<Typography sx={{ fontWeight: 500 }}>{a ? `${a.rank}${a.firstName} ${a.lastName}` : 'ไม่ทราบชื่อ'}</Typography>} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" sx={{ mt: 1 }}>ไม่มีผู้ช่วยสิบเวร</Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
