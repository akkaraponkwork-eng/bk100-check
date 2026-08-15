'use client';

import * as React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';

const theme = createTheme({
  typography: {
    fontFamily: 'var(--font-inter), var(--font-noto-sans-thai), sans-serif',
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
