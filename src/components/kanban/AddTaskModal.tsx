import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { format } from 'date-fns';
import type { KanbanTask } from '@/types';

interface AddTaskModalProps {
  onClose: () => void;
  onAdd: (t: Omit<KanbanTask, 'id'>) => void;
}

export default function AddTaskModal({ onClose, onAdd }: AddTaskModalProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({ title: '', category: 'งานนอก/อื่นๆ' as KanbanTask['category'], location: '', remark: '', date: today });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog 
      open 
      onClose={onClose} 
      fullWidth 
      maxWidth="xs" 
      keepMounted
      sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 18, fontWeight: 700, pb: 1 }}>
        <AddIcon color="primary" /> เพิ่มงาน
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField
          label="ชื่องาน"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="ระบุชื่องาน"
          autoFocus
          fullWidth
          size="small"
        />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>หมวด</InputLabel>
            <Select
              label="หมวด"
              value={form.category}
              onChange={e => set('category', e.target.value as any)}
            >
              <MenuItem value="รปจ">รปจ (งานประจำ)</MenuItem>
              <MenuItem value="งานนอก/อื่นๆ">งานนอก/อื่นๆ</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="สถานที่"
            value={form.location}
            onChange={e => set('location', e.target.value)}
            placeholder="ระบุสถานที่"
            fullWidth
            size="small"
          />
        </Box>
        <TextField
          label="หมายเหตุ"
          value={form.remark}
          onChange={e => set('remark', e.target.value)}
          placeholder="หมายเหตุ (ถ้ามี)"
          fullWidth
          size="small"
        />
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} color="inherit" sx={{ borderRadius: 2 }}>ยกเลิก</Button>
        <Button
          variant="contained"
          disabled={!form.title}
          onClick={() => onAdd({ ...form, count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: false })}
          sx={{ borderRadius: 2, px: 3 }}
        >
          เพิ่ม
        </Button>
      </DialogActions>
    </Dialog>
  );
}
