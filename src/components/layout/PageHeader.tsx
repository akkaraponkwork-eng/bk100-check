'use client';

import { Box, Typography } from '@mui/material';
import NotificationBell from './NotificationBell';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        mt: { xs: -2, md: -3, lg: -4 },
        mx: { xs: -2, md: -3, lg: -4 },
        mb: 3,
        px: { xs: 2, md: 3, lg: 4 },
        py: { xs: 1.5, md: 0 },
        minHeight: { md: 68 },
        bgcolor: 'background.paper',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'primary.main', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.2 }}>
            {description}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {action && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {action}
          </Box>
        )}
        <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
          <NotificationBell />
        </Box>
      </Box>
    </Box>
  );
}
