'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import type { KanbanTask } from '@/types';
import { useToast } from '@/hooks/useToast';
import { Box, Typography, Button, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import BarChartIcon from '@mui/icons-material/BarChart';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import html2canvas from 'html2canvas';

import PageHeader from '@/components/layout/PageHeader';
import TaskCard, { STATUS_CONFIG, getTaskTotal } from '@/components/kanban/TaskCard';
import AddTaskModal from '@/components/kanban/AddTaskModal';
import SummaryModal from '@/components/kanban/SummaryModal';
import HeadcountFooter from '@/components/kanban/HeadcountFooter';
import PrintForm, { ROUTINE_TITLES } from '@/components/kanban/PrintForm';

type TaskStatus = KanbanTask['status'];

const DEFAULT_TASKS: Omit<KanbanTask, 'id' | 'date'>[] = ROUTINE_TITLES.map(title => ({
  title, category: 'รปจ', location: '', count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true
}));

export default function DutyCheckPage() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [totalCompany, setTotalCompany] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const { showToast } = useToast();

  const handleDownloadImage = async () => {
    const element = document.getElementById('print-form-container');
    if (!element) return;
    const originalDisplay = element.style.display;
    const originalPosition = element.style.position;
    const originalLeft = element.style.left;
    const originalWidth = element.style.width;
    element.style.setProperty('display', 'block', 'important');
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.width = '800px';
    element.style.background = 'white';
    try {
      showToast('กำลังสร้างรูปภาพ...', 'success');
      await new Promise(r => setTimeout(r, 100));
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      let shared = false;
      try {
        if (navigator.share) {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], `ยอดกำลังพล_${today}.jpg`, { type: 'image/jpeg' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `ยอดกำลังพล ${today}` });
            shared = true;
          }
        }
      } catch (e) {
        console.log('Share failed or rejected', e);
      }

      if (!shared) {
        if (/Line/i.test(navigator.userAgent) || /Mobi|Android/i.test(navigator.userAgent)) {
          setPreviewImage(dataUrl);
        } else {
          const link = document.createElement('a');
          link.download = `ยอดกำลังพล_${today}.jpg`;
          link.href = dataUrl;
          link.click();
        }
      }
    } catch {
      showToast('ไม่สามารถสร้างรูปภาพได้', 'error');
    } finally {
      element.style.display = originalDisplay;
      element.style.position = originalPosition;
      element.style.left = originalLeft;
      element.style.width = originalWidth;
      element.style.background = '';
    }
  };

  const loadLatest = useCallback(async () => {
    setLoading(true);
    try {
      const todayRes = await fetch(`/api/records?date=${today}`);
      const todayData = await todayRes.json();
      if (todayData.record) {
        const r = todayData.record;
        setTotalCompany(r.totalCompany);
        setTasks(r.tasks.map((t: KanbanTask) => ({ ...t, id: t.id || crypto.randomUUID() })));
      } else {
        const latestRes = await fetch('/api/records?latest=true');
        const latestData = await latestRes.json();
        if (latestData.record) {
          setTotalCompany(latestData.record.totalCompany);
          const routineTasks = latestData.record.tasks.filter((t: KanbanTask) => t.isFixed);
          const baseTasks = routineTasks.length > 0 ? routineTasks : DEFAULT_TASKS;
          const templateTasks: KanbanTask[] = baseTasks.map((t: any) => ({
            ...t,
            id: crypto.randomUUID(),
            count: '', countSenior: '', countJunior: '',
            status: 'todo' as TaskStatus,
            date: today,
            isFixed: true,
          }));
          setTasks(templateTasks);
        } else {
          setTasks(DEFAULT_TASKS.map(t => ({ ...t, id: crypto.randomUUID(), date: today })));
        }
      }
    } catch {
      setTasks(DEFAULT_TASKS.map(t => ({ ...t, id: crypto.randomUUID(), date: today })));
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { loadLatest(); }, [loadLatest]);

  const handleUpdate = (id: string, updates: Partial<KanbanTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };
  const handleDelete = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };
  const handleAdd = (t: Omit<KanbanTask, 'id'>) => {
    setTasks(prev => [...prev, { ...t, id: crypto.randomUUID(), date: today }]);
    setShowAdd(false);
  };

  const handleSave = async () => {
    if (totalCompany === '') { showToast('กรุณากรอกยอดรวม', 'error'); return; }
    
    // Optimistic UI: Immediately give user feedback
    showToast('กำลังซิงค์ข้อมูลลง Google Sheets...', 'success');
    
    try {
      const totalDistributed = tasks.reduce((s, t) => s + getTaskTotal(t), 0);
      await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, totalCompany, totalDistributed, remaining: totalCompany - totalDistributed, tasks }),
      });
      // Silent success since we already showed the optimistic toast
    } catch {
      showToast('เกิดข้อผิดพลาดในการบันทึก โปรดลองใหม่', 'error');
    }
  };

  const filteredTasks = useMemo(() => {
    return filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  }, [tasks, filter]);

  return (
    <Box sx={{ pb: { xs: 'calc(env(safe-area-inset-bottom) + 100px)', lg: '80px' } }}>
      <PrintForm tasks={tasks} date={today} totalCompany={totalCompany} />
      <>

        <PageHeader
          title="บันทึกยอดงานประจำวัน"
          description="ตรวจสอบและจัดการยอดกำลังพลและหน้าที่รับผิดชอบ"
          action={
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <IconButton onClick={handleDownloadImage} title="แชร์เป็นรูปภาพ" size="small" color="inherit">
                <ImageIcon fontSize="small" />
              </IconButton>
              <IconButton onClick={() => window.print()} title="พิมพ์แบบฟอร์ม PDF" size="small" color="inherit">
                <PictureAsPdfIcon fontSize="small" />
              </IconButton>
              <IconButton onClick={loadLatest} title="โหลดข้อมูลล่าสุด" size="small" color="inherit">
                <RefreshIcon fontSize="small" />
              </IconButton>
              <Button variant="outlined" size="small" startIcon={<BarChartIcon />} onClick={() => setShowSummary(true)} sx={{ borderRadius: 2, ml: 1, borderColor: 'divider', color: 'text.primary' }}>
                สรุป
              </Button>
              <Button onClick={() => setShowAdd(true)} variant="contained" size="small" startIcon={<AddIcon />} sx={{ borderRadius: 2 }}>เพิ่มงาน</Button>
            </Box>
          }
        />

      <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 10 }}>
        {/* Filter Tabs */}
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5, '::-webkit-scrollbar': { display: 'none' } }}>
          <Chip
            size="small"
            label={`ทั้งหมด (${tasks.length})`}
            onClick={() => setFilter('all')}
            color={filter === 'all' ? 'primary' : 'default'}
            variant={filter === 'all' ? 'filled' : 'outlined'}
            sx={{ fontWeight: filter === 'all' ? 600 : 400, fontSize: 12, flexShrink: 0, height: 28, borderRadius: 2 }}
          />
          {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(statusKey => {
            const config = STATUS_CONFIG[statusKey];
            const isActive = filter === statusKey;
            const count = tasks.filter(t => t.status === statusKey).length;
            return (
              <Chip
                key={statusKey}
                size="small"
                label={`${config.label} (${count})`}
                onClick={() => setFilter(statusKey)}
                sx={{
                  fontSize: 12,
                  flexShrink: 0,
                  height: 28,
                  borderRadius: 2,
                  fontWeight: isActive ? 600 : 400,
                  bgcolor: isActive ? config.bg : 'transparent',
                  color: isActive ? `${config.color} !important` : 'text.secondary',
                  borderColor: isActive ? config.color : 'divider',
                  borderWidth: 1,
                  borderStyle: 'solid'
                }}
              />
            );
          })}
        </Box>

        {/* Task List */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[1, 2, 3, 4].map(i => <Box key={i} className="skeleton" sx={{ height: 120, borderRadius: 3 }} />)}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {filteredTasks.length === 0 ? (
              <Typography sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                ไม่พบงานในสถานะนี้
              </Typography>
            ) : (
              filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))
            )}
          </Box>
        )}
      </Box>

      {/* Headcount Footer */}
      <HeadcountFooter
        tasks={tasks}
        totalCompany={totalCompany}
        onChangeTotalCompany={setTotalCompany}
        onSave={handleSave}
        saving={saving}
      />

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      {showSummary && <SummaryModal onClose={() => setShowSummary(false)} totalCompany={totalCompany} tasks={tasks} />}
      
      {previewImage && (
        <Dialog open={!!previewImage} onClose={() => setPreviewImage(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">แตะค้างที่รูปเพื่อบันทึกหรือส่งต่อ</Typography>
            <IconButton onClick={() => setPreviewImage(null)} size="small"><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewImage(null)} color="inherit">ปิด</Button>
            <Button variant="contained" onClick={() => {
              const link = document.createElement('a');
              link.download = `ยอดกำลังพล_${today}.jpg`;
              link.href = previewImage;
              link.click();
            }}>ดาวน์โหลด</Button>
          </DialogActions>
        </Dialog>
      )}
      </>
    </Box>
  );
}
