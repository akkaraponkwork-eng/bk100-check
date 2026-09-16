import React from 'react';
import BarChartIcon from '@mui/icons-material/BarChart';
import type { KanbanTask } from '@/types';

interface SummaryModalProps {
  onClose: () => void;
  totalCompany: number | '';
  tasks: KanbanTask[];
  combineCounts?: boolean;
}

export default function SummaryModal({ onClose, totalCompany, tasks, combineCounts }: SummaryModalProps) {
  const totalSenior = tasks.reduce((s, t) => s + (Number(t.countSenior) || 0), 0);
  const totalJunior = tasks.reduce((s, t) => s + (Number(t.countJunior) || 0), 0);
  const totalLegacy = tasks.reduce((s, t) => s + (Number(t.count) || 0), 0);
  const totalDistributed = totalSenior + totalJunior + totalLegacy;
  const remaining = typeof totalCompany === 'number' ? totalCompany - totalDistributed : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <BarChartIcon className="text-sky-600" />
          <h2 className="text-[18px] font-bold text-gray-900">สรุปยอดกำลังพล</h2>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="mb-3 flex justify-between">
              <span className="text-gray-500">ยอดรวมทั้งหมด</span>
              <span className="text-base font-bold text-gray-900">{totalCompany || 0}</span>
            </div>

            <div className="mb-2 flex justify-between">
              <span className="text-gray-500">ยอดจ่ายงาน</span>
              <span className="text-base font-bold text-sky-600">{totalDistributed}</span>
            </div>

            {!combineCounts && (
              <>
                <div className="mb-1 flex justify-between pl-4 text-sm">
                  <span className="text-gray-500">- รุ่นพี่</span>
                  <span className="font-semibold text-gray-900">{totalSenior}</span>
                </div>
                <div className="mb-1 flex justify-between pl-4 text-sm">
                  <span className="text-gray-500">- รุ่นน้อง</span>
                  <span className="font-semibold text-gray-900">{totalJunior}</span>
                </div>
              </>
            )}
            {!combineCounts && totalLegacy > 0 && (
              <div className="mb-1 flex justify-between pl-4 text-sm">
                <span className="text-gray-500">- อื่นๆ (ไม่ระบุรุ่น)</span>
                <span className="font-semibold text-gray-900">{totalLegacy}</span>
              </div>
            )}

            <div className="my-4 border-t border-dashed border-gray-300" />

            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">ยอดคงเหลือ</span>
              <span
                className={`text-xl font-bold ${
                  remaining < 0 ? 'text-red-500' : 'text-green-500'
                }`}
              >
                {remaining}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="rounded-b-2xl px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-sky-700"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
