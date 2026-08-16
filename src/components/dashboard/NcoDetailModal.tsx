import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import type { Personnel } from '@/types';

interface NcoDetailModalProps {
  open: boolean;
  onClose: () => void;
  ncoPersonnel: Personnel | null;
  todayAssistants: (Personnel | undefined)[];
}

export default function NcoDetailModal({ open, onClose, ncoPersonnel, todayAssistants }: NcoDetailModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div className="modal-sheet flex flex-col p-0" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', maxWidth: '400px' }}>
        <div className="modal-handle mt-4 mb-2" />
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 pt-3 border-b border-[var(--color-border)] bg-gradient-to-r from-amber-50 to-white rounded-t-[var(--radius-xl)]">
          <div className="flex items-center gap-2 text-amber-500">
            <PersonIcon />
            <h2 className="text-[16px] font-bold m-0">
              รายละเอียดสิบเวร
            </h2>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full border-none bg-amber-500/10 cursor-pointer hover:bg-amber-500/20 transition-colors text-amber-600">
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-y-auto p-5 gap-5">
          {/* NCO */}
          <div className="bg-[var(--color-surface-2)] p-4 rounded-xl border border-amber-200/50 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <PersonIcon sx={{ fontSize: 60 }} />
            </div>
            <div className="text-[12px] font-bold text-amber-600/80 uppercase tracking-wide mb-1">
              สิบเวรประจำวัน
            </div>
            <div className="text-[18px] font-bold text-[var(--color-text-primary)]">
              {ncoPersonnel ? `${ncoPersonnel.rank}${ncoPersonnel.firstName} ${ncoPersonnel.lastName}` : 'ยังไม่ระบุ'}
            </div>
          </div>

          {/* Assistants */}
          <div className="bg-[var(--color-surface-2)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
            <div className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3 flex justify-between items-center">
              <span>ผู้ช่วยสิบเวร</span>
              <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-[10px]">{todayAssistants.length} นาย</span>
            </div>
            
            {todayAssistants.length > 0 ? (
              <div className="flex flex-col gap-2">
                {todayAssistants.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-[10px] font-bold">
                      {i + 1}
                    </div>
                    <div className="text-[14px] font-medium text-[var(--color-text-primary)]">
                      {a ? `${a.rank}${a.firstName} ${a.lastName}` : 'ไม่ทราบชื่อ'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-[var(--color-text-muted)] text-center py-4 bg-white rounded-lg border border-dashed border-gray-200">
                ไม่มีผู้ช่วยสิบเวร
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
