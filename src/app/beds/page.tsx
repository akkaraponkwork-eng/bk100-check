'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Tabs, Tab, useTheme, useMediaQuery, CircularProgress, Typography
} from '@mui/material';
import SingleBedIcon from '@mui/icons-material/SingleBed';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import GavelIcon from '@mui/icons-material/Gavel';

import PageHeader from '@/components/layout/PageHeader';
import BedGrid from '@/components/beds/BedGrid';
import InspectionSummary from '@/components/beds/InspectionSummary';
import InspectionFab from '@/components/beds/InspectionFab';
import BedRemarkDialog from '@/components/beds/BedRemarkDialog';
import TextImportArea from '@/components/beds/TextImportArea';
import BedStatsAndHistory from '@/components/beds/BedStatsAndHistory';
import BedManageTab from '@/components/beds/BedManageTab';
import PunishmentKanbanTab from '@/components/beds/PunishmentKanbanTab';

import { BedEntry, BedViolation, BedReport, Personnel, PunishmentEntry } from '@/types';

export default function BedsPage() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  const [activeTab, setActiveTab] = useState(0);
  
  // Global Data
  const [beds, setBeds] = useState<BedEntry[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [reports, setReports] = useState<BedReport[]>([]);
  const [punishments, setPunishments] = useState<PunishmentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab 1 Data (Inspection State)
  const [violations, setViolations] = useState<BedViolation[]>([]);
  const [inspectionDate, setInspectionDate] = useState<string>('');
  
  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<string>('');
  
  // Pending Reports State
  const pendingReports = useMemo(() => reports.filter(r => r.status === 'pending'), [reports]);
  
  // Pre-fill text area state (for when we want to pass text to Tab 2)
  const [initialImportText, setInitialImportText] = useState('');

  // Loading State
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bedsRes, pRes, rRes, metaRes] = await Promise.all([
        fetch('/api/beds'),
        fetch('/api/personnel'),
        fetch('/api/bed-reports'),
        fetch('/api/duty-meta')
      ]);
      const bedsData = await bedsRes.json();
      const pData = await pRes.json();
      const rData = await rRes.json();
      const metaData = await metaRes.json();
      
      // If beds is empty, generate 1-83
      let fetchedBeds = bedsData.beds || [];
      if (fetchedBeds.length === 0) {
        fetchedBeds = Array.from({ length: 83 }, (_, i) => ({ bedNo: String(i + 1) }));
      }

      setBeds(fetchedBeds);
      setPersonnel(pData.personnel || []);
      
      const allReports: BedReport[] = rData.reports || [];
      setReports(allReports);
      
      setPunishments(metaData.punishments || []);

      // Load today's persistent violations
      const todayStr = new Date().toISOString().split('T')[0];
      const todayReport = allReports.find(r => r.createdAt.startsWith(todayStr) && r.status === 'pending');
      if (todayReport && todayReport.violations) {
        try {
          const v = JSON.parse(todayReport.violations);
          setViolations(v);
        } catch {}
      }
    } catch (e) {
      console.error('Error loading data', e);
    }
    setLoading(false);
  };

  // --- Handlers for Tab 1 (Inspection) ---

  const handleBedClick = (bedNo: string) => {
    setSelectedBed(bedNo);
    setDialogOpen(true);
  };

  const handleSaveRemark = (bedNo: string, remark: string, actualSleeperId?: string) => {
    setViolations(prev => {
      const existing = prev.filter(v => v.bedNo !== bedNo);
      return [...existing, { bedNo, remark, actualSleeperId }];
    });
    setDialogOpen(false);
  };

  const handleDeleteRemark = (bedNo: string) => {
    setViolations(prev => prev.filter(v => v.bedNo !== bedNo));
    setDialogOpen(false);
  };

  const handleClearViolations = () => {
    if (confirm('คุณต้องการล้างข้อมูลการตรวจปัจจุบันทั้งหมดหรือไม่?')) {
      setViolations([]);
      setInspectionDate('');
    }
  };

  const handleSaveInspection = async (text: string) => {
    if (violations.length === 0) return;
    setSaving(true);
    try {
      await fetch('/api/bed-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rawText: text,
          violations: JSON.stringify(violations)
        })
      });

      // Update Kanban Punishments
      const todayStr = new Date().toISOString().split('T')[0];
      const newPunishments: PunishmentEntry[] = [];
      
      violations.forEach(v => {
        const bed = beds.find(b => b.bedNo === v.bedNo);
        // Use actualSleeperId if set (person sleeping != bed owner), otherwise use bed owner
        const targetId = v.actualSleeperId || bed?.personnelId;
        if (targetId) {
          // Check if already in punishments
          const exists = punishments.some(p => p.personnelId === targetId && p.startDate === todayStr && p.source === 'bed');
          if (!exists) {
            newPunishments.push({
              personnelId: targetId,
              shift: 0,
              startDate: todayStr,
              endDate: todayStr,
              status: 'todo',
              source: 'bed',
              remark: `เตียง ${v.bedNo}: ${v.remark}`
            });
          }
        }
      });

      if (newPunishments.length > 0) {
        await fetch('/api/duty-meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'punishment',
            data: newPunishments,
            overwrite: false
          })
        });
      }

      alert('บันทึกผลการตรวจเรียบร้อยแล้ว');
      // Do NOT clear violations to persist them on screen
      // setViolations([]);
      // setInspectionDate('');
      await fetchData(); // refresh reports & punishments
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    }
    setSaving(false);
  };

  const handleCopyInspection = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // --- Handlers for Tab 2 (Auto-parse) ---

  const handleImportReport = (report: BedReport) => {
    // Fill text in Tab 2 and switch to it
    setInitialImportText(report.rawText);
    setActiveTab(1); // Switch to Tab 2
  };

  const handleApplyToGrid = (newViolations: BedViolation[], dateText?: string) => {
    setViolations(newViolations);
    if (dateText) setInspectionDate(dateText);
    setActiveTab(0); // Switch back to Tab 1
  };

  // --- Handlers for Tab 4 (Manage) ---

  const handleSaveBeds = async (updatedBeds: BedEntry[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/beds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beds: updatedBeds }),
      });
      if (!res.ok) throw new Error('Failed to save beds');
      alert('บันทึกข้อมูลเตียงเรียบร้อยแล้ว');
      await fetchData();
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลเตียง');
    }
    setSaving(false);
  };

  // --- Handlers for Kanban ---
  const handleUpdateKanbanPersonnel = async (punishmentId: string, newPersonnelId: string) => {
    const updated = punishments.find(p => p.id === punishmentId);
    if (!updated) return;
    const newObj = { ...updated, personnelId: newPersonnelId };
    const fullNewList = punishments.map(p => p.id === punishmentId ? newObj : p);
    try {
      await fetch('/api/duty-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'punishment', data: fullNewList, overwrite: true })
      });
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Failed to update personnel');
    }
  };

  const handleUpdateKanbanStatus = async (punishmentId: string, status: 'todo' | 'progress' | 'done', shift?: number, targetDate?: string) => {
    setPunishments(prev => prev.map(p => {
      if (p.id === punishmentId) {
        return { ...p, status, shift: shift ?? p.shift, startDate: targetDate || p.startDate };
      }
      return p;
    }));

    // Find the updated item
    const updated = punishments.find(p => p.id === punishmentId);
    if (!updated) return;

    const newObj = { ...updated, status, shift: shift ?? updated.shift, startDate: targetDate || updated.startDate };

    // Compute the full new list of punishments:
    const fullNewList = punishments.map(p => p.id === punishmentId ? newObj : p);
    try {
      await fetch('/api/duty-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'punishment', data: fullNewList, overwrite: true })
      });
      
      // If moving to 'progress', we also need to inject into targetDate's duty roster
      if (status === 'progress' && shift) {
        const dutyDateStr = targetDate || newObj.startDate || new Date().toISOString().split('T')[0];
        // 1. Fetch duty for target date
        const dutyRes = await fetch(`/api/duty?date=${dutyDateStr}`);
        const dutyData = await dutyRes.json();
        
        let targetShift = dutyData.shift;
        if (!targetShift) {
          // If no duty for today, initialize a blank one
          const defaultSlots = Array(6).fill(null).map((_, i) => ({ 
            id: crypto.randomUUID(), 
            start: `${(i*4).toString().padStart(2, '0')}:00`, 
            end: `${((i*4)+4).toString().padStart(2, '0')}:00`, 
            personnelId: '', 
            order: i + 1 
          }));
          targetShift = {
            id: dutyDateStr,
            date: dutyDateStr,
            location: 'กองร้อยทหารปืนใหญ่',
            batchMode: 'mixed',
            timeSlots: defaultSlots
          };
        }

        // 2. Overwrite the specific shift (shift is 1-indexed)
        const slotIndex = shift - 1;
        if (targetShift.timeSlots && targetShift.timeSlots[slotIndex]) {
          targetShift.timeSlots[slotIndex].personnelId = newObj.personnelId;
          targetShift.timeSlots[slotIndex].isPunishment = true;
          
          // 3. POST it back
          await fetch('/api/duty', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shift: targetShift })
          });
        }
      }
      
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Common Dialog Props
  const selectedBedInfo = beds.find(b => b.bedNo === selectedBed);
  let selectedBedTitle = selectedBedInfo?.ownerName || '';
  if (!selectedBedTitle) {
    const p = personnel.find(p => p.id === selectedBedInfo?.personnelId);
    if (p) selectedBedTitle = `${p.rank}${p.firstName} ${p.lastName}`;
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-10">
      <PageHeader
        title="ตรวจโรงนอน"
        description="ตรวจสอบความเรียบร้อยของโรงนอนและสถิติ"
      />

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab icon={<SingleBedIcon />} iconPosition="start" label="ตรวจเตียง" />
        <Tab icon={<ContentPasteIcon />} iconPosition="start" label="วางข้อความ" />
        <Tab icon={<BarChartIcon />} iconPosition="start" label="สถิติและประวัติ" />
        <Tab icon={<GavelIcon />} iconPosition="start" label="จัดการดองเวร" />
        <Tab icon={<SettingsIcon />} iconPosition="start" label="จัดการเตียง" />
      </Tabs>

      {activeTab === 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-6 items-start w-full pb-4">
            {/* Grid Area */}
            <div className="w-full">
              <BedGrid 
                beds={beds}
                personnel={personnel}
                violations={violations}
                onBedClick={handleBedClick}
              />
            </div>
          </div>

          {/* Universal FAB and Right Side Drawer */}
          <InspectionFab 
            violations={violations}
            dateText={inspectionDate}
            onCopy={handleCopyInspection}
            onSave={handleSaveInspection}
            onClear={handleClearViolations}
            isSaving={saving}
          />

          {/* Dialog for editing remark */}
          <BedRemarkDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            bedNo={selectedBed}
            title={selectedBedTitle}
            initialRemark={violations.find(v => v.bedNo === selectedBed)?.remark || ''}
            onSave={handleSaveRemark}
            onDelete={handleDeleteRemark}
            personnel={personnel}
            bedOwnerId={selectedBedInfo?.personnelId}
          />
        </div>
      )}

      {activeTab === 1 && (
        <TextImportArea 
          onApplyToGrid={handleApplyToGrid}
          initialText={initialImportText}
        />
      )}

      {activeTab === 2 && (
        <BedStatsAndHistory 
          reports={reports}
          beds={beds}
          personnel={personnel}
          punishments={punishments}
        />
      )}

      {activeTab === 3 && (
        <PunishmentKanbanTab
          punishments={punishments}
          personnel={personnel}
          onUpdateStatus={handleUpdateKanbanStatus}
          onUpdatePersonnel={handleUpdateKanbanPersonnel}
        />
      )}

      {activeTab === 4 && (
        <BedManageTab 
          beds={beds}
          personnel={personnel}
          onSaveBeds={handleSaveBeds}
          isSaving={saving}
        />
      )}

    </div>
  );
}
