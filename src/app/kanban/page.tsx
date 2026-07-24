'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import type { KanbanTask } from '@/types';
import { useToast, Toast } from '@/hooks/useToast';
import PushPinIcon from '@mui/icons-material/PushPin';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import AssignmentIcon from '@mui/icons-material/Assignment';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import html2canvas from 'html2canvas';

type TaskStatus = KanbanTask['status'];

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  todo:        { label: 'ต้องทำ',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: <PushPinIcon fontSize="small" /> },
  in_progress: { label: 'กำลังทำ',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: <AutorenewIcon fontSize="small" /> },
  done:        { label: 'เสร็จแล้ว',  color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <CheckCircleIcon fontSize="small" /> },
};

const getTaskTotal = (t: KanbanTask) => (Number(t.countSenior) || 0) + (Number(t.countJunior) || 0) + (Number(t.count) || 0);

const DEFAULT_TASKS: Omit<KanbanTask, 'id' | 'date'>[] = [
  { title: 'บก.ร้อย',         category: 'รปจ', location: '',  count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
  { title: 'คลังผ้า',          category: 'รปจ', location: '',  count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
  { title: 'คลังโยธา',         category: 'รปจ', location: '',  count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
  { title: 'รถไถ',             category: 'รปจ', location: '',  count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
  { title: 'ตัดหญ้า',          category: 'รปจ', location: '',  count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
  { title: 'ตัดแต่ง',          category: 'รปจ', location: '',  count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
  { title: 'ทั่วไป (กองร้อย)', category: 'รปจ', location: '',  count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
  { title: 'ชุดช่าง บก.พัน',   category: 'รปจ', location: '',  count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
  { title: 'ป่วย',             category: 'รปจ', location: '',  count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
  { title: 'ตร.ศบบ.',          category: 'รปจ', location: '',  count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
  { title: 'บ้านพัก ผบ.ศบบ.',  category: 'รปจ', location: '',  count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
];

// ==================== Task Card ====================
function TaskCard({
  task, onUpdate, onDelete,
}: {
  task: KanbanTask;
  onUpdate: (id: string, updates: Partial<KanbanTask>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="card" style={{ marginBottom: 12, padding: '12px', borderLeft: `4px solid ${STATUS_CONFIG[task.status].color}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{task.title}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="badge badge-gray" style={{ fontSize: 10 }}>{task.category}</span>
            {task.location && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 2 }}><LocationOnIcon style={{ fontSize: 14 }} /> {task.location}</span>}
          </div>
        </div>
        
        {/* Count Input */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--color-primary-light)', fontWeight: 600 }}>ยอดพี่</span>
            <input
              type="number"
              value={task.countSenior !== undefined ? task.countSenior : (task.count || '')}
              onChange={e => onUpdate(task.id, { countSenior: e.target.value === '' ? '' : Number(e.target.value), count: '' })}
              placeholder="0"
              min={0}
              style={{
                width: 48, height: 36, background: 'var(--color-surface-2)', border: `1px solid var(--color-primary-light)40`,
                borderRadius: 8, color: 'var(--color-text-primary)',
                textAlign: 'center', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--color-accent-light)', fontWeight: 600 }}>ยอดน้อง</span>
            <input
              type="number"
              value={task.countJunior !== undefined ? task.countJunior : ''}
              onChange={e => onUpdate(task.id, { countJunior: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0"
              min={0}
              style={{
                width: 48, height: 36, background: 'var(--color-surface-2)', border: `1px solid var(--color-accent-light)40`,
                borderRadius: 8, color: 'var(--color-text-primary)',
                textAlign: 'center', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600 }}>รวม</span>
            <div style={{
              width: 42, height: 36, background: 'transparent',
              color: 'var(--color-text-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700
            }}>
              {getTaskTotal(task) || '-'}
            </div>
          </div>
        </div>

        {!task.isFixed && (
          <button
            onClick={() => onDelete(task.id)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--color-danger-light)', cursor: 'pointer', padding: '4px', marginLeft: 4 }}
          ><CloseIcon fontSize="small" /></button>
        )}
      </div>

      {task.remark && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-surface-2)', padding: '6px 8px', borderRadius: 6 }}>
          <ChatIcon style={{ fontSize: 14 }} /> {task.remark}
        </div>
      )}

      {/* Status Segmented Control */}
      <div style={{ display: 'flex', marginTop: 12, background: 'var(--color-surface-2)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(statusKey => {
          const isActive = task.status === statusKey;
          const config = STATUS_CONFIG[statusKey];
          return (
            <button
              key={statusKey}
              onClick={() => onUpdate(task.id, { status: statusKey })}
              style={{
                flex: 1, padding: '8px 0', border: 'none',
                background: isActive ? config.bg : 'transparent',
                color: isActive ? config.color : 'var(--color-text-muted)',
                fontWeight: isActive ? 600 : 400, fontSize: 12, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                transition: 'all 0.2s',
                borderRight: statusKey !== 'done' ? '1px solid var(--color-border)' : 'none'
              }}
            >
              {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==================== Add Task Modal ====================
function AddTaskModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Omit<KanbanTask, 'id'>) => void }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({ title: '', category: 'งานนอก/อื่นๆ' as KanbanTask['category'], location: '', remark: '', date: today });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}><AddIcon fontSize="small" /> เพิ่มงาน</h2>
        <div className="form-group">
          <label className="label">ชื่องาน</label>
          <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="ระบุชื่องาน" autoFocus />
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="label">หมวด</label>
            <select className="select" value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="รปจ">รปจ (งานประจำ)</option>
              <option value="งานนอก/อื่นๆ">งานนอก/อื่นๆ</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">สถานที่</label>
            <input className="input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="ระบุสถานที่" />
          </div>
        </div>
        <div className="form-group">
          <label className="label">หมายเหตุ</label>
          <input className="input" value={form.remark} onChange={e => set('remark', e.target.value)} placeholder="หมายเหตุ (ถ้ามี)" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" disabled={!form.title} onClick={() => onAdd({ ...form, count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: false })}>
            เพิ่ม
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== Headcount Footer ====================
function HeadcountFooter({
  tasks, totalCompany, onChangeTotalCompany, onSave, saving,
}: {
  tasks: KanbanTask[];
  totalCompany: number | '';
  onChangeTotalCompany: (v: number | '') => void;
  onSave: () => void;
  saving: boolean;
}) {
  const totalDistributed = tasks.reduce((s, t) => s + getTaskTotal(t), 0);
  const remaining = typeof totalCompany === 'number' ? totalCompany - totalDistributed : 0;
  const isOver = remaining < 0;

  return (
    <div style={{
      position: 'fixed', bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))',
      left: 0, right: 0,
      background: 'rgba(15,23,42,0.97)', borderTop: '1px solid var(--color-border)',
      padding: '10px 16px', zIndex: 40,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Total input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>ยอดรวม</span>
          <input
            type="number"
            value={totalCompany}
            onChange={e => onChangeTotalCompany(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
            style={{ width: 56, height: 36, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)', textAlign: 'center', fontSize: 15, fontWeight: 700, fontFamily: 'inherit' }}
          />
        </div>
        {/* Distributed */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>จ่าย</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary-light)' }}>{totalDistributed}</div>
        </div>
        {/* Remaining */}
        <div style={{ textAlign: 'center', minWidth: 48 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>คงเหลือ</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: isOver ? '#ef4444' : '#10b981' }}>
            {typeof totalCompany === 'number' ? remaining : '—'}
          </div>
        </div>
        {/* Save */}
        <button
          className="btn btn-primary btn-sm"
          onClick={onSave}
          disabled={saving || isOver}
          style={{ minWidth: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          {saving ? '...' : <><SaveIcon fontSize="small" /> บันทึก</>}
        </button>
      </div>
    </div>
  );
}

// ==================== Print Form ====================
function PrintForm({ tasks, date, totalCompany }: { tasks: KanbanTask[], date: string, totalCompany: number | '' }) {
  const dateDisplay = format(parseISO(date), 'd MMMM yyyy', { locale: th });
  const totalDistributed = tasks.reduce((s, t) => s + getTaskTotal(t), 0);
  const remaining = typeof totalCompany === 'number' ? totalCompany - totalDistributed : 0;
  
  const isMorning = new Date().getHours() < 12;
  const shiftText = isMorning ? 'ยอดจ่ายงานเช้า' : 'ยอดจ่ายงานบ่าย';
  
  // Group tasks
  const routineTasks = tasks.filter(t => t.category === 'รปจ' || (t.category as string) === 'หมวดที่ 1');
  const otherTasks = tasks.filter(t => t.category === 'งานนอก/อื่นๆ' || (t.category as string) === 'หมวดที่ 2');

  const emptyRowsNeeded = Math.max(0, 3 - otherTasks.length);
  const emptyRows = Array.from({ length: emptyRowsNeeded }, (_, i) => i);

  const formatCount = (t: KanbanTask) => {
    const s = Number(t.countSenior) || 0;
    const j = Number(t.countJunior) || 0;
    const old = Number(t.count) || 0;
    const total = s + j + old;
    if (total === 0) return '';
    if (s > 0 && j > 0) return `พี่ ${s} น้อง ${j}`;
    if (s > 0) return `พี่ ${s}`;
    if (j > 0) return `น้อง ${j}`;
    return `${total}`;
  };

  return (
    <div id="print-form-container" className="print-only" style={{ width: '100%', fontFamily: '"Sarabun", "Times New Roman", serif', color: 'black' }}>
      <style>{`
        @media screen { .print-only { display: none !important; } }
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        .print-table { width: 100%; border-collapse: collapse; font-size: 14px; border: 2px solid black; }
        .print-table th, .print-table td { border: 1px solid black; padding: 4px 8px; }
        .print-table th { font-weight: bold; text-align: center; }
        .print-text-center { text-align: center; }
        .print-text-left { text-align: left; }
      `}</style>
      
      <table className="print-table">
        <thead>
          <tr>
            <th colSpan={4} style={{ padding: '8px', borderBottom: 'none' }}>แบบรายชื่อการจ่ายงานตามหน้าที่ ร้อย.บก.พัน.บร.</th>
          </tr>
          <tr>
            <th colSpan={4} style={{ padding: '8px', borderTop: 'none', borderBottom: 'none' }}>ประจำวันที่ {dateDisplay}</th>
          </tr>
          <tr>
            <th colSpan={4} style={{ padding: '6px', borderTop: 'none' }}>ยอดรวมกองร้อย {totalCompany === '' ? '.......................' : totalCompany} นาย</th>
          </tr>
          <tr>
            <th colSpan={4} style={{ padding: '6px', background: '#f0f0f0' }}>{shiftText}</th>
          </tr>
          <tr>
            <th style={{ width: '25%' }}>รูปแบบงาน</th>
            <th style={{ width: '35%' }}>สถานที่ทำงาน/จำหน่าย</th>
            <th style={{ width: '15%' }}>จำนวนยอด</th>
            <th style={{ width: '25%' }}>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {routineTasks.map(t => (
            <tr key={t.id}>
              <td className="print-text-left">{t.title}</td>
              <td className="print-text-left">{t.location}</td>
              <td className="print-text-center" style={{ fontSize: '14px' }}>{formatCount(t)}</td>
              <td className="print-text-left">{t.remark}</td>
            </tr>
          ))}
          <tr>
            <td className="print-text-left" style={{ fontWeight: 'bold' }}>งานนอก/อื่นๆ</td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          {otherTasks.map(t => (
            <tr key={t.id}>
              <td className="print-text-left">{t.title}</td>
              <td className="print-text-left">{t.location}</td>
              <td className="print-text-center" style={{ fontSize: '14px' }}>{formatCount(t)}</td>
              <td className="print-text-left">{t.remark}</td>
            </tr>
          ))}
          {emptyRows.map(i => (
            <tr key={`empty-${i}`}>
              <td>&nbsp;</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} className="print-text-left" style={{ fontWeight: 'bold' }}>รวมยอดจำหน่าย</td>
            <td className="print-text-center" style={{ fontWeight: 'bold' }}>{totalDistributed || ''}</td>
            <td></td>
          </tr>
          <tr>
            <td colSpan={2} className="print-text-left" style={{ fontWeight: 'bold' }}>ยอดคงเหลือ</td>
            <td className="print-text-center" style={{ fontWeight: 'bold' }}>{totalCompany === '' ? '' : remaining}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ==================== Main Page ====================
export default function DutyCheckPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDisplay = format(new Date(), 'EEEE d MMMM yyyy', { locale: th });

  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [totalCompany, setTotalCompany] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const { toast, show: showToast } = useToast();

  const handleDownloadImage = async () => {
    const element = document.getElementById('print-form-container');
    if (!element) return;
    
    // Backup original styles
    const originalDisplay = element.style.display;
    const originalPosition = element.style.position;
    const originalLeft = element.style.left;
    const originalWidth = element.style.width;
    
    // Force show element off-screen for rendering
    element.style.setProperty('display', 'block', 'important');
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.width = '800px'; 
    element.style.background = 'white';
    
    try {
      showToast('กำลังสร้างรูปภาพ...', 'success');
      // Adding a small delay to ensure rendering is updated
      await new Promise(r => setTimeout(r, 100));
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      const link = document.createElement('a');
      link.download = `ยอดกำลังพล_${today}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
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
          const templateTasks: KanbanTask[] = latestData.record.tasks.map((t: KanbanTask) => ({
            ...t,
            id: crypto.randomUUID(),
            count: '',
            status: 'todo' as TaskStatus,
            date: today,
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
    setSaving(true);
    try {
      const totalDistributed = tasks.reduce((s, t) => s + getTaskTotal(t), 0);
      await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, totalCompany, totalDistributed, remaining: totalCompany - totalDistributed, tasks }),
      });
      showToast('บันทึกยอดสำเร็จ');
    } catch {
      showToast('บันทึกไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  }, [tasks, filter]);

  return (
    <div style={{ paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 80px)' }}>
      <PrintForm tasks={tasks} date={today} totalCompany={totalCompany} />
      
      <div className="no-print">
        <Toast toast={toast} />

        {/* Header */}
        <div className="page-header">
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><AssignmentIcon /> ยอดกำลังพล</h1>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{todayDisplay}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleDownloadImage} title="แชร์เป็นรูปภาพ" style={{ padding: '0 8px' }}>
            <ImageIcon fontSize="small" />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()} title="พิมพ์แบบฟอร์ม PDF" style={{ padding: '0 8px' }}>
            <PictureAsPdfIcon fontSize="small" />
          </button>
          <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }} onClick={loadLatest}><RefreshIcon fontSize="small" /></button>
          <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 2 }} onClick={() => setShowAdd(true)}><AddIcon fontSize="small" /> งาน</button>
        </div>

      <div className="content-area">
        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          <button
            onClick={() => setFilter('all')}
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 99, whiteSpace: 'nowrap' }}
          >
            ทั้งหมด ({tasks.length})
          </button>
          {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(statusKey => (
            <button
              key={statusKey}
              onClick={() => setFilter(statusKey)}
              className="btn btn-sm"
              style={{
                background: filter === statusKey ? STATUS_CONFIG[statusKey].bg : 'var(--color-surface)',
                color: filter === statusKey ? STATUS_CONFIG[statusKey].color : 'var(--color-text-muted)',
                border: `1px solid ${filter === statusKey ? STATUS_CONFIG[statusKey].color : 'var(--color-border)'}`,
                borderRadius: 99,
                whiteSpace: 'nowrap',
              }}
            >
              {STATUS_CONFIG[statusKey].label} ({tasks.filter(t => t.status === statusKey).length})
            </button>
          ))}
        </div>

        {/* Task List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
                ไม่พบงานในสถานะนี้
              </div>
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
      />

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      </div>
    </div>
  );
}
