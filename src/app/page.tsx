'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import type { Personnel, DutyShift, NCODuty, KanbanTask, ExceptionEntry, Mission, MissionYearlySummary } from '@/types';
import GroupIcon from '@mui/icons-material/Group';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import BarChartIcon from '@mui/icons-material/BarChart';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageHeader from '@/components/layout/PageHeader';

import StatCard from '@/components/dashboard/StatCard';
import DutyTimeline from '@/components/dashboard/DutyTimeline';
import PersonnelChart from '@/components/dashboard/PersonnelChart';
import TaskDistribution from '@/components/dashboard/TaskDistribution';
import QuickActions from '@/components/dashboard/QuickActions';
import MissionSummaryCard from '@/components/dashboard/MissionSummaryCard';
import YearlyMissionModal from '@/components/dashboard/YearlyMissionModal';
import NcoDetailModal from '@/components/dashboard/NcoDetailModal';
import DutyDetailModal from '@/components/dashboard/DutyDetailModal';
import LeaveDetailModal from '@/components/dashboard/LeaveDetailModal';
import PersonnelDetailModal from '@/components/dashboard/PersonnelDetailModal';

// ==================== Main Dashboard ====================
export default function DashboardPage() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [todayShift, setTodayShift] = useState<DutyShift | null>(null);
  const [todayNCO, setTodayNCO] = useState<NCODuty | null>(null);
  const [lastRecord, setLastRecord] = useState<{ date: string; totalCompany: number; tasks: KanbanTask[] } | null>(null);
  const [exceptions, setExceptions] = useState<ExceptionEntry[]>([]);
  const [todayMissions, setTodayMissions] = useState<Mission[]>([]);
  const [yearlySummary, setYearlySummary] = useState<MissionYearlySummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState<string>('');
  const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: '', visible: false });

  const [showNCOModal, setShowNCOModal] = useState(false);
  const [showDutyModal, setShowDutyModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showPersonnelModal, setShowPersonnelModal] = useState(false);
  const [showYearlyMissionModal, setShowYearlyMissionModal] = useState(false);

  const [leaveEnabled, setLeaveEnabled] = useState(true);
  const [userRole, setUserRole] = useState<string>('personnel');

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayDisplay = format(new Date(), 'd MMMM yyyy', { locale: th });
  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentYear = new Date().getFullYear();

  const showToast = (msg: string) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast({ msg: '', visible: false }), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, dRes, ncoRes, recRes, metaRes, botRes, meRes, misRes, misSumRes] = await Promise.allSettled([
        fetch('/api/personnel'),
        fetch(`/api/duty?date=${todayStr}`),
        fetch(`/api/nco?month=${currentMonth}`),
        fetch(`/api/records?date=${todayStr}`),
        fetch('/api/duty-meta'),
        fetch('/api/bot-settings'),
        fetch('/api/auth/me'),
        fetch(`/api/missions?date=${todayStr}`),
        fetch(`/api/missions/summary?year=${currentYear}`),
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
      if (metaRes.status === 'fulfilled') {
        const data = await metaRes.value.json();
        setExceptions(data.exceptions || []);
      }
      if (botRes && botRes.status === 'fulfilled') {
        const data = await botRes.value.json();
        setLeaveEnabled(data.leaveEnabled !== false);
      }
      if (meRes && meRes.status === 'fulfilled') {
        const data = await meRes.value.json();
        setUserRole(data.role || 'personnel');
      }
      if (misRes && misRes.status === 'fulfilled') {
        const data = await misRes.value.json();
        setTodayMissions(data.missions || []);
      }
      if (misSumRes && misSumRes.status === 'fulfilled') {
        const data = await misSumRes.value.json();
        setYearlySummary(data.summary || null);
      }
      setLoadedAt(format(new Date(), 'HH:mm'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [todayStr, currentMonth, currentYear]);

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
        let name: string;
        if (!slot.personnelId) {
          name = 'ไม่ระบุ';
        } else if (slot.personnelId.startsWith('CUSTOM:')) {
          name = slot.personnelId.slice(7);
        } else {
          name = p ? `${p.rank}${p.firstName} ${p.lastName}` : 'ไม่ระบุ';
        }
        lines.push(`${i + 1}.${name}`);
        lines.push(`${slot.start}-${slot.end}`);
      });
    lines.push('ครับ');
    navigator.clipboard.writeText(lines.join('\n'));
    showToast('คัดลอกข้อความเวรแล้ว!');
  };

  const privatesCount = personnel.filter(p => p.rank === 'พลฯ').length;
  const ncosCount = personnel.filter(p => p.rank !== 'พลฯ').length;
  const leaveCount = personnel.filter(p => p.status === 'leave').length;

  const ncoPersonnel = todayNCO
    ? personnel.find(p => p.id === todayNCO.personnelId)
    : null;

  const todayAssistants = exceptions
    .filter(e => e.reason === 'ผู้ช่วยสิบเวร' && e.startDate <= todayStr && e.endDate >= todayStr)
    .map(e => personnel.find(p => p.id === e.personnelId))
    .filter(Boolean);

  return (
    <div className="page-container">
      {/* Toast */}
      {toast.visible && (
        <div className="toast toast-success">{toast.msg}</div>
      )}

      {/* Header */}
      <PageHeader
        title="BK100 DutyCheck"
        description={`${todayDisplay}${loadedAt ? ` • โหลดข้อมูลล่าสุด ${loadedAt}` : ''}`}
        action={
          <button
            className="btn-icon btn-sm"
            onClick={loadData}
            title="รีเฟรช"
            style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {loading ? <RefreshIcon className="animate-spin" fontSize="small" /> : <RefreshIcon fontSize="small" />}
          </button>
        }
      />

      {/* Content */}
      <div className="content-area" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Summary Cards */}
        {loading ? (
          <div className="stat-cards-grid">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: 90 }} />)}
          </div>
        ) : (
          <div className="stat-cards-grid">
            <StatCard
              icon={<GroupIcon />} label="กำลังพลทั้งหมด" value={personnel.length}
              sub={`พลฯ ${privatesCount} | นายสิบ ${ncosCount}`}
              accent="#3b82f6"
              onClick={() => setShowPersonnelModal(true)}
            />
            <StatCard
              icon={<AccessTimeIcon />} label="เวรวันนี้"
              value={todayShift ? `${todayShift.timeSlots.length} ช่วง` : 'ยังไม่จัด'}
              sub={todayShift?.location}
              accent="#10b981"
              onClick={() => todayShift && setShowDutyModal(true)}
            />
            <StatCard
              icon={<PersonIcon />} label="สิบเวร / ผช.สิบเวร"
              value={ncoPersonnel ? `${ncoPersonnel.rank}${ncoPersonnel.firstName}` : '—'}
              sub={todayAssistants.length > 0 ? `ผช: ${todayAssistants.map(a => `${a?.rank}${a?.firstName}`).join(', ')}` : (ncoPersonnel?.lastName || 'ไม่มีผู้ช่วย')}
              accent="#f59e0b"
              onClick={() => setShowNCOModal(true)}
            />
            <StatCard
              icon={<AssignmentTurnedInIcon />} label="ภารกิจประจำปี"
              value={yearlySummary ? `${yearlySummary.totalMissions} งาน` : `${todayMissions.length} งาน`}
              sub={yearlySummary ? `สำเร็จ ${yearlySummary.completedMissions} งาน` : 'คลิกดูสรุปสถิติ 1 ปี'}
              accent="#8b5cf6"
              onClick={() => setShowYearlyMissionModal(true)}
            />
            <StatCard
              icon={<BarChartIcon />} label="ยอดล่าสุด"
              value={lastRecord ? `${lastRecord.totalCompany} นาย` : '—'}
              sub={lastRecord ? format(parseISO(lastRecord.date), 'd MMM', { locale: th }) : 'ยังไม่มีข้อมูล'}
              accent="#06b6d4"
            />
            <StatCard
              icon={<DirectionsWalkIcon />} label="ทหารลา"
              value={`${leaveCount} นาย`}
              sub="กำลังพลที่ลาพัก"
              accent="#ef4444"
              onClick={() => leaveCount > 0 && setShowLeaveModal(true)}
            />
          </div>
        )}

        {/* Dashboard Main Grid (2 columns on desktop) */}
        {!loading && (
          <div className="dashboard-grid">
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <MissionSummaryCard
                todayMissions={todayMissions}
                personnelList={personnel}
                yearlyTotal={yearlySummary?.totalMissions || 0}
                completedTotal={yearlySummary?.completedMissions || 0}
                onOpenYearlyModal={() => setShowYearlyMissionModal(true)}
              />
              <DutyTimeline shift={todayShift} personnel={personnel} userRole={userRole} />
              <QuickActions todayShift={todayShift} onExport={handleExportDuty} userRole={userRole} />
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {personnel.length > 0 && <PersonnelChart personnel={personnel} />}
              {lastRecord && <TaskDistribution tasks={lastRecord.tasks} recordDate={lastRecord.date} />}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <YearlyMissionModal
        open={showYearlyMissionModal}
        onClose={() => setShowYearlyMissionModal(false)}
      />
      <NcoDetailModal 
        open={showNCOModal} 
        onClose={() => setShowNCOModal(false)} 
        ncoPersonnel={ncoPersonnel || null} 
        todayAssistants={todayAssistants} 
      />
      <DutyDetailModal 
        open={showDutyModal} 
        onClose={() => setShowDutyModal(false)} 
        todayShift={todayShift} 
        personnel={personnel} 
      />
      <LeaveDetailModal 
        open={showLeaveModal} 
        onClose={() => setShowLeaveModal(false)} 
        leaveCount={leaveCount} 
        personnel={personnel} 
      />
      <PersonnelDetailModal 
        open={showPersonnelModal} 
        onClose={() => setShowPersonnelModal(false)} 
        personnel={personnel} 
        ncosCount={ncosCount} 
        privatesCount={privatesCount} 
      />
    </div>
  );
}