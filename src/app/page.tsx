'use client';

import React, { useState, useMemo } from 'react';
import { Container, Box, Typography, CssBaseline, ThemeProvider, createTheme, Snackbar, Alert } from '@mui/material';
import Header from '@/components/Header';
import TaskSection from '@/components/TaskSection';
import StickyFooter from '@/components/StickyFooter';
import { Task } from '@/types';
import { format } from 'date-fns';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb', // Modern Blue
      dark: '#1d4ed8',
      light: '#60a5fa',
    },
    secondary: {
      main: '#475569', // Slate
    },
    background: {
      default: 'transparent',
    },
  },
  typography: {
    fontFamily: '"Inter", "Sarabun", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 12,
  }
});

export default function Home() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [totalCompany, setTotalCompany] = useState<number | ''>('');
  const [tasks, setTasks] = useState<Task[]>([
    { id: crypto.randomUUID(), category: 'หมวดที่ 1', taskName: 'บก.ร้อย', location: '', count: '', remark: '', isFixed: true },
    { id: crypto.randomUUID(), category: 'หมวดที่ 1', taskName: 'คลังผ้า', location: '', count: '', remark: '', isFixed: true },
    { id: crypto.randomUUID(), category: 'หมวดที่ 1', taskName: 'คลังโยธา', location: '', count: '', remark: '', isFixed: true },
    { id: crypto.randomUUID(), category: 'หมวดที่ 1', taskName: 'รถไถ', location: '', count: '', remark: '', isFixed: true },
    { id: crypto.randomUUID(), category: 'หมวดที่ 1', taskName: 'ตัดหญ้า', location: '', count: '', remark: '', isFixed: true },
    { id: crypto.randomUUID(), category: 'หมวดที่ 1', taskName: 'ตัดแต่ง', location: '', count: '', remark: '', isFixed: true },
    { id: crypto.randomUUID(), category: 'หมวดที่ 1', taskName: 'ทั่วไป (กองร้อย)', location: '', count: '', remark: '', isFixed: true },
    { id: crypto.randomUUID(), category: 'หมวดที่ 1', taskName: 'ชุดช่าง บก.พัน', location: '', count: '', remark: '', isFixed: true },
    { id: crypto.randomUUID(), category: 'หมวดที่ 1', taskName: 'ป่วย', location: '', count: '', remark: '', isFixed: true },
    { id: crypto.randomUUID(), category: 'หมวดที่ 1', taskName: 'ตร.ศบบ.', location: '', count: '', remark: '', isFixed: true },
    { id: crypto.randomUUID(), category: 'หมวดที่ 1', taskName: 'บ้านพัก ผบ.ศบบ.', location: '', count: '', remark: '', isFixed: true },
    { id: crypto.randomUUID(), category: 'หมวดที่ 2', taskName: '', location: '', count: '', remark: '', isFixed: false },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  });

  const totalDistributed = useMemo(() => {
    return tasks.reduce((sum, task) => {
      const count = typeof task.count === 'number' ? task.count : 0;
      return sum + count;
    }, 0);
  }, [tasks]);

  const remaining = typeof totalCompany === 'number' ? totalCompany - totalDistributed : 0;
  const isError = remaining < 0;

  const handleSave = async () => {
    if (isError) {
      setNotification({ open: true, message: 'ไม่สามารถบันทึกได้ เนื่องจากยอดเกิน', severity: 'error' });
      return;
    }
    if (totalCompany === '') {
      setNotification({ open: true, message: 'กรุณากรอกยอดรวมกองร้อย', severity: 'error' });
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          totalCompany,
          totalDistributed,
          remaining,
          tasks
        })
      });

      const result = await response.json();
      if (response.ok) {
        setNotification({ open: true, message: 'บันทึกข้อมูลสำเร็จ', severity: 'success' });
      } else {
        throw new Error(result.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (error: any) {
      setNotification({ open: true, message: error.message, severity: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', pt: { xs: 2, md: 4 }, pb: 16 }}>
        <Container maxWidth="md" sx={{ flex: 1 }}>
          <Header 
            date={date} 
            setDate={setDate} 
            totalCompany={totalCompany} 
            setTotalCompany={setTotalCompany} 
          />
          
          <TaskSection 
            title="หมวดที่ 1: ยอดจ่ายงานเช้า" 
            category="หมวดที่ 1" 
            tasks={tasks} 
            setTasks={setTasks} 
          />
          
          <TaskSection 
            title="หมวดที่ 2: งานนอก/อื่นๆ" 
            category="หมวดที่ 2" 
            tasks={tasks} 
            setTasks={setTasks} 
          />
        </Container>
      </Box>

      <StickyFooter 
        totalDistributed={totalDistributed}
        remaining={remaining}
        isError={isError}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 10 }} // Above sticky footer
      >
        <Alert onClose={() => setNotification(prev => ({ ...prev, open: false }))} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
