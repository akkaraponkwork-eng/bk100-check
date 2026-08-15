import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Divider
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import type { KanbanTask } from '@/types';

interface SummaryModalProps {
  onClose: () => void;
  totalCompany: number | '';
  tasks: KanbanTask[];
}

export default function SummaryModal({ onClose, totalCompany, tasks }: SummaryModalProps) {
  const totalSenior = tasks.reduce((s, t) => s + (Number(t.countSenior) || 0), 0);
  const totalJunior = tasks.reduce((s, t) => s + (Number(t.countJunior) || 0), 0);
  const totalLegacy = tasks.reduce((s, t) => s + (Number(t.count) || 0), 0);
  const totalDistributed = totalSenior + totalJunior + totalLegacy;
  const remaining = typeof totalCompany === 'number' ? totalCompany - totalDistributed : 0;

  return (
    <Dialog 
      open 
      onClose={onClose} 
      fullWidth 
      maxWidth="xs" 
      sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 18, fontWeight: 700, pb: 1 }}>
        <BarChartIcon color="primary" /> สรุปยอดกำลังพล
      </DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>
        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography color="text.secondary">ยอดรวมทั้งหมด</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{totalCompany || 0}</Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography color="text.secondary">ยอดจ่ายงาน</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 16, color: 'primary.main' }}>{totalDistributed}</Typography>
          </Box>

          <Box sx={{ pl: 2, display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">- รุ่นพี่</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{totalSenior}</Typography>
          </Box>
          <Box sx={{ pl: 2, display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">- รุ่นน้อง</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{totalJunior}</Typography>
          </Box>
          {totalLegacy > 0 && (
            <Box sx={{ pl: 2, display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">- อื่นๆ (ไม่ระบุรุ่น)</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{totalLegacy}</Typography>
            </Box>
          )}

          <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 700 }}>ยอดคงเหลือ</Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 700, color: remaining < 0 ? 'error.main' : 'success.main' }}>
              {remaining}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button variant="contained" fullWidth onClick={onClose} sx={{ borderRadius: 2 }}>
          ปิด
        </Button>
      </DialogActions>
    </Dialog>
  );
}
