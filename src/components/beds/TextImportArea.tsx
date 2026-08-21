'use client';

import React, { useState } from 'react';
import { 
  TextField, Button, Checkbox, IconButton
} from '@mui/material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

import { parseInspectionText, ParsedInspection } from '@/utils/bedParser';
import { BedViolation } from '@/types';

interface TextImportAreaProps {
  onApplyToGrid: (violations: BedViolation[], dateText?: string) => void;
  initialText?: string;
}

export default function TextImportArea({ onApplyToGrid, initialText = '' }: TextImportAreaProps) {
  const [text, setText] = useState(initialText);
  const [parsedData, setParsedData] = useState<ParsedInspection | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Use effect to parse initial text if provided
  React.useEffect(() => {
    if (initialText) {
      handleParse(initialText);
    }
  }, [initialText]);

  const handleParse = (textToParse: string = text) => {
    if (!textToParse.trim()) return;
    const result = parseInspectionText(textToParse);
    setParsedData(result);
    // Select all by default
    const allIndices = new Set(result.violations.map((_, i) => i));
    setSelectedIndices(allIndices);
  };

  const handleToggleSelection = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const handleApply = () => {
    if (!parsedData) return;
    
    const selectedViolations = parsedData.violations.filter((_, i) => selectedIndices.has(i));
    onApplyToGrid(selectedViolations, parsedData.date || undefined);
    
    // Clear after apply
    setText('');
    setParsedData(null);
    setSelectedIndices(new Set());
  };

  const handleClear = () => {
    setText('');
    setParsedData(null);
    setSelectedIndices(new Set());
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-purple-600">
          <ContentPasteIcon />
          <h3 className="text-lg font-bold text-gray-800 m-0">วางข้อความรายงานตรวจโรงนอน</h3>
        </div>

        <TextField
          fullWidth
          multiline
          rows={8}
          placeholder="ผลการตรวจโรงนอน 19/8/69&#10;เตียงที่ 15 ไม่เก็บสายชาต&#10;เตียงที่ 6 7 8 9 พัดลมไม่ปิด"
          value={text}
          onChange={(e) => setText(e.target.value)}
          sx={{ mb: 4, '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
        />

        <div className="flex gap-4">
          <Button 
            variant="contained" 
            startIcon={<AutoFixHighIcon />}
            onClick={() => handleParse()}
            disabled={!text.trim()}
            sx={{ borderRadius: 2, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, px: 3 }}
          >
            ตรวจอัตโนมัติ
          </Button>
          <Button 
            variant="outlined" 
            color="inherit" 
            startIcon={<ClearIcon />}
            onClick={handleClear}
            disabled={!text.trim() && !parsedData}
            sx={{ borderRadius: 2 }}
          >
            ล้างข้อความ
          </Button>
        </div>
      </div>

      {parsedData && (
        <div className="p-6 bg-white rounded-2xl border-2 border-purple-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6">ผลลัพธ์การอ่านข้อมูล</h3>
          
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg">
              <CheckCircleIcon fontSize="small" />
              <span>พบ {parsedData.violations.length} เตียงไม่เรียบร้อย</span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-600 font-semibold bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg">
              <CalendarMonthIcon fontSize="small" />
              <span>วันที่ตรวจ: {parsedData.date || 'ไม่ได้ระบุ'}</span>
            </div>
          </div>

          <div className="bg-gray-50/50 rounded-xl border border-gray-200 mb-6 max-h-[300px] overflow-y-auto">
            {parsedData.violations.map((v, idx) => {
              const labelId = `checkbox-list-label-${idx}`;
              return (
                <div 
                  key={idx} 
                  className="flex items-start p-3 hover:bg-white cursor-pointer border-b border-gray-200 last:border-0 transition-colors"
                  onClick={() => handleToggleSelection(idx)}
                >
                  <Checkbox
                    edge="start"
                    checked={selectedIndices.has(idx)}
                    tabIndex={-1}
                    disableRipple
                    slotProps={{ input: { 'aria-labelledby': labelId } as any }}
                    sx={{ p: 0.5, mr: 1.5, color: 'text.secondary' }}
                  />
                  <div className="flex flex-col mt-0.5">
                    <span id={labelId} className="font-bold text-gray-800">{`เตียงที่ ${v.bedNo}`}</span>
                    <span className="text-sm text-gray-500 mt-0.5">{v.remark}</span>
                  </div>
                </div>
              );
            })}
            
            {parsedData.violations.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                ไม่พบรูปแบบเตียงที่ไม่เรียบร้อย กรุณาตรวจสอบข้อความอีกครั้ง
              </div>
            )}
          </div>

          <Button 
            variant="contained" 
            color="success" 
            size="large"
            fullWidth
            startIcon={<PlaylistAddCheckIcon />}
            onClick={handleApply}
            disabled={selectedIndices.size === 0}
            sx={{ borderRadius: 2, py: 1.5, fontSize: 16, fontWeight: 'bold' }}
          >
            ใส่ข้อมูลที่เลือก {selectedIndices.size} รายการ ลง Grid
          </Button>
        </div>
      )}
    </div>
  );
}
