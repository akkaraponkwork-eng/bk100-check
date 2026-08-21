'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns';
import { th } from 'date-fns/locale';
import type { Personnel, NCODuty, DutyShift, KanbanTask, Mission, MissionStatus, ExceptionEntry } from '@/types';
import { MISSION_STATUS_LABELS } from '@/types';
import { useToast } from '@/hooks/useToast';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import BoltIcon from '@mui/icons-material/Bolt';
import SaveIcon from '@mui/icons-material/Save';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PlaceIcon from '@mui/icons-material/Place';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MissionModal from '@/components/calendar/MissionModal';

type Tab = 'calendar' | 'nco' | 'tasks';

interface DailyRecord {
  date: string;
  totalCompany: number;
  totalDistributed: number;
  remaining: number;
}

const CAN_MANAGE_ROLES = ['admin', 'commander', 'duty_officer', 'nco'];

// ==================== Day Detail Modal (Duty + Missions) ====================
function DayDetailModal({
  date,
  ncoPersonnel,
  assistants,
  shift,
  missions,
  personnelMap,
  personnelList,
  userRole,
  onOpenAddMission,
  onOpenEditMission,
  onQuickToggleStatus,
  onClose,
}: {
  date: Date;
  ncoPersonnel: Personnel | null;
  assistants: Personnel[];
  shift: DutyShift | null;
  missions: Mission[];
  personnelMap: Record<string, Personnel>;
  personnelList: Personnel[];
  userRole: string;
  onOpenAddMission: () => void;
  onOpenEditMission: (mission: Mission) => void;
  onQuickToggleStatus: (mission: Mission) => void;
  onClose: () => void;
}) {
  const dateStr = format(date, 'd MMMM yyyy', { locale: th });
  const canManage = CAN_MANAGE_ROLES.includes(userRole);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
            <CalendarMonthIcon fontSize="small" /> {dateStr}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {/* Missions Section */}
        <div style={{ marginBottom: 12, background: 'var(--color-surface-2)', borderRadius: 12, padding: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 13, color: '#8b5cf6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AssignmentIcon style={{ fontSize: 16 }} /> ภารกิจประจำวัน ({missions.length})
            </div>
            {canManage && (
              <button
                className="btn btn-primary btn-sm"
                onClick={onOpenAddMission}
                style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 2, height: 26 }}
              >
                <AddIcon style={{ fontSize: 14 }} /> เพิ่มภารกิจ
              </button>
            )}
          </div>

          {missions.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '10px 0', textAlign: 'center' }}>
              ไม่มีบันทึกภารกิจในวันนี้
              {canManage && (
                <div style={{ marginTop: 4 }}>
                  <button
                    onClick={onOpenAddMission}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary-light)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    + คลิกเพื่อลงภารกิจ
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {missions.map(m => {
                const statusConfig = MISSION_STATUS_LABELS[m.status] || { label: m.status, color: '#6b7280' };
                const timeText = m.startTime ? `${m.startTime}${m.endTime ? ' - ' + m.endTime : ''} น.` : 'ตลอดวัน';
                const assignedCount = m.assignedPersonnelIds?.length || 0;

                return (
                  <div
                    key={m.id}
                    style={{
                      background: 'var(--color-surface)',
                      borderRadius: 8,
                      padding: '8px 10px',
                      border: '1px solid var(--color-border)',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {m.title}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <AccessTimeIcon style={{ fontSize: 12 }} /> {timeText}
                          </span>
                          {m.location && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <PlaceIcon style={{ fontSize: 12 }} /> {m.location}
                            </span>
                          )}
                        </div>

                        {/* Assigned personnel list */}
                        <div style={{ marginTop: 6, fontSize: 11 }}>
                          {assignedCount > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                              <span style={{ color: 'var(--color-text-muted)' }}>กำลังพล ({assignedCount}):</span>
                              {m.assignedPersonnelIds.map(pid => {
                                const p = personnelMap[pid];
                                return (
                                  <span key={pid} style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--color-primary-light)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>
                                    {p ? `${p.rank}${p.firstName} ${p.lastName}` : pid}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>ภารกิจภาพรวมกองร้อย</span>
                          )}
                        </div>
                      </div>

                      {/* Status badge and actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 6,
                            background: `${statusConfig.color}20`,
                            color: statusConfig.color,
                            fontWeight: 600,
                            border: `1px solid ${statusConfig.color}40`,
                          }}
                        >
                          {statusConfig.label}
                        </span>

                        {canManage && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() => onQuickToggleStatus(m)}
                              title={m.status === 'completed' ? 'ทำเครื่องหมายว่ายังไม่เสร็จ' : 'ทำเครื่องหมายว่าเสร็จแล้ว'}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: m.status === 'completed' ? '#10b981' : 'var(--color-text-muted)',
                                cursor: 'pointer',
                                padding: 2,
                              }}
                            >
                              <CheckCircleIcon style={{ fontSize: 16 }} />
                            </button>
                            <button
                              onClick={() => onOpenEditMission(m)}
                              title="แก้ไขภารกิจ"
                              style={{ background: 'transparent', border: 'none', color: 'var(--color-primary-light)', cursor: 'pointer', padding: 2 }}
                            >
                              <EditIcon style={{ fontSize: 15 }} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* NCO */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--color-warning-light)', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <PersonIcon style={{ fontSize: 14 }} /> สิบเวร
          </div>
          {ncoPersonnel ? (
            <div style={{ padding: '6px 10px', background: 'rgba(245,158,11,0.1)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div>{ncoPersonnel.rank}{ncoPersonnel.firstName} {ncoPersonnel.lastName}</div>
              {assistants.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', paddingTop: 4, borderTop: '1px solid rgba(245,158,11,0.2)' }}>
                  <span style={{ fontWeight: 600 }}>ผู้ช่วย: </span>
                  {assistants.map(a => `${a.rank}${a.firstName} ${a.lastName}`).join(', ')}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>ยังไม่ได้กำหนด</div>
          )}
        </div>

        {/* Duty Shifts */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-danger-light)', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <SecurityIcon style={{ fontSize: 14 }} /> เวรยาม
          </div>
          {shift ? (
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>{shift.location}</div>
              {shift.timeSlots.slice().sort((a, b) => a.order - b.order).map((slot, i) => {
                const p = personnelMap[slot.personnelId];
                return (
                  <div key={slot.id} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 24 }}>{i + 1}.</span>
                    <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', minWidth: 90 }}>{slot.start}–{slot.end}</span>
                    <span style={{ fontSize: 13 }}>{p ? `${p.rank}${p.firstName} ${p.lastName}` : (slot.customName || '—')}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>ยังไม่ได้จัดเวร</div>
          )}
        </div>
        <button className="btn btn-outline w-full mt-3" onClick={onClose}>ปิด</button>
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
  year, month, ncoByDate, shiftByDate, recordDates, missionDates, mode, personnelMap, onSelectDay, exceptions = []
}: {
  year: number;
  month: number;
  ncoByDate: Record<string, string>;
  shiftByDate: Record<string, boolean>;
  recordDates: Record<string, boolean>;
  missionDates: Record<string, boolean>;
  mode: 'duty' | 'tasks' | 'nco';
  personnelMap?: Record<string, Personnel>;
  onSelectDay: (date: Date) => void;
  exceptions?: ExceptionEntry[];
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
          const hasMission = !!missionDates[dateStr];
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
                {mode === 'duty' && hasMission && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#8b5cf6' }} />}
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
  const [missions, setMissions] = useState<Mission[]>([]);
  const [userRole, setUserRole] = useState<string>('personnel');
  const [exceptions, setExceptions] = useState<ExceptionEntry[]>([]);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTaskDay, setSelectedTaskDay] = useState<Date | null>(null);
  const [selectedNCODay, setSelectedNCODay] = useState<Date | null>(null);

  // Mission Modal state
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);

  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const monthKey = `${viewYear}-${String(viewMonth).padStart(2, '0')}`;

  const loadData = useCallback(async () => {
    try {
      const [pRes, ncoRes, dutyRes, recRes, misRes, meRes, excRes] = await Promise.allSettled([
        fetch('/api/personnel'),
        fetch(`/api/nco?month=${monthKey}`),
        fetch('/api/duty'),
        fetch('/api/records'),
        fetch(`/api/missions?month=${monthKey}`),
        fetch('/api/auth/me'),
        fetch('/api/duty-meta?type=exception'),
      ]);

      if (pRes.status === 'fulfilled' && pRes.value.ok) {
        const d = await pRes.value.json();
        setPersonnel(d.personnel || []);
      }
      if (ncoRes.status === 'fulfilled' && ncoRes.value.ok) {
        const d = await ncoRes.value.json();
        setNcoDuties(d.duties || []);
      }
      if (dutyRes.status === 'fulfilled' && dutyRes.value.ok) {
        const d = await dutyRes.value.json();
        const map: Record<string, DutyShift> = {};
        (d.shifts || d.duties || []).forEach((s: any) => {
          const shiftObj = s.shift || s;
          if (shiftObj.date?.startsWith(monthKey)) map[shiftObj.date] = shiftObj;
        });
        setDutyShifts(map);
      }
      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        const d = await recRes.value.json();
        const map: Record<string, boolean> = {};
        (d.records || []).forEach((r: DailyRecord) => {
          if (r.date?.startsWith(monthKey)) map[r.date] = true;
        });
        setRecordDates(map);
      }
      if (misRes.status === 'fulfilled' && misRes.value.ok) {
        const d = await misRes.value.json();
        setMissions(d.missions || []);
      }
      if (meRes.status === 'fulfilled' && meRes.value.ok) {
        const d = await meRes.value.json();
        setUserRole(d.role || 'personnel');
      }
      if (excRes && excRes.status === 'fulfilled' && excRes.value.ok) {
        const d = await excRes.value.json();
        setExceptions(d.exceptions || []);
      }
    } catch (error) {
      console.error('Failed to load calendar data:', error);
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

  const handleSaveMission = async (missionData: Partial<Mission>) => {
    try {
      const isEdit = !!missionData.id;
      const url = '/api/missions';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(missionData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'บันทึกภารกิจไม่สำเร็จ');
      }

      showToast(isEdit ? 'แก้ไขภารกิจสำเร็จ' : 'เพิ่มภารกิจสำเร็จ');
      await loadData();
    } catch (e: any) {
      showToast(e.message || 'เกิดข้อผิดพลาด', 'error');
      throw e;
    }
  };

  const handleDeleteMission = async (id: string) => {
    try {
      const res = await fetch(`/api/missions?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'ลบภารกิจไม่สำเร็จ');
      }
      showToast('ลบภารกิจสำเร็จ');
      await loadData();
    } catch (e: any) {
      showToast(e.message || 'เกิดข้อผิดพลาด', 'error');
      throw e;
    }
  };

  const handleQuickToggleStatus = async (mission: Mission) => {
    const nextStatus: MissionStatus = mission.status === 'completed' ? 'in_progress' : 'completed';
    try {
      const res = await fetch('/api/missions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mission.id, status: nextStatus }),
      });
      if (res.ok) {
        showToast(`เปลี่ยนสถานะเป็น ${MISSION_STATUS_LABELS[nextStatus].label}`);
        await loadData();
      }
    } catch (e) {
      showToast('ไม่สามารถเปลี่ยนสถานะได้', 'error');
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
  const missionDates = Object.fromEntries(missions.map(m => [m.date, true]));
  const personnelMap = Object.fromEntries(personnel.map(p => [p.id, p]));

  const monthDisplay = format(new Date(viewYear, viewMonth - 1), 'MMMM yyyy', { locale: th });

  const selectedDateStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : '';
  const selectedNCO = selectedDateStr && ncoByDate[selectedDateStr]
    ? personnelMap[ncoByDate[selectedDateStr]] || null
    : null;
  const selectedShift = selectedDateStr ? dutyShifts[selectedDateStr] || null : null;
  const dayMissions = selectedDateStr ? missions.filter(m => m.date === selectedDateStr) : [];
  const dayAssistants = selectedDateStr 
    ? exceptions.filter(e => e.reason === 'ผู้ช่วยสิบเวร' && e.startDate <= selectedDateStr && e.endDate >= selectedDateStr)
        .map(e => personnelMap[e.personnelId]).filter(Boolean)
    : [];

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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          {tab !== 'tasks' && <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />เวรยาม
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />สิบเวร
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} />ภารกิจ
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
            missionDates={missionDates}
            mode={tab === 'nco' ? 'nco' : (tab === 'tasks' ? 'tasks' : 'duty')}
            personnelMap={personnelMap}
            onSelectDay={handleCalendarDayClick}
            exceptions={exceptions}
          />
        )}
      </div>

      {/* Duty + Missions Day Modal */}
      {selectedDay && tab === 'calendar' && (
        <DayDetailModal
          date={selectedDay}
          ncoPersonnel={selectedNCO}
          assistants={dayAssistants}
          shift={selectedShift}
          missions={dayMissions}
          personnelMap={personnelMap}
          personnelList={personnel}
          userRole={userRole}
          onOpenAddMission={() => {
            setEditingMission(null);
            setMissionModalOpen(true);
          }}
          onOpenEditMission={(m) => {
            setEditingMission(m);
            setMissionModalOpen(true);
          }}
          onQuickToggleStatus={handleQuickToggleStatus}
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

      {/* Mission Add/Edit Modal */}
      {missionModalOpen && (
        <MissionModal
          date={selectedDateStr || format(new Date(), 'yyyy-MM-dd')}
          mission={editingMission}
          personnelList={personnel}
          onClose={() => {
            setMissionModalOpen(false);
            setEditingMission(null);
          }}
          onSave={handleSaveMission}
          onDelete={editingMission ? handleDeleteMission : undefined}
        />
      )}
    </div>
  );
}
