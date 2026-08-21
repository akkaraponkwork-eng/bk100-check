'use client';

import React, { useState } from 'react';
import { Fab, Badge, SwipeableDrawer } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import InspectionSummary from './InspectionSummary';
import { BedViolation } from '@/types';

interface InspectionFabProps {
  violations: BedViolation[];
  dateText?: string;
  onCopy: (text: string) => void;
  onSave: (text: string) => void;
  onClear: () => void;
  isSaving?: boolean;
}

export default function InspectionFab({
  violations, dateText, onCopy, onSave, onClear, isSaving
}: InspectionFabProps) {
  const [open, setOpen] = useState(false);

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  return (
    <>
      <Fab 
        color="primary" 
        aria-label="summary" 
        onClick={toggleDrawer(true)}
        sx={{ 
          position: 'fixed', 
          bottom: 16, 
          right: 16,
          zIndex: 1000
        }}
      >
        <Badge badgeContent={violations.length} color="error">
          <AssignmentIcon />
        </Badge>
      </Fab>

      <SwipeableDrawer
        anchor="right"
        open={open}
        onClose={toggleDrawer(false)}
        onOpen={toggleDrawer(true)}
        disableSwipeToOpen={false}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: '85vw',
            maxWidth: 360,
            borderTopLeftRadius: 24, 
            borderBottomLeftRadius: 24
          }
        }}
      >
        
        <div className="flex-1 overflow-hidden flex flex-col p-2">
          <InspectionSummary 
            violations={violations}
            dateText={dateText}
            onCopy={onCopy}
            onSave={(text) => {
              onSave(text);
              setOpen(false);
            }}
            onClear={() => {
              onClear();
              setOpen(false);
            }}
            isSaving={isSaving}
          />
        </div>
      </SwipeableDrawer>
    </>
  );
}
