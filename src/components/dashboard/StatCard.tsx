import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
  onClick?: () => void;
  valueFontSize?: number | string;
  subFontSize?: number | string;
}

export default function StatCard({
  icon,
  label,
  value,
  sub,
  accent = '#3b82f6',
  onClick,
  valueFontSize = 24,
  subFontSize = 12,
}: StatCardProps) {
  return (
    <div
      className="stat-card"
      style={{
        '--accent': accent,
        cursor: onClick ? 'pointer' : 'default',
        padding: '20px',
      } as React.CSSProperties}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: `${accent}1A`, color: accent
        }}>
          {icon}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{label}</div>
      </div>
      <div style={{ fontSize: valueFontSize, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: subFontSize, fontWeight: 500, color: 'var(--color-text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
