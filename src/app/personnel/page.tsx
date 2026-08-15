'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import type { Personnel, ExcelColumnMapping, ExcelRow } from '@/types';
import { useToast } from '@/hooks/useToast';
import {
  BarChart as BarChartIcon,
  Article as ArticleIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  FileUpload as FileUploadIcon,
  Download as DownloadIcon,
  Star as StarIcon,
  Person as PersonIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { Box, Button, Pagination, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import PageHeader from '@/components/layout/PageHeader';

const RANK_OPTIONS = ['พลฯ', 'ส.ต.', 'จ.ส.ต.', 'ส.อ.', 'จ.ส.อ.', 'พล.อส.', 'ส.ต.อ.', 'อื่นๆ'];
const STATUS_LABELS: Record<Personnel['status'], string> = {
  available: 'ว่าง', on_duty: 'เวร', leave: 'ลา', sick: 'ป่วย',
};

// ==================== Excel Import Modal ====================
function ExcelImportModal({
  onClose, onImport,
}: {
  onClose: () => void;
  onImport: (personnel: Omit<Personnel, 'id' | 'status' | 'dutyCount'>[]) => void;
}) {
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ExcelColumnMapping>({
    rank: '', firstName: '', lastName: '', batch: '', phone: '',
  });
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<ExcelRow>(ws, { defval: '' });
      if (json.length > 0) {
        setColumns(Object.keys(json[0]));
        setRows(json);
        setStep('map');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const mappedPersonnel = rows.map(row => {
    let r = String(row[mapping.rank] || '').trim();
    if (!r || r === 'พลทหาร' || r === 'พล.ทหาร' || r === 'พลทหารฯ' || r === 'พล.ฯ') {
      r = 'พลฯ';
    }
    return {
      rank: r,
      firstName: String(row[mapping.firstName] || '').trim(),
      lastName: String(row[mapping.lastName] || '').trim(),
      batch: Number(row[mapping.batch]) || 0,
      phone: String(row[mapping.phone] || '').trim(),
      isNCOEligible: r !== 'พลฯ',
    };
  }).filter(p => p.firstName);

  const fieldLabels: Record<keyof ExcelColumnMapping, string> = {
    rank: 'ยศ', firstName: 'ชื่อ', lastName: 'นามสกุล', batch: 'ผลัด', phone: 'เบอร์โทร',
  };

  const handleDownloadTemplate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const ws = XLSX.utils.json_to_sheet([{
      'ยศ': 'พลฯ',
      'ชื่อ': 'สมชาย',
      'นามสกุล': 'รักชาติ',
      'ผลัด': '169',
      'เบอร์โทร': '0812345678'
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'personnel_template.xlsx');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="flex-between mb-4">
          <h2 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 4 }}><BarChartIcon fontSize="small" /> Import จาก Excel</h2>
          <button className="btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['อัปโหลด', 'Map Column', 'ยืนยัน'].map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: i <= ['upload','map','preview'].indexOf(step) ? 'var(--color-primary-light)' : 'var(--color-text-muted)' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: i <= ['upload','map','preview'].indexOf(step) ? 'var(--color-primary)' : 'var(--color-surface-2)', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
                {i + 1}
              </div>
              {s}
            </div>
          ))}
        </div>

        {step === 'upload' && (
          <>
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            style={{
              border: '2px dashed var(--color-border-light)', borderRadius: 12,
              padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
              background: 'var(--color-surface-2)', transition: 'border-color 0.2s',
            }}
          >
            <ArticleIcon style={{ fontSize: 40, marginBottom: 12, color: 'var(--color-text-muted)' }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>ลากไฟล์มาวางที่นี่</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>หรือคลิกเพื่อเลือกไฟล์ .xlsx, .xls</div>
            <input
              ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
          <button
            className="btn btn-ghost w-full mt-4"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}
            onClick={handleDownloadTemplate}
          >
            <DownloadIcon fontSize="small" /> ดาวน์โหลดไฟล์ต้นแบบ (Template)
          </button>
        </>
        )}

        {step === 'map' && (
          <div>
            <p style={{ fontSize: 13, marginBottom: 12 }}>เลือก column ที่ตรงกับแต่ละข้อมูล</p>
            {(Object.keys(fieldLabels) as (keyof ExcelColumnMapping)[]).map(field => (
              <div className="form-group" key={field}>
                <label className="label">{fieldLabels[field]}</label>
                <select
                  className="select"
                  value={mapping[field]}
                  onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                >
                  <option value="">— เลือก column —</option>
                  {columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            ))}
            <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
              ตัวอย่างแถวแรก: {columns.slice(0, 4).map(c => `${c}: "${String(rows[0]?.[c] ?? '')}"`).join(' | ')}
            </div>
            <button
              className="btn btn-primary w-full mt-4"
              disabled={!mapping.firstName || !mapping.lastName}
              onClick={() => setStep('preview')}
            >
              ดูตัวอย่างข้อมูล →
            </button>
          </div>
        )}

        {step === 'preview' && (
          <div>
            <p style={{ fontSize: 13, marginBottom: 12 }}>พบ <strong style={{ color: 'var(--color-primary-light)' }}>{mappedPersonnel.length}</strong> รายชื่อ</p>
            <div style={{ maxHeight: 300, overflow: 'auto', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              {mappedPersonnel.slice(0, 20).map((p, i) => (
                <div key={i} style={{
                  padding: '8px 12px', fontSize: 13,
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  <span style={{ color: 'var(--color-primary-light)', minWidth: 60 }}>{p.rank}</span>
                  <span>{p.firstName} {p.lastName}</span>
                  {p.batch > 0 && <span className="badge badge-gray">ผลัด {p.batch}</span>}
                </div>
              ))}
              {mappedPersonnel.length > 20 && (
                <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                  ...และอีก {mappedPersonnel.length - 20} รายชื่อ
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setStep('map')}>← กลับ</button>
              <button className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }} onClick={() => onImport(mappedPersonnel)}>
                <CheckCircleIcon fontSize="small" /> บันทึก {mappedPersonnel.length} รายชื่อ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== Add/Edit Modal ====================
function PersonnelModal({
  person, nextNum, onClose, onSave,
}: {
  person: Partial<Personnel> | null;
  nextNum: number;
  onClose: () => void;
  onSave: (p: Omit<Personnel, 'id'>) => void;
}) {
  const [form, setForm] = useState<Omit<Personnel, 'id'>>({
    rank: person?.rank || 'พลฯ',
    firstName: person?.firstName || '',
    lastName: person?.lastName || '',
    batch: person?.batch || 169,
    phone: person?.phone || '',
    status: person?.status || 'available',
    dutyCount: person?.dutyCount || 0,
    isNCOEligible: person?.isNCOEligible || false,
    num: person?.num ?? nextNum,
  });

  const set = (k: keyof typeof form, v: unknown) =>
    setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="flex-between mb-4">
          <h2 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
            {person?.firstName ? <><EditIcon fontSize="small" /> แก้ไข</> : <><AddIcon fontSize="small" /> เพิ่มกำลังพล</>}
          </h2>
          <button className="btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="label">ยศ</label>
            <select className="select" value={form.rank} onChange={e => set('rank', e.target.value)}>
              {RANK_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">ผลัด</label>
            <input className="input" type="number" value={form.batch} onChange={e => set('batch', Number(e.target.value))} placeholder="169" />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="label">ชื่อ</label>
            <input className="input" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="ชื่อ" />
          </div>
          <div className="form-group">
            <label className="label">นามสกุล</label>
            <input className="input" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="นามสกุล" />
          </div>
        </div>

        <div className="form-group">
          <label className="label">เบอร์โทร</label>
          <input className="input" type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="08X-XXXXXXX" />
        </div>

        <div className="form-group">
          <label className="label">สถานะปัจจุบัน</label>
          <select className="select" value={form.status} onChange={e => set('status', e.target.value as Personnel['status'])}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="label">จำนวนเวรสะสม</label>
          <input className="input" type="number" value={form.dutyCount} onChange={e => set('dutyCount', Number(e.target.value))} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 8 }}>
            <input
              type="checkbox" id="nco-eligible"
              checked={form.isNCOEligible || false}
              onChange={e => set('isNCOEligible', e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <label htmlFor="nco-eligible" style={{ fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <PersonIcon fontSize="small" style={{ color: '#f59e0b' }} /> เป็นสิบเวรได้
            </label>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>หมายเลขคิว</span>
            </label>
            <input className="input" type="number" value={form.num} onChange={e => set('num', Number(e.target.value))} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button
            className="btn btn-primary"
            disabled={!form.firstName || !form.lastName}
            onClick={() => onSave(form)}
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== Main Personnel Page ====================
export default function PersonnelPage() {
  return <PersonnelPageInner />;
}

function PersonnelPageInner() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editPerson, setEditPerson] = useState<Personnel | null | 'new'>(null);
  const [filterBatch, setFilterBatch] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRankType, setFilterRankType] = useState<'all' | 'private' | 'nco'>('all');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [filterBatch, filterStatus, filterRankType, searchText, rowsPerPage]);
  const { showToast } = useToast();

  const loadPersonnel = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/personnel');
      const data = await res.json();
      setPersonnel(data.personnel || []);
    } catch {
      showToast('โหลดข้อมูลไม่ได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const savePersonnel = useCallback(async (list: Personnel[]) => {
    setSaving(true);
    try {
      await fetch('/api/personnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personnel: list }),
      });
      showToast('บันทึกสำเร็จ');
    } catch {
      showToast('บันทึกไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  }, [showToast]);

  useEffect(() => { loadPersonnel(); }, [loadPersonnel]);

  // Batches available
  const batches = [...new Set(personnel.map(p => p.batch))].sort((a, b) => a - b);

  const filtered = personnel.filter(p => {
    if (filterRankType === 'private' && p.rank !== 'พลฯ') return false;
    if (filterRankType === 'nco' && p.rank === 'พลฯ') return false;
    if (filterBatch !== 'all' && p.batch !== filterBatch) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      return `${p.rank}${p.firstName}${p.lastName}`.toLowerCase().includes(q);
    }
    return true;
  });

  const activeFiltersCount = (filterRankType !== 'all' ? 1 : 0) 
    + (filterBatch !== 'all' ? 1 : 0) 
    + (filterStatus !== 'all' ? 1 : 0);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);


  const handleAdd = async (form: Omit<Personnel, 'id'>) => {
    const newP: Personnel = { ...form, id: crypto.randomUUID() };
    const updated = [...personnel, newP];
    setPersonnel(updated);
    setEditPerson(null);
    await savePersonnel(updated);
  };

  const handleEdit = async (form: Omit<Personnel, 'id'>) => {
    if (!editPerson || editPerson === 'new') return;
    const updated = personnel.map(p =>
      p.id === editPerson.id ? { ...form, id: p.id } : p
    );
    setPersonnel(updated);
    setEditPerson(null);
    await savePersonnel(updated);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบรายชื่อนี้?')) return;
    const updated = personnel.filter(p => p.id !== id);
    setPersonnel(updated);
    await savePersonnel(updated);
  };

  const handleImport = async (imported: Omit<Personnel, 'id' | 'status' | 'dutyCount'>[]) => {
    let currentMaxNum = Math.max(0, ...personnel.map(p => p.num || 0));
    const newList: Personnel[] = imported.map(p => {
      const isPrivate = p.rank === 'พลฯ';
      if (isPrivate) {
        currentMaxNum++;
      }
      return {
        ...p, id: crypto.randomUUID(), status: 'available', dutyCount: 0, num: isPrivate ? currentMaxNum : 0
      };
    });
    const updated = [...personnel, ...newList];
    setPersonnel(updated);
    setShowImport(false);
    await savePersonnel(updated);
    showToast(`เพิ่ม ${newList.length} รายชื่อสำเร็จ`);
  };

  return (
    <>

      <PageHeader
        title="กำลังพล"
        description="จัดการรายชื่อและข้อมูลกำลังพลในหน่วย"
        action={
          <Button onClick={() => setShowImport(true)} variant="outlined" size="small" startIcon={<FileUploadIcon />}>
            นำเข้าบัญชี
          </Button>
        }
      />

      <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 10 }}>
        <div className="content-area">
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <SearchIcon style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: 20 }} />
              <input
                className="input" placeholder="ค้นหาชื่อ..."
                value={searchText} onChange={e => setSearchText(e.target.value)}
                style={{ width: '100%', paddingLeft: 40 }}
              />
            </div>
            <button 
              className={`btn ${activeFiltersCount > 0 ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setShowFilterModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', border: activeFiltersCount > 0 ? 'none' : '1px solid var(--color-border)' }}
            >
              <FilterListIcon fontSize="small" />
              <span style={{ display: 'inline-block' }}>ตัวกรอง</span>
              {activeFiltersCount > 0 && (
                <span style={{ background: 'white', color: 'var(--color-primary)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, marginLeft: 2 }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 64 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
            {personnel.length === 0 ? 'ยังไม่มีรายชื่อ กด Import หรือ + เพิ่ม' : 'ไม่พบรายชื่อที่ค้นหา'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {paginated.map((p) => (
              <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--color-primary-light)' }}>{p.rank}</span>
                    <span className="truncate">{p.firstName} {p.lastName}</span>
                    {p.isNCOEligible && <StarIcon titleAccess="สิบเวร" style={{ fontSize: 16, color: '#f59e0b' }} />}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                    <span className="badge badge-gray" style={{ fontSize: 10 }}>คิวที่ {p.num || 0}</span>
                    <span className={`badge badge-${p.batch >= 169 ? 'junior' : 'senior'}`} style={{ fontSize: 10 }}>
                      ผลัด {p.batch}
                    </span>
                    <span className={`badge badge-${p.status}`} style={{ fontSize: 10 }}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setEditPerson(p)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px 8px' }}
                ><EditIcon fontSize="small" /></button>
                <button
                  onClick={() => handleDelete(p.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--color-danger-light)', cursor: 'pointer', padding: '4px 8px' }}
                ><DeleteIcon fontSize="small" /></button>
              </div>
            ))}

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, pb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>แสดงหน้าละ:</span>
                  <Select
                    value={rowsPerPage.toString()}
                    onChange={(e: SelectChangeEvent) => setRowsPerPage(Number(e.target.value))}
                    size="small"
                    sx={{ height: 32, fontSize: 13, '.MuiSelect-select': { py: 0.5 } }}
                  >
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={20}>20</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                  </Select>
                </Box>
                <Pagination 
                  count={totalPages} 
                  page={page} 
                  onChange={(_, value) => setPage(value)} 
                  color="primary" 
                  shape="rounded"
                />
              </Box>
            )}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => setEditPerson('new')} aria-label="เพิ่มกำลังพล">
        <AddIcon />
      </button>

      {showImport && (
        <ExcelImportModal onClose={() => setShowImport(false)} onImport={handleImport} />
      )}
      {editPerson && (
        <PersonnelModal
          person={editPerson === 'new' ? null : editPerson}
          nextNum={Math.max(0, ...personnel.map(p => p.num || 0)) + 1}
          onClose={() => setEditPerson(null)}
          onSave={editPerson === 'new' ? handleAdd : handleEdit}
        />
      )}

      {showFilterModal && (
        <div className="modal-overlay" onClick={() => setShowFilterModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-handle" />
            <div className="flex-between mb-4">
              <h2 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
                <FilterListIcon fontSize="small" /> ตัวกรองกำลังพล
              </h2>
              <button className="btn-icon btn-sm" onClick={() => setShowFilterModal(false)}>✕</button>
            </div>
            
            <div style={{ overflowY: 'auto', paddingRight: 4, flex: 1, paddingBottom: 20 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 10 }}>ประเภทกำลังพล</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className={`btn btn-sm ${filterRankType === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterRankType('all')} style={{ flex: 1 }}>ทั้งหมด</button>
                  <button className={`btn btn-sm ${filterRankType === 'private' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterRankType('private')} style={{ flex: 1 }}>พลทหาร</button>
                  <button className={`btn btn-sm ${filterRankType === 'nco' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterRankType('nco')} style={{ flex: 1 }}>นายสิบ/พล.อส.</button>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 10 }}>ผลัด (พลทหาร)</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className={`btn btn-sm ${filterBatch === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterBatch('all')}>ทั้งหมด ({personnel.length})</button>
                  {batches.map(b => (
                    <button key={b} className={`btn btn-sm ${filterBatch === b ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterBatch(b)}>
                      ผลัด {b} ({personnel.filter(p => p.batch === b).length})
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 10 }}>สถานะปัจจุบัน</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['all', 'available', 'on_duty', 'leave', 'sick'].map(s => (
                    <button key={s} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterStatus(s)}>
                      {s === 'all' ? 'สถานะทั้งหมด' : STATUS_LABELS[s as Personnel['status']]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid var(--color-border)', marginTop: 'auto' }}>
              <button className="btn btn-ghost w-full" onClick={() => { setFilterRankType('all'); setFilterBatch('all'); setFilterStatus('all'); }}>ล้างตัวกรอง</button>
              <button className="btn btn-primary w-full" onClick={() => setShowFilterModal(false)}>ดูผลลัพธ์ ({filtered.length})</button>
            </div>
          </div>
        </div>
      )}
      </Box>
    </>
  );
}
