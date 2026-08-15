'use client';

import { useState, useEffect } from 'react';
import { AppUser, UserRole, ROLE_LABELS } from '@/types';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CloudIcon from '@mui/icons-material/Cloud';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PersonIcon from '@mui/icons-material/Person';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import GroupIcon from '@mui/icons-material/Group';
import BadgeIcon from '@mui/icons-material/Badge';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import {
  Box, Typography, TextField, Button, CircularProgress, Paper,
  List, ListItem, ListItemAvatar, ListItemText, Avatar, Select,
  MenuItem, Divider, InputAdornment, IconButton, Chip,
  Tabs, Tab, Pagination
} from '@mui/material';
import PageHeader from '@/components/layout/PageHeader';
import { useToast } from '@/hooks/useToast';

export default function SettingsPage() {
  const [currentTab, setCurrentTab] = useState(0);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const [imgbbApiKey, setImgbbApiKey] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { showToast } = useToast();

  const filteredUsers = users.filter(u =>
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.personnelId && u.personnelId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, rowsPerPage]);

  const pageCount = Math.ceil(filteredUsers.length / rowsPerPage);
  const currentUsers = filteredUsers.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [usersRes, orgChartRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/orgchart')
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }

      if (orgChartRes.ok) {
        const orgData = await orgChartRes.json();
        setImgbbApiKey(orgData.imgbbApiKey || '');
        setImageUrl(orgData.imageUrl || '');
      }
    } catch (e) {
      console.error(e);
      showToast('ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveApiKey = async () => {
    if (!imgbbApiKey) {
      showToast('กรุณากรอก API Key', 'info');
      return;
    }
    setSavingKey(true);
    try {
      const res = await fetch('/api/orgchart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imgbbApiKey })
      });
      if (res.ok) {
        showToast('บันทึก API Key สำเร็จ', 'success');
      } else {
        showToast('ไม่สามารถบันทึก API Key ได้', 'error');
      }
    } catch (e) {
      showToast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
    } finally {
      setSavingKey(false);
    }
  };

  const handleRoleChange = async (lineUserId: string, newRole: string) => {
    setUpdating(lineUserId);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId, newRole })
      });

      if (res.ok) {
        setUsers(users.map(u => u.lineUserId === lineUserId ? { ...u, role: newRole as UserRole } : u));
        showToast('อัปเดตสิทธิ์ผู้ใช้งานสำเร็จ', 'success');
      } else {
        const data = await res.json();
        showToast(`ผิดพลาด: ${data.error}`, 'error');
      }
    } catch (e) {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!imgbbApiKey) {
      showToast('กรุณาตั้งค่า ImgBB API Key ในเมนู "เชื่อมต่อระบบ" ก่อน', 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: formData,
      });

      const imgbbData = await imgbbRes.json();

      if (imgbbData.success) {
        const newImageUrl = imgbbData.data.url;
        setImageUrl(newImageUrl);

        await fetch('/api/orgchart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: newImageUrl })
        });

        showToast('อัปโหลดผังองค์กรสำเร็จ', 'success');
      } else {
        showToast(`อัปโหลดล้มเหลว: ${imgbbData.error?.message}`, 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการอัปโหลด', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <Box sx={{ pb: 10 }}>
      <PageHeader
        title="ตั้งค่าระบบ"
        description="จัดการสิทธิ์ผู้ใช้งาน ผังองค์กร และการเชื่อมต่อระบบ"
      />

      <Box sx={{ maxWidth: 1000, mx: 'auto', px: { xs: 2, md: 3 } }}>

        {/* Top Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs
            value={currentTab}
            onChange={(e, v) => setCurrentTab(v)}
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 15, minWidth: 120, py: 2, minHeight: 64 },
              '& .Mui-selected': { color: 'text.primary' },
              '& .MuiTabs-indicator': { backgroundColor: 'text.primary', height: 2 }
            }}
            textColor="inherit"
            indicatorColor="primary"
          >
            <Tab icon={<AdminPanelSettingsIcon fontSize="small" />} iconPosition="start" label="จัดการสิทธิ์" />
            <Tab icon={<AccountTreeIcon fontSize="small" />} iconPosition="start" label="ผังองค์กร" />
            <Tab icon={<CloudIcon fontSize="small" />} iconPosition="start" label="เชื่อมต่อระบบ" />
          </Tabs>
        </Box>

        {/* Content Area */}
        <Box sx={{ pb: 6 }}>

          {/* Tab 0: Role Management */}
          {currentTab === 0 && (
            <Box>
              {/* Summary Cards */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
                <Box sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main' }}>
                      <GroupIcon />
                    </Box>
                  </Box>
                  <Typography variant="h4" fontWeight={700} color="text.primary">{users.length}</Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mt: 1 }}>ผู้ใช้งานทั้งหมด</Typography>
                </Box>
                
                <Box sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'warning.50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'warning.main' }}>
                      <AdminPanelSettingsIcon />
                    </Box>
                  </Box>
                  <Typography variant="h4" fontWeight={700} color="text.primary">{users.filter(u => u.role === 'admin').length}</Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mt: 1 }}>แอดมินระบบ</Typography>
                </Box>
                
                <Box sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'error.50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'error.main' }}>
                      <BadgeIcon />
                    </Box>
                  </Box>
                  <Typography variant="h4" fontWeight={700} color="text.primary">{users.filter(u => !u.personnelId).length}</Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mt: 1 }}>รอผูกรหัส (ID)</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, gap: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ fontSize: 18 }}>รายชื่อบุคลากร <Typography component="span" variant="body2" color="text.secondary" fontWeight={500}>({filteredUsers.length})</Typography></Typography>
                <TextField
                  size="small"
                  placeholder="ค้นหาชื่อ หรือ ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ width: { xs: '100%', sm: 300 }, bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }
                  }}
                />
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[1, 2, 3].map(i => <Box key={i} className="skeleton" sx={{ height: 76, borderRadius: 3 }} />)}
                </Box>
              ) : filteredUsers.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
                  <PersonIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    ไม่พบผู้ใช้งานที่ตรงกับ "{searchQuery}"
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {currentUsers.map((u) => (
                    <Box
                      key={u.lineUserId}
                      sx={{
                        p: 2,
                        px: 2.5,
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 2,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: '0 4px 12px rgba(14, 165, 233, 0.08)'
                        }
                      }}
                    >
                      <Avatar src={u.pictureUrl || undefined} sx={{ width: 44, height: 44 }}>
                        {!u.pictureUrl && <PersonIcon />}
                      </Avatar>

                      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{u.displayName}</Typography>
                          {!u.personnelId && (
                            <Chip label="รอผูกรหัส" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: 11, fontWeight: 600, borderRadius: 1 }} />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                            {u.personnelId ? `ID: ${u.personnelId}` : 'Line ID ยังไม่ผูกกับรหัสกำลังพล'}
                          </Typography>
                          {u.role === 'admin' && <Chip label="Admin" size="small" color="error" sx={{ height: 20, fontSize: 11, fontWeight: 600, borderRadius: 1 }} />}
                        </Box>
                      </Box>

                      <Box sx={{ width: { xs: '100%', sm: 'auto' }, display: 'flex', justifyContent: 'flex-end', mt: { xs: 1, sm: 0 } }}>
                        {updating === u.lineUserId ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, height: 36 }}>
                            <CircularProgress size={16} />
                            <Typography variant="caption" color="text.secondary">กำลังบันทึก...</Typography>
                          </Box>
                        ) : (
                          <Select
                            size="small"
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.lineUserId, e.target.value)}
                            sx={{
                              minWidth: 150,
                              height: 36,
                              borderRadius: 2,
                              bgcolor: u.role === 'admin' ? 'error.50' : 'background.default',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: u.role === 'admin' ? 'error.200' : 'divider',
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: u.role === 'admin' ? 'error.main' : 'primary.main',
                              },
                              fontWeight: 500,
                              fontSize: 13,
                              color: u.role === 'admin' ? 'error.main' : 'text.primary',
                            }}
                          >
                            {Object.entries(ROLE_LABELS).map(([val, label]) => (
                              <MenuItem key={val} value={val} sx={{ fontSize: 14 }}>{label}</MenuItem>
                            ))}
                          </Select>
                        )}
                      </Box>
                    </Box>
                  ))}
                  
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 1, gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>แสดงรายการหน้าละ:</Typography>
                      <Select 
                        size="small" 
                        value={rowsPerPage} 
                        onChange={(e) => setRowsPerPage(Number(e.target.value))}
                        sx={{ height: 32, fontSize: 13, borderRadius: 2, bgcolor: 'background.paper' }}
                      >
                        <MenuItem value={10} sx={{ fontSize: 13 }}>10</MenuItem>
                        <MenuItem value={20} sx={{ fontSize: 13 }}>20</MenuItem>
                        <MenuItem value={50} sx={{ fontSize: 13 }}>50</MenuItem>
                        <MenuItem value={100} sx={{ fontSize: 13 }}>100</MenuItem>
                      </Select>
                    </Box>
                    {pageCount > 1 && (
                      <Pagination 
                        count={pageCount} 
                        page={page} 
                        onChange={(e, v) => setPage(v)} 
                        color="primary" 
                        shape="rounded"
                      />
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* Tab 1: Org Chart */}
          {currentTab === 1 && (
            <Box sx={{ maxWidth: 800 }}>
              <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontSize: 20 }}>ผังองค์กร</Typography>
                {/* <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto' }}>
                  อัปโหลดภาพผังโครงสร้างแนวตั้งเพื่อนำไปแสดงผลในหน้าแรกของทำเนียบกำลังพล
                </Typography> */}
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                {/* Showcase Frame */}
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 480,
                    bgcolor: '#fafafa',
                    p: 2,
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 400
                  }}
                >
                  {/* Subtle Grid Background Pattern */}
                  <Box
                    sx={{
                      position: 'absolute', inset: 0, opacity: 0.4,
                      backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                      backgroundSize: '16px 16px'
                    }}
                  />

                  <Box sx={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
                    {imageUrl ? (
                      <Box component="img" src={imageUrl} alt="Org Chart Preview" sx={{ width: '100%', height: 'auto', maxHeight: 600, objectFit: 'contain', borderRadius: 2, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }} />
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'text.disabled', gap: 2, my: 8 }}>
                        <AccountTreeIcon sx={{ fontSize: 48, opacity: 0.5 }} />
                        <Typography variant="body2" fontWeight={500}>ยังไม่มีรูปภาพ</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Action Area */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, width: '100%', maxWidth: 300 }}>
                  <Button
                    component="label"
                    variant="contained"
                    disableElevation
                    fullWidth
                    startIcon={uploadingImage ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon fontSize="small" />}
                    disabled={uploadingImage}
                    sx={{
                      borderRadius: 2,
                      py: 1.2,
                      fontWeight: 600,
                      fontSize: 14,
                      textTransform: 'none',
                      bgcolor: 'common.black',
                      color: 'common.white',
                      '&:hover': { bgcolor: 'grey.800' }
                    }}
                  >
                    {uploadingImage ? 'กำลังอัปโหลด...' : (imageUrl ? 'เปลี่ยนรูปผังองค์กรใหม่' : 'อัปโหลดรูปผังองค์กร')}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    รองรับ JPG, PNG (Max 5MB)
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {/* Tab 2: Integrations */}
          {currentTab === 2 && (
            <Box sx={{ maxWidth: 700 }}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, fontSize: 18 }}>การเชื่อมต่อระบบภายนอก</Typography>
                <Typography variant="body2" color="text.secondary">
                  จัดการ API Keys สำหรับการเชื่อมต่อกับบริการคลาวด์ต่างๆ
                </Typography>
              </Box>

              {/* Sleek Integration Row */}
              <Box sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'background.paper' }}>
                <Box sx={{ p: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center' }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: 2, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'common.black', bgcolor: '#fafafa' }}>
                      <CloudIcon sx={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1 }}>ImgBB API</Typography>
                        <Chip
                          label={imgbbApiKey ? "Connected" : "Not configured"}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            borderRadius: 1,
                            height: 20,
                            fontSize: 10,
                            bgcolor: imgbbApiKey ? '#edfcf4' : 'grey.100',
                            color: imgbbApiKey ? '#166534' : 'text.secondary',
                            border: '1px solid',
                            borderColor: imgbbApiKey ? '#bbf7d0' : 'divider'
                          }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                        บริการรับฝากไฟล์รูปภาพสำหรับระบบผังองค์กร
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Divider />

                <Box sx={{ p: 3, bgcolor: '#fafafa' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>API Configuration</Typography>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      size="small"
                      type={showKey ? 'text' : 'password'}
                      placeholder="Enter ImgBB API Key"
                      value={imgbbApiKey}
                      onChange={(e) => setImgbbApiKey(e.target.value)}
                      sx={{
                        bgcolor: 'background.paper',
                        '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14 }
                      }}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowKey(!showKey)} edge="end" size="small">
                                {showKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }
                      }}
                    />
                    <Button
                      variant="contained"
                      disableElevation
                      disabled={savingKey}
                      onClick={handleSaveApiKey}
                      sx={{
                        borderRadius: 1.5,
                        px: 3,
                        minWidth: 100,
                        fontWeight: 600,
                        fontSize: 13,
                        textTransform: 'none',
                        bgcolor: 'common.black',
                        color: 'common.white',
                        '&:hover': { bgcolor: 'grey.800' }
                      }}
                    >
                      {savingKey ? 'Saving...' : 'Save'}
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}

        </Box>
      </Box>
    </Box>
  );
}
