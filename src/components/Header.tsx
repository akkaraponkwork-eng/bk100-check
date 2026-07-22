'use client';

import React from 'react';
import { Box, TextField, Typography, Paper } from '@mui/material';

interface HeaderProps {
  date: string;
  setDate: (val: string) => void;
  totalCompany: number | '';
  setTotalCompany: (val: number | '') => void;
}

export default function Header({ date, setDate, totalCompany, setTotalCompany }: HeaderProps) {
  return (
    <Paper elevation={0} className="glass-card" sx={{ p: { xs: 3, md: 4 }, mb: 4, borderRadius: 4 }}>
      <Typography variant="h5" gutterBottom color="primary" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
        แบบรายชื่อการจ่ายงานตามหน้าที่ ร้อย.บก.พัน.บร.
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }} className="print-friendly-box">
        <TextField
          label="วันที่ประจำวัน"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
          sx={{ flex: '1 1 250px' }}
        />
        
        <TextField
          label="ยอดรวมกองร้อย"
          type="number"
          value={totalCompany}
          onChange={(e) => {
            const val = e.target.value;
            setTotalCompany(val === '' ? '' : Number(val));
          }}
          fullWidth
          sx={{ flex: '1 1 250px' }}
        />
      </Box>
    </Paper>
  );
}
