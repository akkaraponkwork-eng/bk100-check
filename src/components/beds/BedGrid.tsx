'use client';

import React, { useState } from 'react';
import { Typography, IconButton, Tabs, Tab } from '@mui/material';
import { motion } from 'framer-motion';
import WarningIcon from '@mui/icons-material/Warning';
import BedIcon from '@mui/icons-material/Bed';
import { BedEntry, BedViolation, Personnel } from '@/types';

interface BedGridProps {
  beds: BedEntry[];
  personnel: Personnel[];
  violations: BedViolation[];
  onBedClick: (bedNo: string) => void;
}

const TOP_BEDS = ['81', '82', '83'];
const COL_1 = Array.from({ length: 20 }, (_, i) => String(i + 1));
const COL_2 = Array.from({ length: 20 }, (_, i) => String(i + 21));
const COL_3 = Array.from({ length: 20 }, (_, i) => String(i + 41));
const COL_4 = Array.from({ length: 20 }, (_, i) => String(i + 61));

export default function BedGrid({ beds, personnel, violations, onBedClick }: BedGridProps) {
  const [activeTab, setActiveTab] = useState(0);

  const getBedInfo = (bedNo: string) => {
    const bed = beds.find((b) => b.bedNo === bedNo);
    const p = personnel.find((p) => p.id === bed?.personnelId);
    const violation = violations.find((v) => v.bedNo === bedNo);

    let title = bed?.ownerName || '';
    if (p) {
      title = `${p.rank}${p.firstName}`; // e.g. "พลฯสมชาย"
    }
    
    // empty bed condition (if no title resolved or it's just a dash, it's empty)
    const cleanTitle = title.trim();
    const isEmpty = !cleanTitle || cleanTitle === '-';
    if (isEmpty) {
      title = 'ว่าง';
    }

    const isViolated = !!violation;

    return { title, isEmpty, isViolated };
  };

  const renderBedBox = (bedNo: string) => {
    const { title, isEmpty, isViolated } = getBedInfo(bedNo);

    // Icon Color logic with Tailwind classes
    let iconClass = 'text-emerald-500'; // เขียวเรียบร้อย
    if (isEmpty) {
      iconClass = 'text-gray-300'; // เทาว่าง
    }
    if (isViolated) {
      iconClass = 'text-red-500'; // แดงผิด
    }

    return (
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onBedClick(bedNo)}
        className="flex flex-col items-center justify-center cursor-pointer relative min-h-[70px] p-2"
      >
        <div className="relative flex justify-center items-center w-full h-[64px]">
          <BedIcon sx={{ fontSize: 64 }} className={`absolute ${iconClass}`} />
          <span 
            className="text-base font-black z-10 text-gray-800"
            style={{ textShadow: '0px 0px 4px rgba(255,255,255,1), 0px 0px 2px rgba(255,255,255,1)' }}
          >
            {bedNo}
          </span>
        </div>
        <span className="w-full text-center text-gray-500 text-xs truncate z-10 mt-1">
          {title}
        </span>
      </motion.div>
    );
  };

  const renderColumn = (bedNumbers: string[], title?: string) => {
    return (
      <div className="flex flex-col gap-2">
        {title && (
          <div className="text-center font-bold text-sm text-gray-500 bg-gray-50/80 rounded-lg py-1.5 mb-2 shadow-sm border border-gray-100 lg:hidden">
            {title}
          </div>
        )}
        {bedNumbers.map((no) => (
          <React.Fragment key={no}>
            {renderBedBox(no)}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
      {/* Mobile Tabs */}
      <div className="block lg:hidden mb-6 border-b border-gray-200">
        <Tabs 
          value={activeTab} 
          onChange={(e, v) => setActiveTab(v)} 
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="แถวที่ 1" />
          <Tab label="แถวที่ 2" />
          <Tab label="แถวที่ 3" />
          <Tab label="แถวที่ 4" />
        </Tabs>
      </div>

      {/* Top Row (81, 82, 83) matching main grid columns */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
        <div className={`lg:block ${activeTab === 0 ? 'block' : 'hidden'}`}>{renderBedBox('81')}</div>
        <div className={`lg:block ${activeTab === 1 ? 'block' : 'hidden'}`}>{renderBedBox('82')}</div>
        <div className={`lg:block ${activeTab === 2 ? 'block' : 'hidden'}`}>{renderBedBox('83')}</div>
        <div className="hidden lg:block">{/* Empty column 4 */}</div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className={`lg:block ${activeTab === 0 ? 'block' : 'hidden'}`}>
          {renderColumn(COL_1, 'แถวที่ 1')}
        </div>
        <div className={`lg:block ${activeTab === 1 ? 'block' : 'hidden'}`}>
          {renderColumn(COL_2, 'แถวที่ 2')}
        </div>
        <div className={`lg:block ${activeTab === 2 ? 'block' : 'hidden'}`}>
          {renderColumn(COL_3, 'แถวที่ 3')}
        </div>
        <div className={`lg:block ${activeTab === 3 ? 'block' : 'hidden'}`}>
          {renderColumn(COL_4, 'แถวที่ 4')}
        </div>
      </div>
    </div>
  );
}
