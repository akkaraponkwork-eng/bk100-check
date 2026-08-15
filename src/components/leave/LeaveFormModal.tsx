'use client';

import { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';

interface LeaveFormModalProps {
  onClose: () => void;
  onSubmit: (data: { startDate: string; endDate: string; reason: string }) => Promise<void>;
}

export default function LeaveFormModal({ onClose, onSubmit }: LeaveFormModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError('กรุณาเลือกวันที่เริ่มและสิ้นสุด');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSubmit({ startDate, endDate, reason });
      onClose();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Mobile handle */}
        <div className="modal-handle" />

        <div className="flex-between mb-4">
          <h2 style={{ fontSize: 18, color: 'var(--color-navy)' }}>ยื่นลาเยี่ยมญาติ</h2>
          <button className="btn-icon btn-sm" onClick={onClose} style={{ border: 'none' }}>
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {error && (
          <div className="badge badge-red w-full flex-center mb-4 p-2" style={{ borderRadius: 8, whiteSpace: 'normal', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="label">ตั้งแต่วันที่</label>
              <input 
                type="date" 
                className="input" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="label">ถึงวันที่</label>
              <input 
                type="date" 
                className="input" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="label">เหตุผลการลา (ไม่บังคับ)</label>
            <textarea 
              className="input" 
              rows={3} 
              placeholder="เช่น กลับไปเยี่ยมครอบครัวที่ต่างจังหวัด"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full mt-2" 
            disabled={loading}
          >
            {loading ? 'กำลังส่งข้อมูล...' : 'ยืนยันการยื่นลา'}
          </button>
        </form>
      </div>
    </div>
  );
}
