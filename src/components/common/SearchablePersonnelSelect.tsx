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
}

export default function SearchablePersonnelSelect({ personnel, value, onChange, placeholder = 'ค้นหาชื่อ/นามสกุล...' }: Props) {
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
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        className={`w-full text-left min-h-[44px] text-xs flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 transition-colors duration-200 cursor-pointer hover:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-light)] ${
          (selected || value) ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'
        }`}
        onClick={() => setOpen(!open)}
      >
        {displayText}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg shadow-lg z-[9999] max-h-[250px] flex flex-col">
          <div className="p-2 border-b border-[var(--color-border)]">
            <div className="flex items-center bg-[var(--color-surface)] rounded-md px-2 py-1.5 focus-within:ring-1 focus-within:ring-[var(--color-primary-light)] transition-all">
              <SearchIcon className="text-[16px] text-[var(--color-text-muted)] mr-1.5" />
              <input
                autoFocus
                type="text"
                placeholder={placeholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border-none bg-transparent outline-none w-full text-[13px] text-[var(--color-text-primary)]"
              />
            </div>
          </div>
          <div className="overflow-y-auto p-1">
            <button
               type="button"
               onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
               className={`w-full text-left px-3 py-2 min-h-[44px] text-xs border-none rounded cursor-pointer transition-colors duration-200 ${
                 !value ? 'bg-[var(--color-primary)] text-white' : 'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
               }`}
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
                  className={`w-full text-left px-3 py-2 text-xs rounded-md cursor-pointer mt-0.5 flex justify-between items-center transition-colors duration-200 ${
                    isSelected ? 'bg-[var(--color-primary)] text-white' : 
                    isUnavailable ? 'bg-red-50 text-[var(--color-text-primary)] hover:bg-red-100' : 'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                  } ${isUnavailable && !isSelected ? 'border border-dashed border-red-300/50' : 'border-none'}`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{p.rank}{p.firstName} {p.lastName}</span>
                    {statusLabel && (
                      <span className={`text-[10px] px-1.5 py-[1px] rounded font-bold ${
                        isSelected ? 'bg-white/25 text-white' : 
                        p.status === 'sick' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {statusLabel}
                      </span>
                    )}
                  </span>
                  <span className="opacity-75 text-[10px] tabular-nums">
                    (เวร {p.dutyCount} ครั้ง)
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[var(--color-text-muted)] text-center text-sm">
                ไม่พบกำลังพลที่ค้นหา
              </div>
            )}
            {search && (
              <button
                type="button"
                onClick={() => { onChange(makeCustomValue(search)); setOpen(false); setSearch(''); }}
                className="w-full text-left px-3 py-2 text-xs border border-dashed border-[var(--color-primary-light)] bg-blue-500/5 text-[var(--color-primary-light)] rounded cursor-pointer mt-1 font-semibold transition-colors duration-200 hover:bg-blue-500/10"
              >
                🔹 + เพิ่มรายชื่อนอก: &quot;{search}&quot;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
