'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  isToday, parseISO, addMonths, subMonths, subDays
} from 'date-fns';
import { th } from 'date-fns/locale';
import type { Personnel, DutyShift, ShiftSlot, CalendarEvent, KanbanTask, PunishmentEntry, ExceptionEntry } from '@/types';
import { useToast, Toast } from '@/hooks/useToast';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BoltIcon from '@mui/icons-material/Bolt';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SecurityIcon from '@mui/icons-material/Security';
import BlockIcon from '@mui/icons-material/Block';
import StarIcon from '@mui/icons-material/Star';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SearchablePersonnelSelect from '@/components/SearchablePersonnelSelect';

// ==================== Constants ====================
const LOCATION = 'หน้าคลังอาวุธกองร้อยกองบังคับการ';

const SHIFT_TIMES = [
  { shift: 1, label: 'ผลัด 1', start: '18:00', end: '20:00' },
  { shift: 2, label: 'ผลัด 2', start: '20:00', end: '22:00' },
  { shift: 3, label: 'ผลัด 3', start: '22:00', end: '00:00' },
  { shift: 4, label: 'ผลัด 4', start: '00:00', end: '02:00' },
  { shift: 5, label: 'ผลัด 5', start: '02:00', end: '04:00' },
  { shift: 6, label: 'ผลัด 6', start: '04:00', end: '06:00' },
];

