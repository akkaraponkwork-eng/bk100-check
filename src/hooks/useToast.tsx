'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const slideDown = keyframes`
  0% {
    transform: translate(-50%, -100%) scale(0.9);
    opacity: 0;
  }
  100% {
    transform: translate(-50%, 0) scale(1);
    opacity: 1;
  }
`;

const fadeOut = keyframes`
  0% {
    transform: translate(-50%, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -20px) scale(0.95);
    opacity: 0;
  }
`;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });
  const [isClosing, setIsClosing] = useState(false);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setIsClosing(false);
    setToast({ message, type, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
      setIsClosing(false);
    }, 200); // match animation duration
  }, []);

  useEffect(() => {
    if (toast.visible && !isClosing) {
      const timer = setTimeout(hideToast, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible, isClosing, hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast.visible && (
        <Box
          sx={{
            position: 'fixed',
            top: { xs: 'calc(env(safe-area-inset-top) + 16px)', md: 24 },
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2.5,
            py: 1.5,
            borderRadius: '100px', // Pill shape
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            animation: `${isClosing ? fadeOut : slideDown} 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
            maxWidth: '90vw',
          }}
        >
          {toast.type === 'success' && <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />}
          {toast.type === 'error' && <ErrorIcon sx={{ color: '#ef4444', fontSize: 20 }} />}
          {toast.type === 'info' && <InfoIcon sx={{ color: '#3b82f6', fontSize: 20 }} />}
          
          <Typography sx={{ 
            fontSize: { xs: 13, md: 14 }, 
            fontWeight: 600, 
            color: '#1e293b',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            mt: 0.25 // Optical alignment
          }}>
            {toast.message}
          </Typography>
        </Box>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
