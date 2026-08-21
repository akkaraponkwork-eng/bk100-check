'use client';

import React, { useState } from 'react';
import { 
  Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip, Alert
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import InfoIcon from '@mui/icons-material/Info';
import EditIcon from '@mui/icons-material/Edit';
import * as XLSX from 'xlsx';
import { BedEntry, Personnel } from '@/types';
import BedAssignDialog from './BedAssignDialog';

interface BedManageTabProps {
  beds: BedEntry[];
  personnel: Personnel[];
  onSaveBeds: (beds: BedEntry[]) => void;
  isSaving?: boolean;
}

export default function BedManageTab({ beds, personnel, onSaveBeds, isSaving }: BedManageTabProps) {
  const [draftBeds, setDraftBeds] = useState<BedEntry[]>(beds);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Edit Dialog State
  const [editBedNo, setEditBedNo] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        const newBeds: BedEntry[] = [];

        data.forEach((row) => {
          const rawBedNo = row['หมายเลขเตียง'] || row['bedNo'] || row['เตียง'];
          const rawName = row['ชื่อ-นามสกุล'] || row['name'] || row['ชื่อ'];

          if (!rawBedNo) return; // Skip if no bed number

          const bedNo = String(rawBedNo).trim();
          let ownerName = rawName ? String(rawName).trim() : undefined;
          let personnelId: string | undefined = undefined;

          // Try to match with personnel
          if (ownerName) {
            const matchedPersonnel = personnel.find(p => {
               const fullName = `${p.rank}${p.firstName} ${p.lastName}`.replace(/\s+/g, '');
               const searchName = ownerName!.replace(/\s+/g, '');
               return fullName.includes(searchName) || searchName.includes(p.firstName);
            });
            
            if (matchedPersonnel) {
              personnelId = matchedPersonnel.id;
              ownerName = `${matchedPersonnel.rank}${matchedPersonnel.firstName}`;
            }
          }

          newBeds.push({
            bedNo,
            ownerName,
            personnelId
          });
        });

        // Ensure 1-83 exists if not in the file? 
        // No, we just replace with what's in the file. The UI grid shows 1-83 based on logic, 
        // but if data isn't there it'll just show empty. Let's merge instead of fully replace.
        // Actually, requirement says: "import เป็นเตียงว่าง" for missing names. 
        // Let's generate a strict 1-83 array and merge with newBeds.
        
        const allBeds = Array.from({ length: 83 }, (_, i) => String(i + 1));
        const finalBeds: BedEntry[] = allBeds.map(no => {
           const found = newBeds.find(b => b.bedNo === no);
           if (found) return found;
           // If not in excel, keep existing or make empty
           const existing = beds.find(b => b.bedNo === no);
           if (existing) return existing;
           return { bedNo: no };
        });

        setDraftBeds(finalBeds);
        setHasChanges(true);
      } catch (error) {
        console.error("Error parsing excel", error);
        alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const handleDelete = (bedNo: string) => {
    setDraftBeds(prev => prev.map(b => b.bedNo === bedNo ? { bedNo } : b));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSaveBeds(draftBeds);
    setHasChanges(false);
  };

  const handleSaveAssign = (bedNo: string, personnelId: string | undefined) => {
    setDraftBeds(prev => {
      let updated = [...prev];
      
      // If assigning someone new
      if (personnelId) {
        // Find if this person already has a bed
        const oldBedIndex = updated.findIndex(b => b.personnelId === personnelId);
        if (oldBedIndex !== -1 && updated[oldBedIndex].bedNo !== bedNo) {
          // Clear old bed
          updated[oldBedIndex] = { ...updated[oldBedIndex], personnelId: undefined, ownerName: undefined };
        }
        
        // Find person name
        const p = personnel.find(p => p.id === personnelId);
        const ownerName = p ? `${p.rank}${p.firstName}` : undefined;
        
        // Update new bed
        updated = updated.map(b => b.bedNo === bedNo ? { ...b, personnelId, ownerName } : b);
      } else {
        // Clearing the bed
        updated = updated.map(b => b.bedNo === bedNo ? { ...b, personnelId: undefined, ownerName: undefined } : b);
      }
      return updated;
    });
    setHasChanges(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4">นำเข้าข้อมูลเตียงจาก Excel</h3>
        
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 4, borderRadius: 2 }}>
          ระบบต้องการไฟล์ Excel ที่มีคอลัมน์ชื่อ <b>หมายเลขเตียง</b> และ <b>ชื่อ-นามสกุล</b> (ถ้ามี)<br/>
          * หากไม่มีชื่อ ระบบจะถือว่าเป็น "เตียงว่าง"<br/>
          * ระบบจะพยายามจับคู่ชื่อกับฐานข้อมูลกำลังพลอัตโนมัติ
        </Alert>

        <div className="flex gap-4 items-center">
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadFileIcon />}
            sx={{ borderRadius: 2, px: 3, py: 1 }}
          >
            อัปโหลดไฟล์ Excel
            <input
              type="file"
              hidden
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
          </Button>
          <span className="text-sm text-gray-500">
            รองรับ .xlsx, .xls
          </span>
        </div>
      </div>

      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[600px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 m-0">ข้อมูลเตียง ({draftBeds.length})</h3>
          
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            sx={{ borderRadius: 2, fontWeight: 'bold' }}
          >
            บันทึกการเปลี่ยนแปลง
          </Button>
        </div>

        <TableContainer className="flex-1 border border-gray-200 rounded-xl">
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>หมายเลขเตียง</TableCell>
                <TableCell>ชื่อเจ้าของ</TableCell>
                <TableCell>รหัสกำลังพล</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {draftBeds.map((bed) => (
                <TableRow key={bed.bedNo} hover>
                  <TableCell>{bed.bedNo}</TableCell>
                  <TableCell>
                    {bed.ownerName ? (
                      <span className="text-sm">{bed.ownerName}</span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">(ว่าง)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {bed.personnelId ? (
                       <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-semibold">
                         เชื่อมต่อแล้ว
                       </span>
                    ) : <span className="text-gray-300">-</span>}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="แก้ไขเจ้าของเตียง">
                      <IconButton size="small" color="primary" onClick={() => setEditBedNo(bed.bedNo)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="ลบชื่อเจ้าของ">
                      <span>
                        <IconButton size="small" color="error" onClick={() => handleDelete(bed.bedNo)} disabled={!bed.ownerName}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {draftBeds.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    ยังไม่มีข้อมูลเตียง
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      {editBedNo && (
        <BedAssignDialog
          open={!!editBedNo}
          onClose={() => setEditBedNo(null)}
          bedNo={editBedNo}
          currentPersonnelId={draftBeds.find(b => b.bedNo === editBedNo)?.personnelId}
          personnel={personnel}
          onSave={handleSaveAssign}
        />
      )}
    </div>
  );
}
