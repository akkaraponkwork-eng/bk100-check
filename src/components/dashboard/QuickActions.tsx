import React from 'react';
import Link from 'next/link';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import type { DutyShift } from '@/types';

interface QuickActionsProps {
  todayShift: DutyShift | null;
  onExport: () => void;
}

export default function QuickActions({ todayShift, onExport }: QuickActionsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
      <Link href="/duty" className="btn btn-primary" style={{ textDecoration: 'none', fontSize: 14 }}>
        <AccessTimeIcon fontSize="small" /> จัดเวรวันนี้
      </Link>
      <Link href="/kanban" className="btn btn-ghost" style={{ textDecoration: 'none', fontSize: 14 }}>
        <AssignmentIcon fontSize="small" /> บันทึกยอด
      </Link>
      {todayShift && (
        <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={onExport}>
          <AssignmentIcon fontSize="small" /> Copy ข้อความเวร
        </button>
      )}
      <Link href="/calendar" className="btn btn-ghost" style={{ textDecoration: 'none', fontSize: 14 }}>
        <CalendarMonthIcon fontSize="small" /> ปฏิทิน
      </Link>
    </div>
  );
}
