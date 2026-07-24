'use client';

import React from 'react';
import { Box, Typography, TextField, IconButton, Paper, Divider, Button, Stack } from '@mui/material';
import { 
  DeleteOutlined as DeleteOutlineIcon, 
  Add as AddIcon, 
  Remove as RemoveIcon,
  CorporateFare,
  Checkroom,
  Build,
  Agriculture,
  Grass,
  ContentCut,
  Assignment,
  Handyman,
  LocalHospital,
  LocalPolice,
  House,
  WorkOutlined
} from '@mui/icons-material';
import { Task } from '@/types';

interface TaskSectionProps {
  title: string;
  category: Task['category'];
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const getTaskIcon = (taskName: string) => {
  if (taskName.includes('บก.ร้อย')) return <CorporateFare color="primary" />;
  if (taskName.includes('คลังผ้า')) return <Checkroom color="primary" />;
  if (taskName.includes('คลังโยธา')) return <Build color="primary" />;
  if (taskName.includes('รถไถ')) return <Agriculture color="primary" />;
  if (taskName.includes('ตัดหญ้า')) return <Grass color="primary" />;
  if (taskName.includes('ตัดแต่ง')) return <ContentCut color="primary" />;
  if (taskName.includes('ทั่วไป')) return <Assignment color="primary" />;
  if (taskName.includes('ช่าง')) return <Handyman color="primary" />;
  if (taskName.includes('ป่วย')) return <LocalHospital color="error" />;
  if (taskName.includes('ตร.ศบบ')) return <LocalPolice color="primary" />;
  if (taskName.includes('บ้านพัก')) return <House color="primary" />;
  return <WorkOutlined color="action" />;
};

export default function TaskSection({ title, category, tasks, setTasks }: TaskSectionProps) {
  const categoryTasks = tasks.filter(t => t.category === category);

  const handleUpdate = (id: string, field: keyof Task, value: any) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleDelete = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleAdd = () => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      category,
      taskName: '',
      location: '',
      count: '',
      remark: '',
      isFixed: false
    };
    setTasks(prev => [...prev, newTask]);
  };

  const adjustCount = (id: string, currentCount: number | '', delta: number) => {
    const val = typeof currentCount === 'number' ? currentCount : 0;
    const newVal = val + delta;
    if (newVal < 0) return;
    handleUpdate(id, 'count', newVal === 0 ? '' : newVal);
  };

  return (
    <Paper elevation={0} className="glass-card" sx={{ p: { xs: 2, md: 4 }, mb: 4, borderRadius: 4 }}>
      <Typography variant="h6" gutterBottom color="secondary" sx={{ fontWeight: 'bold' }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 3, opacity: 0.5 }} />

      <Stack spacing={2.5} className="print-task-table">
        {/* Print Only Header (Hidden on Web) */}
        <Box className="print-only print-table-header" sx={{ display: 'none', fontWeight: 'bold', borderBottom: '1px solid black', pb: 1 }}>
          <Box sx={{ width: '30%' }}>รูปแบบงาน</Box>
          <Box sx={{ width: '30%' }}>สถานที่ทำงาน/จำหน่าย</Box>
          <Box sx={{ width: '20%', textAlign: 'center' }}>จำนวนยอด</Box>
          <Box sx={{ width: '20%' }}>หมายเหตุ</Box>
        </Box>

        {categoryTasks.map((task) => {
          const isEmpty = task.count === '' || task.count === 0;
          return (
            <Box 
              key={task.id} 
              className={`task-card ${isEmpty ? 'print-hide-empty' : 'print-table-row'}`}
              sx={{ 
                p: { xs: 2.5, md: 3 }, 
                border: '1px solid',
                borderColor: isEmpty ? 'rgba(0,0,0,0.05)' : 'rgba(25, 118, 210, 0.3)',
                borderRadius: 3,
                position: 'relative',
                bgcolor: isEmpty ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.9)',
                transition: 'border-color 0.2s',
                boxShadow: isEmpty ? 'none' : '0 4px 12px rgba(0,0,0,0.03)',
                '@media print': {
                  border: 'none',
                  borderBottom: '1px solid black',
                  borderRadius: 0,
                  p: 1,
                  display: isEmpty ? 'none' : 'flex',
                  bgcolor: 'transparent',
                  boxShadow: 'none'
                }
              }}
            >
              {/* Web View (Mobile First Card) */}
              <Box className="no-print" sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {getTaskIcon(task.taskName)}
                    {task.isFixed ? (
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }} color={isEmpty ? 'text.secondary' : 'primary.dark'}>
                        {task.taskName}
                      </Typography>
                    ) : (
                      <TextField
                        placeholder="ชื่อภารกิจ"
                        size="small"
                        value={task.taskName}
                        onChange={(e) => handleUpdate(task.id, 'taskName', e.target.value)}
                        variant="standard"
                        sx={{ input: { fontWeight: 'bold', fontSize: '1.1rem' } }}
                      />
                    )}
                  </Box>

                  {!task.isFixed && (
                    <IconButton color="error" size="small" onClick={() => handleDelete(task.id)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 3, flexWrap: { xs: 'wrap', sm: 'nowrap' }, alignItems: 'flex-end' }}>
                  <Box sx={{ flex: 1, display: 'flex', gap: 1.5, flexDirection: 'column' }}>
                    <TextField
                      placeholder="สถานที่ทำงาน/จำหน่าย"
                      size="small"
                      value={task.location}
                      onChange={(e) => handleUpdate(task.id, 'location', e.target.value)}
                      variant="outlined"
                      className="glass-input"
                      fullWidth
                      sx={{ '& fieldset': { border: 'none' } }}
                    />
                    <TextField
                      placeholder="หมายเหตุ"
                      size="small"
                      value={task.remark}
                      onChange={(e) => handleUpdate(task.id, 'remark', e.target.value)}
                      variant="outlined"
                      className="glass-input"
                      fullWidth
                      sx={{ '& fieldset': { border: 'none' } }}
                    />
                  </Box>

                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    bgcolor: 'white', 
                    borderRadius: 3, 
                    p: 1, 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    border: '1px solid rgba(0,0,0,0.05)'
                  }}>
                    <IconButton 
                      size="medium" 
                      color="primary"
                      onClick={() => adjustCount(task.id, task.count, -1)}
                      sx={{ bgcolor: 'rgba(25, 118, 210, 0.05)' }}
                    >
                      <RemoveIcon />
                    </IconButton>
                    <TextField
                      value={task.count}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleUpdate(task.id, 'count', val === '' ? '' : Number(val));
                      }}
                      slotProps={{
                        htmlInput: {
                          inputMode: 'numeric', 
                          pattern: '[0-9]*',
                          style: { textAlign: 'center', fontWeight: 'bold', fontSize: '1.5rem', width: '60px', padding: 0 } 
                        },
                        input: { disableUnderline: true }
                      }}
                      variant="standard"
                    />
                    <IconButton 
                      size="medium" 
                      color="primary"
                      onClick={() => adjustCount(task.id, task.count, 1)}
                      sx={{ bgcolor: 'rgba(25, 118, 210, 0.05)' }}
                    >
                      <AddIcon />
                    </IconButton>
                  </Box>
                </Box>
              </Box>

              {/* Print View Only */}
              <Box className="print-only" sx={{ display: 'none', width: '100%' }}>
                <Box sx={{ width: '30%' }}>{task.taskName}</Box>
                <Box sx={{ width: '30%' }}>{task.location}</Box>
                <Box sx={{ width: '20%', textAlign: 'center' }}>{task.count}</Box>
                <Box sx={{ width: '20%' }}>{task.remark}</Box>
              </Box>
            </Box>
          );
        })}
      </Stack>

      <Button 
        startIcon={<AddIcon />} 
        onClick={handleAdd} 
        variant="contained" 
        size="large"
        sx={{ mt: 3, borderRadius: 3, textTransform: 'none', fontWeight: 'bold' }}
        className="no-print"
        fullWidth
        disableElevation
      >
        เพิ่มงานนอก / ภารกิจอื่นๆ
      </Button>
    </Paper>
  );
}
