'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import type { LeaveRequest, Personnel, UserRole } from '@/types';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';
import InfoIcon from '@mui/icons-material/Info';
import { Box, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Pagination, Select, MenuItem } from '@mui/material';
import PageHeader from '@/components/layout/PageHeader';
import LeaveFormModal from '@/components/leave/LeaveFormModal';
import { useToast } from '@/hooks/useToast';

export default function LeavePage() {
  const [activeTab, setActiveTab] = useState<'my_leave' | 'approvals' | 'history'>('my_leave');
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('personnel');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ req: LeaveRequest, status: 'approved' | 'rejected' } | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);
  const [myLeavePage, setMyLeavePage] = useState(1);
  const [myLeaveRowsPerPage, setMyLeaveRowsPerPage] = useState(10);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingRowsPerPage, setPendingRowsPerPage] = useState(10);
  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [leaveRes, pRes] = await Promise.all([
        fetch('/api/leave'),
        fetch('/api/personnel')
      ]);

      if (leaveRes.ok) {
        const data = await leaveRes.json();
        setMyRequests(data.myRequests || []);
        setPendingRequests(data.pendingRequests || []);
        setAllRequests(data.allRequests || []);
        setUserRole(data.userRole || 'personnel');
      }
      if (pRes.ok) {
        const data = await pRes.json();
        setPersonnel(data.personnel || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => { setHistoryPage(1); }, [historyRowsPerPage]);
  useEffect(() => { setMyLeavePage(1); }, [myLeaveRowsPerPage]);
  useEffect(() => { setPendingPage(1); }, [pendingRowsPerPage]);

  const handleSubmitLeave = async (data: { startDate: string; endDate: string; reason: string }) => {
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit leave');
      }
      showToast('ส่งใบลาเรียบร้อยแล้ว', 'success');
      setShowForm(false);
      loadData(); // Reload after submit
    } catch (e: any) {
      showToast(e.message || 'เกิดข้อผิดพลาดในการส่งใบลา', 'error');
      throw e;
    }
  };

  const handleApproveReject = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch('/api/leave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        showToast(`ทำรายการ ${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'} สำเร็จ`, 'success');
        loadData();
      } else {
        const err = await res.json();
        showToast(`เกิดข้อผิดพลาด: ${err.error || 'ไม่สามารถทำรายการได้'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  const showApprovalsTab = ['admin', 'commander', 'duty_officer'].includes(userRole);

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'approved') return <span className="badge badge-green"><CheckCircleIcon sx={{ fontSize: 14, mr: 0.5 }} /> อนุมัติแล้ว</span>;
    if (status === 'rejected') return <span className="badge badge-red"><CancelIcon sx={{ fontSize: 14, mr: 0.5 }} /> ไม่อนุมัติ</span>;
    return <span className="badge badge-yellow"><AccessTimeFilledIcon sx={{ fontSize: 14, mr: 0.5 }} /> รออนุมัติ</span>;
  };

  const getPersonnelName = (id: string) => {
    const p = personnel.find(x => x.id === id);
    return p ? `${p.rank}${p.firstName} ${p.lastName}` : `ID: ${id}`;
  };

  const getPersonnelBatch = (id: string) => {
    const p = personnel.find(x => x.id === id);
    return p?.batch ? `ผลัด ${p.batch}` : '';
  };

  const formatDateRange = (start: string, end: string) => {
    const s = format(parseISO(start), 'd MMM', { locale: th });
    const e = format(parseISO(end), 'd MMM yy', { locale: th });
    return start === end ? format(parseISO(start), 'd MMM yyyy', { locale: th }) : `${s} - ${e}`;
  };

  const historyItems = allRequests.filter(r => r.status !== 'pending').sort((a,b) => new Date(b.approvedAt || b.createdAt).getTime() - new Date(a.approvedAt || a.createdAt).getTime());
  const historyPageCount = Math.ceil(historyItems.length / historyRowsPerPage);
  const currentHistoryItems = historyItems.slice((historyPage - 1) * historyRowsPerPage, historyPage * historyRowsPerPage);

  const sortedMyRequests = [...myRequests].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const myLeavePageCount = Math.ceil(sortedMyRequests.length / myLeaveRowsPerPage);
  const currentMyRequests = sortedMyRequests.slice((myLeavePage - 1) * myLeaveRowsPerPage, myLeavePage * myLeaveRowsPerPage);

  const sortedPendingRequests = [...pendingRequests].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const pendingPageCount = Math.ceil(sortedPendingRequests.length / pendingRowsPerPage);
  const currentPendingRequests = sortedPendingRequests.slice((pendingPage - 1) * pendingRowsPerPage, pendingPage * pendingRowsPerPage);

  return (
    <>
      <PageHeader
        title="ระบบการลา"
        description="ยื่นใบลาและตรวจสอบสถานะการลาเยี่ยมญาติ"
        action={
          <IconButton onClick={loadData} title="โหลดข้อมูลล่าสุด" size="small" color="inherit">
            <RefreshIcon fontSize="small" className={loading ? "animate-spin" : ""} />
          </IconButton>
        }
      />

      <Box sx={{ maxWidth: 1000, mx: 'auto', pb: 10 }}>
        <div className="content-area">
          {/* Tabs */}        {showApprovalsTab && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: 'var(--color-surface-2)', padding: 4, borderRadius: 12 }}>
            <button 
              style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, 
                background: activeTab === 'my_leave' ? 'white' : 'transparent',
                color: activeTab === 'my_leave' ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
                boxShadow: activeTab === 'my_leave' ? 'var(--shadow-sm)' : 'none'
              }}
              onClick={() => setActiveTab('my_leave')}
            >
              การลาของฉัน
            </button>
            <button 
              style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, 
                background: activeTab === 'approvals' ? 'white' : 'transparent',
                color: activeTab === 'approvals' ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
                boxShadow: activeTab === 'approvals' ? 'var(--shadow-sm)' : 'none',
                position: 'relative'
              }}
              onClick={() => setActiveTab('approvals')}
            >
              รออนุมัติ
              {pendingRequests.length > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 12, background: 'var(--color-danger)', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button 
              style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, 
                background: activeTab === 'history' ? 'white' : 'transparent',
                color: activeTab === 'history' ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
                boxShadow: activeTab === 'history' ? 'var(--shadow-sm)' : 'none'
              }}
              onClick={() => setActiveTab('history')}
            >
              ประวัติพิจารณา
            </button>
          </div>
        )}

        {/* Tab Content: My Leave */}
        {activeTab === 'my_leave' && (
          <div>
            <button className="btn btn-primary w-full mb-4" onClick={() => setShowForm(true)}>
              + ยื่นใบลาเยี่ยมญาติ
            </button>

            {loading ? (
              <div className="flex-col gap-3">
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
              </div>
            ) : sortedMyRequests.length === 0 ? (
              <div className="text-center p-4 text-muted" style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px dashed var(--color-border)' }}>
                ไม่มีประวัติการลา
              </div>
            ) : (
              <div className="flex-col gap-3">
                {currentMyRequests.map(req => (
                  <div 
                    key={req.id} 
                    className="card p-4" 
                    style={{ 
                      cursor: 'pointer', 
                      border: req.status === 'rejected' ? '1px solid var(--color-danger-light)' : '1px solid transparent',
                      transition: 'border 0.2s, box-shadow 0.2s',
                    }}
                    onClick={() => setSelectedRequest(req)}
                  >
                    <div className="flex-between mb-2">
                      <div className="font-bold text-primary">{formatDateRange(req.startDate, req.endDate)}</div>
                      <StatusBadge status={req.status} />
                    </div>
                    {req.reason && <div className="text-sm text-secondary mb-2 line-clamp-1">เหตุผล: {req.reason}</div>}
                    <div className="flex-between">
                      <div className="text-xs text-muted">ยื่นเมื่อ: {format(parseISO(req.createdAt), 'd MMM yy HH:mm', { locale: th })}</div>
                      <div className="text-xs text-primary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <InfoIcon sx={{ fontSize: 14 }} /> แตะเพื่อดูรายละเอียด
                      </div>
                    </div>
                  </div>
                ))}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', mt: 2, gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>แสดงรายการหน้าละ:</Typography>
                    <Select 
                      size="small" 
                      value={myLeaveRowsPerPage} 
                      onChange={(e) => setMyLeaveRowsPerPage(Number(e.target.value))}
                      sx={{ height: 32, fontSize: 13, borderRadius: 2, bgcolor: 'background.paper' }}
                    >
                      <MenuItem value={10} sx={{ fontSize: 13 }}>10</MenuItem>
                      <MenuItem value={20} sx={{ fontSize: 13 }}>20</MenuItem>
                      <MenuItem value={50} sx={{ fontSize: 13 }}>50</MenuItem>
                      <MenuItem value={100} sx={{ fontSize: 13 }}>100</MenuItem>
                    </Select>
                  </Box>
                  {myLeavePageCount > 1 && (
                    <Pagination 
                      count={myLeavePageCount} 
                      page={myLeavePage} 
                      onChange={(e, v) => setMyLeavePage(v)} 
                      color="primary" 
                      shape="rounded"
                    />
                  )}
                </Box>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Approvals */}
        {activeTab === 'approvals' && showApprovalsTab && (
          <div>
            {loading ? (
              <div className="flex-col gap-3">
                {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 120 }} />)}
              </div>
            ) : sortedPendingRequests.length === 0 ? (
              <div className="text-center p-4 text-muted" style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px dashed var(--color-border)' }}>
                ไม่มีรายการรออนุมัติ
              </div>
            ) : (
              <div className="flex-col gap-3">
                {currentPendingRequests.map(req => (
                  <div key={req.id} className="card p-4" style={{ border: '1px solid var(--color-border)', cursor: 'pointer' }} onClick={() => setSelectedRequest(req)}>
                    <div className="flex-between mb-1">
                      <div className="font-bold text-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {getPersonnelName(req.personnelId)}
                        {getPersonnelBatch(req.personnelId) && (
                          <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', fontSize: 11 }}>
                            {getPersonnelBatch(req.personnelId)}
                          </span>
                        )}
                      </div>
                      <span className="badge badge-yellow">ลาเยี่ยมญาติ</span>
                    </div>
                    <div className="text-sm font-semibold text-blue mb-1">
                      {formatDateRange(req.startDate, req.endDate)}
                    </div>
                    {req.reason && <div className="text-sm text-secondary mb-3 line-clamp-1">เหตุผล: {req.reason}</div>}
                    
                    <div className="grid-2 mt-3" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-outline" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger-light)' }} onClick={() => setConfirmAction({ req, status: 'rejected' })}>
                        ไม่อนุมัติ
                      </button>
                      <button className="btn btn-success" onClick={() => setConfirmAction({ req, status: 'approved' })}>
                        อนุมัติ
                      </button>
                    </div>
                  </div>
                ))}

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', mt: 2, gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>แสดงรายการหน้าละ:</Typography>
                    <Select 
                      size="small" 
                      value={pendingRowsPerPage} 
                      onChange={(e) => setPendingRowsPerPage(Number(e.target.value))}
                      sx={{ height: 32, fontSize: 13, borderRadius: 2, bgcolor: 'background.paper' }}
                    >
                      <MenuItem value={10} sx={{ fontSize: 13 }}>10</MenuItem>
                      <MenuItem value={20} sx={{ fontSize: 13 }}>20</MenuItem>
                      <MenuItem value={50} sx={{ fontSize: 13 }}>50</MenuItem>
                      <MenuItem value={100} sx={{ fontSize: 13 }}>100</MenuItem>
                    </Select>
                  </Box>
                  {pendingPageCount > 1 && (
                    <Pagination 
                      count={pendingPageCount} 
                      page={pendingPage} 
                      onChange={(e, v) => setPendingPage(v)} 
                      color="primary" 
                      shape="rounded"
                    />
                  )}
                </Box>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: History */}
        {activeTab === 'history' && showApprovalsTab && (
          <div>
            {loading ? (
              <div className="flex-col gap-3">
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
              </div>
            ) : historyItems.length === 0 ? (
              <div className="text-center p-4 text-muted" style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px dashed var(--color-border)' }}>
                ไม่มีประวัติการพิจารณา
              </div>
            ) : (
              <div className="flex-col gap-3">
                {currentHistoryItems.map(req => (
                  <div 
                    key={req.id} 
                    className="card p-4" 
                    style={{ 
                      cursor: 'pointer', 
                      border: req.status === 'rejected' ? '1px solid var(--color-danger-light)' : '1px solid transparent',
                      transition: 'border 0.2s, box-shadow 0.2s',
                    }}
                    onClick={() => setSelectedRequest(req)}
                  >
                    <div className="flex-between mb-2">
                      <div className="font-bold text-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {getPersonnelName(req.personnelId)}
                        {getPersonnelBatch(req.personnelId) && (
                          <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', fontSize: 11 }}>
                            {getPersonnelBatch(req.personnelId)}
                          </span>
                        )}
                      </div>
                      <StatusBadge status={req.status} />
                    </div>
                    <div className="text-sm font-semibold text-blue mb-1">
                      {formatDateRange(req.startDate, req.endDate)}
                    </div>
                    <div className="flex-between mt-2">
                      <div className="text-xs text-muted">พิจารณาเมื่อ: {req.approvedAt ? format(parseISO(req.approvedAt), 'd MMM yy HH:mm', { locale: th }) : '-'}</div>
                      <div className="text-xs text-primary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <InfoIcon sx={{ fontSize: 14 }} /> แตะเพื่อดูรายละเอียด
                      </div>
                    </div>
                  </div>
                ))}

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', mt: 2, gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>แสดงรายการหน้าละ:</Typography>
                    <Select 
                      size="small" 
                      value={historyRowsPerPage} 
                      onChange={(e) => setHistoryRowsPerPage(Number(e.target.value))}
                      sx={{ height: 32, fontSize: 13, borderRadius: 2, bgcolor: 'background.paper' }}
                    >
                      <MenuItem value={10} sx={{ fontSize: 13 }}>10</MenuItem>
                      <MenuItem value={20} sx={{ fontSize: 13 }}>20</MenuItem>
                      <MenuItem value={50} sx={{ fontSize: 13 }}>50</MenuItem>
                      <MenuItem value={100} sx={{ fontSize: 13 }}>100</MenuItem>
                    </Select>
                  </Box>
                  {historyPageCount > 1 && (
                    <Pagination 
                      count={historyPageCount} 
                      page={historyPage} 
                      onChange={(e, v) => setHistoryPage(v)} 
                      color="primary" 
                      shape="rounded"
                    />
                  )}
                </Box>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <LeaveFormModal 
          onClose={() => setShowForm(false)} 
          onSubmit={handleSubmitLeave} 
        />
      )}

      {selectedRequest && (
        <Dialog open={!!selectedRequest} onClose={() => setSelectedRequest(null)} maxWidth="xs" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>รายละเอียดใบลา</DialogTitle>
          <DialogContent dividers sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>ผู้ยื่นขอลา</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" fontWeight={600}>{getPersonnelName(selectedRequest.personnelId)}</Typography>
                  {getPersonnelBatch(selectedRequest.personnelId) && (
                    <Typography variant="caption" sx={{ px: 1, py: 0.2, bgcolor: 'grey.100', borderRadius: 1, color: 'text.secondary', fontWeight: 600 }}>
                      {getPersonnelBatch(selectedRequest.personnelId)}
                    </Typography>
                  )}
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>ประเภทการลา</Typography>
                  <Typography variant="body2">{selectedRequest.type}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>สถานะ</Typography>
                  <Box sx={{ mt: 0.5 }}><StatusBadge status={selectedRequest.status} /></Box>
                </Box>
              </Box>
              
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>ช่วงเวลาที่ลา</Typography>
                <Typography variant="body1" color="primary.main" fontWeight={600}>
                  {formatDateRange(selectedRequest.startDate, selectedRequest.endDate)}
                </Typography>
              </Box>
              
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>เหตุผลการลา</Typography>
                <Typography variant="body2">{selectedRequest.reason || '-'}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">วันที่ยื่น</Typography>
                  <Typography variant="caption" fontWeight={500}>{format(parseISO(selectedRequest.createdAt), 'd MMM yy HH:mm', { locale: th })}</Typography>
                </Box>
                {selectedRequest.approvedAt && (
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" display="block">พิจารณาเมื่อ</Typography>
                    <Typography variant="caption" fontWeight={500}>{format(parseISO(selectedRequest.approvedAt), 'd MMM yy HH:mm', { locale: th })}</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setSelectedRequest(null)} variant="contained" disableElevation fullWidth sx={{ borderRadius: 2, fontWeight: 600 }}>
              ปิดหน้าต่าง
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onClose={() => setConfirmAction(null)} maxWidth="xs" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>ยืนยันการพิจารณา</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            คุณแน่ใจหรือไม่ที่จะ <Typography component="span" fontWeight={700} color={confirmAction?.status === 'approved' ? 'success.main' : 'error.main'}>
              {confirmAction?.status === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'}
            </Typography> ใบลาของ <b>{confirmAction ? getPersonnelName(confirmAction.req.personnelId) : ''}</b> {confirmAction && getPersonnelBatch(confirmAction.req.personnelId) ? `(${getPersonnelBatch(confirmAction.req.personnelId)})` : ''}?
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
             <Typography variant="body2" sx={{ mb: 0.5 }}>ช่วงเวลา: <b>{confirmAction ? formatDateRange(confirmAction.req.startDate, confirmAction.req.endDate) : ''}</b></Typography>
             <Typography variant="body2" color="text.secondary">เหตุผล: {confirmAction?.req.reason || '-'}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setConfirmAction(null)} color="inherit" sx={{ fontWeight: 600 }}>ยกเลิก</Button>
          <Button 
            onClick={() => {
              if (confirmAction) {
                handleApproveReject(confirmAction.req.id, confirmAction.status);
                setConfirmAction(null);
              }
            }} 
            variant="contained" 
            color={confirmAction?.status === 'approved' ? 'success' : 'error'}
            disableElevation
            sx={{ fontWeight: 600, borderRadius: 2, px: 3 }}
          >
            ยืนยัน
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </>
  );
}
