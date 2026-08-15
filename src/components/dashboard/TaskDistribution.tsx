import React from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import AssignmentIcon from '@mui/icons-material/Assignment';
import type { KanbanTask } from '@/types';

export default function TaskDistribution({ tasks, recordDate }: { tasks: KanbanTask[], recordDate: string }) {
  const getTaskTotal = (t: KanbanTask) => (Number(t.countSenior) || 0) + (Number(t.countJunior) || 0) + (Number(t.count) || 0);
  const activeTasks = tasks.filter(t => getTaskTotal(t) > 0);
  
  if (activeTasks.length === 0) return null;
  
  const totalInTasks = activeTasks.reduce((sum, t) => sum + getTaskTotal(t), 0);

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="flex-between mb-2">
        <h3 style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AssignmentIcon fontSize="small" /> ยอดจ่ายงานล่าสุด
        </h3>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{format(parseISO(recordDate), 'd MMM', { locale: th })}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {activeTasks.slice(0, 5).map((t, i) => {
          const s = Number(t.countSenior) || 0;
          const j = Number(t.countJunior) || 0;
          const total = getTaskTotal(t);
          return (
            <div key={`${t.id}-${i}`} style={{ display: 'flex', alignItems: 'center', padding: '7px 10px', background: 'var(--color-surface-2)', borderRadius: 8 }}>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)' }} className="truncate" title={t.title}>{t.title}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {(s > 0 || j > 0) ? (
                  <>
                    {s > 0 && <span style={{ fontSize: 11, color: 'var(--color-primary-light)', fontWeight: 500 }}>พี่ {s}</span>}
                    {j > 0 && <span style={{ fontSize: 11, color: 'var(--color-accent-light)', fontWeight: 500 }}>น้อง {j}</span>}
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', minWidth: 24, textAlign: 'right' }}>{total}</span>
                  </>
                ) : (
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary-light)' }}>{total}</span>
                )}
              </div>
            </div>
          );
        })}
        {activeTasks.length > 5 && (
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 4 }}>
            และงานอื่นๆ อีก {activeTasks.length - 5} งาน...
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'right' }}>
        รวมจ่ายงาน: <strong style={{ color: 'var(--color-text-primary)' }}>{totalInTasks}</strong> นาย
      </div>
    </div>
  );
}
