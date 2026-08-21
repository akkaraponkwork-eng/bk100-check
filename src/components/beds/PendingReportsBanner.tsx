'use client';

import React, { useState } from 'react';
import { Collapse, IconButton, Button } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import { BedReport } from '@/types';

interface PendingReportsBannerProps {
  pendingReports: BedReport[];
  onImport: (report: BedReport) => void;
}

export default function PendingReportsBanner({ pendingReports, onImport }: PendingReportsBannerProps) {
  const [expanded, setExpanded] = useState(true);

  if (pendingReports.length === 0) return null;

  return (
    <div className="mb-4 border border-amber-200 bg-amber-50 rounded-2xl overflow-hidden shadow-sm">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-amber-700">
          <NotificationsActiveIcon />
          <h4 className="font-bold m-0 text-[15px]">
            มีรายงานจาก LINE รอตรวจสอบ {pendingReports.length} รายการ
          </h4>
        </div>
        <IconButton size="small" className="text-amber-700">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </div>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <div className="p-4 pt-0 flex flex-col gap-2">
          {pendingReports.map(report => (
            <div 
              key={report.id} 
              className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white rounded-xl border border-amber-100 shadow-sm"
            >
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 font-medium">
                  {new Date(report.createdAt).toLocaleString('th-TH')}
                </span>
                <span className="text-sm text-gray-700 mt-1 line-clamp-2">
                  {report.rawText}
                </span>
              </div>
              <Button 
                variant="contained" 
                color="warning" 
                size="small"
                startIcon={<TouchAppIcon />}
                onClick={() => onImport(report)}
                sx={{ whiteSpace: 'nowrap', borderRadius: 2, fontWeight: 'bold', boxShadow: 'none' }}
              >
                นำเข้า
              </Button>
            </div>
          ))}
        </div>
      </Collapse>
    </div>
  );
}
