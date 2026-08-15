import React from 'react';
import BarChartIcon from '@mui/icons-material/BarChart';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import type { Personnel } from '@/types';

export default function PersonnelChart({ personnel }: { personnel: Personnel[] }) {
  if (personnel.length === 0) return null;
  const privates = personnel.filter(p => p.rank === 'พลฯ');

  const counts = {
    available: privates.filter(p => p.status === 'available').length,
    on_duty: privates.filter(p => p.status === 'on_duty').length,
    leave: privates.filter(p => p.status === 'leave').length,
    sick: privates.filter(p => p.status === 'sick').length,
  };

  const data = [
    { name: 'ประจำการ', value: counts.available, color: '#10b981' },
    { name: 'เข้าเวร', value: counts.on_duty, color: '#3b82f6' },
    { name: 'ลา', value: counts.leave, color: '#f59e0b' },
    { name: 'ป่วย', value: counts.sick, color: '#ef4444' },
  ];

  return (
    <div className="card" style={{ marginTop: 12, padding: '20px' }}>
      <h3 style={{ fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
        <BarChartIcon fontSize="small" style={{ color: '#3b82f6' }} /> สถิติกำลังพล (หมวดพลทหาร)
      </h3>
      <div style={{ height: 220, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontWeight: 600 }}
              itemStyle={{ color: '#1e293b' }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={45}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
