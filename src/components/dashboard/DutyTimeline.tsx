import React from 'react';
import Link from 'next/link';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { DutyShift, Personnel, ShiftSlot } from '@/types';

function getCurrentSlotIndex(): number {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const total = h * 60 + m;
  if (total >= 18 * 60) return Math.floor((total - 18 * 60) / 120);
  if (total < 6 * 60) return Math.floor((total + 6 * 60) / 120);
  return -1;
}

interface DutyTimelineProps {
  shift: DutyShift | null;
  personnel: Personnel[];
}

export default function DutyTimeline({ shift, personnel }: DutyTimelineProps) {
  const currentSlot = getCurrentSlotIndex();
  const personnelMap = Object.fromEntries(personnel.map(p => [p.id, p]));

  // Helper: resolve display name from a slot (handles CUSTOM: prefix)
  const resolveSlotName = (slot: ShiftSlot) => {
    if (!slot.personnelId) return 'ไม่ระบุ';
    if (slot.personnelId.startsWith('CUSTOM:')) return slot.personnelId.slice(7);
    const p = personnelMap[slot.personnelId];
    return p ? `${p.rank}${p.firstName} ${p.lastName}` : 'ไม่ระบุ';
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="flex-between mb-2">
        <h3 style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AccessTimeIcon fontSize="small" /> เวรยามวันนี้
        </h3>
        <Link href="/duty" style={{ fontSize: 12, color: 'var(--color-primary-light)', textDecoration: 'none' }}>
          จัดเวร →
        </Link>
      </div>
      {shift ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {shift.timeSlots.sort((a, b) => a.order - b.order).map((slot, i) => {
            const isCurrent = i === currentSlot;
            return (
              <div
                key={slot.id || i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8,
                  background: isCurrent ? 'rgba(59,130,246,0.15)' : 'var(--color-surface-2)',
                  border: isCurrent ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                }}
              >
                <div style={{ minWidth: 80, fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: isCurrent ? 600 : 400 }}>
                  {slot.start}–{slot.end}
                </div>
                {isCurrent && <span style={{ fontSize: 10, background: 'var(--color-primary)', color: 'white', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>ปัจจุบัน</span>}
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', flex: 1 }}>
                  {resolveSlotName(slot)}
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: '2px' }}>
            <LocationOnIcon style={{ fontSize: 14 }} /> {shift.location}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
          ยังไม่ได้จัดเวรวันนี้
          <br />
          <Link href="/duty" style={{ color: 'var(--color-primary-light)', fontWeight: 600, textDecoration: 'none' }}>
            + จัดเวรเลย
          </Link>
        </div>
      )}
    </div>
  );
}
