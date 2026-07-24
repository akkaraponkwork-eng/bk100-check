'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import type { Personnel, DutyShift, ShiftSlot } from '@/types';
import { useToast, Toast } from '@/hooks/useToast';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import BoltIcon from '@mui/icons-material/Bolt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SaveIcon from '@mui/icons-material/Save';
import BarChartIcon from '@mui/icons-material/BarChart';

const DEFAULT_TIME_SLOTS = [
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

// ==================== Auto-schedule ====================
function autoSchedule(
  personnel: Personnel[],
  slotCount: number,
  batchMode: 'mixed' | 'batch_only',
  targetBatch?: number,
): string[] {
  let pool = personnel.filter(p => p.status !== 'sick' && p.status !== 'leave');
  if (batchMode === 'batch_only' && targetBatch) {
    pool = pool.filter(p => p.batch === targetBatch);
  }
  // Sort by dutyCount asc, then by name
  pool.sort((a, b) => a.dutyCount - b.dutyCount || `${a.firstName}${a.lastName}`.localeCompare(`${b.firstName}${b.lastName}`));

  const result: string[] = [];
  for (let i = 0; i < slotCount; i++) {
    result.push(pool[i % pool.length]?.id || '');
  }
  return result;
}

export default function DutyPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [location, setLocation] = useState('หน้าคลังอาวุธ');
  const [batchMode, setBatchMode] = useState<'mixed' | 'batch_only'>('mixed');
  const [targetBatch, setTargetBatch] = useState<number>(169);
  const [slots, setSlots] = useState<ShiftSlot[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [batches, setBatches] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingShift, setExistingShift] = useState<DutyShift | null>(null);
  const [showExport, setShowExport] = useState(false);
  const { toast, show: showToast } = useToast();

  // Load personnel
  useEffect(() => {
    fetch('/api/personnel')
      .then(r => r.json())
      .then(data => {
        const list: Personnel[] = data.personnel || [];
        setPersonnel(list);
        const bList = [...new Set(list.map(p => p.batch))].sort((a, b) => a - b);
        setBatches(bList);
        if (bList.length > 0) setTargetBatch(bList[bList.length - 1]); // ผลัดล่าสุด
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load existing shift for date
  useEffect(() => {
    fetch(`/api/duty?date=${date}`)
      .then(r => r.json())
      .then(data => {
        if (data.shift) {
          setExistingShift(data.shift);
          setSlots(data.shift.timeSlots);
          setLocation(data.shift.location);
        } else {
          setExistingShift(null);
          setSlots([]);
        }
      })
      .catch(() => {});
  }, [date]);

  const handleAutoSchedule = () => {
    const assignedIds = autoSchedule(personnel, DEFAULT_TIME_SLOTS.length, batchMode, batchMode === 'batch_only' ? targetBatch : undefined);
    const newSlots: ShiftSlot[] = DEFAULT_TIME_SLOTS.map((t, i) => ({
      id: crypto.randomUUID(),
      start: t.start,
      end: t.end,
      personnelId: assignedIds[i] || '',
      order: i,
    }));
    setSlots(newSlots);
    showToast('จัดเวรอัตโนมัติแล้ว');
  };

  const handleChangeSlotPerson = (slotId: string, personnelId: string) => {
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, personnelId } : s));
  };

  const handleSave = async () => {
    if (slots.length === 0) { showToast('กรุณาจัดเวรก่อน', 'error'); return; }
    setSaving(true);
    try {
      const shift: DutyShift = {
        id: existingShift?.id || crypto.randomUUID(),
        date, location, batchMode,
        targetBatch: batchMode === 'batch_only' ? targetBatch : undefined,
        timeSlots: slots,
      };
      await fetch('/api/duty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift }),
      });

      // Update dutyCount for personnel
      const updatedPersonnel = personnel.map(p => {
        const count = slots.filter(s => s.personnelId === p.id).length;
        return count > 0 ? { ...p, dutyCount: p.dutyCount + count } : p;
      });
      await fetch('/api/personnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personnel: updatedPersonnel }),
      });
      setPersonnel(updatedPersonnel);

      showToast('บันทึกตารางเวรสำเร็จ');
      setExistingShift(shift);
    } catch {
      showToast('บันทึกไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Export text
  const exportText = () => {
    const personnelMap = Object.fromEntries(personnel.map(p => [p.id, p]));
    const dateDisplay = format(parseISO(date), 'd MMM yy', { locale: th });
    const lines: string[] = [`ขออนุญาตแจ้งเวร${location}ประจำวันที่ ${dateDisplay}`];
    slots.sort((a, b) => a.order - b.order).forEach((slot, i) => {
      const p = personnelMap[slot.personnelId];
      const name = p ? `${p.rank}${p.firstName}  ${p.lastName}` : 'ไม่ระบุ';
      lines.push(`${i + 1}.${name}`);
      lines.push(`${slot.start}-${slot.end}`);
    });
    return lines.join('\n');
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(exportText());
    showToast('คัดลอกข้อความเวรแล้ว!');
    setShowExport(false);
  };

  const personnelMap = Object.fromEntries(personnel.map(p => [p.id, p]));
  const currentSlot = getCurrentSlotIndex();
  const dateDisplay = format(parseISO(date), 'd MMMM yyyy', { locale: th });

  return (
    <div className="page-container">
      <Toast toast={toast} />

      <div className="page-header">
        <h1 style={{ fontSize: 16, fontWeight: 700, flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}><AccessTimeIcon /> จัดเวรยาม</h1>
        {slots.length > 0 && (
          <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setShowExport(true)}><AssignmentIcon fontSize="small" /> Copy</button>
        )}
      </div>

      <div className="content-area">
        {/* Date */}
        <div className="form-group">
          <label className="label">วันที่</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{dateDisplay}</div>
        </div>

        {/* Location */}
        <div className="form-group">
          <label className="label">สถานที่</label>
          <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="หน้าคลังอาวุธ" />
        </div>

        {/* Batch Mode */}
        <div className="form-group">
          <label className="label">โหมดผลัด</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn btn-sm ${batchMode === 'mixed' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setBatchMode('mixed')} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}
            ><ShuffleIcon fontSize="small" /> รวมทุกผลัด</button>
            <button
              className={`btn btn-sm ${batchMode === 'batch_only' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setBatchMode('batch_only')} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}
            ><TrackChangesIcon fontSize="small" /> เฉพาะผลัด</button>
          </div>
        </div>

        {batchMode === 'batch_only' && (
          <div className="form-group">
            <label className="label">เลือกผลัด</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {batches.map(b => (
                <button
                  key={b}
                  className={`btn btn-sm ${targetBatch === b ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTargetBatch(b)}
                >ผลัด {b}</button>
              ))}
            </div>
          </div>
        )}

        {/* Auto Schedule Button */}
        <button className="btn btn-success w-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={handleAutoSchedule} disabled={loading}>
          <BoltIcon fontSize="small" /> จัดเวรอัตโนมัติ
        </button>

        {existingShift && (
          <div style={{ fontSize: 12, color: 'var(--color-warning-light)', textAlign: 'center', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <WarningAmberIcon fontSize="small" /> มีตารางเวรวันนี้อยู่แล้ว การบันทึกจะเพิ่ม record ใหม่
          </div>
        )}

        {/* Slots */}
        {slots.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 10 }}>ตารางเวร — {location}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {slots.sort((a, b) => a.order - b.order).map((slot, i) => {
                const p = personnelMap[slot.personnelId];
                const isCurrent = i === currentSlot && date === today;
                return (
                  <div key={slot.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    background: isCurrent ? 'rgba(59,130,246,0.15)' : 'var(--color-surface-2)',
                    border: isCurrent ? '1px solid rgba(59,130,246,0.4)' : '1px solid var(--color-border)',
                  }}>
                    <div style={{ minWidth: 28, width: 28, height: 28, borderRadius: '50%', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--color-primary-light)' }}>
                      {i + 1}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', minWidth: 90 }}>
                      {slot.start}–{slot.end}
                    </div>
                    <select
                      className="select"
                      style={{ flex: 1, height: 36, fontSize: 13 }}
                      value={slot.personnelId}
                      onChange={e => handleChangeSlotPerson(slot.id, e.target.value)}
                    >
                      <option value="">— เลือกชื่อ —</option>
                      {personnel
                        .filter(p => batchMode === 'mixed' || p.batch === targetBatch)
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.rank}{p.firstName} {p.lastName} (เวร {p.dutyCount})
                          </option>
                        ))
                      }
                    </select>
                    {isCurrent && <span style={{ fontSize: 10, background: 'var(--color-primary)', color: 'white', padding: '2px 6px', borderRadius: 99, fontWeight: 700, whiteSpace: 'nowrap' }}>ปัจจุบัน</span>}
                  </div>
                );
              })}
            </div>

            <button className="btn btn-primary w-full mt-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }} onClick={handleSave} disabled={saving}>
              {saving ? 'กำลังบันทึก...' : <><SaveIcon fontSize="small" /> บันทึกตารางเวร</>}
            </button>
          </div>
        )}

        {/* Fairness chart */}
        {personnel.length > 0 && (
          <div className="card mt-4">
            <h3 style={{ fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}><BarChartIcon fontSize="small" /> เวรสะสม (Fairness)</h3>
            {[...personnel]
              .sort((a, b) => b.dutyCount - a.dutyCount)
              .slice(0, 10)
              .map(p => {
                const max = Math.max(...personnel.map(x => x.dutyCount), 1);
                return (
                  <div key={p.id} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{p.rank}{p.firstName} {p.lastName}</span>
                      <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>{p.dutyCount} ครั้ง</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: 'var(--color-surface-2)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(p.dutyCount / max) * 100}%`, background: 'var(--color-primary)', borderRadius: 99, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExport && (
        <div className="modal-overlay" onClick={() => setShowExport(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={{ fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}><AssignmentIcon fontSize="small" /> ข้อความแจ้งเวร</h2>
            <pre style={{
              background: 'var(--color-surface-2)', borderRadius: 10, padding: 16,
              fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-primary)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              border: '1px solid var(--color-border)',
            }}>
              {exportText()}
            </pre>
            <button className="btn btn-primary w-full mt-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }} onClick={handleCopyExport}>
              <AssignmentIcon fontSize="small" /> คัดลอกข้อความ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
