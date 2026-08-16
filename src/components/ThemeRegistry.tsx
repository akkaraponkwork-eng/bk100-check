'use client';

import * as React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';

const theme = createTheme({
  typography: {
    fontFamily: "'Sarabun', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  palette: {
    primary: {
      main: '#0EA5E9', // Sky Blue 500
      light: '#38BDF8', // Sky Blue 400
      dark: '#0284C7', // Sky Blue 600
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64748B', // Slate 500
      light: '#94A3B8', // Slate 400
      dark: '#475569', // Slate 600
      contrastText: '#ffffff',
    },
    error: {
      main: '#EF4444', // Red 500
    },
    warning: {
      main: '#F59E0B', // Amber 500
    },
    info: {
      main: '#3B82F6', // Blue 500
    },
    success: {
      main: '#10B981', // Emerald 500
    },
    background: {
      default: '#F1F5F9', // Slate 100
      paper: '#ffffff',
    },
    text: {
      primary: '#0F172A', // Slate 900
      secondary: '#475569', // Slate 600
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          padding: 0,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: '1.25rem',
          color: '#0f172a',
          padding: '24px 24px 16px 24px',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          position: 'relative',
          transform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          color: '#475569',
          marginBottom: '6px',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#f8fafc',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: '#f1f5f9',
          },
          '&.Mui-focused': {
            backgroundColor: '#ffffff',
            boxShadow: '0 0 0 3px rgba(14, 165, 233, 0.15)',
            borderColor: '#0EA5E9',
          },
        },
        input: {
          boxSizing: 'content-box',
          padding: '12px 14px',
          '&::placeholder': {
            opacity: 1,
            color: '#94a3b8',
          },
        },

        notchedOutline: {
          top: 0,
          legend: {
            display: 'none',
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '8px 24px 24px 24px',
          '&.MuiDialogContent-dividers': {
            borderTop: 'none',
            borderBottom: 'none',
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px 24px 24px',
          gap: '12px',
          '& > :not(style) ~ :not(style)': {
            marginLeft: 0,
          },
        },
      },
    },
  },
});

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
