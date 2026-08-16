'use client';

import React from 'react';
import { Typography, Chip } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlaceIcon from '@mui/icons-material/Place';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import type { Mission, Personnel } from '@/types';
import { MISSION_STATUS_LABELS } from '@/types';
import Link from 'next/link';

interface MissionSummaryCardProps {
  todayMissions: Mission[];
  personnelList: Personnel[];
  yearlyTotal: number;
  completedTotal: number;
  onOpenYearlyModal: () => void;
}

export default function MissionSummaryCard({
  todayMissions,
  yearlyTotal,
  completedTotal,
  onOpenYearlyModal,
}: MissionSummaryCardProps) {
  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)] flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-500">
            <AssignmentIcon fontSize="small" />
          </div>
          <div>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
              ภารกิจประจำวัน ({todayMissions.length})
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
              สะสมปีนี้: {yearlyTotal} งาน (เสร็จ {completedTotal})
            </Typography>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenYearlyModal}
          className="text-xs font-semibold bg-purple-500/10 text-purple-600 rounded-lg px-2.5 py-1.5 flex items-center gap-1 transition-colors duration-200 hover:bg-purple-500/20 cursor-pointer border-none outline-none"
        >
          <BarChartIcon style={{ fontSize: 16 }} />
          สถิติ 1 ปี
        </button>
      </div>

      {/* Mission List */}
      {todayMissions.length === 0 ? (
        <div className="py-4 px-3 rounded-lg bg-[var(--color-surface-2)] text-center text-[var(--color-text-muted)]">
          <Typography variant="body2" sx={{ fontSize: 12 }}>
            วันนี้ยังไม่มีบันทึกภารกิจพิเศษ
          </Typography>
          <Link href="/calendar" className="text-[11px] text-[var(--color-primary-light)] no-underline inline-block mt-1.5 hover:underline">
            เปิดหน้าปฏิทินเพื่อดูหรือลงภารกิจ →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {todayMissions.slice(0, 3).map(m => {
            const statusConfig = MISSION_STATUS_LABELS[m.status] || { label: m.status, color: '#6b7280' };
            const timeText = m.startTime ? `${m.startTime}${m.endTime ? ' - ' + m.endTime : ''} น.` : 'ตลอดวัน';
            const assignedCount = m.assignedPersonnelIds?.length || 0;

            return (
              <div
                key={m.id}
                className="p-2.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] transition-all duration-300 hover:shadow-sm hover:border-[var(--color-primary-light)]"
              >
                <div className="flex items-center justify-between mb-1">
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                    {m.title}
                  </Typography>
                  <Chip
                    label={statusConfig.label}
                    size="small"
                    sx={{
                      fontSize: 10,
                      height: 20,
                      bgcolor: `${statusConfig.color}20`,
                      color: statusConfig.color,
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-2.5 text-[11px] text-[var(--color-text-muted)]">
                  <span className="flex items-center gap-1">
                    <AccessTimeIcon style={{ fontSize: 12 }} /> {timeText}
                  </span>
                  {m.location && (
                    <span className="flex items-center gap-1">
                      <PlaceIcon style={{ fontSize: 12 }} /> {m.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <PeopleAltIcon style={{ fontSize: 12 }} />
                    {assignedCount > 0 ? `${assignedCount} นาย` : 'ภารกิจกองร้อย'}
                  </span>
                </div>
              </div>
            );
          })}

          {todayMissions.length > 3 && (
            <Link
              href="/calendar"
              className="text-center text-[11px] text-[var(--color-primary-light)] no-underline py-0.5 hover:underline"
            >
              ดูภารกิจทั้งหมดในปฏิทิน ({todayMissions.length} ภารกิจ) →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
