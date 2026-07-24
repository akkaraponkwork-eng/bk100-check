'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import Link from 'next/link';
import type { Personnel, DutyShift, NCODuty, KanbanTask } from '@/types';
import HomeIcon from '@mui/icons-material/Home';
import GroupIcon from '@mui/icons-material/Group';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import BarChartIcon from '@mui/icons-material/BarChart';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import RefreshIcon from '@mui/icons-material/Refresh';

// ==================== Stat Card ====================
function StatCard({
  icon, label, value, sub, accent = '#3b82f6', onClick,
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  accent?: string; onClick?: () => void;
}) {
  return (
    <div
      className="stat-card"
      style={{ '--accent': accent } as React.CSSProperties}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', color: accent }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{sub}</div>}
    </div>
  );
}

// ==================== Shift Timeline ====================
const DEFAULT_SLOTS = [
  { start: '18:00', end: '20:00' },
  { start: '20:00', end: '22:00' },
  { start: '22:00', end: '00:00' },
  { start: '00:00', end: '02:00' },
  { start: '02:00', end: '04:00' },
  { start: '04:00', end: '06:00' },
];

function getCurrentSlotIndex(): number {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const total = h * 60 + m;
  if (total >= 18 * 60) return Math.floor((total - 18 * 60) / 120);
  if (total < 6 * 60) return Math.floor((total + 6 * 60) / 120);
  return -1;
}

function DutyTimeline({
  shift, personnel,
}: {
  shift: DutyShift | null;
  personnel: Personnel[];
}) {
  const currentSlot = getCurrentSlotIndex();
  const personnelMap = Object.fromEntries(personnel.map(p => [p.id, p]));

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="flex-between mb-2">
        <h3 style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: '4px' }}><AccessTimeIcon fontSize="small" /> เวรยามวันนี้</h3>
        <Link href="/duty" style={{ fontSize: 12, color: 'var(--color-primary-light)', textDecoration: 'none' }}>
          จัดเวร →
        </Link>
      </div>
      {shift ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {shift.timeSlots.sort((a, b) => a.order - b.order).map((slot, i) => {
            const p = personnelMap[slot.personnelId];
            const isCurrent = i === currentSlot;
            return (
              <div
                key={slot.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8,
                  background: isCurrent ? 'rgba(59,130,246,0.15)' : 'var(--color-surface-2)',
                  border: isCurrent ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                }}
              >
                <div style={{ minWidth: 80, fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: isCurrent ? 600 : 400 }}>
                  {slot.start}–{slot.end}
                </div>
                {isCurrent && <span style={{ fontSize: 10, background: 'var(--color-primary)', color: 'white', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>ปัจจุบัน</span>}
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', flex: 1 }}>
                  {p ? `${p.rank}${p.firstName} ${p.lastName}` : 'ไม่ระบุ'}
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: '2px' }}>
            <LocationOnIcon style={{ fontSize: 14 }} /> {shift.location}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
          ยังไม่ได้จัดเวรวันนี้
          <br />
          <Link href="/duty" style={{ color: 'var(--color-primary-light)', fontWeight: 600, textDecoration: 'none' }}>
            + จัดเวรเลย
          </Link>
        </div>
      )}
    </div>
  );
}

