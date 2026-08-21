'use client';

import React from 'react';
import { Typography, Paper, Chip, IconButton, MenuItem, Select, FormControl, InputLabel, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import UndoIcon from '@mui/icons-material/Undo';
import { BedEntry, Personnel, PunishmentEntry } from '@/types';
import { parseISO, format } from 'date-fns';
import { th } from 'date-fns/locale';

interface PunishmentKanbanTabProps {
  punishments: PunishmentEntry[];
  personnel: Personnel[];
  onUpdateStatus: (punishmentId: string, status: 'todo' | 'progress' | 'done', shift?: number, targetDate?: string) => void;
  onUpdatePersonnel?: (punishmentId: string, newPersonnelId: string) => void;
}

export default function PunishmentKanbanTab({ punishments, personnel, onUpdateStatus, onUpdatePersonnel }: PunishmentKanbanTabProps) {
  const bedPunishments = punishments.filter(p => p.source === 'bed');
  
  const todo = bedPunishments.filter(p => p.status === 'todo');
  const progress = bedPunishments.filter(p => p.status === 'progress');
  const done = bedPunishments.filter(p => p.status === 'done');

  const getPersonnelName = (id: string) => {
    const p = personnel.find(p => p.id === id);
    return p ? `${p.rank}${p.firstName} ${p.lastName}` : 'ไม่ทราบชื่อ';
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'd MMM', { locale: th });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[600px]">
      {/* Column: Todo */}
      <Paper elevation={0} className="bg-gray-50 p-4 border border-gray-200 rounded-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between mb-2">
          <Typography variant="h6" className="font-bold text-gray-800">รอดำเนินการ</Typography>
          <Chip label={todo.length} size="small" color="error" />
        </div>
        {todo.length === 0 && <Typography variant="body2" className="text-gray-400 text-center py-4">ไม่มีรายการ</Typography>}
        
        {todo.map(p => (
          <TodoCard 
            key={p.id} 
            punishment={p} 
            name={getPersonnelName(p.personnelId)} 
            date={formatDate(p.startDate)}
            personnelList={personnel}
            onSend={(shift, targetDate) => onUpdateStatus(p.id!, 'progress', shift, targetDate)} 
            onUpdatePersonnel={(newId) => onUpdatePersonnel?.(p.id!, newId)}
          />
        ))}
      </Paper>

      {/* Column: Progress */}
      <Paper elevation={0} className="bg-blue-50 p-4 border border-blue-100 rounded-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between mb-2">
          <Typography variant="h6" className="font-bold text-blue-800">กำลังเข้าเวร</Typography>
          <Chip label={progress.length} size="small" color="primary" />
        </div>
        {progress.length === 0 && <Typography variant="body2" className="text-blue-300 text-center py-4">ไม่มีรายการ</Typography>}
        
        {progress.map(p => (
          <ProgressCard 
            key={p.id} 
            punishment={p} 
            name={getPersonnelName(p.personnelId)} 
            date={formatDate(p.startDate)}
            onComplete={() => onUpdateStatus(p.id!, 'done')} 
            onUndo={() => onUpdateStatus(p.id!, 'todo')}
          />
        ))}
      </Paper>

      {/* Column: Done */}
      <Paper elevation={0} className="bg-green-50 p-4 border border-green-100 rounded-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between mb-2">
          <Typography variant="h6" className="font-bold text-green-800">เสร็จสิ้น</Typography>
          <Chip label={done.length} size="small" color="success" />
        </div>
        {done.length === 0 && <Typography variant="body2" className="text-green-300 text-center py-4">ไม่มีรายการ</Typography>}
        
        {done.map(p => (
          <Paper key={p.id} elevation={1} className="p-3 bg-white rounded-xl border border-green-200 opacity-80 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <Typography variant="subtitle2" className="font-bold text-gray-700">{getPersonnelName(p.personnelId)}</Typography>
              <IconButton size="small" onClick={() => onUpdateStatus(p.id!, 'progress')} className="text-gray-400 hover:text-blue-500" title="ย้อนกลับไปกำลังเข้าเวร">
                <UndoIcon fontSize="small" />
              </IconButton>
            </div>
            <Typography variant="caption" className="text-gray-500 block">ข้อหา: {p.remark}</Typography>
            <div className="flex justify-between items-center mt-1">
              <Typography variant="caption" className="text-gray-500">ผลัดที่ {p.shift} (ลงเวร {formatDate(p.startDate)})</Typography>
              <Chip label="เรียบร้อย" size="small" color="success" variant="outlined" />
            </div>
          </Paper>
        ))}
      </Paper>
    </div>
  );
}

