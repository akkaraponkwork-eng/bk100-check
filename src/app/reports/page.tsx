'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, CircularProgress,
  Paper, Button, Alert, IconButton
} from '@mui/material';
import type { UserRole } from '@/types';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import SecurityIcon from '@mui/icons-material/Security';
import PageHeader from '@/components/layout/PageHeader';
import BarChartIcon from '@mui/icons-material/BarChart';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { exportToExcel } from '@/utils/export';
import type { DutyShift, Personnel } from '@/types';

// ==================== 1. Daily Duty Report ====================
function DailyDutyReport() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [shift, setShift] = useState<DutyShift | null>(null);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async (targetDate: string) => {
    setLoading(true);
    try {
      const [pRes, dRes] = await Promise.all([
        fetch('/api/personnel'),
        fetch('/api/duty')
      ]);
      const pData = await pRes.json();
      const dData = await dRes.json();

      setPersonnel(pData.personnel || []);
      const allShifts: DutyShift[] = dData.shifts || [];
      const foundShift = allShifts.find(s => s?.date === targetDate) || null;
      setShift(foundShift);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(date);
  }, [date]);

  const handleExport = () => {
    if (!shift) return;
    const pMap = Object.fromEntries(personnel.map(p => [p.id, p]));
    const data = shift.timeSlots.sort((a, b) => a.order - b.order).map(slot => {
      const p = pMap[slot.personnelId];
      return {
        'ผลัด': slot.order,
        'เวลา': `${slot.start} - ${slot.end}`,
        'ชื่อ-นามสกุล': p ? `${p.rank}${p.firstName} ${p.lastName}` : 'ไม่ระบุ'
      };
    });
    exportToExcel(data, `ตารางเวร_${date}`, 'DutySchedule');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>ตารางเวรประจำวัน</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <input
            type="date"
            className="select"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)' }}
          />
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExport} disabled={!shift || loading}>
            Export Excel
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : shift ? (
        <Box className="print-area">
          <Typography variant="h5" align="center" sx={{ fontWeight: 700, color: '#0f172a', mb: 1, fontFamily: 'inherit' }}>
            ตารางเวร {shift.location}
          </Typography>
          <Typography variant="subtitle1" align="center" sx={{ fontWeight: 700, color: '#334155', mb: 4, fontFamily: 'inherit' }}>
            ประจำวันที่ {format(parseISO(date), 'd MMMM yyyy', { locale: th })}
          </Typography>

          <Box sx={{ px: { xs: 0, md: 2 } }}>
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center', width: '15%', fontWeight: 700, color: '#1e293b' }}>ผลัดที่</th>
                  <th style={{ padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center', width: '30%', fontWeight: 700, color: '#1e293b' }}>เวลา</th>
                  <th style={{ padding: '16px', border: '1px solid #e2e8f0', textAlign: 'left', fontWeight: 700, color: '#1e293b', paddingLeft: '32px' }}>ยศ-ชื่อ-นามสกุล</th>
                </tr>
              </thead>
              <tbody>
                {shift.timeSlots.sort((a, b) => a.order - b.order).map(slot => {
                  const p = personnel.find(x => x.id === slot.personnelId);
                  return (
                    <tr key={slot.id}>
                      <td data-label="ผลัดที่" style={{ padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#334155', fontSize: '15px' }}>{slot.order}</td>
                      <td data-label="เวลา" style={{ padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#334155', fontSize: '15px' }}>{slot.start} - {slot.end}</td>
                      <td data-label="ยศ-ชื่อ-นามสกุล" style={{ padding: '16px', border: '1px solid #e2e8f0', textAlign: 'left', color: '#0f172a', fontWeight: 500, fontSize: '15px', paddingLeft: '32px' }}>
                        {p ? `${p.rank}${p.firstName} ${p.lastName}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        </Box>
      ) : (
        <Alert severity="info">ไม่มีข้อมูลการจัดเวรในวันที่เลือก</Alert>
      )}
    </Box>
  );
}

// ==================== 2. Duty Summary Report ====================
function DutySummaryReport() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [shifts, setShifts] = useState<DutyShift[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, dRes] = await Promise.all([
        fetch('/api/personnel'),
        fetch('/api/duty')
      ]);
      const pData = await pRes.json();
      const dData = await dRes.json();

      setPersonnel(pData.personnel || []);
      setShifts(dData.shifts ? dData.shifts.map((s: any) => s.shift) : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getMonthlyStats = () => {
    const stats: Record<string, number> = {};
    const selectedMonthPrefix = month; // "yyyy-MM"
    shifts.forEach(shift => {
      if (shift && shift.date && shift.date.startsWith(selectedMonthPrefix)) {
        shift.timeSlots?.forEach(slot => {
          if (slot.personnelId) {
            stats[slot.personnelId] = (stats[slot.personnelId] || 0) + 1;
          }
        });
      }
    });
    return stats;
  };

  const handleExport = () => {
    const stats = getMonthlyStats();
    const data = personnel.map((p, index) => ({
      'ลำดับ': index + 1,
      'ยศ': p.rank,
      'ชื่อ': p.firstName,
      'นามสกุล': p.lastName,
      'ผลัด': p.batch,
      'ยอดเวรเดือนนี้': stats[p.id] || 0,
      'ยอดสะสมทั้งหมด': p.dutyCount || 0
    }));
    exportToExcel(data, `สรุปยอดเวร_${month}`, 'DutySummary');
  };

  const stats = getMonthlyStats();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>ยอดเวรสะสมของกำลังพล</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <input
            type="month"
            className="select"
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)' }}
          />
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExport} disabled={loading}>
            Export Excel
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : (
        <Box className="print-area">
          <Typography variant="h5" align="center" sx={{ fontWeight: 700 }} gutterBottom>
            สรุปยอดเวรสะสมกำลังพล
          </Typography>
          <Typography variant="subtitle1" align="center" gutterBottom color="text.secondary">
            ประจำเดือน {format(new Date(month + '-01'), 'MMMM yyyy', { locale: th })}
          </Typography>

          <Box sx={{ mt: 4, overflowX: 'auto' }}>
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--color-border)' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <th style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center' }}>ลำดับ</th>
                  <th style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'left' }}>ยศ-ชื่อ-นามสกุล</th>
                  <th style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center' }}>ผลัด</th>
                  <th style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center' }}>เวรเดือนนี้</th>
                  <th style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center' }}>เวรสะสม(รวม)</th>
                </tr>
              </thead>
              <tbody>
                {personnel.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      ไม่มีข้อมูล (No Data)
                    </td>
                  </tr>
                ) : (
                  personnel.map((p, index) => (
                    <tr key={p.id}>
                      <td data-label="ลำดับ" style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center', width: '60px' }}>{index + 1}</td>
                      <td data-label="ยศ-ชื่อ-นามสกุล" style={{ padding: '12px', border: '1px solid var(--color-border)' }}>{p.rank}{p.firstName} {p.lastName}</td>
                      <td data-label="ผลัด" style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center' }}>{p.batch}</td>
                      <td data-label="เวรเดือนนี้" style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                        {stats[p.id] || 0}
                      </td>
                      <td data-label="เวรสะสม(รวม)" style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center' }}>{p.dutyCount || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ==================== 3. Leave Stats Report ====================
function LeaveStatsReport() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, lRes] = await Promise.all([
        fetch('/api/personnel'),
        fetch('/api/leave')
      ]);
      const pData = await pRes.json();
      const lData = await lRes.json();

      setPersonnel(pData.personnel || []);
      setAllLeaves(lData.allRequests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getLeaveStats = () => {
    const stats: Record<string, { count: number, days: number }> = {};
    allLeaves.forEach(leave => {
      if (leave.status === 'approved' && leave.startDate.startsWith(year)) {
        const pId = leave.personnelId;
        if (!stats[pId]) stats[pId] = { count: 0, days: 0 };

        stats[pId].count += 1;

        // Calculate days between start and end (inclusive)
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        stats[pId].days += diffDays;
      }
    });
    return stats;
  };

  const handleExport = () => {
    const stats = getLeaveStats();
    const data = personnel.map((p, index) => ({
      'ลำดับ': index + 1,
      'ยศ': p.rank,
      'ชื่อ': p.firstName,
      'นามสกุล': p.lastName,
      'ผลัด': p.batch,
      'จำนวนครั้งที่ลา (ครั้ง)': stats[p.id]?.count || 0,
      'จำนวนวันที่ลา (วัน)': stats[p.id]?.days || 0
    }));
    exportToExcel(data, `สถิติการลา_${year}`, 'LeaveStats');
  };

  const stats = getLeaveStats();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>สถิติการลากำลังพล</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <select
            className="select"
            value={year}
            onChange={e => setYear(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)' }}
          >
            {[0, 1, 2].map(i => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExport} disabled={loading}>
            Export Excel
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : (
        <Box className="print-area">
          <Typography variant="h5" align="center" sx={{ fontWeight: 700 }} gutterBottom>
            สถิติการลากำลังพล (เฉพาะที่อนุมัติแล้ว)
          </Typography>
          <Typography variant="subtitle1" align="center" gutterBottom color="text.secondary">
            ประจำปี พ.ศ. {parseInt(year) + 543}
          </Typography>

          <Box sx={{ mt: 4, overflowX: 'auto' }}>
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--color-border)' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <th style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center' }}>ลำดับ</th>
                  <th style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'left' }}>ยศ-ชื่อ-นามสกุล</th>
                  <th style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center' }}>ผลัด</th>
                  <th style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center' }}>จำนวนครั้งที่ลา</th>
                  <th style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center' }}>รวมจำนวนวัน</th>
                </tr>
              </thead>
              <tbody>
                {personnel.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      ไม่มีข้อมูล (No Data)
                    </td>
                  </tr>
                ) : (
                  personnel.map((p, index) => (
                    <tr key={p.id}>
                      <td data-label="ลำดับ" style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center', width: '60px' }}>{index + 1}</td>
                      <td data-label="ยศ-ชื่อ-นามสกุล" style={{ padding: '12px', border: '1px solid var(--color-border)' }}>{p.rank}{p.firstName} {p.lastName}</td>
                      <td data-label="ผลัด" style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center' }}>{p.batch}</td>
                      <td data-label="จำนวนครั้งที่ลา" style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                        {stats[p.id]?.count || 0}
                      </td>
                      <td data-label="รวมจำนวนวัน" style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                        {stats[p.id]?.days || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ==================== 4. NCO Duty Report ====================
function NCODutyReport() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [ncoDuties, setNcoDuties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, nRes] = await Promise.all([
        fetch('/api/personnel'),
        fetch(`/api/nco?month=${month}`)
      ]);
      const pData = await pRes.json();
      const nData = await nRes.json();

      setPersonnel(pData.personnel || []);
      setNcoDuties(nData.duties || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month]);

  const handleExport = () => {
    const pMap = Object.fromEntries(personnel.map(p => [p.id, p]));
    const data = ncoDuties.sort((a, b) => a.date.localeCompare(b.date)).map(duty => {
      const p = pMap[duty.personnelId];
      return {
        'วันที่': format(parseISO(duty.date), 'd MMMM yyyy', { locale: th }),
        'สิบเวรปฏิบัติหน้าที่': p ? `${p.rank}${p.firstName} ${p.lastName}` : 'ไม่ระบุ'
      };
    });
    exportToExcel(data, `รายงานสิบเวร_${month}`, 'NCOReport');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>รายงานการจัดสิบเวร</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <input
            type="month"
            className="select"
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)' }}
          />
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExport} disabled={loading || ncoDuties.length === 0}>
            Export Excel
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : ncoDuties.length > 0 ? (
        <Box className="print-area">
          <Typography variant="h5" align="center" sx={{ fontWeight: 700 }} gutterBottom>
            ตารางเวรนายสิบเวร (NCO)
          </Typography>
          <Typography variant="subtitle1" align="center" gutterBottom color="text.secondary">
            ประจำเดือน {format(new Date(month + '-01'), 'MMMM yyyy', { locale: th })}
          </Typography>

          <Box sx={{ mt: 4, overflowX: 'auto' }}>
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--color-border)' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <th style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center', width: '25%' }}>วันที่</th>
                  <th style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'left' }}>ยศ-ชื่อ-นามสกุล</th>
                </tr>
              </thead>
              <tbody>
                {ncoDuties.sort((a, b) => a.date.localeCompare(b.date)).map(duty => {
                  const p = personnel.find(x => x.id === duty.personnelId);
                  return (
                    <tr key={duty.date}>
                      <td style={{ padding: '12px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                        {format(parseISO(duty.date), 'd MMM yy', { locale: th })}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid var(--color-border)' }}>
                        {p ? `${p.rank}${p.firstName} ${p.lastName}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        </Box>
      ) : (
        <Alert severity="info">ไม่มีข้อมูลการจัดเวรนายสิบในเดือนที่เลือก</Alert>
      )}
    </Box>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('personnel');
  const [userName, setUserName] = useState('');
  const [userRank, setUserRank] = useState('');

  useEffect(() => {
    // Authentication Check (Simplified for now)
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.role || 'personnel');
          setUserName(data.name || '');
          setUserRank(data.rank || '');

          if (!['admin', 'commander'].includes(data.role)) {
            // Redirect if not authorized, but for testing we can just alert
            // window.location.href = '/';
          }
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>

      <PageHeader
        title="รายงานและสถิติ"
        description="ตรวจสอบสถิติการเข้าเวร การลา และยอดกำลังพลประจำเดือน"
        action={
          <Box className="no-print" sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
              size="small"
            >
              พิมพ์ (PDF)
            </Button>
            <IconButton onClick={handlePrint} sx={{ display: { xs: 'flex', sm: 'none' } }} color="primary" size="small">
              <PrintIcon />
            </IconButton>
          </Box>
        }
      />

      <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 10 }}>
        {/* {(!['admin', 'commander'].includes(userRole)) && (
          <Alert severity="warning" sx={{ mb: 3 }} className="no-print">
            หน้านี้สงวนสิทธิ์เฉพาะผู้บังคับบัญชาและผู้ดูแลระบบเท่านั้น แต่เนื่องจากอยู่ในช่วงทดสอบ คุณสามารถดูตัวอย่างได้
          </Alert>
        )} */}

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <Box className="no-print" sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': { py: 2, fontWeight: 600, minHeight: 64 },
              }}
            >
              <Tab icon={<AssignmentIcon />} iconPosition="start" label="ตารางเวรประจำวัน" />
              <Tab icon={<PeopleIcon />} iconPosition="start" label="ยอดเวรสะสม" />
              <Tab icon={<BeachAccessIcon />} iconPosition="start" label="สถิติการลา" />
              <Tab icon={<SecurityIcon />} iconPosition="start" label="เวรสิบเวร" />
            </Tabs>
          </Box>

          <Box sx={{ minHeight: '60vh', bgcolor: 'var(--color-surface)' }}>
            {activeTab === 0 && <DailyDutyReport />}
            {activeTab === 1 && <DutySummaryReport />}
            {activeTab === 2 && <LeaveStatsReport />}
            {activeTab === 3 && <NCODutyReport />}
          </Box>
        </Paper>
      </Box>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print, .MuiTabs-root {
            display: none !important;
          }
          .MuiPaper-root {
            border: none !important;
            box-shadow: none !important;
          }
          .MuiBox-root > .MuiPaper-root > .MuiBox-root:last-child {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            visibility: visible;
          }
          .MuiBox-root > .MuiPaper-root > .MuiBox-root:last-child * {
            visibility: visible;
          }
        }
      `}} />
    </>
  );
}