const SHIFT_COLORS = ['#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

// ==================== Types ====================


// ==================== Helpers ====================
function getCurrentShift(): number {
  const now = new Date();
  const total = now.getHours() * 60 + now.getMinutes();
  if (total >= 18 * 60) return Math.floor((total - 18 * 60) / 120) + 1;
  if (total < 6 * 60) return Math.floor((total + 6 * 60) / 120) + 1;
  return -1;
}

function isPersonnelAvailable(
  p: Personnel,
  date: string,
  exceptions: ExceptionEntry[],
): boolean {
  if (p.status === 'sick' || p.status === 'leave') return false;
  // If there's any exception OTHER than 'ผู้ช่วยสิบเวร', they are unavailable
  const ex = exceptions.find(
    e => e.personnelId === p.id && e.startDate <= date && e.endDate >= date && e.reason !== 'ผู้ช่วยสิบเวร'
  );
  return !ex;
}

function buildShift(date: string, slotPersonnelIds: string[], punishedIds: string[] = []): DutyShift {
  const timeSlots: ShiftSlot[] = SHIFT_TIMES.map((st, i) => {
    const pId = slotPersonnelIds[i] || '';
    return {
      id: crypto.randomUUID(),
      start: st.start,
      end: st.end,
      personnelId: pId,
      order: i + 1,
      isPunishment: punishedIds.includes(pId),
    };
  });
  return { id: crypto.randomUUID(), date, location: LOCATION, timeSlots, batchMode: 'mixed' };
}

function formatCopyText(
  date: string,
  shift: DutyShift,
  personnelMap: Record<string, Personnel>,
  exceptions: ExceptionEntry[],
): string {
  const d = parseISO(date);
  const formattedDate = `${format(d, 'd MMM', { locale: th })} ${(d.getFullYear() + 543).toString().slice(-2)}`;

  let text = `ขออนุญาตแจ้งเวรหน้าคลังอาวุธประจำวันที่ ${formattedDate}\n`;
  shift.timeSlots
    .sort((a, b) => a.order - b.order)
    .forEach((slot, i) => {
      const p = personnelMap[slot.personnelId];
      const name = p ? `${p.rank}${p.firstName}  ${p.lastName}` : (slot.personnelId || '—');
      text += `${i + 1}.${name}\n`;
      text += `${slot.start}-${slot.end}\n`;
    });
  return text.trimEnd();
}

// ==================== Punishment Manager Modal ====================
function PunishmentModal({
  punishments,
  personnel,
  initialDate,
  onSave,
  onClose,
}: {
  punishments: PunishmentEntry[];
  personnel: Personnel[];
  initialDate?: string;
  onSave: (entries: PunishmentEntry[]) => Promise<void>;
  onClose: () => void;
}) {
  const [list, setList] = useState<PunishmentEntry[]>(punishments);
  const [form, setForm] = useState({
    personnelId: '',
    shift: 1,
    startDate: initialDate || format(new Date(), 'yyyy-MM-dd'),
    endDate: initialDate || format(new Date(), 'yyyy-MM-dd'),
  });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const personnelMap = Object.fromEntries(personnel.map(p => [p.id, p]));

  const handleAdd = () => {
    if (!form.personnelId) return;
    const start = parseISO(form.startDate);
    const end = parseISO(form.endDate);
    const days = eachDayOfInterval({ start, end });
    const newEntries = days.map(d => ({
      ...form,
      startDate: format(d, 'yyyy-MM-dd'),
      endDate: format(d, 'yyyy-MM-dd')
    }));

    setList(prev => [...prev, ...newEntries]);
    setForm({ personnelId: '', shift: 1, startDate: initialDate || format(new Date(), 'yyyy-MM-dd'), endDate: initialDate || format(new Date(), 'yyyy-MM-dd') });
    setShowForm(false);
  };

  const handleRemove = (idx: number) => setList(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    await onSave(list);
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxHeight: '90vh' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444' }}>
              <BlockIcon fontSize="small" /> จัดการดองเวร
            </h2>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>กำหนดผลัดและวันที่สำหรับทหารเฉพาะบุคคล</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {/* Add form toggle */}
        <button
          className={`btn btn-sm w-full ${showForm ? 'btn-ghost' : 'btn-primary'}`}
          onClick={() => setShowForm(v => !v)}
          style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          {showForm ? <><CloseIcon fontSize="small" /> ยกเลิก</> : <><AddIcon fontSize="small" /> เพิ่มดองเวร</>}
        </button>

        {showForm && (
          <div style={{ background: 'var(--color-surface-2)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>ชื่อทหาร</label>
                <SearchablePersonnelSelect personnel={personnel} value={form.personnelId} onChange={v => setForm(f => ({ ...f, personnelId: v }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>ผลัดที่กำหนด</label>
                <select className="select" style={{ width: '100%' }} value={form.shift} onChange={e => setForm(f => ({ ...f, shift: Number(e.target.value) }))}>
                  {SHIFT_TIMES.map((st, i) => (
                    <option key={st.shift} value={st.shift}>{st.label} ({st.start}–{st.end})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>วันที่เริ่ม</label>
                  <input type="date" className="select" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>วันที่สิ้นสุด</label>
                  <input type="date" className="select" value={form.endDate} min={form.startDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                disabled={!form.personnelId}
                onClick={handleAdd}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                <AddIcon fontSize="small" /> เพิ่ม
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
          {(() => {
            const visibleList = list.map((entry, idx) => ({ entry, idx }))
              .filter(({ entry }) => !initialDate || (entry.startDate <= initialDate && entry.endDate >= initialDate));
            if (visibleList.length === 0) {
              return <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: 13 }}>ไม่มีรายการดองเวร</div>;
            }
            return visibleList.map(({ entry, idx }) => {
              const p = personnelMap[entry.personnelId];
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--color-surface-2)', borderRadius: 8, borderLeft: `3px solid #ef4444` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p ? `${p.rank}${p.firstName} ${p.lastName}` : entry.personnelId}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {SHIFT_TIMES[entry.shift - 1]?.label} ({SHIFT_TIMES[entry.shift - 1]?.start}–{SHIFT_TIMES[entry.shift - 1]?.end})
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{entry.startDate} ถึง {entry.endDate}</div>
                  </div>
                  <button onClick={() => handleRemove(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    <DeleteIcon fontSize="small" />
                  </button>
                </div>
              );
            });
          })()}
        </div>

        <button
          className="btn btn-primary w-full mt-4"
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          {saving ? '...' : <><SaveIcon fontSize="small" /> บันทึกรายการดองเวร</>}
        </button>
      </div>
    </div>
  );
}

// ==================== Exception Manager Modal ====================
function ExceptionModal({
  exceptions,
  personnel,
  initialDate,
  onSave,
  onClose,
}: {
  exceptions: ExceptionEntry[];
  personnel: Personnel[];
  initialDate?: string;
  onSave: (entries: ExceptionEntry[]) => Promise<void>;
  onClose: () => void;
}) {
  const [list, setList] = useState<ExceptionEntry[]>(exceptions);
  const [form, setForm] = useState({
    personnelId: '',
    reason: 'ผู้ช่วยสิบเวร' as ExceptionEntry['reason'],
    startDate: initialDate || format(new Date(), 'yyyy-MM-dd'),
    endDate: initialDate || format(new Date(), 'yyyy-MM-dd'),
  });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const personnelMap = Object.fromEntries(personnel.map(p => [p.id, p]));

  const REASON_LABELS: Record<ExceptionEntry['reason'], { label: string; color: string }> = {
    'ผู้ช่วยสิบเวร': { label: 'ผช.สิบเวร', color: '#f59e0b' },
    'ป่วย': { label: 'ป่วย', color: '#ef4444' },
    'ธุระการ': { label: 'ธุระการ', color: '#3b82f6' },
    'งดเวร': { label: 'งดเวร', color: '#10b981' },
  };

  const handleAdd = () => {
    if (!form.personnelId) return;
    const start = parseISO(form.startDate);
    const end = parseISO(form.endDate);
    const days = eachDayOfInterval({ start, end });
    const newEntries = days.map(d => ({
      ...form,
      startDate: format(d, 'yyyy-MM-dd'),
      endDate: format(d, 'yyyy-MM-dd')
    }));

    setList(prev => [...prev, ...newEntries]);
    setForm({ personnelId: '', reason: 'ผู้ช่วยสิบเวร', startDate: initialDate || format(new Date(), 'yyyy-MM-dd'), endDate: initialDate || format(new Date(), 'yyyy-MM-dd') });
    setShowForm(false);
  };

  const handleRemove = (idx: number) => setList(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    await onSave(list);
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxHeight: '90vh' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b' }}>
              <StarIcon fontSize="small" /> ผู้ช่วยสิบเวรประจำวัน
            </h2>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>กำหนดผู้ช่วย</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <button
          className={`btn btn-sm w-full ${showForm ? 'btn-ghost' : 'btn-primary'}`}
          onClick={() => setShowForm(v => !v)}
          style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          {showForm ? <><CloseIcon fontSize="small" /> ยกเลิก</> : <><AddIcon fontSize="small" /> เพิ่มรายการ</>}
        </button>

        {showForm && (
          <div style={{ background: 'var(--color-surface-2)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>ชื่อทหาร</label>
                <SearchablePersonnelSelect personnel={personnel} value={form.personnelId} onChange={v => setForm(f => ({ ...f, personnelId: v }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>ประเภท</label>
                <select className="select" style={{ width: '100%' }} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value as ExceptionEntry['reason'] }))}>
                  <option value="ผู้ช่วยสิบเวร">ผู้ช่วยสิบเวร</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>วันที่เริ่ม</label>
                  <input type="date" className="select" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>วันที่สิ้นสุด</label>
                  <input type="date" className="select" value={form.endDate} min={form.startDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                disabled={!form.personnelId}
                onClick={handleAdd}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                <AddIcon fontSize="small" /> เพิ่ม
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
          {(() => {
            const visibleList = list.map((entry, idx) => ({ entry, idx }))
              .filter(({ entry }) => entry.reason === 'ผู้ช่วยสิบเวร' && (!initialDate || (entry.startDate <= initialDate && entry.endDate >= initialDate)));
            if (visibleList.length === 0) {
              return <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: 13 }}>ไม่มีรายการ</div>;
            }
            return visibleList.map(({ entry, idx }) => {
              const p = personnelMap[entry.personnelId];
              const ri = REASON_LABELS[entry.reason];
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--color-surface-2)', borderRadius: 8, borderLeft: `3px solid ${ri.color}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p ? `${p.rank}${p.firstName} ${p.lastName}` : entry.personnelId}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{entry.startDate} ถึง {entry.endDate}</div>
                  </div>
                  <span style={{ fontSize: 10, background: ri.color + '22', color: ri.color, padding: '2px 6px', borderRadius: 99, fontWeight: 700 }}>{ri.label}</span>
                  <button onClick={() => handleRemove(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    <DeleteIcon fontSize="small" />
                  </button>
                </div>
              );
            });
          })()}
        </div>

        <button
          className="btn btn-primary w-full mt-4"
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          {saving ? '...' : <><SaveIcon fontSize="small" /> บันทึก</>}
        </button>
      </div>
    </div>
  );
}

// ==================== Exempt Manager Modal ====================
function ExemptModal({
  exceptions,
  personnel,
  initialDate,
  onSave,
  onClose,
}: {
  exceptions: ExceptionEntry[];
  personnel: Personnel[];
  initialDate?: string;
  onSave: (entries: ExceptionEntry[]) => Promise<void>;
  onClose: () => void;
}) {
  const [list, setList] = useState<ExceptionEntry[]>(exceptions);
  const [form, setForm] = useState({
    personnelId: '',
    reason: 'ป่วย' as ExceptionEntry['reason'],
    startDate: initialDate || format(new Date(), 'yyyy-MM-dd'),
    endDate: initialDate || format(new Date(), 'yyyy-MM-dd'),
  });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const personnelMap = Object.fromEntries(personnel.map(p => [p.id, p]));

  const REASON_LABELS: Record<ExceptionEntry['reason'], { label: string; color: string }> = {
    'ผู้ช่วยสิบเวร': { label: 'ผช.สิบเวร', color: '#f59e0b' },
    'ป่วย': { label: 'ป่วย', color: '#ef4444' },
    'ธุระการ': { label: 'ธุระการ', color: '#3b82f6' },
    'งดเวร': { label: 'งดเวร', color: '#10b981' },
  };

  const handleAdd = () => {
    if (!form.personnelId) return;
    const start = parseISO(form.startDate);
    const end = parseISO(form.endDate);
    const days = eachDayOfInterval({ start, end });
    const newEntries = days.map(d => ({
      ...form,
      startDate: format(d, 'yyyy-MM-dd'),
      endDate: format(d, 'yyyy-MM-dd')
    }));

    setList(prev => [...prev, ...newEntries]);
    setForm({ personnelId: '', reason: 'ป่วย', startDate: initialDate || format(new Date(), 'yyyy-MM-dd'), endDate: initialDate || format(new Date(), 'yyyy-MM-dd') });
    setShowForm(false);
  };

  const handleRemove = (idx: number) => setList(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    await onSave(list);
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxHeight: '90vh' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, color: '#a855f7' }}>
              <StarIcon fontSize="small" /> รายชื่อผู้ยกเว้นเวร
            </h2>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>กำหนด ป่วย, ธุระการ, งดเวร</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <button
          className={`btn btn-sm w-full ${showForm ? 'btn-ghost' : 'btn-primary'}`}
          onClick={() => setShowForm(v => !v)}
          style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          {showForm ? <><CloseIcon fontSize="small" /> ยกเลิก</> : <><AddIcon fontSize="small" /> เพิ่มรายการ</>}
        </button>

        {showForm && (
          <div style={{ background: 'var(--color-surface-2)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>ชื่อทหาร</label>
                <SearchablePersonnelSelect personnel={personnel} value={form.personnelId} onChange={v => setForm(f => ({ ...f, personnelId: v }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>ประเภท</label>
                <select className="select" style={{ width: '100%' }} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value as ExceptionEntry['reason'] }))}>
                  <option value="ป่วย">ป่วย</option>
                  <option value="ธุระการ">ธุระการ</option>
                  <option value="งดเวร">งดเวร (เฉพาะวัน)</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>วันที่เริ่ม</label>
                  <input type="date" className="select" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>วันที่สิ้นสุด</label>
                  <input type="date" className="select" value={form.endDate} min={form.startDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                disabled={!form.personnelId}
                onClick={handleAdd}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                <AddIcon fontSize="small" /> เพิ่ม
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
          {(() => {
            const visibleList = list.map((entry, idx) => ({ entry, idx }))
              .filter(({ entry }) => entry.reason !== 'ผู้ช่วยสิบเวร' && (!initialDate || (entry.startDate <= initialDate && entry.endDate >= initialDate)));
            if (visibleList.length === 0) {
              return <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: 13 }}>ไม่มีรายการ</div>;
            }
            return visibleList.map(({ entry, idx }) => {
              const p = personnelMap[entry.personnelId];
              const ri = REASON_LABELS[entry.reason];
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--color-surface-2)', borderRadius: 8, borderLeft: `3px solid ${ri.color}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p ? `${p.rank}${p.firstName} ${p.lastName}` : entry.personnelId}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{entry.startDate} ถึง {entry.endDate}</div>
                  </div>
                  <span style={{ fontSize: 10, background: ri.color + '22', color: ri.color, padding: '2px 6px', borderRadius: 99, fontWeight: 700 }}>{ri.label}</span>
                  <button onClick={() => handleRemove(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    <DeleteIcon fontSize="small" />
                  </button>
                </div>
              );
            });
          })()}
        </div>

        <button
          className="btn btn-primary w-full mt-4"
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          {saving ? '...' : <><SaveIcon fontSize="small" /> บันทึก</>}
        </button>
      </div>
    </div>
  );
}

// ==================== Day Detail Modal ====================
function DayDetailModal({
  date, shift, personnel, exceptions, punishments, onClose, onSave, onOpenPunishment, onOpenException, onOpenExempt, shiftsMap,
}: {
  date: string;
  shift: DutyShift | null;
  personnel: Personnel[];
  exceptions: ExceptionEntry[];
  punishments: PunishmentEntry[];
  onClose: () => void;
  onSave: (shift: DutyShift) => Promise<void>;
  onOpenPunishment: () => void;
  onOpenException: () => void;
  onOpenExempt: () => void;
  shiftsMap: Record<string, DutyShift>;
}) {
  const personnelMap = Object.fromEntries(personnel.map(p => [p.id, p]));
  const [slots, setSlots] = useState<string[]>(
    shift
      ? shift.timeSlots.sort((a, b) => a.order - b.order).map(s => s.personnelId)
      : Array(6).fill('')
  );
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const currentShift = isToday(parseISO(date)) ? getCurrentShift() : -1;
  const dateDisplay = format(parseISO(date), 'd MMMM yyyy', { locale: th });

  // Get daily assistants for this date
  const dailyAssistants = exceptions
    .filter(e => e.reason === 'ผู้ช่วยสิบเวร' && e.startDate <= date && e.endDate >= date)
    .map(e => personnelMap[e.personnelId])
    .filter(Boolean);

  // Get daily exceptions (ป่วย, ธุระการ, งดเวร) for this date
  const dailyExceptions = exceptions
    .filter(e => e.reason !== 'ผู้ช่วยสิบเวร' && e.startDate <= date && e.endDate >= date)
    .map(e => {
      const p = personnelMap[e.personnelId];
      return p ? { p, reason: e.reason } : null;
    })
    .filter(Boolean);

  // Get punishments for this date  
  const todayPunishments = punishments.filter(p => p.startDate <= date && p.endDate >= date);

  const handleAutoFill = () => {
    const punishedIds = Array.from(new Set(todayPunishments.map(p => p.personnelId)));

    const available = personnel
      .filter(p => p.rank.includes('พลฯ'))
      .filter(p => isPersonnelAvailable(p, date, exceptions))
      .sort((a, b) => (a.num || 0) - (b.num || 0));

    const availableNotPunished = available.filter(p => !punishedIds.includes(p.id));

    const newSlots = Array(6).fill('');

    let pIdx = 0;
    for (let i = 5; i >= 0 && pIdx < punishedIds.length; i--) {
      newSlots[i] = punishedIds[pIdx];
      pIdx++;
    }

    // Calculate pointer by counting regular assignments in this month up to yesterday
    const targetDate = parseISO(date);
    const firstDay = startOfMonth(targetDate);
    const endDay = subDays(targetDate, 1);
    // Find last regular assigned person before this date
    let lastAssignedId = '';
    const pastDates = Object.keys(shiftsMap).filter(d => d < date).sort().reverse();
    for (const d of pastDates) {
      const shift = shiftsMap[d];
      const sortedSlots = [...shift.timeSlots].sort((a, b) => b.order - a.order);
      const lastSlot = sortedSlots.find(s => s.personnelId && !s.isPunishment);
      if (lastSlot) {
        lastAssignedId = lastSlot.personnelId;
        break;
      }
    }

    let aIdx = 0;
    if (lastAssignedId) {
      const idx = availableNotPunished.findIndex(p => p.id === lastAssignedId);
      if (idx !== -1) aIdx = idx + 1;
      else {
        const lastPerson = personnel.find(p => p.id === lastAssignedId);
        if (lastPerson) {
          const nextIdx = availableNotPunished.findIndex(p => (p.num || 0) > (lastPerson.num || 0));
          aIdx = nextIdx !== -1 ? nextIdx : 0;
        }
      }
    }

    for (let i = 0; i < 6; i++) {
      if (newSlots[i] === '') {
        if (availableNotPunished.length > 0) {
          newSlots[i] = availableNotPunished[aIdx % availableNotPunished.length].id;
          aIdx++;
        }
      }
    }
    setSlots(newSlots);
  };

  const handleSave = async () => {
    setSaving(true);
    const punishedIds = Array.from(new Set(todayPunishments.map(p => p.personnelId)));
    const newShift = buildShift(date, slots, punishedIds);
    await onSave(newShift);
    setSaving(false);
  };

  const handleCopy = () => {
    try {
      const tempPunishedIds = Array.from(new Set(todayPunishments.map(p => p.personnelId)));
      const tempShift = buildShift(date, slots, tempPunishedIds);
      const text = formatCopyText(date, tempShift, personnelMap, exceptions);
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
              <SecurityIcon fontSize="small" /> ตารางเวร
            </h2>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{dateDisplay}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onOpenPunishment}
              style={{ padding: '0 8px', display: 'flex', alignItems: 'center', gap: 3 }}
              title="จัดการดองเวร"
            >
              <BlockIcon style={{ fontSize: 16, color: '#ef4444' }} />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onOpenException}
              style={{ padding: '0 8px', display: 'flex', alignItems: 'center', gap: 3 }}
              title="ผู้ช่วยสิบเวร"
            >
              <StarIcon style={{ fontSize: 16, color: '#f59e0b' }} />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onOpenExempt}
              style={{ padding: '0 8px', display: 'flex', alignItems: 'center', gap: 3 }}
              title="ยกเว้นเวร"
            >
              <StarIcon style={{ fontSize: 16, color: '#a855f7' }} />
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginLeft: 8 }}>
              <CloseIcon fontSize="small" />
            </button>
          </div>
        </div>

        {/* Daily Assistants banner */}
        {dailyAssistants.length > 0 && (
          <div style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarIcon style={{ fontSize: 14, color: '#f59e0b' }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>ผู้ช่วยสิบเวรประจำวัน</div>
              <div style={{ fontSize: 12 }}>{dailyAssistants.map(p => `${p!.rank}${p!.firstName} ${p!.lastName}`).join(', ')}</div>
            </div>
          </div>
        )}

        {/* Daily Exceptions banner */}
        {/* {dailyExceptions.length > 0 && (
          <div style={{ padding: '8px 12px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarIcon style={{ fontSize: 14, color: '#a855f7' }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#a855f7' }}>รายชื่อผู้ยกเว้นเวร (ป่วย, ธุระการ, งดเวร)</div>
              <div style={{ fontSize: 12 }}>{dailyExceptions.map(item => `${item!.p.rank}${item!.p.firstName} ${item!.p.lastName} (${item!.reason})`).join(', ')}</div>
            </div>
          </div>
        )} */}

        {/* Punishment warning */}
        {/* {todayPunishments.length > 0 && (
          <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
              <BlockIcon style={{ fontSize: 13 }} /> มีดองเวร {todayPunishments.length} ราย
            </div>
            {todayPunishments.map((pm, idx) => {
              const p = personnelMap[pm.personnelId];
              return (
                <div key={idx} style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  - {p ? `${p.rank}${p.firstName}` : pm.personnelId}
                </div>
              );
            })}
          </div>
        )} */}

        {/* Auto fill */}
        <button
          className="btn btn-ghost btn-sm w-full"
          onClick={handleAutoFill}
          style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          <BoltIcon fontSize="small" /> จัดเวรอัตโนมัติ (พร้อมดองเวร)
        </button>

        {/* Shift slots */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SHIFT_TIMES.map((st, i) => {
            const isCurrent = (i + 1) === currentShift;
            const isPunished = todayPunishments.some(p => p.personnelId === slots[i]);
            return (
              <div
                key={st.shift}
                style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr',
                  alignItems: 'center', gap: 10,
                  padding: '7px 10px', borderRadius: 10,
                  background: isCurrent ? 'rgba(59,130,246,0.12)' : isPunished ? 'rgba(239,68,68,0.06)' : 'var(--color-surface-2)',
                  border: `1px solid ${isCurrent ? 'rgba(59,130,246,0.4)' : isPunished ? 'rgba(239,68,68,0.3)' : SHIFT_COLORS[i] + '33'}`,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: SHIFT_COLORS[i] }}>ผลัด {i + 1}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{st.start}–{st.end}</div>
                  {isCurrent && <span style={{ fontSize: 9, background: 'var(--color-primary)', color: 'white', padding: '1px 4px', borderRadius: 99, fontWeight: 700 }}>ปัจจุบัน</span>}
                  {isPunished && <span style={{ fontSize: 9, background: '#ef4444', color: 'white', padding: '1px 4px', borderRadius: 99, fontWeight: 700 }}>ดอง</span>}
                </div>
                <SearchablePersonnelSelect
                  personnel={personnel}
                  value={slots[i]}
                  onChange={v => setSlots(prev => prev.map((val, idx) => idx === i ? v : val))}
                />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            className={`btn btn-sm ${copied ? 'btn-success' : 'btn-ghost'}`}
            onClick={handleCopy}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            {copied ? <><CheckIcon fontSize="small" /> คัดลอกแล้ว</> : <><ContentCopyIcon fontSize="small" /> คัดลอก</>}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            {saving ? '...' : <><SaveIcon fontSize="small" /> บันทึก</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== Month Calendar ====================
function MonthCalendar({
  viewDate, shiftsMap, personnelMap, exceptions, punishments, onSelectDay, onPrev, onNext,
}: {
  viewDate: Date;
  shiftsMap: Record<string, DutyShift>;
  personnelMap: Record<string, Personnel>;
  exceptions: ExceptionEntry[];
  punishments: PunishmentEntry[];
  onSelectDay: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const firstDay = startOfMonth(viewDate);
  const lastDay = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });
  const startPad = getDay(firstDay);
  const touchStartX = useRef(0);
  const [swiping, setSwiping] = useState(false);

  const weekDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const monthDisplay = format(viewDate, 'MMMM yyyy', { locale: th });
  const thaiYear = viewDate.getFullYear() + 543;

  return (
    <div
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX; setSwiping(false); }}
      onTouchMove={e => { if (Math.abs(touchStartX.current - e.touches[0].clientX) > 30) setSwiping(true); }}
      onTouchEnd={e => {
        if (!swiping) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (diff > 60) onNext();
        else if (diff < -60) onPrev();
        setSwiping(false);
      }}
    >
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <button className="btn-icon btn-sm" onClick={onPrev} style={{ width: 34, height: 34 }}>
          <ChevronLeftIcon fontSize="small" />
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{monthDisplay}</div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>พ.ศ. {thaiYear}</div>
        </div>
        <button className="btn-icon btn-sm" onClick={onNext} style={{ width: 34, height: 34 }}>
          <ChevronRightIcon fontSize="small" />
        </button>
      </div>

      {/* Calendar */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--color-border)' }}>
          {weekDays.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', padding: '6px 0', fontSize: 11, color: i === 0 ? '#ef4444' : i === 6 ? '#60a5fa' : 'var(--color-text-muted)', fontWeight: 600 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {Array.from({ length: startPad }).map((_, i) => <div key={`p-${i}`} style={{ minHeight: 68 }} />)}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const shift = shiftsMap[dateStr];
            const todayClass = isToday(day);
            const dow = getDay(day);

            // Badges for this day
            const hasAssistant = exceptions.some(e => e.reason === 'ผู้ช่วยสิบเวร' && e.startDate <= dateStr && e.endDate >= dateStr);
            const hasPunishment = punishments.some(p => p.startDate <= dateStr && p.endDate >= dateStr);

            const previews = shift
              ? shift.timeSlots
                .sort((a, b) => a.order - b.order)
                .slice(0, 3)
                .map(s => {
                  const p = personnelMap[s.personnelId];
                  return p ? p.firstName.substring(0, 5) : (s.personnelId ? s.personnelId.substring(0, 5) : null);
                })
                .filter(Boolean)
              : [];

            const filledCount = shift ? shift.timeSlots.filter(s => s.personnelId).length : 0;

            return (
              <button
                key={dateStr}
                onClick={() => onSelectDay(dateStr)}
                style={{
                  minHeight: 68, border: 'none', background: 'transparent', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  padding: '3px 3px', fontFamily: 'inherit',
                  borderTop: '1px solid var(--color-border)',
                  borderLeft: dow !== 0 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', marginBottom: 2 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: todayClass ? 700 : 400,
                    background: todayClass ? 'var(--color-primary)' : 'transparent',
                    color: todayClass ? 'white' : dow === 0 ? '#ef4444' : dow === 6 ? '#60a5fa' : 'var(--color-text-primary)',
                    flexShrink: 0,
                  }}>
                    {format(day, 'd')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {hasAssistant && <div style={{ fontSize: 8, color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center' }}><StarIcon style={{ fontSize: 9, marginRight: 1 }} /> ผู้ช่วย</div>}
                    {hasPunishment && <div style={{ fontSize: 8, color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center' }}><BlockIcon style={{ fontSize: 9, marginRight: 1 }} /> ดองเวร</div>}
                  </div>
                </div>
                {previews.length > 0 ? (
                  <div style={{ width: '100%' }}>
                    {previews.map((name, i) => (
                      <div key={i} style={{
                        fontSize: 8, color: 'var(--color-text-secondary)',
                        borderLeft: `2px solid ${SHIFT_COLORS[i]}`,
                        paddingLeft: 2, marginBottom: 1, lineHeight: 1.4,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {name}
                      </div>
                    ))}
                    {filledCount > 3 && (
                      <div style={{ fontSize: 8, color: 'var(--color-text-muted)', paddingLeft: 3 }}>+{filledCount - 3}</div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 8, color: 'var(--color-border-light)', paddingLeft: 3 }}>—</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        {SHIFT_TIMES.map((st, i) => (
          <div key={st.shift} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--color-text-muted)' }}>
            <div style={{ width: 6, height: 6, borderRadius: 1, background: SHIFT_COLORS[i] }} />
            ผลัด {i + 1}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--color-text-muted)' }}>
            <BlockIcon style={{ fontSize: 10, color: '#ef4444' }} /> ดองเวร
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--color-text-muted)' }}>
            <StarIcon style={{ fontSize: 10, color: '#f59e0b' }} /> ผู้ช่วยสิบเวร
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== Main Page ====================
export default function DutyPage() {
  const [viewDate, setViewDate] = useState(new Date());
  const [shiftsMap, setShiftsMap] = useState<Record<string, DutyShift>>({});
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [punishments, setPunishments] = useState<PunishmentEntry[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showPunishment, setShowPunishment] = useState(false);
  const [showException, setShowException] = useState(false);
  const [showExempt, setShowExempt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast, show: showToast } = useToast();

  const monthKey = format(viewDate, 'yyyy-MM');
  const personnelMap = Object.fromEntries(personnel.map(p => [p.id, p]));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, dRes, metaRes] = await Promise.all([
        fetch('/api/personnel'),
        fetch('/api/duty'),
        fetch('/api/duty-meta'),
      ]);
      const pData = await pRes.json();
      const dData = await dRes.json();
      const metaData = await metaRes.json();

      setPersonnel(pData.personnel || []);
      setPunishments(metaData.punishments || []);
      setExceptions(metaData.exceptions || []);

      const map: Record<string, DutyShift> = {};
      (dData.shifts || []).forEach((s: { date: string; shift: DutyShift }) => {
        map[s.date] = s.shift; // Store all shifts so we can check history
      });
      setShiftsMap(map);
    } catch {
      showToast('โหลดข้อมูลไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveDay = async (shift: DutyShift) => {
    await fetch('/api/duty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shift }),
    });
    setShiftsMap(prev => ({ ...prev, [shift.date]: shift }));
    showToast('บันทึกตารางเวรสำเร็จ');
    setSelectedDate(null);
  };

  const handleSavePunishments = async (entries: PunishmentEntry[]) => {
    await fetch('/api/duty-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'punishment', data: entries }),
    });
    setPunishments(entries);
    showToast('บันทึกรายการดองเวรสำเร็จ');
  };

  const handleSaveExceptions = async (entries: ExceptionEntry[]) => {
    await fetch('/api/duty-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'exception', data: entries }),
    });
    setExceptions(entries);
    showToast('บันทึกรายการยกเว้นสำเร็จ');
  };

  // Auto-generate full month with punishment support
  const handleGenerateMonth = async () => {
    if (!confirm(`สร้างตารางเวรทั้งเดือน ${format(viewDate, 'MMMM yyyy', { locale: th })} อัตโนมัติ?\n(จะเขียนทับข้อมูลเดิม)`)) return;
    setGenerating(true);
    try {
      const firstDay = startOfMonth(viewDate);
      const lastDay = endOfMonth(viewDate);
      const days = eachDayOfInterval({ start: firstDay, end: lastDay });

      const allPersonnel = [...personnel]
        .filter(p => p.rank.includes('พลฯ'))
        .sort((a, b) => (a.num || 0) - (b.num || 0));

      const newMap: Record<string, DutyShift> = {};

      let lastAssignedId = '';
      const firstDateStr = format(firstDay, 'yyyy-MM-dd');
      const pastDates = Object.keys(shiftsMap).filter(d => d < firstDateStr).sort().reverse();
      for (const d of pastDates) {
        const shift = shiftsMap[d];
        const sortedSlots = [...shift.timeSlots].sort((a, b) => b.order - a.order);
        const lastSlot = sortedSlots.find(s => s.personnelId && !s.isPunishment);
        if (lastSlot) {
          lastAssignedId = lastSlot.personnelId;
          break;
        }
      }

      for (const day of days) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const todayPunishments = punishments.filter(p => p.startDate <= dateStr && p.endDate >= dateStr);
        const punishedIds = Array.from(new Set(todayPunishments.map(p => p.personnelId)));

        const available = allPersonnel
          .filter(p => isPersonnelAvailable(p, dateStr, exceptions))
          .filter(p => !punishedIds.includes(p.id));

        const ids: string[] = Array(6).fill('');

        // 1. Assign punishments from shift 6 down to 1
        let pIdx = 0;
        for (let i = 5; i >= 0 && pIdx < punishedIds.length; i--) {
          ids[i] = punishedIds[pIdx];
          pIdx++;
        }

        // 2. Fill remaining slots from shift 1 up to 6 with regular available people
        let pointer = 0;
        if (lastAssignedId) {
          const idx = available.findIndex(p => p.id === lastAssignedId);
          if (idx !== -1) pointer = idx + 1;
          else {
            const lastPerson = allPersonnel.find(p => p.id === lastAssignedId);
            if (lastPerson) {
              const nextIdx = available.findIndex(p => (p.num || 0) > (lastPerson.num || 0));
              pointer = nextIdx !== -1 ? nextIdx : 0;
            }
          }
        }

        for (let i = 0; i < 6; i++) {
          if (ids[i] === '') {
            if (available.length > 0) {
              const assignedP = available[pointer % available.length];
              ids[i] = assignedP.id;
              lastAssignedId = assignedP.id;
              pointer++;
            }
          }
        }

        const shift = buildShift(dateStr, ids, punishedIds);
        newMap[dateStr] = shift;

        await fetch('/api/duty', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shift }),
        });
      }

      setShiftsMap(prev => ({ ...prev, ...newMap }));
      showToast(`สร้างเวรทั้งเดือนสำเร็จ! ${days.length} วัน`);
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const selectedShift = selectedDate ? shiftsMap[selectedDate] || null : null;

  return (
    <div style={{ paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 16px)' }}>
      <Toast toast={toast} />

      {/* Header */}
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
            <AccessTimeIcon fontSize="small" /> จัดตารางเวร
          </h1>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{LOCATION}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleGenerateMonth}
            disabled={generating || loading}
            style={{ display: 'flex', alignItems: 'center', gap: 3 }}
          >
            {generating ? '...' : <><BoltIcon fontSize="small" /> ออโต้</>}
          </button>
        </div>
      </div>

      {/* Badge summary */}
      {(punishments.length > 0 || exceptions.length > 0) && (
        <div style={{ display: 'flex', gap: 8, padding: '6px 16px', background: 'var(--color-surface)' }}>
          {punishments.length > 0 && (
            <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444' }}>
              <BlockIcon style={{ fontSize: 12 }} /> ดองเวร {punishments.length} ราย
            </div>
          )}
          {exceptions.length > 0 && (
            <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b' }}>
              <StarIcon style={{ fontSize: 12 }} /> ยกเว้น {exceptions.length} ราย
            </div>
          )}
        </div>
      )}

      <div className="content-area">
        {loading ? (
          <div className="skeleton" style={{ height: 420, borderRadius: 12 }} />
        ) : (
          <MonthCalendar
            viewDate={viewDate}
            shiftsMap={shiftsMap}
            personnelMap={personnelMap}
            exceptions={exceptions}
            punishments={punishments}
            onSelectDay={setSelectedDate}
            onPrev={() => setViewDate(d => subMonths(d, 1))}
            onNext={() => setViewDate(d => addMonths(d, 1))}
          />
        )}
      </div>

      {/* Modals */}
      {selectedDate && (
        <DayDetailModal
          date={selectedDate}
          shift={selectedShift}
          personnel={personnel}
          exceptions={exceptions}
          punishments={punishments}
          onClose={() => setSelectedDate(null)}
          onSave={handleSaveDay}
          onOpenPunishment={() => setShowPunishment(true)}
          onOpenException={() => setShowException(true)}
          onOpenExempt={() => setShowExempt(true)}
          shiftsMap={shiftsMap}
        />
      )}
      {showPunishment && (
        <PunishmentModal
          punishments={punishments}
          personnel={personnel}
          initialDate={selectedDate || undefined}
          onSave={handleSavePunishments}
          onClose={() => setShowPunishment(false)}
        />
      )}
      {showException && (
        <ExceptionModal
          exceptions={exceptions}
          personnel={personnel}
          initialDate={selectedDate || undefined}
          onSave={handleSaveExceptions}
          onClose={() => setShowException(false)}
        />
      )}
      {showExempt && (
        <ExemptModal
          exceptions={exceptions}
          personnel={personnel}
          initialDate={selectedDate || undefined}
          onSave={handleSaveExceptions}
          onClose={() => setShowExempt(false)}
        />
      )}
    </div>
  );
}
