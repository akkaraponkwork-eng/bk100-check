'use client';

import { useState, useRef, useEffect } from 'react';
import type { Personnel } from '@/types';
import SearchIcon from '@mui/icons-material/Search';

// value คือ personnelId (id ของ Personnel) หรือ customName (ขึ้นต้นด้วย "CUSTOM:")
// เมื่อเลือกรายชื่อนอก จะ onChange("CUSTOM:ชื่อที่พิมพ์")
const CUSTOM_PREFIX = 'CUSTOM:';

export function isCustomName(val: string) {
  return val.startsWith(CUSTOM_PREFIX);
}
export function getCustomName(val: string) {
  return val.startsWith(CUSTOM_PREFIX) ? val.slice(CUSTOM_PREFIX.length) : val;
}
export function makeCustomValue(name: string) {
  return CUSTOM_PREFIX + name;
}

interface Props {
  personnel: Personnel[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  height?: number;
}

export default function SearchablePersonnelSelect({ personnel, value, onChange, placeholder = 'ค้นหาชื่อ/นามสกุล...', height = 34 }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = personnel.find(p => p.id === value);
  const isCustom = isCustomName(value);
  const displayText = selected
    ? `${selected.rank}${selected.firstName} ${selected.lastName}`
    : isCustom
    ? `🔹 ${getCustomName(value)}`
    : (value || '— เลือกทหาร —');
  
  const filtered = personnel.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.firstName.toLowerCase().includes(q) || p.lastName.toLowerCase().includes(q) || p.id.includes(q);
  });

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        className="select"
        style={{ 
          width: '100%', textAlign: 'left', minHeight: 44, fontSize: 12, 
          display: 'flex', alignItems: 'center', 
          background: 'var(--color-surface)', border: '1px solid var(--color-border)', 
          borderRadius: 8, padding: '0 10px',
          color: (selected || value) ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          cursor: 'pointer'
        }}
        onClick={() => setOpen(!open)}
      >
        {displayText}
      </button>

      {open && (
        <div style={{ 
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, 
          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', 
          borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 9999, 
          maxHeight: 250, display: 'flex', flexDirection: 'column' 
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface)', borderRadius: 6, padding: '6px 8px' }}>
              <SearchIcon style={{ fontSize: 16, color: 'var(--color-text-muted)', marginRight: 6 }} />
              <input
                autoFocus
                type="text"
                placeholder={placeholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 13, color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>
          <div style={{ overflowY: 'auto', padding: 4 }}>
            <button
               type="button"
               onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
               style={{ width: '100%', textAlign: 'left', padding: '8px 12px', minHeight: 44, fontSize: 12, border: 'none', background: !value ? 'var(--color-primary)' : 'transparent', color: !value ? 'white' : 'var(--color-text-primary)', borderRadius: 4, cursor: 'pointer' }}
            >
              — ไม่ระบุ —
            </button>
            {filtered.map(p => {
              const isUnavailable = p.status === 'sick' || p.status === 'leave';
              const statusLabel = p.status === 'sick' ? 'ป่วย' : p.status === 'leave' ? 'ลา' : null;
              const isSelected = value === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onChange(p.id); setOpen(false); setSearch(''); }}
                  style={{ 
                    width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, 
                    border: isUnavailable && !isSelected ? '1px dashed rgba(239, 68, 68, 0.3)' : 'none',
                    background: isSelected ? 'var(--color-primary)' : isUnavailable ? 'rgba(239, 68, 68, 0.04)' : 'transparent', 
                    color: isSelected ? 'white' : 'var(--color-text-primary)', 
                    borderRadius: 6, cursor: 'pointer', marginTop: 2,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{p.rank}{p.firstName} {p.lastName}</span>
                    {statusLabel && (
                      <span style={{ 
                        fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 700,
                        background: isSelected ? 'rgba(255,255,255,0.25)' : p.status === 'sick' ? '#FEE2E2' : '#FEF3C7',
                        color: isSelected ? 'white' : p.status === 'sick' ? '#B91C1C' : '#B45309'
                      }}>
                        {statusLabel}
                      </span>
                    )}
                  </span>
                  <span style={{ opacity: 0.75, fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                    (เวร {p.dutyCount} ครั้ง)
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '8px 12px', color: 'var(--color-text-muted)', textAlign: 'center', fontSize: 14 }}>
                ไม่พบกำลังพลที่ค้นหา
              </div>
            )}
            {search && (
              <button
                type="button"
                onClick={() => { onChange(makeCustomValue(search)); setOpen(false); setSearch(''); }}
                style={{ 
                  width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, 
                  border: '1px dashed var(--color-primary-light)', background: 'rgba(59, 130, 246, 0.05)', 
                  color: 'var(--color-primary-light)', borderRadius: 4, cursor: 'pointer', marginTop: 4,
                  fontWeight: 600
                }}
              >
                🔹 + เพิ่มรายชื่อนอก: "{search}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
