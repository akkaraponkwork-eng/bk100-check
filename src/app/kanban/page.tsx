'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import type { KanbanTask } from '@/types';
import { useToast } from '@/hooks/useToast';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import BarChartIcon from '@mui/icons-material/BarChart';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { domToJpeg } from 'modern-screenshot';
import { jsPDF } from 'jspdf';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

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
  const [combineCounts, setCombineCounts] = useState(false);
  const { showToast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDownloadImage = async () => {
    const originalElement = document.getElementById('print-form-container');
    if (!originalElement) return;

    const clone = originalElement.cloneNode(true) as HTMLElement;
    clone.id = 'print-form-container-clone';
    clone.classList.remove('print-only');
    
    clone.style.cssText = `
      display: block !important;
      width: 800px !important;
      background: white !important;
      margin: 0 !important;
    `;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: absolute;
      top: 0;
      left: -9999px;
      width: 0;
      height: 0;
      overflow: hidden;
    `;
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      showToast('กำลังสร้างรูปภาพ...', 'success');
      await new Promise(r => setTimeout(r, 150));
      
      const dataUrl = await domToJpeg(clone, {
        quality: 0.9,
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      const isMobile = /Line|Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        setPreviewImage(dataUrl);
      } else {
        const link = document.createElement('a');
        link.download = `ยอดกำลังพล_${today}.jpg`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err: any) {
      console.error('modern-screenshot error:', err);
      showToast(`ไม่สามารถสร้างรูปภาพได้: ${err?.message || err}`, 'error');
    } finally {
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    }
  };

  const handleDownloadPDF = async () => {
    const originalElement = document.getElementById('print-form-container');
    if (!originalElement) return;

    const clone = originalElement.cloneNode(true) as HTMLElement;
    clone.id = 'print-form-container-clone';
    clone.classList.remove('print-only');
    
    clone.style.cssText = `
      display: block !important;
      width: 800px !important;
      background: white !important;
      margin: 0 !important;
    `;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: absolute;
      top: 0;
      left: -9999px;
      width: 0;
      height: 0;
      overflow: hidden;
    `;
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      showToast('กำลังสร้าง PDF...', 'success');
      await new Promise(r => setTimeout(r, 150));
      
      const canvasWidth = clone.offsetWidth;
      const canvasHeight = clone.offsetHeight;

      const dataUrl = await domToJpeg(clone, {
        quality: 0.9,
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvasHeight * pdfWidth) / canvasWidth;
      
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const isMobile = /Line|Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && typeof navigator.canShare === 'function') {
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], `ยอดกำลังพล_${today}.pdf`, { type: 'application/pdf' });
        try {
          await navigator.share({
            files: [file],
            title: `ยอดกำลังพล ${today}`
          });
        } catch (e) {
          pdf.save(`ยอดกำลังพล_${today}.pdf`);
        }
      } else {
        pdf.save(`ยอดกำลังพล_${today}.pdf`);
      }
    } catch (err: any) {
      console.error('PDF generation error:', err);
      showToast(`ไม่สามารถสร้าง PDF ได้: ${err?.message || err}`, 'error');
    } finally {
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    }
  };

  const loadLatest = useCallback(async () => {
    setLoading(true);
    try {
      const [todayRes, botRes] = await Promise.all([
        fetch(`/api/records?date=${today}`, { cache: 'no-store' }),
        fetch('/api/bot-settings', { cache: 'no-store' })
      ]);

      if (botRes.ok) {
        const botData = await botRes.json();
        setCombineCounts(botData.combineKanbanCounts === true);
      }

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((t) => t.id === active.id);
        const newIndex = items.findIndex((t) => t.id === over.id);
        
        // Prevent moving fixed routine tasks into extra categories or vice versa? 
        // For simplicity, just allow full reordering like a standard Kanban list.
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    if (totalCompany === '') { showToast('กรุณากรอกยอดรวม', 'error'); return; }
    
    showToast('กำลังซิงค์ข้อมูลลง Google Sheets...', 'success');
    setSaving(true);
    
    try {
      const totalDistributed = tasks.reduce((s, t) => s + getTaskTotal(t), 0);
      await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, totalCompany, totalDistributed, remaining: totalCompany - totalDistributed, tasks }),
      });
    } catch {
      showToast('เกิดข้อผิดพลาดในการบันทึก โปรดลองใหม่', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  }, [tasks, filter]);

  return (
    <div className="pb-[calc(env(safe-area-inset-bottom)+100px)] lg:pb-[80px]">
      <PrintForm tasks={tasks} date={today} totalCompany={totalCompany} combineCounts={combineCounts} />

      <PageHeader
        title="บันทึกยอดงานประจำวัน"
        description="ตรวจสอบและจัดการยอดกำลังพลและหน้าที่รับผิดชอบ"
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={handleDownloadImage} title="แชร์เป็นรูปภาพ" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100">
              <ImageIcon fontSize="small" />
            </button>
            <button onClick={handleDownloadPDF} title="พิมพ์แบบฟอร์ม PDF" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100">
              <PictureAsPdfIcon fontSize="small" />
            </button>
            <button onClick={loadLatest} title="โหลดข้อมูลล่าสุด" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100">
              <RefreshIcon fontSize="small" />
            </button>
            <button onClick={() => setShowSummary(true)} className="ml-2 flex h-8 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <BarChartIcon fontSize="small" /> สรุป
            </button>
            <button onClick={() => setShowAdd(true)} className="flex h-8 items-center gap-1.5 rounded-lg bg-sky-600 px-3 text-sm font-bold text-white shadow-sm hover:bg-sky-700">
              <AddIcon fontSize="small" /> เพิ่มงาน
            </button>
          </div>
        }
      />

      <div className="mx-auto max-w-5xl px-4 pb-24 md:px-6">
        {/* Filter Tabs */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setFilter('all')}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs transition-colors ${
              filter === 'all'
                ? 'bg-sky-600 font-bold text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            ทั้งหมด ({tasks.length})
          </button>
          {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(statusKey => {
            const config = STATUS_CONFIG[statusKey];
            const isActive = filter === statusKey;
            const count = tasks.filter(t => t.status === statusKey).length;
            return (
              <button
                key={statusKey}
                onClick={() => setFilter(statusKey)}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  isActive ? 'font-bold' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                style={{
                  backgroundColor: isActive ? config.bg : undefined,
                  borderColor: isActive ? config.color : '#e5e7eb',
                  color: isActive ? config.color : undefined,
                }}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Task List */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-[120px] animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredTasks.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                ไม่พบงานในสถานะนี้
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      combineCounts={combineCounts}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}
      </div>

      {/* Headcount Footer */}
      <HeadcountFooter
        tasks={tasks}
        totalCompany={totalCompany}
        onChangeTotalCompany={setTotalCompany}
        onSave={handleSave}
        saving={saving}
        combineCounts={combineCounts}
      />

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      {showSummary && <SummaryModal onClose={() => setShowSummary(false)} totalCompany={totalCompany} tasks={tasks} combineCounts={combineCounts} />}
      
      {/* Preview Image Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">แตะค้างที่รูปเพื่อบันทึกหรือส่งต่อ</h2>
              <button onClick={() => setPreviewImage(null)} className="rounded-full p-1 text-gray-500 hover:bg-gray-100">
                <CloseIcon fontSize="small" />
              </button>
            </div>
            
            <div className="bg-gray-100 p-6 text-center">
              <img 
                src={previewImage} 
                alt="Preview" 
                className="max-h-[60vh] max-w-full rounded-lg border border-black/10 object-contain shadow-md"
              />
            </div>
            
            <div className="flex justify-end gap-2 rounded-b-2xl bg-gray-50 px-6 py-4">
              <button onClick={() => setPreviewImage(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
                ปิด
              </button>
              <button 
                onClick={async () => {
                  try {
                    if (navigator.share) {
                      const blob = await (await fetch(previewImage)).blob();
                      const file = new File([blob], `ยอดกำลังพล_${today}.jpg`, { type: 'image/jpeg' });
                      if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: `ยอดกำลังพล ${today}` });
                        return;
                      }
                    }
                  } catch (e) {
                    console.log('Share failed', e);
                  }
                  const link = document.createElement('a');
                  link.download = `ยอดกำลังพล_${today}.jpg`;
                  link.href = previewImage;
                  link.click();
                }}
                className="rounded-lg bg-sky-600 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-sky-700"
              >
                แชร์ / ดาวน์โหลด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
