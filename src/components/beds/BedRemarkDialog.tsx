'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Chip, IconButton, Autocomplete, Switch, FormControlLabel
} from '@mui/material';
import SingleBedIcon from '@mui/icons-material/SingleBed';
import CloseIcon from '@mui/icons-material/Close';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import DeleteIcon from '@mui/icons-material/Delete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { Personnel } from '@/types';

const QUICK_SUGGESTIONS = [
  'ผ้าปูที่นอนยับ',
  'ไม่เก็บขยะ',
  'ไม่เก็บเสื้อผ้า',
  'สายชาตไม่เก็บ',
  'พัดลมไม่ปิด',
  'ไม่เก็บผ้า',
  'หมอนอยู่ใต้เตียง',
  'ถาดเหล็กใต้เตียง'
];

interface BedRemarkDialogProps {
  open: boolean;
  onClose: () => void;
  bedNo: string;
  title: string;
  initialRemark: string;
  onSave: (bedNo: string, remark: string, actualSleeperId?: string) => void;
  onDelete: (bedNo: string) => void;
  personnel?: Personnel[];
  bedOwnerId?: string;
}

export default function BedRemarkDialog({
  open, onClose, bedNo, title, initialRemark, onSave, onDelete, personnel = [], bedOwnerId
}: BedRemarkDialogProps) {
  const [remark, setRemark] = useState('');
  const [differentSleeper, setDifferentSleeper] = useState(false);
  const [actualSleeperId, setActualSleeperId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRemark(initialRemark);
      setDifferentSleeper(false);
      setActualSleeperId(null);
    }
  }, [open, initialRemark]);

  const handleSave = () => {
    if (remark.trim()) {
      onSave(bedNo, remark.trim(), differentSleeper && actualSleeperId ? actualSleeperId : undefined);
    }
  };

  const handleDelete = () => {
    onDelete(bedNo);
  };

  const handleChipClick = (suggestion: string) => {
    if (remark) {
      setRemark(prev => `${prev} ${suggestion}`);
    } else {
      setRemark(suggestion);
    }
  };

  const personnelOptions = personnel.map(p => ({
    id: p.id,
    label: `${p.rank}${p.firstName} ${p.lastName}`
  })).filter(p => p.id !== bedOwnerId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}>
      <DialogTitle className="p-5 pb-4 border-b border-gray-100 flex items-center gap-3 font-bold text-gray-800">
        <SingleBedIcon className="text-purple-600" />
        <div className="flex-1 flex flex-col">
          <span className="text-lg font-bold">เตียงที่ {bedNo}</span>
          <span className="text-sm font-medium text-gray-500">{title || 'เตียงว่าง'}</span>
        </div>
        <IconButton onClick={onClose} size="small" className="bg-gray-50 hover:bg-gray-100">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      
      <DialogContent className="p-5">
        <span className="text-sm font-bold text-gray-500 mb-2 block mt-2">ข้อความแนะนำด่วน:</span>
        <div className="flex flex-wrap gap-2 mb-6">
          {QUICK_SUGGESTIONS.map((suggestion) => (
            <Chip 
              key={suggestion} 
              label={suggestion} 
              size="small" 
              onClick={() => handleChipClick(suggestion)}
              sx={{ cursor: 'pointer', borderRadius: 2 }}
            />
          ))}
        </div>

        <TextField
          fullWidth
          label="หมายเหตุ"
          multiline
          rows={3}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="ระบุข้อบกพร่องที่พบ..."
          autoFocus
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />

        {/* Actual Sleeper Override */}
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <FormControlLabel
            control={
              <Switch 
                checked={differentSleeper} 
                onChange={(e) => setDifferentSleeper(e.target.checked)}
                size="small"
              />
            }
            label={
              <span className="text-sm font-medium text-amber-800 flex items-center gap-1">
                <SwapHorizIcon fontSize="small" /> คนนอนไม่ใช่เจ้าของเตียง
              </span>
            }
          />
          {differentSleeper && (
            <Autocomplete
              options={personnelOptions}
              getOptionLabel={(option) => option.label}
              onChange={(_, value) => setActualSleeperId(value?.id || null)}
              size="small"
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="เลือกคนที่นอนจริง" 
                  placeholder="พิมพ์ชื่อเพื่อค้นหา..."
                  sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              )}
            />
          )}
        </div>
      </DialogContent>
      
      <DialogActions className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-between">
        {initialRemark ? (
          <Button 
            startIcon={<DeleteIcon />} 
            color="inherit" 
            onClick={handleDelete}
            sx={{ fontWeight: 'bold' }}
          >
            ลบหมายเหตุ
          </Button>
        ) : (
          <div /> // placeholder for flex space-between
        )}
        
        <div className="flex gap-2">
          <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 'bold' }}>ยกเลิก</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            color="error"
            startIcon={<ReportProblemIcon />}
            disabled={!remark.trim() || (differentSleeper && !actualSleeperId)}
            sx={{ borderRadius: 2, fontWeight: 'bold', boxShadow: 'none' }}
          >
            ไม่เรียบร้อย
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
}
