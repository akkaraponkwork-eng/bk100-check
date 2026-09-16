import React from 'react';
import SaveIcon from '@mui/icons-material/Save';
import type { KanbanTask } from '@/types';
import { getTaskTotal } from './TaskCard';

interface HeadcountFooterProps {
  tasks: KanbanTask[];
  totalCompany: number | '';
  onChangeTotalCompany: (v: number | '') => void;
  onSave: () => void;
  saving: boolean;
  combineCounts?: boolean;
}

export default function HeadcountFooter({
  tasks, totalCompany, onChangeTotalCompany, onSave, saving, combineCounts
}: HeadcountFooterProps) {
  const totalDistributed = tasks.reduce((s, t) => s + getTaskTotal(t), 0);
  const totalSenior = tasks.reduce((s, t) => s + (Number(t.countSenior) || 0), 0);
  const totalJunior = tasks.reduce((s, t) => s + (Number(t.countJunior) || 0), 0);
  const remaining = typeof totalCompany === 'number' ? totalCompany - totalDistributed : 0;
  const isOver = remaining < 0;

  return (
    <div
      className="fixed bottom-[env(safe-area-inset-bottom)] left-0 right-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] backdrop-blur-md transition-[left] duration-300 lg:bottom-0 lg:left-[var(--sidebar-width,240px)]"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-4 md:gap-8">
        
        <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-8">
          
          <div className="flex w-full items-center justify-between gap-2 md:w-auto md:justify-center md:gap-8">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 md:text-sm">ยอดรวม</span>
              <input
                type="number"
                min="0"
                value={totalCompany}
                onChange={e => onChangeTotalCompany(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="h-8 w-14 rounded-lg border border-gray-300 bg-gray-50 text-center text-sm font-bold text-gray-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 md:h-10 md:w-20 md:text-base"
              />
            </div>
            
            {!combineCounts && (
              <div className="flex gap-4 md:gap-6">
                <div className="text-center">
                  <div className="mb-1 text-[10px] font-semibold text-blue-600 md:text-xs">พี่</div>
                  <div className="text-sm font-bold leading-none text-blue-600 md:text-lg">{totalSenior}</div>
                </div>
                <div className="text-center">
                  <div className="mb-1 text-[10px] font-semibold text-purple-600 md:text-xs">น้อง</div>
                  <div className="text-sm font-bold leading-none text-purple-600 md:text-lg">{totalJunior}</div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex w-full items-center justify-between gap-2 rounded-lg bg-black/5 px-3 py-1.5 md:w-auto md:flex-1 md:justify-center md:gap-8 md:bg-transparent md:p-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 md:text-[13px]">ยอดจ่ายรวม:</span>
              <span className="text-sm font-bold text-gray-900 md:text-lg">{totalDistributed}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 md:text-[13px]">คงเหลือ:</span>
              <span className={`text-[15px] font-bold md:text-xl ${isOver ? 'text-red-500' : 'text-green-500'}`}>
                {typeof totalCompany === 'number' ? remaining : '—'}
              </span>
            </div>
          </div>
          
        </div>

        <button
          onClick={onSave}
          disabled={saving || isOver}
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-sky-600 px-6 font-bold text-white shadow-[0_4px_12px_rgba(59,130,246,0.25)] transition-colors hover:bg-sky-700 disabled:bg-gray-400 disabled:shadow-none"
        >
          {!saving && <SaveIcon fontSize="small" />}
          {saving ? '...' : 'บันทึก'}
        </button>
        
      </div>
    </div>
  );
}