// ==================== Status Bar ====================
function StatusBar({ personnel }: { personnel: Personnel[] }) {
  if (personnel.length === 0) return null;

  const renderStatusRow = (title: string, list: Personnel[]) => {
    if (list.length === 0) return null;
    const counts = {
      available: list.filter(p => p.status === 'available').length,
      on_duty: list.filter(p => p.status === 'on_duty').length,
      leave: list.filter(p => p.status === 'leave').length,
      sick: list.filter(p => p.status === 'sick').length,
    };
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>{title}</span>
          <span>{list.length} นาย</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[
            { label: 'ว่าง', count: counts.available, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
            { label: 'เวร', count: counts.on_duty, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
            { label: 'ลา', count: counts.leave, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
            { label: 'ป่วย', count: counts.sick, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
          ].map(s => (
            <div key={s.label} style={{
              textAlign: 'center', padding: '6px 0',
              background: s.bg, borderRadius: 8, border: `1px solid ${s.color}40`,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 4, borderRadius: 99, background: 'var(--color-surface-2)', marginTop: 8, overflow: 'hidden', display: 'flex' }}>
          {counts.available > 0 && <div style={{ flex: counts.available, background: '#10b981' }} />}
          {counts.on_duty > 0 && <div style={{ flex: counts.on_duty, background: '#3b82f6' }} />}
          {counts.leave > 0 && <div style={{ flex: counts.leave, background: '#f59e0b' }} />}
          {counts.sick > 0 && <div style={{ flex: counts.sick, background: '#ef4444' }} />}
        </div>
      </div>
    );
  };

  const privates = personnel.filter(p => p.rank === 'พลฯ');

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: '4px' }}><GroupIcon fontSize="small" /> สถานะกำลังพล</h3>
      {renderStatusRow('หมวดพลทหาร', privates)}
    </div>
  );
}

// ==================== Task Distribution ====================
function TaskDistribution({ tasks, recordDate }: { tasks: KanbanTask[], recordDate: string }) {
  const getTaskTotal = (t: KanbanTask) => (Number(t.countSenior) || 0) + (Number(t.countJunior) || 0) + (Number(t.count) || 0);
  const activeTasks = tasks.filter(t => getTaskTotal(t) > 0);
  if (activeTasks.length === 0) return null;
  const totalInTasks = activeTasks.reduce((sum, t) => sum + getTaskTotal(t), 0);
  
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="flex-between mb-3">
        <h3 style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AssignmentIcon fontSize="small" /> ยอดจ่ายงานล่าสุด
        </h3>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{format(parseISO(recordDate), 'd MMM', { locale: th })}</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {activeTasks.map(t => {
          const s = Number(t.countSenior) || 0;
          const j = Number(t.countJunior) || 0;
          const total = getTaskTotal(t);
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '7px 10px', background: 'var(--color-surface-2)', borderRadius: 8 }}>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)' }} className="truncate" title={t.title}>{t.title}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {(s > 0 || j > 0) ? (
                  <>
                    {s > 0 && <span style={{ fontSize: 11, color: 'var(--color-primary-light)', fontWeight: 500 }}>พี่ {s}</span>}
                    {j > 0 && <span style={{ fontSize: 11, color: 'var(--color-accent-light)', fontWeight: 500 }}>น้อง {j}</span>}
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', minWidth: 24, textAlign: 'right' }}>{total}</span>
                  </>
                ) : (
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary-light)' }}>{total}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'right' }}>
        รวมจ่ายงาน: <strong style={{ color: 'var(--color-text-primary)' }}>{totalInTasks}</strong> นาย
      </div>
    </div>
  );
}

// ==================== Quick Actions ====================
function QuickActions({ todayShift, onExport }: { todayShift: DutyShift | null; onExport: () => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
      <Link href="/duty" className="btn btn-primary" style={{ textDecoration: 'none', fontSize: 14 }}>
        <AccessTimeIcon fontSize="small" /> จัดเวรวันนี้
      </Link>
      <Link href="/kanban" className="btn btn-ghost" style={{ textDecoration: 'none', fontSize: 14 }}>
        <AssignmentIcon fontSize="small" /> บันทึกยอด
      </Link>
      {todayShift && (
        <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={onExport}>
          <AssignmentIcon fontSize="small" /> Copy ข้อความเวร
        </button>
      )}
      <Link href="/calendar" className="btn btn-ghost" style={{ textDecoration: 'none', fontSize: 14 }}>
        <CalendarMonthIcon fontSize="small" /> ปฏิทิน
      </Link>
    </div>
  );
}

