'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns';
import { th } from 'date-fns/locale';
import type { SickRecord, Personnel } from '@/types';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SickIcon from '@mui/icons-material/Sick';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Pagination } from '@mui/material';
import { useToast } from '@/hooks/useToast';
import { usePermissions } from '@/hooks/usePermissions';
import SearchablePersonnelSelect from '@/components/common/SearchablePersonnelSelect';

function SickCard({ record, name, canManage, onMarkReturned, onEdit, onDelete, onUpdateStatus }: {
  record: SickRecord;
  name: string;
  canManage: boolean;
  onMarkReturned: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: 'approved' | 'rejected') => void;
}) {
  const isPending = record.status === 'pending';
  const isRejected = record.status === 'rejected';
  const isApproved = record.status === 'approved' || !record.status;
  const isActive = isApproved && !record.isReturned;
  
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)', flex: 1 }}>{name}</div>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
          background: isPending ? 'rgba(245,158,11,0.12)' : isRejected ? 'rgba(107,114,128,0.12)' : isActive ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
          color: isPending ? '#f59e0b' : isRejected ? '#6b7280' : isActive ? '#ef4444' : '#10b981',
        }}>
          {isPending ? 'รออนุมัติ' : isRejected ? 'ไม่อนุมัติ' : isActive ? 'กำลังป่วย' : 'กลับแล้ว'}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
        {record.symptoms && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><SickIcon style={{ fontSize: 16 }} /> {record.symptoms}</span>}
        {record.hospital && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><LocalHospitalIcon style={{ fontSize: 16 }} /> {record.hospital}</span>}
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
        <span>เริ่มป่วย: <strong style={{ color: 'var(--color-text-secondary)' }}>
          {record.startDate ? format(parseISO(record.startDate), 'd MMM yy', { locale: th }) : '-'}
        </strong></span>
        {record.expectedReturnDate && (
          <span>คาดกลับ: <strong style={{ color: 'var(--color-text-secondary)' }}>
            {format(parseISO(record.expectedReturnDate), 'd MMM yy', { locale: th })}
          </strong></span>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {isPending && canManage ? (
          <>
            <button onClick={() => onUpdateStatus('approved')} style={{
              flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              borderRadius: 10, border: 'none', background: 'var(--color-primary)', color: 'white',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <CheckCircleIcon style={{ fontSize: 16 }} /> อนุมัติ
            </button>
            <button onClick={() => onUpdateStatus('rejected')} style={{
              flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <CancelIcon style={{ fontSize: 16 }} /> ไม่อนุมัติ
            </button>
          </>
        ) : (
          <>
            {isActive && canManage && (
              <button onClick={onMarkReturned} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px 0', borderRadius: 10, border: '1px solid rgba(16,185,129,0.4)',
                background: 'rgba(16,185,129,0.08)', color: '#10b981',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <CheckCircleIcon style={{ fontSize: 16 }} /> กลับแล้ว
              </button>
            )}
            {canManage && (
              <>
                <button onClick={onEdit} style={{
                  flex: isActive ? 0 : 1, minWidth: 44, height: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '0 14px', borderRadius: 10, border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <EditIcon style={{ fontSize: 16 }} />
                  {!isActive && <span>แก้ไข</span>}
                </button>
                <button onClick={onDelete} style={{
                  width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', flexShrink: 0,
                  background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <DeleteIcon style={{ fontSize: 16 }} />
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SickPage() {
  const [records, setRecords] = useState<SickRecord[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;
  const [filter, setFilter] = useState<'all' | 'pending' | 'sick' | 'returned'>('sick');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState<Partial<SickRecord>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  const { showToast } = useToast();
  const { can, user } = usePermissions();
  const canManage = can('Personnel.manage');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sickRes, pRes] = await Promise.all([fetch('/api/sick'), fetch('/api/personnel')]);
      if (sickRes.ok) {
        const data = await sickRes.json();
        setRecords((data.records || []).sort((a: SickRecord, b: SickRecord) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
      }
      if (pRes.ok) { const data = await pRes.json(); setPersonnel(data.personnel || []); }
    } catch { showToast('ไม่สามารถดึงข้อมูลได้', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setPage(1); }, [filter, viewMode]);

  const getPersonnelName = (id: string) => { const p = personnel.find(x => x.id === id); return p ? `${p.rank}${p.firstName} ${p.lastName}` : 'ไม่ทราบชื่อ'; };

  const handleSubmit = async () => {
    if (!formData.personnelId) { showToast('กรุณาเลือกกำลังพล', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/sick', {
        method: formMode === 'add' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      showToast('บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
      setShowForm(false); loadData();
    } catch (e: any) { showToast(e.message || 'เกิดข้อผิดพลาด', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/sick?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('ลบข้อมูลเรียบร้อยแล้ว', 'success'); setConfirmDelete(null); loadData();
    } catch { showToast('เกิดข้อผิดพลาดในการลบ', 'error'); }
  };

  const handleUpdateStatus = async (record: SickRecord, status: 'approved' | 'rejected' | 'returned') => {
    try {
      const isReturned = status === 'returned' || record.isReturned;
      const finalStatus = status === 'returned' ? 'approved' : status;
      const res = await fetch('/api/sick', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ...record, isReturned, status: finalStatus }) 
      });
      if (!res.ok) throw new Error();
      showToast('อัปเดตข้อมูลเรียบร้อย', 'success'); loadData();
    } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
  };

  const activeSick = records.filter(r => (r.status === 'approved' || !r.status) && !r.isReturned).length;
  const pendingSick = records.filter(r => r.status === 'pending').length;

  // Render logic for List View
  const filteredRecords = records.filter(r => {
    const s = r.status || 'approved';
    if (filter === 'pending') return s === 'pending';
    if (filter === 'sick') return s === 'approved' && !r.isReturned;
    if (filter === 'returned') return s === 'approved' && r.isReturned;
    return true; // all
  });
  const paginatedRecords = filteredRecords.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);

  // Render logic for Calendar View (Only Approved records)
  const firstDayOfMonth = startOfMonth(new Date(calYear, calMonth - 1));
  const monthDays = eachDayOfInterval({ start: firstDayOfMonth, end: endOfMonth(firstDayOfMonth) });
  const startPad = getDay(firstDayOfMonth);
  
  const sickDates: Record<string, SickRecord[]> = {};
  records.filter(r => (r.status === 'approved' || !r.status)).forEach(r => {
    const start = new Date(r.startDate);
    const end = r.isReturned ? (r.expectedReturnDate ? new Date(r.expectedReturnDate) : new Date(r.startDate)) : (r.expectedReturnDate ? new Date(r.expectedReturnDate) : new Date(new Date().getFullYear() + 1, 0, 1));
    const intervalDays = eachDayOfInterval({ start, end: end < start ? start : end });
    intervalDays.forEach(d => {
      const key = format(d, 'yyyy-MM-dd');
      if (!sickDates[key]) sickDates[key] = [];
      sickDates[key].push(r);
    });
  });

  const selectedDateStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const dayRecords = selectedDateStr ? (sickDates[selectedDateStr] || []) : [];

  return (
    <div style={{ padding: '16px', maxWidth: 720, margin: '0 auto', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LocalHospitalIcon sx={{ color: '#ef4444', fontSize: 24 }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>ทะเบียนป่วย</div>
            <div style={{ display: 'flex', gap: 8, fontSize: 12, fontWeight: 600 }}>
              {activeSick > 0 && <span style={{ color: '#ef4444' }}>กำลังป่วย {activeSick} นาย</span>}
              {pendingSick > 0 && <span style={{ color: '#f59e0b' }}>รออนุมัติ {pendingSick} นาย</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', background: 'var(--color-surface-2)', borderRadius: 10, padding: 4 }}>
            <button onClick={() => setViewMode('list')} style={{
              padding: '6px 12px', border: 'none', borderRadius: 8, cursor: 'pointer',
              background: viewMode === 'list' ? 'var(--color-surface)' : 'transparent',
              color: viewMode === 'list' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s'
            }}><FormatListBulletedIcon fontSize="small" /></button>
            <button onClick={() => setViewMode('calendar')} style={{
              padding: '6px 12px', border: 'none', borderRadius: 8, cursor: 'pointer',
              background: viewMode === 'calendar' ? 'var(--color-surface)' : 'transparent',
              color: viewMode === 'calendar' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              boxShadow: viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s'
            }}><CalendarMonthIcon fontSize="small" /></button>
          </div>
          <button onClick={loadData} disabled={loading} style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <RefreshIcon fontSize="small" />
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Filter tabs + Add */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div style={{ display: 'flex', flex: 1, background: 'var(--color-surface-2)', borderRadius: 12, padding: 4, gap: 2 }}>
              {(['all', 'pending', 'sick', 'returned'] as const).map(f => {
                const labels = { all: 'ทั้งหมด', pending: 'รออนุมัติ', sick: 'กำลังป่วย', returned: 'กลับแล้ว' };
                return (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: filter === f ? 700 : 400,
                    background: filter === f ? 'var(--color-surface)' : 'transparent',
                    color: filter === f ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                    boxShadow: filter === f ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                    position: 'relative'
                  }}>
                    {labels[f]}
                    {f === 'pending' && pendingSick > 0 && (
                      <span style={{ position: 'absolute', top: -2, right: 0, background: '#f59e0b', color: 'white', fontSize: 9, padding: '1px 5px', borderRadius: 10 }}>{pendingSick}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button onClick={() => { setFormMode('add'); setFormData({ startDate: new Date().toISOString().split('T')[0], isReturned: false, personnelId: (!canManage && user?.personnelId) ? user.personnelId : undefined }); setShowForm(true); }} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0 18px', height: 44, borderRadius: 12,
              border: 'none', background: 'var(--color-primary)', color: 'white', fontSize: 14,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}>
              <AddIcon style={{ fontSize: 18 }} /> {canManage ? 'ส่งป่วย' : 'ร้องขอไปตร.'}
            </button>
          </div>

          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>{filteredRecords.length} รายการ</div>

          {/* Cards list */}
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>กำลังโหลด...</div>
          ) : filteredRecords.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', borderRadius: 16, background: 'var(--color-surface)', border: '1px dashed var(--color-border)' }}>
              <LocalHospitalIcon sx={{ fontSize: 40, color: 'var(--color-text-muted)', mb: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: 14, marginTop: 8 }}>
                {filter === 'sick' ? <><CheckCircleIcon fontSize="small" /> ไม่มีกำลังพลที่กำลังป่วย</> : 
                 filter === 'pending' ? <><AccessTimeIcon fontSize="small" /> ไม่มีรายการรออนุมัติ</> : 'ไม่มีข้อมูล'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {paginatedRecords.map(record => (
                <SickCard key={record.id} record={record} name={getPersonnelName(record.personnelId)}
                  canManage={canManage}
                  onMarkReturned={() => handleUpdateStatus(record, 'returned')}
                  onEdit={() => { setFormMode('edit'); setFormData({ ...record }); setShowForm(true); }}
                  onDelete={() => setConfirmDelete(record.id)}
                  onUpdateStatus={(st) => handleUpdateStatus(record, st)}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
              <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" size="medium" />
            </div>
          )}
        </>
      ) : (
        <>
          {/* Calendar View */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'flex-end' }}>
            <button onClick={() => { setFormMode('add'); setFormData({ startDate: new Date().toISOString().split('T')[0], isReturned: false, personnelId: (!canManage && user?.personnelId) ? user.personnelId : undefined }); setShowForm(true); }} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0 18px', height: 44, borderRadius: 12,
              border: 'none', background: 'var(--color-primary)', color: 'white', fontSize: 14,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}>
              <AddIcon style={{ fontSize: 18 }} /> {canManage ? 'ส่งป่วย' : 'ร้องขอไปตร.'}
            </button>
          </div>
          
          <div style={{ background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <button onClick={() => calMonth === 1 ? (setCalYear(y => y-1), setCalMonth(12)) : setCalMonth(m => m-1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}><ChevronLeftIcon /></button>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{format(firstDayOfMonth, 'MMMM yyyy', { locale: th })}</div>
              <button onClick={() => calMonth === 12 ? (setCalYear(y => y+1), setCalMonth(1)) : setCalMonth(m => m+1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}><ChevronRightIcon /></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--color-border)' }}>
              {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => (
                <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>{d}</div>
              ))}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
              {monthDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isSelected = selectedDateStr === dateStr;
                const sickCount = (sickDates[dateStr] || []).length;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDay(day)}
                    style={{
                      padding: '8px 2px 6px', border: 'none', background: 'transparent',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      minHeight: 56, fontFamily: 'inherit',
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: isToday(day) ? 700 : 400,
                      background: isSelected ? 'var(--color-primary-light)' : (isToday(day) ? 'var(--color-primary)' : 'transparent'),
                      color: isSelected || isToday(day) ? 'white' : 'var(--color-text-primary)',
                    }}>
                      {format(day, 'd')}
                    </div>
                    <div style={{ display: 'flex', gap: 2, minHeight: 5 }}>
                      {sickCount > 0 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444' }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDateStr && (
            <div className="modal-overlay" onClick={() => setSelectedDay(null)}>
              <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                <div className="modal-handle" />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CalendarMonthIcon fontSize="small" style={{ color: 'var(--color-primary)' }} /> 
                    {format(selectedDay!, 'd MMMM yyyy', { locale: th })}
                  </div>
                  <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4 }}>
                    <CloseIcon fontSize="small" />
                  </button>
                </div>
                
                {dayRecords.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: 12, color: 'var(--color-text-muted)', fontSize: 14 }}>
                    ไม่มีประวัติป่วยในวันนี้
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 20 }}>
                    {dayRecords.map(record => (
                      <SickCard key={record.id} record={record} name={getPersonnelName(record.personnelId)}
                        canManage={canManage}
                        onMarkReturned={() => handleUpdateStatus(record, 'returned')}
                        onEdit={() => { setFormMode('edit'); setFormData({ ...record }); setShowForm(true); }}
                        onDelete={() => setConfirmDelete(record.id)}
                        onUpdateStatus={(st) => handleUpdateStatus(record, st)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '92dvh', overflowY: 'auto', paddingBottom: 24 }}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                {formMode === 'add' ? <><LocalHospitalIcon /> {canManage ? 'ส่งป่วย' : 'ร้องขอไปตร.'}</> : <><EditIcon /> แก้ไขข้อมูล</>}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4 }}>
                <CloseIcon fontSize="small" />
              </button>
            </div>

            <div className="form-group">
              <label className="label">กำลังพล <span style={{ color: '#ef4444' }}>*</span></label>
              {formMode === 'add' ? (
                <SearchablePersonnelSelect personnel={personnel} value={formData.personnelId || ''} onChange={id => setFormData({ ...formData, personnelId: id })} placeholder="ค้นหาชื่อ-นามสกุล..." />
              ) : (
                <div style={{ padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 10, fontSize: 14, fontWeight: 500 }}>
                  {getPersonnelName(formData.personnelId!)}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="label">อาการ / สาเหตุ</label>
              <textarea className="input" rows={3} value={formData.symptoms || ''} onChange={e => setFormData({ ...formData, symptoms: e.target.value })} placeholder="เช่น ปวดท้อง มีไข้ อุบัติเหตุ..." style={{ resize: 'none' }} />
            </div>

            <div className="form-group">
              <label className="label">โรงพยาบาล / สถานพยาบาล</label>
              <input className="input" type="text" value={formData.hospital || ''} onChange={e => setFormData({ ...formData, hospital: e.target.value })} placeholder="เช่น รพ.ค่าย, รพ.พระมงกุฎเกล้า" />
            </div>

            <div className="form-group">
              <label className="label">วันที่เริ่มป่วย</label>
              <input className="input" type="date" value={formData.startDate || ''} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="label">วันที่คาดว่าจะกลับ (ถ้าทราบ)</label>
              <input className="input" type="date" value={formData.expectedReturnDate || ''} onChange={e => setFormData({ ...formData, expectedReturnDate: e.target.value })} />
            </div>

            {formMode === 'edit' && canManage && (
              <div onClick={() => setFormData({ ...formData, isReturned: !formData.isReturned })} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, marginBottom: 16,
                background: formData.isReturned ? 'rgba(16,185,129,0.1)' : 'var(--color-surface-2)',
                border: `1px solid ${formData.isReturned ? 'rgba(16,185,129,0.4)' : 'var(--color-border)'}`,
                cursor: 'pointer', transition: 'background 0.15s',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: formData.isReturned ? '#10b981' : 'var(--color-surface)',
                  border: `2px solid ${formData.isReturned ? '#10b981' : 'var(--color-border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {formData.isReturned && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: formData.isReturned ? '#10b981' : 'var(--color-text-primary)' }}>กำลังพลกลับมาแล้ว</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>เปลี่ยนสถานะเป็น "กลับแล้ว"</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)} style={{ flex: 1, height: 48 }}>ยกเลิก</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !formData.personnelId} style={{ flex: 2, height: 48, fontSize: 15, fontWeight: 700 }}>
                {saving ? 'กำลังบันทึก...' : (canManage || formMode === 'edit') ? 'บันทึก' : 'ส่งคำร้อง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent><Typography>ลบประวัติการป่วยนี้? ไม่สามารถเรียกคืนได้</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)} color="inherit">ยกเลิก</Button>
          <Button onClick={() => confirmDelete && handleDelete(confirmDelete)} color="error" variant="contained" disableElevation>ลบ</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
