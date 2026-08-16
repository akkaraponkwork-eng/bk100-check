import React, { useState, useEffect } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import type { Personnel } from '@/types';

interface LeaveDetailModalProps {
  open: boolean;
  onClose: () => void;
  leaveCount: number;
  personnel: Personnel[];
}

export default function LeaveDetailModal({ open, onClose, leaveCount, personnel }: LeaveDetailModalProps) {
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (open) setPage(1);
  }, [open]);

  if (!open) return null;

  const leavePersonnel = personnel.filter(p => p.status === 'leave');
  const totalPages = Math.ceil(leavePersonnel.length / itemsPerPage);
  const currentData = leavePersonnel.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div className="modal-sheet flex flex-col p-0" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', maxWidth: '500px' }}>
        <div className="modal-handle mt-4 mb-2" />
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 pt-3 border-b border-[var(--color-border)] bg-gradient-to-r from-red-50 to-white rounded-t-[var(--radius-xl)]">
          <div className="flex items-center gap-2 text-red-500">
            <DirectionsWalkIcon />
            <h2 className="text-[16px] font-bold m-0">
              ทหารที่ลาพัก <span className="text-red-500/70 text-[14px]">({leaveCount} นาย)</span>
            </h2>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full border-none bg-red-500/10 cursor-pointer hover:bg-red-500/20 transition-colors text-red-600">
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-y-auto p-4 gap-2">
          {leavePersonnel.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-muted)] text-[14px]">ไม่มีทหารลาพัก</div>
          ) : (
            <>
              {currentData.map((p, i) => {
                const formatDate = (dateStr: string) => {
                  const d = new Date(dateStr);
                  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                };

                return (
                  <div key={i} className="flex flex-col p-3 rounded-lg bg-[var(--color-surface)] border border-red-100 shadow-sm hover:border-red-300 transition-colors relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400"></div>
                    <div className="flex justify-between items-center pl-2">
                      <div className="text-[15px] font-medium text-[var(--color-text-primary)]">
                        {p.rank}{p.firstName} {p.lastName}
                      </div>
                      {p.leaveDetails ? (
                        <div className="text-[12px] text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                          {formatDate(p.leaveDetails.startDate)} - {formatDate(p.leaveDetails.endDate)}
                        </div>
                      ) : (
                        <div className="text-[12px] text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                          ลาพัก
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
