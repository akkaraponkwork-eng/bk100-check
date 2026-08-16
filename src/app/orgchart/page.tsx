'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { UserRole } from '@/types';
import {
  Box, Typography, Button, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Paper, CircularProgress, Tabs, Tab
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInMapIcon from '@mui/icons-material/ZoomInMap';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LinkIcon from '@mui/icons-material/Link';
import PageHeader from '@/components/layout/PageHeader';

export default function OrgChartPage() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imgbbApiKey, setImgbbApiKey] = useState<string>('');
  const [userRole, setUserRole] = useState<UserRole>('personnel');
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUrl, setEditUrl] = useState('');

  const [zoomOpen, setZoomOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [tabIndex, setTabIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orgchart');
      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.imageUrl || '');
        setImgbbApiKey(data.imgbbApiKey || '');
        setUserRole(data.userRole || 'personnel');
      }
    } catch (e) {
      console.error('Failed to load org chart', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveUrl = async () => {
    try {
      // Send only imageUrl, the API will preserve the API key
      const res = await fetch('/api/orgchart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: editUrl })
      });
      if (res.ok) {
        setImageUrl(editUrl);
        setDialogOpen(false);
      }
    } catch (e) {
      console.error('Failed to save', e);
    }
  };

  const openEditDialog = () => {
    setEditUrl(imageUrl);
    setTabIndex(0);
    setDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!imgbbApiKey) {
      alert('ไม่พบ ImgBB API Key กรุณาไปตั้งค่าที่เมนู "ตั้งค่า" ก่อนครับ');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        const uploadedUrl = data.data.url;
        // Auto-save the new URL after successful upload
        const saveRes = await fetch('/api/orgchart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: uploadedUrl })
        });

        if (saveRes.ok) {
          setImageUrl(uploadedUrl);
          setDialogOpen(false);
        }
      } else {
        alert('อัพโหลดไม่สำเร็จ: ' + (data.error?.message || 'ข้อผิดพลาดไม่ทราบสาเหตุ'));
      }
    } catch (error) {
      console.error('Upload failed', error);
      alert('เกิดข้อผิดพลาดในการอัพโหลด');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const isAdmin = userRole === 'admin';

  return (
    <>
      <PageHeader
        title="ทำเนียบหน่วย"
        description="โครงสร้างสายการบังคับบัญชา กองร้อยบังคับการ"
      />

      <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 10 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        ) : !imageUrl ? (
          <Paper sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 4,
            bgcolor: 'background.paper',
            border: '2px dashed',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}>
            <AddPhotoAlternateIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />
            <Typography variant="h6" color="text.primary" sx={{ fontWeight: 600 }}>
              ยังไม่มีข้อมูลทำเนียบข้าราชการ
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
              ยังไม่มีการอัพโหลดรูปทำเนียบ กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มรูปภาพในหน้าการตั้งค่า
            </Typography>
          </Paper>
        ) : (
          <Box
            sx={{
              position: 'relative',
              cursor: 'zoom-in',
              transition: 'transform 0.2s',
              display: 'flex',
              justifyContent: 'center',
              '&:hover': { transform: 'scale(1.01)' }
            }}
            onClick={() => setZoomOpen(true)}
          >
            <Box sx={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="ทำเนียบข้าราชการ"
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', border: '1px solid oklch(0 0 0 / 0.1)' }}
              />

              {/* <Box sx={{ 
              position: 'absolute', top: 16, right: 16, 
              bgcolor: 'rgba(255,255,255,0.9)', 
              borderRadius: '50%', p: 1, 
              display: 'flex', boxShadow: 2 
            }}>
              <ZoomInMapIcon color="primary" />
            </Box> */}
            </Box>
          </Box>
        )}

        {/* Full-Screen Zoom Dialog */}
        <Dialog
          fullScreen
          open={zoomOpen}
          onClose={() => setZoomOpen(false)}
          sx={{
            '& .MuiDialog-paper': {
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              boxShadow: 'none',
            }
          }}
        >
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setZoomOpen(false)}
            aria-label="close"
            sx={{ position: 'absolute', top: 16, right: 16, color: 'white', zIndex: 10, bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
          >
            <CloseIcon />
          </IconButton>

          <Box
            sx={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2
            }}
            onClick={() => setZoomOpen(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="ทำเนียบข้าราชการ ขยายใหญ่"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'zoom-out', border: '1px solid oklch(0 0 0 / 0.1)' }}
            />
          </Box>
        </Dialog>
      </Box>
    </>
  );
}
