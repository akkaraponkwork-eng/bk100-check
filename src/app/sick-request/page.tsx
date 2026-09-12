'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import type { SickRecord, Personnel } from '@/types';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import SickIcon from '@mui/icons-material/Sick';
import CancelIcon from '@mui/icons-material/Cancel';
import HistoryIcon from '@mui/icons-material/History';
import SendIcon from '@mui/icons-material/Send';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Pagination } from '@mui/material';
import { useToast } from '@/hooks/useToast';
import { usePermissions } from '@/hooks/usePermissions';
import SearchablePersonnelSelect from '@/components/common/SearchablePersonnelSelect';

function SickCard({ record, name, canManage, isOwner, onMarkReturned, onEdit, onDelete, onUpdateStatus }: {
  record: SickRecord;
  name: string;
  canManage: boolean;
  isOwner: boolean;
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
            {isActive && (canManage || isOwner) && (
              <button onClick={onMarkReturned} style={{
                flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                borderRadius: 10, border: '1px solid rgba(16,185,129,0.4)',
                background: 'rgba(16,185,129,0.08)', color: '#10b981',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <CheckCircleIcon style={{ fontSize: 16 }} /> กลับแล้ว
              </button>
            )}
            {canManage && (
              <>
                <button onClick={onEdit} style={{
                  flex: (isActive && (canManage || isOwner)) ? 0 : 1, minWidth: 44, height: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '0 14px', borderRadius: 10, border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <EditIcon style={{ fontSize: 16 }} />
                  {!(isActive && (canManage || isOwner)) && <span>แก้ไข</span>}
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

export default function SickRequestPage() {
  const [records, setRecords] = useState<SickRecord[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;

  const [activeTab, setActiveTab] = useState<'form' | 'active' | 'history'>('form');

  const [formData, setFormData] = useState<Partial<SickRecord>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  const { showToast } = useToast();
  const { can, user } = usePermissions();
  const canManage = can('Sick.manage');

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
  useEffect(() => { setPage(1); }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'form' && !formData.startDate && !formData.id) {
      setFormData({
        startDate: new Date().toISOString().split('T')[0],
        isReturned: false,
        personnelId: (!canManage && user?.personnelId) ? user.personnelId : undefined
      });
    }
  }, [activeTab, user, canManage, formData.startDate, formData.id]);

  const getPersonnelName = (id: string) => { const p = personnel.find(x => x.id === id); return p ? `${p.rank}${p.firstName} ${p.lastName}` : 'ไม่ทราบชื่อ'; };

  const handleSubmit = async () => {
    if (!formData.personnelId) { showToast('กรุณาเลือกกำลังพล', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/sick', {
        method: formData.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      showToast('ส่งคำร้องขอไปตร.เรียบร้อยแล้ว', 'success');
      
      // Reset form and go to history
      setFormData({
        startDate: new Date().toISOString().split('T')[0],
        isReturned: false,
        personnelId: (!canManage && user?.personnelId) ? user.personnelId : undefined
      });
      setActiveTab('history');
      loadData();
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

  const activeRecords = records.filter(r => (r.status === 'approved' || !r.status) && !r.isReturned);
  const historyRecords = records.filter(r => !((r.status === 'approved' || !r.status) && !r.isReturned));

  const listToRender = activeTab === 'active' ? activeRecords : historyRecords;
  const paginatedRecords = listToRender.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(listToRender.length / rowsPerPage);

  return (
    <div style={{ padding: '16px', maxWidth: 720, margin: '0 auto', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LocalHospitalIcon sx={{ color: '#ef4444', fontSize: 24 }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>ร้องขอไปตร.</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>ส่งคำร้องขอไปตรวจรักษาโรค</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadData} disabled={loading} style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <RefreshIcon fontSize="small" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--color-surface-2)', borderRadius: 14, padding: 4 }}>
        <button onClick={() => setActiveTab('form')} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 13, fontWeight: activeTab === 'form' ? 700 : 500,
          background: activeTab === 'form' ? 'var(--color-surface)' : 'transparent',
          color: activeTab === 'form' ? 'var(--color-primary)' : 'var(--color-text-muted)',
          boxShadow: activeTab === 'form' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
          transition: 'all 0.2s',
        }}>
          <EditIcon fontSize="small" /> กรอกคำร้อง
        </button>
        <button onClick={() => setActiveTab('active')} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 13, fontWeight: activeTab === 'active' ? 700 : 500,
          background: activeTab === 'active' ? 'var(--color-surface)' : 'transparent',
          color: activeTab === 'active' ? '#ef4444' : 'var(--color-text-muted)',
          boxShadow: activeTab === 'active' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
          transition: 'all 0.2s',
          position: 'relative',
        }}>
          <DirectionsWalkIcon fontSize="small" /> กำลังดำเนินการ
          {activeRecords.length > 0 && (
            <span style={{ position: 'absolute', top: -2, right: 0, background: '#ef4444', color: 'white', fontSize: 9, padding: '1px 5px', borderRadius: 10 }}>{activeRecords.length}</span>
          )}
        </button>
        <button onClick={() => setActiveTab('history')} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 13, fontWeight: activeTab === 'history' ? 700 : 500,
          background: activeTab === 'history' ? 'var(--color-surface)' : 'transparent',
          color: activeTab === 'history' ? 'var(--color-primary)' : 'var(--color-text-muted)',
          boxShadow: activeTab === 'history' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
          transition: 'all 0.2s',
        }}>
          <HistoryIcon fontSize="small" /> ประวัติ
        </button>
      </div>

      {activeTab === 'form' && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: 24, border: '1px solid var(--color-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          
          {formData.id && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <EditIcon fontSize="small" /> กำลังแก้ไขประวัติ
              </div>
              <button onClick={() => {
                setFormData({
                  startDate: new Date().toISOString().split('T')[0],
                  isReturned: false,
                  personnelId: (!canManage && user?.personnelId) ? user.personnelId : undefined
                });
              }} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>
                ยกเลิกการแก้ไข
              </button>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>กำลังพล <span style={{ color: '#ef4444' }}>*</span></label>
            {(!canManage) ? (
              <div style={{ padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 12, fontSize: 15, fontWeight: 600 }}>
                {getPersonnelName(user?.personnelId || '')}
              </div>
            ) : (!formData.id) ? (
              <SearchablePersonnelSelect personnel={personnel} value={formData.personnelId || ''} onChange={id => setFormData({ ...formData, personnelId: id })} placeholder="ค้นหาชื่อ-นามสกุล..." />
            ) : (
              <div style={{ padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 12, fontSize: 15, fontWeight: 600 }}>
                {getPersonnelName(formData.personnelId!)}
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>อาการ / สาเหตุ</label>
            <textarea className="input" rows={3} value={formData.symptoms || ''} onChange={e => setFormData({ ...formData, symptoms: e.target.value })} placeholder="เช่น ปวดท้อง มีไข้ อุบัติเหตุ..." style={{ resize: 'none', width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--color-border)' }} />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>โรงพยาบาล / สถานพยาบาล</label>
            <select 
              className="input" 
              value={formData.hospital || ''} 
              onChange={e => setFormData({ ...formData, hospital: e.target.value })} 
              style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', fontFamily: 'inherit', fontSize: 15 }}
            >
              <option value="" disabled>-- เลือกสถานที่ --</option>
              <option value="ตร">ตร</option>
              <option value="รพ">รพ</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>วันที่เริ่มป่วย</label>
            <input className="input" type="date" value={formData.startDate || ''} onChange={e => setFormData({ ...formData, startDate: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--color-border)' }} />
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>วันที่คาดว่าจะกลับ (ถ้าทราบ)</label>
            <input className="input" type="date" value={formData.expectedReturnDate || ''} onChange={e => setFormData({ ...formData, expectedReturnDate: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--color-border)' }} />
          </div>

          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !formData.personnelId} style={{ width: '100%', height: 52, fontSize: 16, fontWeight: 700, borderRadius: 14, display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', border: 'none', background: 'var(--color-primary)', color: 'white', cursor: saving || !formData.personnelId ? 'not-allowed' : 'pointer', opacity: saving || !formData.personnelId ? 0.7 : 1 }}>
            <SendIcon fontSize="small" />
            {saving ? 'กำลังบันทึก...' : formData.id ? 'บันทึกการแก้ไข' : 'ส่งคำร้องขอไปตร.'}
          </button>
        </div>
      )}

      {(activeTab === 'history' || activeTab === 'active') && (
        <>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12, fontWeight: 500 }}>
            {activeTab === 'active' ? `กำลังดำเนินการ (${activeRecords.length} รายการ)` : `ประวัติทั้งหมด (${historyRecords.length} รายการ)`}
          </div>
          
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>กำลังโหลด...</div>
          ) : listToRender.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', borderRadius: 20, background: 'var(--color-surface)', border: '1px dashed var(--color-border)' }}>
              {activeTab === 'active' ? (
                <DirectionsWalkIcon sx={{ fontSize: 48, color: 'var(--color-border)', mb: 2 }} />
              ) : (
                <HistoryIcon sx={{ fontSize: 48, color: 'var(--color-border)', mb: 2 }} />
              )}
              <div style={{ color: 'var(--color-text-muted)', fontSize: 15, fontWeight: 500 }}>
                {activeTab === 'active' ? 'ไม่มีรายการกำลังดำเนินการ' : 'ไม่มีประวัติคำร้อง'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {paginatedRecords.map(record => (
                <SickCard key={record.id} record={record} name={getPersonnelName(record.personnelId)}
                  canManage={canManage}
                  isOwner={user?.personnelId === record.personnelId}
                  onMarkReturned={() => handleUpdateStatus(record, 'returned')}
                  onEdit={() => { setActiveTab('form'); setFormData({ ...record }); }}
                  onDelete={() => setConfirmDelete(record.id)}
                  onUpdateStatus={(st) => handleUpdateStatus(record, st)}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
              <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" size="medium" />
            </div>
          )}
        </>
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
