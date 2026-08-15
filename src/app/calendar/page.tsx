'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import type { Personnel, NCODuty, DutyShift, KanbanTask } from '@/types';
import { useToast } from '@/hooks/useToast';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import BoltIcon from '@mui/icons-material/Bolt';
import SaveIcon from '@mui/icons-material/Save';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CloseIcon from '@mui/icons-material/Close';

type Tab = 'calendar' | 'nco' | 'tasks';

interface DailyRecord {
  date: string;
  totalCompany: number;
  totalDistributed: number;
  remaining: number;
}

// ==================== Day Detail Modal (Duty) ====================
function DayDetailModal({
  date, ncoPersonnel, shift, personnelMap, onClose,
}: {
  date: Date;
  ncoPersonnel: Personnel | null;
  shift: DutyShift | null;
  personnelMap: Record<string, Personnel>;
  onClose: () => void;
}) {
  const dateStr = format(date, 'd MMMM yyyy', { locale: th });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}><CalendarMonthIcon fontSize="small" /> {dateStr}</h2>

        {/* NCO */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--color-warning-light)', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 2 }}><PersonIcon style={{ fontSize: 14 }} /> สิบเวร</div>
          {ncoPersonnel ? (
            <div style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', fontSize: 14 }}>
              {ncoPersonnel.rank}{ncoPersonnel.firstName} {ncoPersonnel.lastName}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>ยังไม่ได้กำหนด</div>
          )}
        </div>

        {/* Duty Shifts */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-danger-light)', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 2 }}><SecurityIcon style={{ fontSize: 14 }} /> เวรยาม</div>
          {shift ? (
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>{shift.location}</div>
              {shift.timeSlots.slice().sort((a, b) => a.order - b.order).map((slot, i) => {
                const p = personnelMap[slot.personnelId];
                return (
                  <div key={slot.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 24 }}>{i + 1}.</span>
                    <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', minWidth: 90 }}>{slot.start}–{slot.end}</span>
                    <span style={{ fontSize: 13 }}>{p ? `${p.rank}${p.firstName} ${p.lastName}` : '—'}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>ยังไม่ได้จัดเวร</div>
          )}
        </div>

        <button className="btn btn-ghost w-full mt-4" onClick={onClose}>ปิด</button>
      </div>
    </div>
  );
}

// ==================== Task Record Modal ====================
function TaskRecordModal({ date, onClose }: { date: Date; onClose: () => void }) {
  const dateKey = format(date, 'yyyy-MM-dd');
  const dateStr = format(date, 'd MMMM yyyy', { locale: th });
  const [record, setRecord] = useState<{ totalCompany: number; totalDistributed: number; remaining: number; tasks: KanbanTask[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/records?date=${dateKey}`)
      .then(r => r.json())
      .then(d => { setRecord(d.record || null); })
      .finally(() => setLoading(false));
  }, [dateKey]);

  const getTaskTotal = (t: KanbanTask) => (Number(t.countSenior) || 0) + (Number(t.countJunior) || 0) + (Number(t.count) || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 4 }}>
            <AssignmentIcon fontSize="small" /> ยอดงาน {dateStr}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)' }}>กำลังโหลด...</div>
        ) : !record ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)' }}>
            <AssignmentIcon style={{ fontSize: 40, opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
            ไม่มีข้อมูลยอดงานวันนี้
          </div>
        ) : (
          <>
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'ยอดรวม', value: record.totalCompany, color: 'var(--color-text-primary)' },
                { label: 'จ่ายแล้ว', value: record.totalDistributed, color: 'var(--color-primary-light)' },
                { label: 'คงเหลือ', value: record.remaining, color: record.remaining < 0 ? '#ef4444' : '#10b981' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--color-surface-2)', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Task list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {record.tasks.filter(t => getTaskTotal(t) > 0).map((t, idx) => {
                const s = Number(t.countSenior) || 0;
                const j = Number(t.countJunior) || 0;
                const total = getTaskTotal(t);
                return (
                  <div key={`${t.id}-${idx}`} style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', background: 'var(--color-surface-2)', borderRadius: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                      {t.location && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t.location}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary-light)' }}>{total}</div>
                      {(s > 0 || j > 0) && (
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                          {s > 0 && <span style={{ color: 'var(--color-primary-light)' }}>พี่ {s} </span>}
                          {j > 0 && <span style={{ color: 'var(--color-accent-light)' }}>น้อง {j}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ==================== NCO Select Modal ====================
function NCOSelectModal({
  date, currentNCOId, personnel, onSave, onClose,
}: {
  date: Date;
  currentNCOId: string | null;
  personnel: Personnel[];
  onSave: (personnelId: string) => void;
  onClose: () => void;
}) {
  const dateStr = format(date, 'd MMMM yyyy', { locale: th });
  const eligiblePersonnel = personnel.filter(p => p.isNCOEligible);

  const [selectedId, setSelectedId] = useState(currentNCOId || '');

  const handleSave = () => {
    onSave(selectedId);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
          <PersonIcon fontSize="small" /> เลือกสิบเวรประจำวัน
        </h2>
        <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
          วันที่ {dateStr}
        </div>

        <select
          className="select w-full"
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          style={{ padding: '12px', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 24 }}
        >
          <option value="">-- ไม่จัดสิบเวร --</option>
          {eligiblePersonnel.map(p => (
            <option key={p.id} value={p.id}>{p.rank}{p.firstName} {p.lastName}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost w-full" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary w-full" onClick={handleSave}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}

// ==================== Month Calendar ====================
function MonthCalendar({
  year, month, ncoByDate, shiftByDate, recordDates, mode, personnelMap, onSelectDay,
}: {
  year: number;
  month: number;
  ncoByDate: Record<string, string>;
  shiftByDate: Record<string, boolean>;
  recordDates: Record<string, boolean>;
  mode: 'duty' | 'tasks' | 'nco';
  personnelMap?: Record<string, Personnel>;
  onSelectDay: (date: Date) => void;
}) {
  const firstDay = startOfMonth(new Date(year, month - 1));
  const lastDay = endOfMonth(firstDay);
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });
  const startPad = getDay(firstDay);

  const weekDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--color-border)' }}>
        {weekDays.map(d => (
          <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const hasNCO = !!ncoByDate[dateStr];
          const hasDuty = !!shiftByDate[dateStr];
          const hasRecord = !!recordDates[dateStr];
          const todayClass = isToday(day);

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDay(day)}
              style={{
                padding: '8px 2px 6px', border: 'none', background: 'transparent',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                minHeight: 56, fontFamily: 'inherit',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: todayClass ? 700 : 400,
                background: todayClass ? 'var(--color-primary)' : 'transparent',
                color: todayClass ? 'white' : 'var(--color-text-primary)',
              }}>
                {format(day, 'd')}
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                {mode === 'duty' && hasDuty && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444' }} />}
                {mode === 'duty' && hasNCO  && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b' }} />}
                {mode === 'tasks' && hasRecord && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6' }} />}
              </div>
              {mode === 'nco' && hasNCO && personnelMap && (
                <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600, marginTop: 2, textAlign: 'center', lineHeight: 1.1 }}>
                  {personnelMap[ncoByDate[dateStr]]?.firstName || 'สิบเวร'}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==================== NCO Monthly Table ====================
function NCOMonthlyTable({
  year, month, duties, personnel, onSave, saving,
}: {
  year: number; month: number;
  duties: NCODuty[];
  personnel: Personnel[];
  onSave: (duties: NCODuty[]) => void;
  saving: boolean;
}) {
  const firstDay = startOfMonth(new Date(year, month - 1));
  const lastDay = endOfMonth(firstDay);
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });

  const eligiblePersonnel = personnel.filter(p => p.isNCOEligible);
  const [localDuties, setLocalDuties] = useState<NCODuty[]>(duties);

  useEffect(() => { setLocalDuties(duties); }, [duties]);

  const getDutyForDate = (dateStr: string) =>
    localDuties.find(d => d.date === dateStr);

  const handleChange = (dateStr: string, personnelId: string) => {
    setLocalDuties(prev => {
      const existing = prev.find(d => d.date === dateStr);
      if (personnelId === '') return prev.filter(d => d.date !== dateStr);
      if (existing) return prev.map(d => d.date === dateStr ? { ...d, personnelId } : d);
      return [...prev, { id: crypto.randomUUID(), date: dateStr, personnelId }];
    });
  };

  const handleAutoFill = () => {
    if (eligiblePersonnel.length === 0) return;
    const newDuties = days.map((day, i) => ({
      id: crypto.randomUUID(),
      date: format(day, 'yyyy-MM-dd'),
      personnelId: eligiblePersonnel[i % eligiblePersonnel.length].id,
    }));
    setLocalDuties(newDuties);
  };

  const monthDisplay = format(firstDay, 'MMMM yyyy', { locale: th });

  return (
    <div>
      <div className="flex-between mb-3">
        <h3 style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}><PersonIcon fontSize="small" /> ตารางสิบเวร {monthDisplay}</h3>
        <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 2 }} onClick={handleAutoFill} disabled={eligiblePersonnel.length === 0}>
          <BoltIcon fontSize="small" /> ออโต้
        </button>
      </div>

      {eligiblePersonnel.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontSize: 13 }}>
          ยังไม่มีรายชื่อสิบเวร<br />
          <span style={{ fontSize: 12 }}>ไปที่ กำลังพล → แก้ไข → เปิด "สามารถเป็นสิบเวร"</span>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const duty = getDutyForDate(dateStr);
              const dayLabel = format(day, 'd EEE', { locale: th });
              const todayClass = isToday(day);

              return (
                <div key={dateStr} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 10px', borderRadius: 8,
                  background: todayClass ? 'rgba(59,130,246,0.1)' : 'var(--color-surface-2)',
                  border: todayClass ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                }}>
                  <div style={{ minWidth: 50, fontSize: 13, color: todayClass ? 'var(--color-primary-light)' : 'var(--color-text-secondary)', fontWeight: todayClass ? 700 : 400 }}>
                    {dayLabel}
                  </div>
                  <select
                    className="select"
                    style={{ flex: 1, height: 36, fontSize: 13 }}
                    value={duty?.personnelId || ''}
                    onChange={e => handleChange(dateStr, e.target.value)}
                  >
                    <option value="">— ยังไม่กำหนด —</option>
                    {eligiblePersonnel.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.rank}{p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <button
            className="btn btn-primary w-full mt-4"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            onClick={() => onSave(localDuties)}
            disabled={saving}
          >
            {saving ? 'กำลังบันทึก...' : <><SaveIcon fontSize="small" /> บันทึกตารางสิบเวร</>}
          </button>
        </>
      )}
    </div>
  );
}

// ==================== Main Calendar Page ====================
export default function CalendarPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [tab, setTab] = useState<Tab>('calendar');
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [ncoDuties, setNcoDuties] = useState<NCODuty[]>([]);
  const [dutyShifts, setDutyShifts] = useState<Record<string, DutyShift>>({});
  const [recordDates, setRecordDates] = useState<Record<string, boolean>>({});
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTaskDay, setSelectedTaskDay] = useState<Date | null>(null);
  const [selectedNCODay, setSelectedNCODay] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const monthKey = `${viewYear}-${String(viewMonth).padStart(2, '0')}`;

  const loadData = useCallback(async () => {
    try {
      const [pRes, ncoRes, dutyRes, recRes] = await Promise.allSettled([
        fetch('/api/personnel'),
        fetch(`/api/nco?month=${monthKey}`),
        fetch('/api/duty'),
        fetch('/api/records'),
      ]);

      if (pRes.status === 'fulfilled') {
        const d = await pRes.value.json();
        setPersonnel(d.personnel || []);
      }
      if (ncoRes.status === 'fulfilled') {
        const d = await ncoRes.value.json();
        setNcoDuties(d.duties || []);
      }
      if (dutyRes.status === 'fulfilled') {
        const d = await dutyRes.value.json();
        const map: Record<string, DutyShift> = {};
        (d.shifts || []).forEach((s: any) => {
          const shiftObj = s.shift || s;
          if (shiftObj.date?.startsWith(monthKey)) map[shiftObj.date] = shiftObj;
        });
        setDutyShifts(map);
      }
      if (recRes.status === 'fulfilled') {
        const d = await recRes.value.json();
        const map: Record<string, boolean> = {};
        (d.records || []).forEach((r: DailyRecord) => {
          if (r.date?.startsWith(monthKey)) map[r.date] = true;
        });
        setRecordDates(map);
      }
    } catch {
      console.error('Failed to load calendar data');
    }
  }, [monthKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveNCOModal = async (personnelId: string) => {
    if (!selectedNCODay) return;
    setSaving(true);
    try {
      const dateStr = format(selectedNCODay, 'yyyy-MM-dd');
      let newDuties = [...ncoDuties];
      const idx = newDuties.findIndex(d => d.date === dateStr);
      if (personnelId) {
        if (idx >= 0) newDuties[idx].personnelId = personnelId;
        else newDuties.push({ id: `new-${Date.now()}`, date: dateStr, personnelId });
      } else {
        if (idx >= 0) newDuties.splice(idx, 1);
      }

      await fetch('/api/nco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: monthKey, duties: newDuties }),
      });
      setNcoDuties(newDuties);
      showToast('บันทึกสิบเวรสำเร็จ');
      setSelectedNCODay(null);
    } catch {
      showToast('บันทึกไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };

  const ncoByDate = Object.fromEntries(ncoDuties.map(d => [d.date, d.personnelId]));
  const shiftByDate = Object.fromEntries(Object.keys(dutyShifts).map(k => [k, true]));
  const personnelMap = Object.fromEntries(personnel.map(p => [p.id, p]));

  const monthDisplay = format(new Date(viewYear, viewMonth - 1), 'MMMM yyyy', { locale: th });

  const selectedDateStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : '';
  const selectedNCO = selectedDateStr && ncoByDate[selectedDateStr]
    ? personnelMap[ncoByDate[selectedDateStr]] || null
    : null;
  const selectedShift = selectedDateStr ? dutyShifts[selectedDateStr] || null : null;

  const handleCalendarDayClick = (date: Date) => {
    if (tab === 'tasks') setSelectedTaskDay(date);
    else if (tab === 'nco') setSelectedNCODay(date);
    else setSelectedDay(date);
  };

  return (
    <div className="page-container">

      {/* Header */}
      <div className="page-header">
        <button className="btn-icon btn-sm" onClick={prevMonth} style={{ width: 36, height: 36 }}>‹</button>
        <h1 style={{ fontSize: 15, fontWeight: 700, flex: 1, textAlign: 'center' }}>{monthDisplay}</h1>
        <button className="btn-icon btn-sm" onClick={nextMonth} style={{ width: 36, height: 36 }}>›</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        {([
          { id: 'calendar', label: 'ปฏิทิน', icon: <CalendarMonthIcon fontSize="small" /> },
          { id: 'tasks',    label: 'ยอดงาน', icon: <AssignmentIcon fontSize="small" /> },
          { id: 'nco',      label: 'สิบเวร', icon: <PersonIcon fontSize="small" /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '12px 0', border: 'none', background: 'transparent',
              color: tab === t.id ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
              fontWeight: tab === t.id ? 700 : 400, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
              borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>{t.icon} {t.label}</span>
          </button>
        ))}
      </div>

      <div className="content-area">
        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          {tab !== 'tasks' && <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />เวรยาม
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />สิบเวร
            </div>
          </>}
          {tab === 'tasks' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />มีบันทึกยอดงาน (กดเพื่อดูรายละเอียด)
            </div>
          )}
        </div>

        {(tab === 'calendar' || tab === 'tasks' || tab === 'nco') && (
          <MonthCalendar
            year={viewYear}
            month={viewMonth}
            ncoByDate={ncoByDate}
            shiftByDate={shiftByDate}
            recordDates={recordDates}
            mode={tab === 'nco' ? 'nco' : (tab === 'tasks' ? 'tasks' : 'duty')}
            personnelMap={personnelMap}
            onSelectDay={handleCalendarDayClick}
          />
        )}
      </div>

      {/* Duty Day Modal */}
      {selectedDay && tab === 'calendar' && (
        <DayDetailModal
          date={selectedDay}
          ncoPersonnel={selectedNCO}
          shift={selectedShift}
          personnelMap={personnelMap}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* Task Record Modal */}
      {selectedTaskDay && tab === 'tasks' && (
        <TaskRecordModal
          date={selectedTaskDay}
          onClose={() => setSelectedTaskDay(null)}
        />
      )}

      {/* NCO Select Modal */}
      {selectedNCODay && tab === 'nco' && (
        <NCOSelectModal
          date={selectedNCODay}
          currentNCOId={ncoByDate[format(selectedNCODay, 'yyyy-MM-dd')] || null}
          personnel={personnel}
          onSave={handleSaveNCOModal}
          onClose={() => setSelectedNCODay(null)}
        />
      )}
    </div>
  );
}
