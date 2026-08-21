'use client';

import React, { useMemo } from 'react';
import { Button } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import WarningIcon from '@mui/icons-material/Warning';
import { BedViolation } from '@/types';

interface InspectionSummaryProps {
  dateText?: string;
  violations: BedViolation[];
  onCopy: (text: string) => void;
  onSave: (text: string) => void;
  onClear: () => void;
  isSaving?: boolean;
}

export default function InspectionSummary({
  dateText, violations, onCopy, onSave, onClear, isSaving
}: InspectionSummaryProps) {
  
  // Sort numerically based on bedNo
  const sortedViolations = useMemo(() => {
    return [...violations].sort((a, b) => {
      const numA = parseInt(a.bedNo, 10);
      const numB = parseInt(b.bedNo, 10);
      return (isNaN(numA) ? 0 : numA) - (isNaN(numB) ? 0 : numB);
    });
  }, [violations]);

  const generatedText = useMemo(() => {
    if (sortedViolations.length === 0) return '';
    
    // Default to today if no date provided
    let dateStr = dateText;
    if (!dateStr) {
      const d = new Date();
      dateStr = `${d.getDate()}/${d.getMonth() + 1}/${(d.getFullYear() + 543).toString().slice(2)}`;
    }

    let text = `ผลการตรวจโรงนอน ${dateStr}\n`;
    sortedViolations.forEach(v => {
      text += `เตียงที่ ${v.bedNo} ${v.remark}\n`;
    });
    text += `ครับ`;
    return text;
  }, [sortedViolations, dateText]);

  return (
    <div className="p-4 h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <AssignmentIcon className="text-purple-600" />
        <h3 className="text-lg font-bold text-gray-800 m-0">สรุปผลการตรวจ</h3>
      </div>

      {violations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-gray-400 text-sm">ยังไม่พบเตียงที่ไม่เรียบร้อย</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
            <ReportProblemIcon fontSize="small" />
            <span className="font-bold text-sm">พบ {violations.length} เตียงไม่เรียบร้อย</span>
          </div>

          <div className="flex-1 overflow-y-auto mb-4 bg-gray-50 rounded-xl border border-gray-100 p-2 space-y-2 max-h-[300px]">
            {sortedViolations.map((v, idx) => (
              <div key={`${v.bedNo}-${idx}`} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                <WarningIcon className="text-red-400 shrink-0" fontSize="small" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800">{`เตียงที่ ${v.bedNo}`}</span>
                  <span className="text-xs text-gray-500 mt-1">{v.remark}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 mb-4 bg-gray-100 rounded-xl max-h-[150px] overflow-y-auto border border-gray-200">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap m-0 font-medium">
              {generatedText}
            </pre>
          </div>

          <div className="flex flex-col gap-2 mt-auto">
            <div className="flex gap-2">
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<ContentCopyIcon />}
                onClick={() => onCopy(generatedText)}
                sx={{ borderRadius: 2, borderColor: 'var(--color-border)', color: 'text.primary' }}
              >
                คัดลอก
              </Button>
              <Button 
                variant="contained" 
                fullWidth 
                startIcon={<SaveIcon />}
                onClick={() => onSave(generatedText)}
                disabled={isSaving}
                sx={{ borderRadius: 2, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
              >
                บันทึก
              </Button>
            </div>
            <Button 
              variant="text" 
              color="error" 
              startIcon={<ClearAllIcon />}
              onClick={onClear}
              size="small"
              sx={{ borderRadius: 2 }}
            >
              ล้างทั้งหมด
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
