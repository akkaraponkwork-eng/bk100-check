'use client';

import React, { useState } from 'react';
import {
  Chip, Checkbox
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import type { Mission, MissionStatus, Personnel } from '@/types';
import { MISSION_STATUS_LABELS } from '@/types';

interface MissionModalProps {
  date: string; // YYYY-MM-DD
  mission?: Mission | null;
  personnelList: Personnel[];
  onClose: () => void;
  onSave: (missionData: Partial<Mission>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const COMMON_TITLES = [
  'จัดเก็บเต็นท์',
  'พัฒนา บก.ร้อย',
  'ทำความสะอาดคลังอาวุธ',
  'ภารกิจขนย้ายสิ่งอุปกรณ์',
  'ตัดหญ้าพัฒนาพื้นที่',
  'ภารกิจพิเศษ/ภายนอก',
];

export default function MissionModal({
  date,
  mission,
  personnelList,
  onClose,
  onSave,
  onDelete,
}: MissionModalProps) {
  const [title, setTitle] = useState(mission?.title || '');
  const [targetDate, setTargetDate] = useState(mission?.date || date);
  const [startTime, setStartTime] = useState(mission?.startTime || '');
  const [endTime, setEndTime] = useState(mission?.endTime || '');
  const [location, setLocation] = useState(mission?.location || '');
  const [assignedPersonnelIds, setAssignedPersonnelIds] = useState<string[]>(
    mission?.assignedPersonnelIds || []
  );
  const [status, setStatus] = useState<MissionStatus>(mission?.status || 'pending');
  const [remark, setRemark] = useState(mission?.remark || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [searchPersonnel, setSearchPersonnel] = useState('');

  const isEdit = !!mission?.id;

  // Filter personnel based on search
  const filteredPersonnel = personnelList.filter(p => {
    const fullName = `${p.rank}${p.firstName} ${p.lastName} ${p.batch || ''}`.toLowerCase();
    return fullName.includes(searchPersonnel.toLowerCase());
  });

  const handleSelectAllFiltered = () => {
    const ids = filteredPersonnel.map(p => p.id);
    const set = new Set([...assignedPersonnelIds, ...ids]);
    setAssignedPersonnelIds(Array.from(set));
  };

  const handleClearPersonnel = () => {
    setAssignedPersonnelIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      await onSave({
        ...(mission?.id ? { id: mission.id } : {}),
        title: title.trim(),
        date: targetDate,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        location: location.trim() || undefined,
        assignedPersonnelIds,
        status,
        remark: remark.trim() || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!mission?.id || !onDelete) return;
    if (!window.confirm(`ต้องการลบภารกิจ "${mission.title}" ใช่หรือไม่?`)) return;

    setDeleting(true);
    try {
      await onDelete(mission.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div className="modal-sheet flex flex-col p-0" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh', maxWidth: '560px' }}>
        <div className="modal-handle mt-4 mb-2" />
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-2 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <AssignmentIcon className="text-[var(--color-primary)]" />
            <h2 className="text-[16px] font-bold m-0 text-[var(--color-text-primary)]">
              {isEdit ? 'แก้ไขภารกิจ' : 'เพิ่มภารกิจใหม่'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full border-none bg-transparent cursor-pointer hover:bg-gray-100 transition-colors text-[var(--color-text-secondary)]">
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex flex-col gap-4 p-5 overflow-y-auto">
            {/* Quick Title Chips */}
            <div>
              <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] block mb-1.5">
                รายการแนะนำ:
              </span>
            <div className="flex flex-wrap gap-2">
              {COMMON_TITLES.map(t => (
                <Chip
                  key={t}
                  label={t}
                  size="small"
                  onClick={() => setTitle(t)}
                  color={title === t ? 'primary' : 'default'}
                  variant={title === t ? 'filled' : 'outlined'}
                  className="cursor-pointer text-xs transition-all duration-200 hover:opacity-90"
                />
              ))}
            </div>
          </div>

          {/* Title input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[var(--color-text-secondary)]">ชื่องาน / ภารกิจ *</label>
            <input
              type="text"
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="เช่น จัดเก็บเต็นท์, พัฒนากองร้อย"
              required
            />
          </div>

          {/* Date and Times */}
          <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1fr] gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[var(--color-text-secondary)]">วันที่ *</label>
              <input
                type="date"
                className="input"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[var(--color-text-secondary)]">เวลาเริ่ม</label>
              <input
                type="time"
                className="input"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[var(--color-text-secondary)]">เวลาสิ้นสุด</label>
              <input
                type="time"
                className="input"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Location & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[var(--color-text-secondary)]">สถานที่</label>
              <input
                type="text"
                className="input"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="เช่น บก.ร้อย, คลังอาวุธ"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[var(--color-text-secondary)]">สถานะ</label>
              <select
                className="select"
                value={status}
                onChange={e => setStatus(e.target.value as MissionStatus)}
              >
                {Object.entries(MISSION_STATUS_LABELS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Personnel Assignment Section */}
          <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-surface-2)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-1.5 font-bold text-[13px] m-0 text-[var(--color-text-primary)]">
                <PeopleAltIcon fontSize="small" className="text-[var(--color-primary)]" />
                กำลังพลที่มอบหมาย ({assignedPersonnelIds.length > 0 ? `${assignedPersonnelIds.length} นาย` : 'ภารกิจภาพรวม/ไม่ระบุ'})
              </h3>
              <div className="flex gap-2">
                <button type="button" onClick={handleSelectAllFiltered} className="text-[11px] font-semibold text-[var(--color-primary-dark)] bg-transparent border-none cursor-pointer hover:underline">
                  เลือกผลการค้นหา
                </button>
                {assignedPersonnelIds.length > 0 && (
                  <button type="button" onClick={handleClearPersonnel} className="text-[11px] font-semibold text-red-500 bg-transparent border-none cursor-pointer hover:underline">
                    ล้าง
                  </button>
                )}
              </div>
            </div>

            <input
              type="text"
              className="input input-sm w-full mb-3"
              placeholder="ค้นหากำลังพลตามชื่อ/ยศ/ผลัด..."
              value={searchPersonnel}
              onChange={e => setSearchPersonnel(e.target.value)}
            />

            {/* Selected personnel tags */}
            {assignedPersonnelIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 max-h-20 overflow-y-auto">
                {assignedPersonnelIds.map(id => {
                  const p = personnelList.find(x => x.id === id);
                  return (
                    <Chip
                      key={id}
                      label={p ? `${p.rank}${p.firstName} ${p.lastName}` : id}
                      size="small"
                      onDelete={() => setAssignedPersonnelIds(prev => prev.filter(x => x !== id))}
                      sx={{ fontSize: 11 }}
                    />
                  );
                })}
              </div>
            )}

            {/* Personnel selection list */}
            <div className="max-h-[150px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 border-t border-[var(--color-border)] pt-3">
              {filteredPersonnel.map(p => {
                const isSelected = assignedPersonnelIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setAssignedPersonnelIds(prev =>
                        isSelected ? prev.filter(x => x !== p.id) : [...prev, p.id]
                      );
                    }}
                    className={`flex items-center p-1.5 rounded-md cursor-pointer transition-colors duration-200 border ${
                      isSelected ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary-light)]'
                    }`}
                  >
                    <Checkbox checked={isSelected} size="small" sx={{ p: 0.5, mr: 0.5 }} />
                    <span className="text-[12px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[var(--color-text-primary)] font-medium">
                      {p.rank}{p.firstName} {p.lastName}
                    </span>
                    {p.batch && (
                      <span className="text-[10px] text-[var(--color-text-muted)] ml-1">
                        ผลัด {p.batch}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Remark */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[var(--color-text-secondary)]">หมายเหตุ / รายละเอียดเพิ่มเติม</label>
            <textarea
              className="input"
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม คำสั่ง หรือผู้ประสานงาน"
              rows={3}
              style={{ height: 'auto' }}
            />
          </div>
          </div>
          
          {/* Actions */}
          <div className="p-4 border-t border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)] shrink-0 rounded-b-[var(--radius-xl)]">
            {isEdit && onDelete ? (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                {deleting ? 'กำลังลบ...' : 'ลบภารกิจ'}
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving || deleting}>
                ยกเลิก
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm px-5"
                disabled={saving || deleting || !title.trim()}
              >
                {saving ? 'กำลังบันทึก...' : (isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มภารกิจ')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
