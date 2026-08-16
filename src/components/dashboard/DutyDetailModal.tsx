import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { DutyShift, Personnel } from '@/types';

interface DutyDetailModalProps {
  open: boolean;
  onClose: () => void;
  todayShift: DutyShift | null;
  personnel: Personnel[];
}

export default function DutyDetailModal({ open, onClose, todayShift, personnel }: DutyDetailModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div className="modal-sheet flex flex-col p-0" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', maxWidth: '500px' }}>
        <div className="modal-handle mt-4 mb-2" />
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 pt-3 border-b border-[var(--color-border)] bg-gradient-to-r from-emerald-50 to-white rounded-t-[var(--radius-xl)]">
          <div className="flex items-center gap-2 text-emerald-600">
            <AccessTimeIcon />
            <h2 className="text-[16px] font-bold m-0">
              เวรยามวันนี้ <span className="text-emerald-700/70 text-[14px]">({todayShift?.location || 'ไม่มีข้อมูล'})</span>
            </h2>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full border-none bg-emerald-500/10 cursor-pointer hover:bg-emerald-500/20 transition-colors text-emerald-700">
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-y-auto p-4 gap-2">
          {!todayShift || todayShift.timeSlots.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-muted)] text-[14px]">ไม่มีข้อมูลเวรยามวันนี้</div>
          ) : (
            todayShift.timeSlots.sort((a, b) => a.order - b.order).map((slot, i) => {
              const p = personnel.find(x => x.id === slot.personnelId);
              const name = p ? `${p.rank}${p.firstName} ${p.lastName}` : (slot.personnelId?.startsWith('CUSTOM:') ? slot.personnelId.slice(7) : 'ไม่ระบุ');
              return (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:border-emerald-300 transition-colors">
                  <div className="w-[80px] shrink-0 text-center font-bold text-[13px] text-emerald-600 bg-emerald-50 rounded-md py-1">
                    {slot.start}-{slot.end}
                  </div>
                  <div className="text-[15px] font-medium text-[var(--color-text-primary)]">
                    {name}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