// ==================== Main Dashboard ====================
export default function DashboardPage() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [todayShift, setTodayShift] = useState<DutyShift | null>(null);
  const [todayNCO, setTodayNCO] = useState<NCODuty | null>(null);
  const [lastRecord, setLastRecord] = useState<{ date: string; totalCompany: number; tasks: KanbanTask[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState<string>('');
  const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: '', visible: false });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayDisplay = format(new Date(), 'd MMMM yyyy', { locale: th });
  const currentMonth = format(new Date(), 'yyyy-MM');

  const showToast = (msg: string) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast({ msg: '', visible: false }), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, dRes, ncoRes, recRes] = await Promise.allSettled([
        fetch('/api/personnel'),
        fetch(`/api/duty?date=${todayStr}`),
        fetch(`/api/nco?month=${currentMonth}`),
        fetch('/api/records?latest=true'),
      ]);

      if (pRes.status === 'fulfilled') {
        const data = await pRes.value.json();
        setPersonnel(data.personnel || []);
      }
      if (dRes.status === 'fulfilled') {
        const data = await dRes.value.json();
        setTodayShift(data.shift || null);
      }
      if (ncoRes.status === 'fulfilled') {
        const data = await ncoRes.value.json();
        const duties: NCODuty[] = data.duties || [];
        const todays = duties.find(d => d.date === todayStr) || null;
        setTodayNCO(todays);
      }
      if (recRes.status === 'fulfilled') {
        const data = await recRes.value.json();
        if (data.record) {
          setLastRecord({ 
            date: data.record.date, 
            totalCompany: data.record.totalCompany,
            tasks: data.record.tasks || []
          });
        }
      }
      setLoadedAt(format(new Date(), 'HH:mm'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [todayStr, currentMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExportDuty = () => {
    if (!todayShift) return;
    const personnelMap = Object.fromEntries(personnel.map(p => [p.id, p]));
    const dateDisplay = format(parseISO(todayShift.date), 'd MMM yy', { locale: th });
    const lines = [`ขออนุญาตแจ้งเวร${todayShift.location}ประจำวันที่ ${dateDisplay}`];
    todayShift.timeSlots
      .sort((a, b) => a.order - b.order)
      .forEach((slot, i) => {
        const p = personnelMap[slot.personnelId];
        const name = p ? `${p.rank}${p.firstName} ${p.lastName}` : 'ไม่ระบุ';
        lines.push(`${i + 1}.${name}`);
        lines.push(`${slot.start}-${slot.end}`);
      });
    navigator.clipboard.writeText(lines.join('\n'));
    showToast('คัดลอกข้อความเวรแล้ว!');
  };

  const privatesCount = personnel.filter(p => p.rank === 'พลฯ').length;
  const ncosCount = personnel.filter(p => p.rank !== 'พลฯ').length;

  const ncoPersonnel = todayNCO
    ? personnel.find(p => p.id === todayNCO.personnelId)
    : null;

  return (
    <div className="page-container">
      {/* Toast */}
      {toast.visible && (
        <div className="toast toast-success">{toast.msg}</div>
      )}

      {/* Header */}
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><HomeIcon /> BK100 DutyCheck</h1>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {todayDisplay}
            {loadedAt && (
              <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--color-surface-2)', padding: '1px 6px', borderRadius: 99 }}>
                โหลด {loadedAt}
              </span>
            )}
          </div>
        </div>
        <button
          className="btn-icon btn-sm"
          onClick={loadData}
          title="รีเฟรช"
          style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {loading ? <RefreshIcon className="animate-spin" fontSize="small" /> : <RefreshIcon fontSize="small" />}
        </button>
      </div>

      {/* Content */}
      <div className="content-area">
        {/* Summary Cards */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 90 }} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <StatCard
              icon={<GroupIcon />} label="กำลังพลทั้งหมด" value={personnel.length}
              sub={`พลฯ ${privatesCount} | นายสิบ ${ncosCount}`}
              accent="#3b82f6"
            />
            <StatCard
              icon={<AccessTimeIcon />} label="เวรวันนี้"
              value={todayShift ? `${todayShift.timeSlots.length} ช่วง` : 'ยังไม่จัด'}
              sub={todayShift?.location}
              accent="#10b981"
            />
            <StatCard
              icon={<PersonIcon />} label="สิบเวรวันนี้"
              value={ncoPersonnel ? `${ncoPersonnel.rank}${ncoPersonnel.firstName}` : '—'}
              sub={ncoPersonnel?.lastName}
              accent="#f59e0b"
            />
            <StatCard
              icon={<BarChartIcon />} label="ยอดล่าสุด"
              value={lastRecord ? `${lastRecord.totalCompany} นาย` : '—'}
              sub={lastRecord ? format(parseISO(lastRecord.date), 'd MMM', { locale: th }) : 'ยังไม่มีข้อมูล'}
              accent="#8b5cf6"
            />
          </div>
        )}

        {/* Today Duty Timeline */}
        {!loading && <DutyTimeline shift={todayShift} personnel={personnel} />}

        {/* Status Bar */}
        {!loading && personnel.length > 0 && <StatusBar personnel={personnel} />}

        {/* Task Distribution */}
        {!loading && lastRecord && <TaskDistribution tasks={lastRecord.tasks} recordDate={lastRecord.date} />}

        {/* Quick Actions */}
        {!loading && <QuickActions todayShift={todayShift} onExport={handleExportDuty} />}
      </div>
    </div>
  );
}
