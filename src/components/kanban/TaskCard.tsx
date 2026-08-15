import React from 'react';
import {
  Box, Typography, Card, CardContent, Chip, InputBase, IconButton, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import PushPinIcon from '@mui/icons-material/PushPin';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { KanbanTask } from '@/types';

type TaskStatus = KanbanTask['status'];

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  todo: { label: 'ต้องทำ', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: <PushPinIcon fontSize="small" /> },
  in_progress: { label: 'กำลังทำ', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: <AutorenewIcon fontSize="small" /> },
  done: { label: 'เสร็จแล้ว', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <CheckCircleIcon fontSize="small" /> },
};

export const getTaskTotal = (t: KanbanTask) => (Number(t.countSenior) || 0) + (Number(t.countJunior) || 0) + (Number(t.count) || 0);

interface TaskCardProps {
  task: KanbanTask;
  onUpdate: (id: string, updates: Partial<KanbanTask>) => void;
  onDelete: (id: string) => void;
}

export default function TaskCard({ task, onUpdate, onDelete }: TaskCardProps) {
  return (
    <Card sx={{ mb: 2, border: '1px solid var(--color-border)', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <CardContent sx={{ p: '16px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5, lineHeight: 1.2 }}>{task.title}</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
              <Chip label={task.category} size="small" sx={{ fontSize: 10, height: 20 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.03)', px: 1, py: 0.25, borderRadius: 1 }}>
                <LocationOnIcon sx={{ fontSize: 14, color: 'text.secondary', mr: 0.5 }} />
                <InputBase
                  value={task.location || ''}
                  onChange={e => onUpdate(task.id, { location: e.target.value })}
                  placeholder="เพิ่มสถานที่..."
                  sx={{ fontSize: 12, width: 100 }}
                />
              </Box>
            </Box>
          </Box>

          {/* Count Input */}
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
              <Typography sx={{ fontSize: 9, color: 'primary.main', fontWeight: 600 }}>พี่</Typography>
              <InputBase
                type="number"
                value={task.countSenior !== undefined ? task.countSenior : (task.count || '')}
                onChange={e => onUpdate(task.id, { countSenior: e.target.value === '' ? '' : Number(e.target.value), count: '' })}
                placeholder="0"
                inputProps={{ min: 0, style: { textAlign: 'center', fontWeight: 700, padding: 0 } }}
                sx={{ width: 36, height: 36, bgcolor: 'action.hover', border: '1px solid', borderColor: 'primary.light', borderRadius: 1.5 }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
              <Typography sx={{ fontSize: 9, color: 'secondary.main', fontWeight: 600 }}>น้อง</Typography>
              <InputBase
                type="number"
                value={task.countJunior !== undefined ? task.countJunior : ''}
                onChange={e => onUpdate(task.id, { countJunior: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="0"
                inputProps={{ min: 0, style: { textAlign: 'center', fontWeight: 700, padding: 0 } }}
                sx={{ width: 36, height: 36, bgcolor: 'action.hover', border: '1px solid', borderColor: 'secondary.light', borderRadius: 1.5 }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, ml: 0.5 }}>
              <Typography sx={{ fontSize: 9, color: 'text.secondary', fontWeight: 600 }}>รวม</Typography>
              <Box sx={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{getTaskTotal(task) || '-'}</Typography>
              </Box>
            </Box>
          </Box>

          {!task.isFixed && (
            <IconButton size="small" color="error" onClick={() => onDelete(task.id)} sx={{ ml: 0.5, p: 0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'action.hover', px: 1.5, py: 0, borderRadius: 2, border: '1px solid', borderColor: 'divider', mt: 1.5 }}>
          <ChatIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <InputBase
            value={task.remark || ''}
            onChange={e => onUpdate(task.id, { remark: e.target.value })}
            placeholder="เพิ่มหมายเหตุ..."
            sx={{ fontSize: 12, flex: 1, minHeight: 36 }}
          />
        </Box>

        {/* Status Segmented Control */}
        <ToggleButtonGroup
          value={task.status}
          exclusive
          onChange={(_, newVal) => newVal && onUpdate(task.id, { status: newVal })}
          fullWidth
          size="small"
          sx={{ 
            mt: 1.5, 
            bgcolor: 'rgba(0,0,0,0.04)', 
            p: '4px', 
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'stretch',
            '& .MuiToggleButtonGroup-grouped': {
              border: 0,
              borderRadius: '20px !important',
              m: 0,
              '&:not(:first-of-type)': {
                ml: 0.5,
              },
            }
          }}
        >
          {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(statusKey => {
            const config = STATUS_CONFIG[statusKey];
            const isActive = task.status === statusKey;
            return (
              <ToggleButton
                key={statusKey}
                value={statusKey}
                disableRipple
                sx={{
                  textTransform: 'none',
                  fontSize: 13,
                  bgcolor: isActive ? 'white' : 'transparent',
                  color: isActive ? `${config.color} !important` : 'text.secondary',
                  flex: 1,
                  py: 0.75,
                  boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: isActive ? 'white' : 'rgba(0,0,0,0.02)',
                  },
                  '&.Mui-selected': {
                    bgcolor: 'white',
                    fontWeight: 600
                  }
                }}
              >
                {config.label}
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>
      </CardContent>
    </Card>
  );
}