function TodoCard({ punishment, name, date, personnelList, onSend, onUpdatePersonnel }: { 
  punishment: PunishmentEntry, 
  name: string, 
  date: string, 
  personnelList: Personnel[],
  onSend: (shift: number, targetDate: string) => void,
  onUpdatePersonnel: (newId: string) => void
}) {
  const [shift, setShift] = React.useState<number>(6);
  const [targetDate, setTargetDate] = React.useState<string>(punishment.startDate || new Date().toISOString().split('T')[0]);
  const [editOpen, setEditOpen] = React.useState(false);
  const [tempPersonnelId, setTempPersonnelId] = React.useState(punishment.personnelId);
  
  const handleSavePersonnel = () => {
    onUpdatePersonnel(tempPersonnelId);
    setEditOpen(false);
  };

  return (
    <Paper elevation={1} className="p-3 bg-white rounded-xl border border-gray-200 flex flex-col gap-2">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-1">
          <Typography variant="subtitle2" className="font-bold text-gray-800 leading-tight">{name}</Typography>
          <IconButton size="small" onClick={() => { setTempPersonnelId(punishment.personnelId); setEditOpen(true); }} className="text-gray-400 hover:text-blue-500 p-0.5">
            <EditIcon fontSize="small" style={{ fontSize: '1rem' }} />
          </IconButton>
        </div>
        <Typography variant="caption" className="text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded">ตรวจเจอ: {date}</Typography>
      </div>
      <Typography variant="caption" className="text-gray-500 block mb-2">ข้อหา: {punishment.remark}</Typography>
      
      <div className="flex flex-col gap-2 mt-auto">
        <TextField
          type="date"
          size="small"
          fullWidth
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          label="วันที่เข้าเวร"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <div className="flex gap-2 items-center">
          <FormControl size="small" fullWidth>
            <InputLabel>ผลัด</InputLabel>
            <Select
              value={shift}
              label="ผลัด"
              onChange={(e) => setShift(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6].map(s => (
                <MenuItem key={s} value={s}>ผลัด {s}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button 
            variant="contained" 
            color="primary" 
            size="small" 
            onClick={() => onSend(shift, targetDate)}
            sx={{ minWidth: 'auto', p: 1, borderRadius: 2 }}
          >
            <PlayArrowIcon fontSize="small" />
          </Button>
        </div>
      </div>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle className="font-bold text-gray-800">เปลี่ยนชื่อผู้กระทำผิด</DialogTitle>
        <DialogContent className="pt-2">
          <Autocomplete
            options={personnelList}
            getOptionLabel={(p) => `${p.rank}${p.firstName} ${p.lastName}`}
            value={personnelList.find(p => p.id === tempPersonnelId) || null}
            onChange={(_, newValue) => setTempPersonnelId(newValue ? newValue.id : '')}
            renderInput={(params) => <TextField {...params} label="ค้นหา/เลือกบุคลากร" size="small" />}
            size="small"
            className="mt-2"
            fullWidth
          />
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setEditOpen(false)} color="inherit">ยกเลิก</Button>
          <Button onClick={handleSavePersonnel} variant="contained" color="primary" sx={{ borderRadius: 2 }}>
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

function ProgressCard({ punishment, name, date, onComplete, onUndo }: { punishment: PunishmentEntry, name: string, date: string, onComplete: () => void, onUndo: () => void }) {
  return (
    <Paper elevation={1} className="p-3 bg-white rounded-xl border border-blue-200 border-l-4 border-l-blue-500 flex flex-col gap-2">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-1">
          <Typography variant="subtitle2" className="font-bold text-gray-800 leading-tight">{name}</Typography>
        </div>
        <div className="flex items-center gap-1">
          <IconButton size="small" onClick={onUndo} className="text-gray-400 hover:text-red-500 p-0.5" title="ย้อนกลับไปรอดำเนินการ">
            <UndoIcon fontSize="small" style={{ fontSize: '1.1rem' }} />
          </IconButton>
          <Typography variant="caption" className="text-blue-500 font-medium bg-blue-50 px-2 py-0.5 rounded">ผลัด {punishment.shift}</Typography>
        </div>
      </div>
      <Typography variant="caption" className="text-gray-500 block">ข้อหา: {punishment.remark}</Typography>
      <Typography variant="caption" className="text-gray-500 block mb-2">ลงเวรวันที่: {date}</Typography>
      
      <Button 
        variant="outlined" 
        color="success" 
        size="small" 
        fullWidth
        startIcon={<CheckCircleIcon />}
        onClick={onComplete}
        sx={{ borderRadius: 2 }}
      >
        เข้าเวรเสร็จสิ้น
      </Button>
    </Paper>
  );
}
