import React, { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import { format } from 'date-fns';
import type { KanbanTask } from '@/types';

interface AddTaskModalProps {
  onClose: () => void;
  onAdd: (t: Omit<KanbanTask, 'id'>) => void;
}

export default function AddTaskModal({ onClose, onAdd }: AddTaskModalProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({
    title: '',
    category: 'งานนอก/อื่นๆ' as KanbanTask['category'],
    location: '',
    remark: '',
    date: today,
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <AddIcon className="text-sky-600" />
          <h2 className="text-[18px] font-bold text-gray-900">เพิ่มงาน</h2>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">ชื่องาน</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="ระบุชื่องาน"
              autoFocus
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">หมวด</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="รปจ">รปจ (งานประจำ)</option>
                <option value="งานนอก/อื่นๆ">งานนอก/อื่นๆ</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">สถานที่</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="ระบุสถานที่"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">หมายเหตุ</label>
            <input
              type="text"
              value={form.remark}
              onChange={(e) => set('remark', e.target.value)}
              placeholder="หมายเหตุ (ถ้ามี)"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 rounded-b-2xl bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            ยกเลิก
          </button>
          <button
            disabled={!form.title}
            onClick={() =>
              onAdd({
                ...form,
                count: '',
                countSenior: '',
                countJunior: '',
                status: 'todo',
                isFixed: false,
              })
            }
            className="rounded-lg bg-sky-600 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
          >
            เพิ่ม
          </button>
        </div>
      </div>
    </div>
  );
}
