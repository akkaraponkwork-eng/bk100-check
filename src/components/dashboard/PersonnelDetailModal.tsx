import React, { useState, useEffect } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import GroupIcon from '@mui/icons-material/Group';
import type { Personnel } from '@/types';

interface PersonnelDetailModalProps {
  open: boolean;
  onClose: () => void;
  personnel: Personnel[];
  ncosCount: number;
  privatesCount: number;
}

export default function PersonnelDetailModal({ open, onClose, personnel, ncosCount, privatesCount }: PersonnelDetailModalProps) {
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (open) setPage(1);
  }, [open]);

  if (!open) return null;

  const totalPages = Math.ceil(personnel.length / itemsPerPage);
  const currentData = personnel.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const statusColors: Record<string, string> = {
    available: 'bg-emerald-500',
    on_duty: 'bg-blue-500',
    leave: 'bg-amber-500',
    sick: 'bg-red-500'
  };

  const statusLabels: Record<string, string> = {
    available: 'ประจำการ',
    on_duty: 'เข้าเวร',
    leave: 'ลา',
    sick: 'ป่วย'
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div className="modal-sheet flex flex-col p-0" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', maxWidth: '500px' }}>
        <div className="modal-handle mt-4 mb-2" />
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 pt-3 border-b border-[var(--color-border)] bg-gradient-to-r from-blue-50 to-white rounded-t-[var(--radius-xl)]">
          <div className="flex items-center gap-2 text-blue-500">
            <GroupIcon />
            <h2 className="text-[16px] font-bold m-0">
              กำลังพลทั้งหมด <span className="text-blue-500/70 text-[14px]">({personnel.length} นาย)</span>
            </h2>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full border-none bg-blue-500/10 cursor-pointer hover:bg-blue-500/20 transition-colors text-blue-600">
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-y-auto p-4 gap-4">
          
          {/* Summary Boxes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-white to-blue-50 p-3 rounded-xl border border-blue-100 shadow-sm flex flex-col items-center justify-center">
              <span className="text-[12px] font-bold text-blue-600/80 uppercase tracking-wide">นายสิบ</span>
              <span className="text-[24px] font-black text-blue-600">{ncosCount}</span>
            </div>
            <div className="bg-gradient-to-br from-white to-emerald-50 p-3 rounded-xl border border-emerald-100 shadow-sm flex flex-col items-center justify-center">
              <span className="text-[12px] font-bold text-emerald-600/80 uppercase tracking-wide">พลทหาร</span>
              <span className="text-[24px] font-black text-emerald-600">{privatesCount}</span>
            </div>
          </div>

          {/* List */}
          <div className="flex flex-col gap-2">
            {currentData.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusColors[p.status] || 'bg-gray-300'}`}></div>
                <div className="flex flex-col flex-1 pl-2">
                  <span className="text-[15px] font-medium text-[var(--color-text-primary)]">
                    {p.rank}{p.firstName} {p.lastName}
                  </span>
                  <span className="text-[12px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${statusColors[p.status] || 'bg-gray-300'}`}></span>
                    {statusLabels[p.status] || 'ไม่ทราบ'}
                  </span>
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--color-border)]">
                <button 
                  type="button"
                  className="btn btn-ghost btn-sm px-3" 
                  disabled={page === 1} 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  ก่อนหน้า
                </button>
                <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">
                  หน้า {page} / {totalPages}
                </span>
                <button 
                  type="button"
                  className="btn btn-ghost btn-sm px-3" 
                  disabled={page === totalPages} 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  ถัดไป
                </button>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
