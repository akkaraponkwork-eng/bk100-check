'use client';

import { useState, useCallback, useEffect } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });

  const show = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type, visible: true });
  }, []);

  const hide = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(hide, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible, hide]);

  return { toast, show, hide };
}

interface ToastProps {
  toast: ToastState;
}

export function Toast({ toast }: ToastProps) {
  if (!toast.visible) return null;
  return (
    <div className={`toast toast-${toast.type}`} role="alert" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {toast.type === 'success' && <CheckCircleIcon fontSize="small" />}
      {toast.type === 'error' && <ErrorIcon fontSize="small" />}
      {toast.type === 'info' && <InfoIcon fontSize="small" />}
      {toast.message}
    </div>
  );
}
