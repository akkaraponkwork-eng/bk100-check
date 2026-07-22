'use client';

import React from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { Print as PrintIcon, Save as SaveIcon } from '@mui/icons-material';

interface StickyFooterProps {
  totalDistributed: number;
  remaining: number;
  isError: boolean;
  onSave: () => void;
  isSaving: boolean;
}

export default function StickyFooter({ totalDistributed, remaining, isError, onSave, isSaving }: StickyFooterProps) {
  return (
    <Box
      className="no-print"
      sx={{
        position: 'fixed',
        bottom: { xs: 16, md: 32 },
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: 'calc(100% - 32px)',
        maxWidth: '800px',
        backgroundColor: isError ? 'rgba(253, 237, 237, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        padding: { xs: '12px 16px', md: '16px 24px' },
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        border: '1px solid',
        borderColor: isError ? 'error.light' : 'rgba(255,255,255,0.5)',
        transition: 'background-color 0.3s, border-color 0.3s',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: 2 }}>
        
        <Box sx={{ display: 'flex', gap: { xs: 2, md: 4 } }}>
          <Box>
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>รวมยอดจำหน่าย</Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', lineHeight: 1 }}>{totalDistributed}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>ยอดคงเหลือ</Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: isError ? 'error.main' : 'success.main', lineHeight: 1 }}>
              {remaining}
              {isError && <Typography component="span" variant="caption" sx={{ ml: 1, fontWeight: 'bold', color: 'error.main' }}>ยอดเกิน!</Typography>}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            color="inherit"
            onClick={() => window.print()}
            sx={{ minWidth: { xs: 'auto', md: '80px' }, borderRadius: 2 }}
          >
            <PrintIcon sx={{ mr: { xs: 0, md: 1 } }} />
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>พิมพ์</Box>
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={onSave}
            disabled={isError || isSaving}
            disableElevation
            sx={{ borderRadius: 2, minWidth: { xs: 'auto', md: '120px' } }}
          >
            {isSaving ? <CircularProgress size={24} color="inherit" /> : (
              <>
                <SaveIcon sx={{ mr: { xs: 0, md: 1 } }} />
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>บันทึกข้อมูล</Box>
              </>
            )}
          </Button>
        </Box>

      </Box>
    </Box>
  );
}
