'use client';

import React, { useMemo, useState } from 'react';
import { 
  Select, MenuItem, FormControl, InputLabel, ToggleButtonGroup, ToggleButton,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SingleBedIcon from '@mui/icons-material/SingleBed';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { BedReport, BedViolation, BedEntry, Personnel, PunishmentEntry } from '@/types';
import BlockIcon from '@mui/icons-material/Block';

interface BedStatsAndHistoryProps {
  reports: BedReport[];
  beds: BedEntry[];
  personnel: Personnel[];
  punishments?: PunishmentEntry[];
}

export default function BedStatsAndHistory({ reports, beds, personnel, punishments = [] }: BedStatsAndHistoryProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'processed'>('all');
  const [viewReport, setViewReport] = useState<BedReport | null>(null);

  // Derive available months from reports
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    reports.forEach(r => {
      if (r.createdAt) {
        // e.g. "2026-08-19T..." -> "2026-08"
        months.add(r.createdAt.substring(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [reports]);

  const activeMonthForStats = selectedMonth;

  const statsData = useMemo(() => {
    let targetReports = reports;
    if (activeMonthForStats !== 'all') {
      targetReports = reports.filter(r => r.createdAt.startsWith(activeMonthForStats));
    }

    const bedCountMap = new Map<string, number>();
    const bedRemarksMap = new Map<string, string[]>();
    let totalInspections = targetReports.length;

    targetReports.forEach(r => {
      if (r.violations) {
        try {
          const violations: BedViolation[] = JSON.parse(r.violations);
          violations.forEach(v => {
            bedCountMap.set(v.bedNo, (bedCountMap.get(v.bedNo) || 0) + 1);
            
            const existingRemarks = bedRemarksMap.get(v.bedNo) || [];
            if (!existingRemarks.includes(v.remark)) {
               existingRemarks.push(v.remark);
            }
            bedRemarksMap.set(v.bedNo, existingRemarks);
          });
        } catch (e) {
          console.error("Failed to parse violations", e);
        }
      }
    });

    const repeatOffendersCount = Array.from(bedCountMap.values()).filter(c => c > 1).length;
    
    // Sort for chart (top 10)
    const chartData = Array.from(bedCountMap.entries())
      .map(([bedNo, count]) => {
        const bed = beds.find(b => b.bedNo === bedNo);
        const p = personnel.find(p => p.id === bed?.personnelId);
        const name = p ? p.firstName : (bed?.ownerName || 'ว่าง');
        return {
          bedNo,
          name,
          label: `เตียง ${bedNo}`,
          count
        };
      })
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return parseInt(a.bedNo) - parseInt(b.bedNo);
      })
      .slice(0, 10);
      
    const topOffender = chartData.length > 0 ? chartData[0] : null;

    return { totalInspections, repeatOffendersCount, topOffender, chartData };
  }, [reports, activeMonthForStats, beds, personnel]);

  const filteredHistory = useMemo(() => {
    return reports
      .filter(r => selectedMonth === 'all' || r.createdAt.startsWith(selectedMonth))
      .filter(r => historyFilter === 'all' || r.status === historyFilter)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reports, selectedMonth, historyFilter]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // Optionally add toast here
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>เดือน</InputLabel>
          <Select
            value={selectedMonth}
            label="เดือน"
            onChange={(e) => setSelectedMonth(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="all">ทั้งหมด</MenuItem>
            {availableMonths.map(m => (
              <MenuItem key={m} value={m}>{m}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      {/* Stats Section */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          สถิติ {activeMonthForStats !== 'all' ? `ประจำเดือน ${activeMonthForStats}` : ''}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="p-5 rounded-2xl bg-white border border-blue-100 text-center shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>
             <AssignmentLateIcon className="absolute top-4 right-4 text-blue-200 z-0" sx={{ fontSize: 40 }} />
             <span className="text-sm font-bold text-gray-500 uppercase relative z-10">จำนวนครั้งที่ตรวจ</span>
             <span className="text-4xl font-black text-blue-600 my-2 relative z-10">{statsData.totalInspections}</span>
             <span className="text-xs text-gray-400 relative z-10">ครั้ง</span>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-2xl bg-white border border-amber-100 text-center shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>
             <WarningAmberIcon className="absolute top-4 right-4 text-amber-200 z-0" sx={{ fontSize: 40 }} />
             <span className="text-sm font-bold text-gray-500 uppercase relative z-10">ผิดระเบียบซ้ำ {'>='} 2 ครั้ง</span>
             <span className="text-4xl font-black text-amber-500 my-2 relative z-10">{statsData.repeatOffendersCount}</span>
             <span className="text-xs text-gray-400 relative z-10">เตียง</span>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-2xl bg-white border border-red-100 text-center shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>
             <SingleBedIcon className="absolute top-4 right-4 text-red-200 z-0" sx={{ fontSize: 40 }} />
             <span className="text-sm font-bold text-gray-500 uppercase relative z-10">เตียงที่ผิดบ่อยสุด</span>
             <span className="text-2xl font-black text-red-500 my-2 relative z-10">
               {statsData.topOffender ? `เตียง ${statsData.topOffender.bedNo}` : '-'}
             </span>
             <span className="text-xs text-red-600 font-semibold relative z-10 truncate w-full px-2">
               {statsData.topOffender ? `${statsData.topOffender.name} (${statsData.topOffender.count} ครั้ง)` : 'ยังไม่มีข้อมูล'}
             </span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-6">10 อันดับเตียงที่ไม่เรียบร้อยบ่อยที่สุด</h3>
        <div className="h-[300px] w-full">
          {statsData.chartData.length > 0 ? (
             <ResponsiveContainer>
             <BarChart data={statsData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
               <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
               <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
               <RechartsTooltip 
                 cursor={{ fill: '#f9fafb' }}
                 formatter={(value: any) => [`${value} ครั้ง`, 'จำนวน']}
                 labelFormatter={(label, entries) => {
                    const entry = entries[0]?.payload;
                    return entry ? `${label} (${entry.name})` : label;
                 }}
               />
               <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={50} />
             </BarChart>
           </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <span className="text-gray-400">ไม่มีข้อมูลสำหรับเดือนนี้</span>
            </div>
          )}
        </div>
      </div>

      {/* Punishment Stats Section */}
      {punishments.filter(p => p.source === 'bed').length > 0 && (
        <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BlockIcon className="text-red-500" /> สรุปดองเวรโรงนอน
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 text-left font-bold text-gray-600">ลำดับ</th>
                  <th className="py-3 px-4 text-left font-bold text-gray-600">ชื่อ</th>
                  <th className="py-3 px-4 text-center font-bold text-gray-600">จำนวนครั้ง</th>
                  <th className="py-3 px-4 text-center font-bold text-gray-600">สถานะ</th>
                  <th className="py-3 px-4 text-left font-bold text-gray-600">ข้อหาล่าสุด</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const bedPunishments = punishments.filter(p => p.source === 'bed');
                  // Group by personnelId and count
                  const countMap = new Map<string, { count: number; latestRemark: string; statuses: string[] }>();
                  bedPunishments.forEach(p => {
                    const existing = countMap.get(p.personnelId);
                    if (existing) {
                      existing.count++;
                      if (p.remark) existing.latestRemark = p.remark;
                      existing.statuses.push(p.status || 'todo');
                    } else {
                      countMap.set(p.personnelId, {
                        count: 1,
                        latestRemark: p.remark || '-',
                        statuses: [p.status || 'todo']
                      });
                    }
                  });

                  return Array.from(countMap.entries())
                    .sort((a, b) => {
                      if (b[1].count !== a[1].count) return b[1].count - a[1].count;
                      const pA = personnel.find(x => x.id === a[0]);
                      const pB = personnel.find(x => x.id === b[0]);
                      const nameA = pA ? pA.firstName : a[0];
                      const nameB = pB ? pB.firstName : b[0];
                      return nameA.localeCompare(nameB, 'th');
                    })
                    .map(([pId, data], idx) => {
                      const p = personnel.find(x => x.id === pId);
                      const name = p ? `${p.rank}${p.firstName} ${p.lastName}` : 'ไม่ทราบชื่อ';
                      const statusColors: Record<string, string> = {
                        todo: 'bg-red-100 text-red-700',
                        progress: 'bg-blue-100 text-blue-700',
                        done: 'bg-green-100 text-green-700'
                      };
                      const statusLabels: Record<string, string> = {
                        todo: 'รอดำเนินการ',
                        progress: 'กำลังเข้าเวร',
                        done: 'เสร็จสิ้น'
                      };
                      const latestStatus = data.statuses[data.statuses.length - 1];
                      return (
                        <tr key={pId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-bold text-gray-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-medium text-gray-800">{name}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="bg-red-50 text-red-600 font-bold px-3 py-1 rounded-full text-xs">
                              {data.count} ครั้ง
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[latestStatus] || 'bg-gray-100 text-gray-600'}`}>
                              {statusLabels[latestStatus] || latestStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-xs max-w-[200px] truncate">{data.latestRemark}</td>
                        </tr>
                      );
                    });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History Section */}
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className="text-lg font-bold text-gray-800 m-0">ประวัติการตรวจ</h3>
          <ToggleButtonGroup
            color="primary"
            value={historyFilter}
            exclusive
            onChange={(e, val) => val && setHistoryFilter(val)}
            size="small"
            sx={{ '& .MuiToggleButton-root': { borderRadius: 2 } }}
          >
            <ToggleButton value="all">ทั้งหมด</ToggleButton>
            <ToggleButton value="pending">รอดำเนินการ</ToggleButton>
            <ToggleButton value="processed">ตรวจสอบแล้ว</ToggleButton>
          </ToggleButtonGroup>
        </div>
        
        <div className="bg-gray-50/50 rounded-xl border border-gray-200">
          {filteredHistory.map((report, idx) => (
             <div key={report.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-gray-200 last:border-0 hover:bg-white transition-colors gap-3">
               <div className="flex flex-col gap-1">
                 <div className="flex items-center gap-2">
                   <span className="font-bold text-gray-800">{new Date(report.createdAt).toLocaleString('th-TH')}</span>
                   <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${report.status === 'processed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                     {report.status === 'processed' ? 'ตรวจสอบแล้ว' : 'รอตรวจสอบ'}
                   </span>
                 </div>
                 <span className="text-sm text-gray-500 truncate max-w-xs sm:max-w-md">
                   {report.rawText.split('\n')[0]} ...
                 </span>
               </div>
               
               <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                 <Tooltip title="คัดลอกข้อความ">
                   <IconButton aria-label="copy" onClick={() => handleCopy(report.rawText)} size="small" className="text-gray-400 hover:text-gray-700">
                     <ContentCopyIcon fontSize="small" />
                   </IconButton>
                 </Tooltip>
                 <Tooltip title="ดูรายละเอียด">
                   <IconButton aria-label="view" onClick={() => setViewReport(report)} size="small" className="text-gray-400 hover:text-gray-700 bg-white shadow-sm border border-gray-200">
                     <VisibilityIcon fontSize="small" />
                   </IconButton>
                 </Tooltip>
               </div>
             </div>
          ))}
          {filteredHistory.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              ไม่พบประวัติการตรวจในเดือนที่เลือก
            </div>
          )}
        </div>
      </div>

      {/* View Full Report Dialog */}
      <Dialog open={!!viewReport} onClose={() => setViewReport(null)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}>
        <DialogTitle className="flex justify-between items-center p-5 pb-4 border-b border-gray-100 font-bold text-gray-800">
          รายละเอียดการตรวจ
          <IconButton onClick={() => setViewReport(null)} size="small" className="bg-gray-50 hover:bg-gray-100">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent className="p-5">
          {viewReport && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-gray-500 uppercase">วันที่สร้าง</span>
                <span className="text-gray-800 font-medium">{new Date(viewReport.createdAt).toLocaleString('th-TH')}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-gray-500 uppercase">สถานะ</span>
                <span className={`w-fit text-sm px-2.5 py-0.5 rounded-md font-semibold ${viewReport.status === 'processed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {viewReport.status === 'processed' ? 'ตรวจสอบแล้ว' : 'รอดำเนินการ'}
                </span>
              </div>
              
              <div className="mt-2 flex flex-col gap-1">
                <span className="text-sm font-bold text-gray-500 uppercase">ข้อความแจ้งเตือน</span>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap m-0 font-medium">
                    {viewReport.rawText}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions className="p-4 border-t border-gray-100 bg-gray-50/50">
          <Button onClick={() => setViewReport(null)} sx={{ color: 'text.secondary', fontWeight: 'bold' }}>ปิด</Button>
          <Button 
            variant="contained" 
            startIcon={<ContentCopyIcon />}
            sx={{ borderRadius: 2, fontWeight: 'bold', boxShadow: 'none' }}
            onClick={() => {
              if (viewReport) {
                handleCopy(viewReport.rawText);
                setViewReport(null);
              }
            }}
          >
            คัดลอกข้อความ
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
