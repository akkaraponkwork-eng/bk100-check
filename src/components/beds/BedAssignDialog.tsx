import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Autocomplete, TextField, Typography
} from '@mui/material';
import { Personnel } from '@/types';

interface BedAssignDialogProps {
  open: boolean;
  onClose: () => void;
  bedNo: string;
  currentPersonnelId?: string;
  personnel: Personnel[];
  onSave: (bedNo: string, personnelId: string | undefined) => void;
}

export default function BedAssignDialog({ open, onClose, bedNo, currentPersonnelId, personnel, onSave }: BedAssignDialogProps) {
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);

  useEffect(() => {
    if (open) {
      if (currentPersonnelId) {
        const found = personnel.find(p => p.id === currentPersonnelId);
        setSelectedPerson(found || null);
      } else {
        setSelectedPerson(null);
      }
    }
  }, [open, currentPersonnelId, personnel]);

  const handleSave = () => {
    onSave(bedNo, selectedPerson?.id);
    onClose();
  };

  const options = personnel.sort((a, b) => a.firstName.localeCompare(b.firstName));

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xs" 
      fullWidth
      sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold' }}>กำหนดเจ้าของเตียง {bedNo}</DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          ค้นหาและเลือกชื่อกำลังพลเพื่อกำหนดให้เป็นเจ้าของเตียงหมายเลข {bedNo}
          หากกำลังพลมีเตียงอยู่แล้ว ระบบจะย้ายมาเตียงนี้และทำให้เตียงเก่าว่างโดยอัตโนมัติ
        </Typography>
        
        <Autocomplete
          options={options}
          getOptionLabel={(option) => `${option.rank}${option.firstName} ${option.lastName}`}
          value={selectedPerson}
          onChange={(_, newValue) => setSelectedPerson(newValue)}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField 
              {...params} 
              label="ค้นหากำลังพล" 
              variant="outlined"
              fullWidth
              autoFocus
            />
          )}
          noOptionsText="ไม่พบชื่อกำลังพล"
        />
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} color="inherit">ยกเลิก</Button>
        <Button onClick={handleSave} variant="contained" disableElevation sx={{ borderRadius: 2 }}>
          บันทึก
        </Button>
      </DialogActions>
    </Dialog>
  );
}
