'use client';

import { useState, useRef, useEffect } from 'react';
import type { Personnel } from '@/types';
import SearchIcon from '@mui/icons-material/Search';

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
          width: '100%', textAlign: 'left', minHeight: height, fontSize: 12, 
          display: 'flex', alignItems: 'center', 
          background: 'var(--color-surface)', border: '1px solid var(--color-border)', 
          borderRadius: 8, padding: '0 10px',
          color: selected ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          cursor: 'pointer'
        }}
        onClick={() => setOpen(!open)}
      >
        {selected ? `${selected.rank}${selected.firstName} ${selected.lastName}` : '— เลือกทหาร —'}
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
               style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, border: 'none', background: !value ? 'var(--color-primary)' : 'transparent', color: !value ? 'white' : 'var(--color-text-primary)', borderRadius: 4, cursor: 'pointer' }}
            >
              — ไม่ระบุ —
            </button>
            {filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange(p.id); setOpen(false); setSearch(''); }}
                style={{ 
                  width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, 
                  border: 'none', background: value === p.id ? 'var(--color-primary)' : 'transparent', 
                  color: value === p.id ? 'white' : 'var(--color-text-primary)', 
                  borderRadius: 4, cursor: 'pointer', marginTop: 2,
                  display: 'flex', justifyContent: 'space-between'
                }}
              >
                <span>{p.rank}{p.firstName} {p.lastName}</span>
                <span style={{ opacity: 0.7, fontSize: 10 }}>(เวร {p.dutyCount})</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '12px', fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>ไม่พบรายชื่อ</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
