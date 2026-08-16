'use client';

import React, { useState, useEffect } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import BarChartIcon from '@mui/icons-material/BarChart';
import type { MissionYearlySummary } from '@/types';

interface YearlyMissionModalProps {
  open: boolean;
  onClose: () => void;
}

export default function YearlyMissionModal({ open, onClose }: YearlyMissionModalProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [summary, setSummary] = useState<MissionYearlySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/missions/summary?year=${selectedYear}`);
        const d = await r.json();
        if (isMounted) setSummary(d.summary || null);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchData();
    return () => { isMounted = false; };
  }, [open, selectedYear]);

  if (!open) return null;

  const completionRate = summary && summary.totalMissions > 0
    ? Math.round((summary.completedMissions / summary.totalMissions) * 100)
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div className="modal-sheet flex flex-col p-0" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', maxWidth: '800px' }}>
        <div className="modal-handle mt-4 mb-2" />
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 pt-3 border-b border-[var(--color-border)] bg-gradient-to-r from-purple-50 to-white rounded-t-[var(--radius-xl)]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2 text-purple-600">
              <AssignmentTurnedInIcon />
              <h2 className="text-[16px] font-bold m-0">
                สรุปสถิติภารกิจรอบ 1 ปี 
              </h2>
            </div>
            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="select h-8 py-0 px-2 text-[13px] bg-white border-purple-200 text-purple-700 w-fit ml-0 sm:ml-2 font-semibold"
            >
              {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map(y => (
                <option key={y} value={y}>
                  ประจำปี {y + 543}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full border-none bg-purple-500/10 cursor-pointer hover:bg-purple-500/20 transition-colors text-purple-700 shrink-0">
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-y-auto p-5 gap-5 bg-[#fafafa]">
          {loading ? (
            <div className="py-12 text-center text-[var(--color-text-muted)] text-[14px]">
              กำลังประมวลผลข้อมูลสถิติภารกิจ...
            </div>
          ) : !summary ? (
            <div className="py-12 text-center text-[var(--color-text-muted)] text-[14px]">
              ไม่มีข้อมูลสรุปภารกิจสำหรับปีนี้
            </div>
          ) : (
            <>
              {/* 4 Summary Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-white border border-purple-100 text-center shadow-sm flex flex-col justify-center items-center">
                  <span className="text-[12px] font-bold text-gray-500 uppercase">ภารกิจทั้งหมด</span>
                  <span className="text-[28px] font-black text-purple-600 my-1">{summary.totalMissions}</span>
                  <span className="text-[11px] text-gray-400">งานตลอดปี</span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-emerald-100 text-center shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
                  <span className="text-[12px] font-bold text-gray-500 uppercase relative z-10">สำเร็จแล้ว</span>
                  <span className="text-[28px] font-black text-emerald-500 my-1 relative z-10">{summary.completedMissions}</span>
                  <span className="text-[11px] text-emerald-600 font-semibold relative z-10">{completionRate}% สำเร็จ</span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-amber-100 text-center shadow-sm flex flex-col justify-center items-center">
                  <span className="text-[12px] font-bold text-gray-500 uppercase">กำลังดำเนินการ</span>
                  <span className="text-[28px] font-black text-amber-500 my-1">{summary.inProgressMissions + summary.pendingMissions}</span>
                  <span className="text-[11px] text-gray-400">รอและกำลังทำ</span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-blue-100 text-center shadow-sm flex flex-col justify-center items-center">
                  <span className="text-[12px] font-bold text-gray-500 uppercase">กำลังพลปฏิบัติ</span>
                  <span className="text-[28px] font-black text-blue-500 my-1">{summary.totalPersonnelAssigned}</span>
                  <span className="text-[11px] text-gray-400">นาย-ครั้ง</span>
                </div>
              </div>

              {/* Monthly Distribution Chart / Progress */}
              <div className="p-4 rounded-xl bg-white border border-purple-100 shadow-sm">
                <div className="flex items-center gap-1.5 font-bold text-[14px] mb-4 text-[var(--color-text-primary)]">
                  <BarChartIcon fontSize="small" className="text-purple-500" /> สถิติภารกิจรายเดือน (ม.ค. - ธ.ค. {selectedYear})
                </div>
                <div className="flex items-end justify-between h-52 mt-6 pt-4 border-b border-gray-100 gap-1 sm:gap-2 px-2">
                  {summary.monthlyBreakdown.map(m => {
                    const maxCount = Math.max(...summary.monthlyBreakdown.map(x => x.count), 1);
                    const pct = Math.round((m.count / maxCount) * 100);
                    const completedPct = m.count > 0 ? (m.completed / m.count) * 100 : 0;
                    
                    return (
                      <div key={m.month} className="flex flex-col items-center flex-1 group">
                        <div className="flex flex-col items-center mb-1 h-8 justify-end">
                          <span className={`text-[11px] font-bold transition-opacity ${m.count > 0 ? 'text-purple-600' : 'text-gray-300'}`}>
                            {m.count > 0 ? m.count : ''}
                          </span>
                        </div>
                        <div className="w-full max-w-[36px] bg-gray-50 rounded-t-md h-36 relative flex flex-col justify-end overflow-hidden group-hover:bg-purple-50 transition-colors">
                          <div 
                             className="w-full bg-purple-200 rounded-t-md transition-all duration-700 relative flex flex-col justify-end"
                             style={{ height: `${pct}%` }}
                          >
                             <div 
                               className="w-full bg-purple-600 transition-all duration-700 rounded-t-sm"
                               style={{ height: `${completedPct}%` }}
                             />
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-gray-500 mt-2 mb-1 whitespace-nowrap">
                          {m.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center items-center gap-6 mt-4 text-[11px] font-medium text-gray-500">
                   <div className="flex items-center gap-1.5">
                     <div className="w-3 h-3 bg-purple-600 rounded-sm shadow-sm"></div>
                     สำเร็จแล้ว
                   </div>
                   <div className="flex items-center gap-1.5">
                     <div className="w-3 h-3 bg-purple-200 rounded-sm shadow-sm"></div>
                     กำลังดำเนินการ
                   </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
