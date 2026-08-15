import React from 'react';
import { Paper, Box, Typography, InputBase, Button } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import type { KanbanTask } from '@/types';
import { getTaskTotal } from './TaskCard';

interface HeadcountFooterProps {
  tasks: KanbanTask[];
  totalCompany: number | '';
  onChangeTotalCompany: (v: number | '') => void;
  onSave: () => void;
  saving: boolean;
}

export default function HeadcountFooter({
  tasks, totalCompany, onChangeTotalCompany, onSave, saving,
}: HeadcountFooterProps) {
  const totalDistributed = tasks.reduce((s, t) => s + getTaskTotal(t), 0);
  const totalSenior = tasks.reduce((s, t) => s + (Number(t.countSenior) || 0), 0);
  const totalJunior = tasks.reduce((s, t) => s + (Number(t.countJunior) || 0), 0);
  const remaining = typeof totalCompany === 'number' ? totalCompany - totalDistributed : 0;
  const isOver = remaining < 0;

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        bottom: { xs: 'env(safe-area-inset-bottom)', lg: 0 },
        left: { xs: 0, lg: 'var(--sidebar-width, 240px)' },
        right: 0,
        bgcolor: 'rgba(255,255,255,0.95)',
        borderTop: '1px solid',
        borderColor: 'divider',
        px: 2,
        py: 1.5,
        backdropFilter: 'blur(12px)',
        transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <Box
        sx={{
          maxWidth: { xs: 600, md: 1000 },
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 2, md: 3 },
        }}
      >
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          gap: { xs: 1, md: 3 },
          alignItems: 'center'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'space-between', md: 'center' }, gap: { xs: 1, md: 4 }, width: { xs: '100%', md: 'auto' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: { xs: 12, md: 14 }, color: 'text.secondary', fontWeight: 600 }}>ยอดรวม</Typography>
              <InputBase
                type="number"
                value={totalCompany}
                onChange={e => onChangeTotalCompany(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                inputProps={{ style: { textAlign: 'center', fontWeight: 700 } }}
                sx={{ width: { xs: 56, md: 72 }, height: { xs: 32, md: 40 }, fontSize: { xs: 14, md: 16 }, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: { xs: 2, md: 3 } }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: { xs: 10, md: 12 }, color: 'primary.main', fontWeight: 600, mb: 0.25 }}>พี่</Typography>
                <Typography sx={{ fontSize: { xs: 14, md: 18 }, fontWeight: 700, color: 'primary.main', lineHeight: 1 }}>{totalSenior}</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: { xs: 10, md: 12 }, color: 'secondary.main', fontWeight: 600, mb: 0.25 }}>น้อง</Typography>
                <Typography sx={{ fontSize: { xs: 14, md: 18 }, fontWeight: 700, color: 'secondary.main', lineHeight: 1 }}>{totalJunior}</Typography>
              </Box>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'space-between', md: 'center' }, gap: { xs: 1, md: 4 }, width: { xs: '100%', md: 'auto' }, flex: { md: 1 }, bgcolor: { xs: 'rgba(0,0,0,0.02)', md: 'transparent' }, px: { xs: 1.5, md: 0 }, py: { xs: 0.5, md: 0 }, borderRadius: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: { xs: 11, md: 13 }, color: 'text.secondary' }}>ยอดจ่ายรวม:</Typography>
              <Typography sx={{ fontSize: { xs: 14, md: 18 }, fontWeight: 700 }}>{totalDistributed}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: { xs: 11, md: 13 }, color: 'text.secondary' }}>คงเหลือ:</Typography>
              <Typography sx={{ fontSize: { xs: 15, md: 20 }, fontWeight: 700, color: isOver ? 'error.main' : 'success.main' }}>
                {typeof totalCompany === 'number' ? remaining : '—'}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Button
          variant="contained"
          onClick={onSave}
          disabled={saving || isOver}
          startIcon={!saving && <SaveIcon />}
          sx={{
            height: 48,
            borderRadius: 2.5,
            px: 2.5,
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
            fontWeight: 600
          }}
        >
          {saving ? '...' : 'บันทึก'}
        </Button>
      </Box>
    </Paper>
  );
}
