import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import PushPinIcon from '@mui/icons-material/PushPin';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import type { KanbanTask } from '@/types';

type TaskStatus = KanbanTask['status'];

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  todo: { label: 'ต้องทำ', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: <PushPinIcon fontSize="small" /> },
  in_progress: { label: 'กำลังทำ', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: <AutorenewIcon fontSize="small" /> },
  done: { label: 'เสร็จแล้ว', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <CheckCircleIcon fontSize="small" /> },
};

export const getTaskTotal = (t: KanbanTask) => (Number(t.countSenior) || 0) + (Number(t.countJunior) || 0) + (Number(t.count) || 0);

interface TaskCardProps {
  task: KanbanTask;
  onUpdate: (id: string, updates: Partial<KanbanTask>) => void;
  onDelete: (id: string) => void;
  combineCounts?: boolean;
}

export default function TaskCard({ task, onUpdate, onDelete, combineCounts }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${
        isDragging ? 'ring-2 ring-sky-500 ring-opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-1 flex cursor-grab items-center justify-center p-1 text-gray-400 hover:text-gray-600 active:cursor-grabbing"
        >
          <DragIndicatorIcon fontSize="small" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="mb-1 text-[15px] font-bold leading-snug text-gray-900">{task.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-5 items-center rounded-full bg-gray-100 px-2 text-[10px] font-medium text-gray-600">
              {task.category}
            </span>
            <div className="flex items-center rounded-md bg-black/5 px-2 py-1">
              <LocationOnIcon sx={{ fontSize: 14 }} className="mr-1 text-gray-500" />
              <input
                type="text"
                value={task.location || ''}
                onChange={(e) => onUpdate(task.id, { location: e.target.value })}
                placeholder="เพิ่มสถานที่..."
                className="w-24 bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Count Inputs */}
        <div className="flex items-center gap-1.5 ml-2">
          {combineCounts ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-gray-500">ยอดรวม</span>
              <input
                type="number"
                min="0"
                value={task.count !== undefined && task.count !== '' ? task.count : (getTaskTotal(task) || '')}
                onChange={(e) =>
                  onUpdate(task.id, {
                    count: e.target.value === '' ? '' : Number(e.target.value),
                    countSenior: '',
                    countJunior: '',
                  })
                }
                placeholder="0"
                className="h-9 w-11 rounded-md border border-gray-400 bg-gray-50 text-center text-sm font-bold text-gray-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold text-blue-600">พี่</span>
                <input
                  type="number"
                  min="0"
                  value={task.countSenior !== undefined ? task.countSenior : task.count || ''}
                  onChange={(e) =>
                    onUpdate(task.id, {
                      countSenior: e.target.value === '' ? '' : Number(e.target.value),
                      count: '',
                    })
                  }
                  placeholder="0"
                  className="h-9 w-10 rounded-md border border-blue-300 bg-gray-50 text-center text-sm font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold text-purple-600">น้อง</span>
                <input
                  type="number"
                  min="0"
                  value={task.countJunior !== undefined ? task.countJunior : ''}
                  onChange={(e) =>
                    onUpdate(task.id, {
                      countJunior: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  placeholder="0"
                  className="h-9 w-10 rounded-md border border-purple-300 bg-gray-50 text-center text-sm font-bold text-gray-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div className="ml-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold text-gray-500">รวม</span>
                <div className="flex h-9 w-10 items-center justify-center rounded-md bg-black/5">
                  <span className="text-sm font-bold text-gray-900">{getTaskTotal(task) || '-'}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Delete Button */}
        {!task.isFixed && (
          <div className="ml-1 mt-1">
            <button
              onClick={() => onDelete(task.id)}
              className="flex items-center justify-center rounded p-1 text-red-500 hover:bg-red-50"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
        <ChatIcon sx={{ fontSize: 14 }} className="text-gray-400" />
        <input
          type="text"
          value={task.remark || ''}
          onChange={(e) => onUpdate(task.id, { remark: e.target.value })}
          placeholder="เพิ่มหมายเหตุ..."
          className="flex-1 bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400"
        />
      </div>

      {/* Status Segmented Control */}
      <div className="mt-3 flex items-stretch gap-1 rounded-full bg-black/5 p-1">
        {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((statusKey) => {
          const config = STATUS_CONFIG[statusKey];
          const isActive = task.status === statusKey;
          return (
            <button
              key={statusKey}
              onClick={() => onUpdate(task.id, { status: statusKey })}
              className={`flex-1 rounded-[20px] py-2 text-[13px] transition-all duration-200 ${
                isActive
                  ? 'bg-white font-bold shadow-sm'
                  : 'text-gray-500 hover:bg-black/5'
              }`}
              style={{ color: isActive ? config.color : undefined }}
            >
              {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
