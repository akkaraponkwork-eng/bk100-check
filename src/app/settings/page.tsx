'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import PageHeader from '@/components/layout/PageHeader';
import { useToast } from '@/hooks/useToast';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

export default function SettingsPage() {
  const [currentTab, setCurrentTab] = useState(0);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [viewingUser, setViewingUser] = useState<AppUser | null>(null);
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

  // Bot Settings
  const [botGroupId, setBotGroupId] = useState('');
  const [leaveEnabled, setLeaveEnabled] = useState(true);
  const [savingBotSettings, setSavingBotSettings] = useState(false);
  const [refreshingBot, setRefreshingBot] = useState(false);

  // Admin Accounts
  const [adminAccounts, setAdminAccounts] = useState<{ username: string }[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [openAdminDialog, setOpenAdminDialog] = useState(false);

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
      const [usersRes, orgChartRes, botRes, adminsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/orgchart'),
        fetch('/api/bot-settings'),
        fetch('/api/admin-accounts')
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
      if (botRes.ok) {
        const botData = await botRes.json();
        setBotGroupId(botData.groupId || '');
        setLeaveEnabled(botData.leaveEnabled !== false);
      }
      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        setAdminAccounts(adminsData.accounts || []);
      }
    } catch (e) {
      console.error(e);
      showToast('ไม่สามารถโหลดข้อมูลได้', 'error');
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

  const handleAddAdminAccount = async () => {
    if (!newAdminUsername || !newAdminPassword) {
      showToast('กรุณากรอก Username และ Password', 'info');
      return;
    }
    setSavingAdmin(true);
    try {
      const res = await fetch('/api/admin-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newAdminUsername, password: newAdminPassword })
      });
      if (res.ok) {
        showToast('เพิ่มบัญชีแอดมินสำเร็จ', 'success');
        setAdminAccounts([...adminAccounts, { username: newAdminUsername }]);
        setNewAdminUsername('');
        setNewAdminPassword('');
        setOpenAdminDialog(false);
      } else {
        const data = await res.json();
        showToast(`เกิดข้อผิดพลาด: ${data.error}`, 'error');
      }
    } catch (e) {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleDeleteAdminAccount = async (username: string) => {
    if (!window.confirm(`คุณต้องการลบบัญชี ${username} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch('/api/admin-accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      if (res.ok) {
        showToast('ลบบัญชีแอดมินสำเร็จ', 'success');
        setAdminAccounts(adminAccounts.filter(a => a.username !== username));
      } else {
        const data = await res.json();
        showToast(`เกิดข้อผิดพลาด: ${data.error}`, 'error');
      }
    } catch (e) {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
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

  const handleToggleLeave = async (newVal: boolean) => {
    setLeaveEnabled(newVal); // Optimistic UI update
    try {
      const res = await fetch('/api/bot-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: botGroupId, leaveEnabled: newVal })
      });
      if (res.ok) {
        showToast(newVal ? 'เปิดใช้งานระบบลางานแล้ว' : 'ปิดใช้งานระบบลางานแล้ว', 'success');
      } else {
        const data = await res.json();
        showToast(`เกิดข้อผิดพลาด: ${data.error}`, 'error');
        setLeaveEnabled(!newVal); // Revert on failure
      }
    } catch (e) {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
      setLeaveEnabled(!newVal); // Revert on failure
    }
  };

  const handleRefreshBot = async () => {
    setRefreshingBot(true);
    try {
      const res = await fetch('/api/bot-settings');
      if (res.ok) {
        const data = await res.json();
        setBotGroupId(data.groupId || '');
        showToast('ดึงข้อมูลล่าสุดสำเร็จ', 'success');
      } else {
        showToast('เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setRefreshingBot(false);
    }
  };

  const handleSaveBotSettings = async () => {
    setSavingBotSettings(true);
    try {
      const res = await fetch('/api/bot-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: botGroupId, leaveEnabled })
      });
      if (res.ok) {
        showToast('บันทึกการตั้งค่าบอทสำเร็จ', 'success');
      } else {
        const data = await res.json();
        showToast(`เกิดข้อผิดพลาด: ${data.error}`, 'error');
      }
    } catch (e) {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setSavingBotSettings(false);
    }
  };



  const tabs = [
    { id: 0, label: 'ตั้งค่าทั่วไป', icon: <SettingsIcon fontSize="small" /> },
    { id: 1, label: 'จัดการสิทธิ์', icon: <AdminPanelSettingsIcon fontSize="small" /> },
    { id: 2, label: 'บัญชีแอดมิน', icon: <VpnKeyIcon fontSize="small" /> },
    { id: 3, label: 'ตั้งค่าบอท', icon: <SmartToyIcon fontSize="small" /> },
    { id: 4, label: 'ผังองค์กร', icon: <AccountTreeIcon fontSize="small" /> },
    { id: 5, label: 'เชื่อมต่อระบบ', icon: <CloudIcon fontSize="small" /> },
  ];

  return (
    <div className="pb-24">
      <PageHeader
        title="ตั้งค่าระบบ"
        description="จัดการสิทธิ์ผู้ใช้งาน ผังองค์กร และการเชื่อมต่อระบบ"
      />

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6">

        {/* Top Tabs */}
        <div className="flex overflow-x-auto mb-8 scrollbar-hide p-1.5 bg-gray-100/80 rounded-2xl gap-1.5 shadow-inner">
          {tabs.map(tab => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`relative flex items-center justify-center gap-2 whitespace-nowrap px-5 py-3 min-w-[130px] font-semibold text-[14px] rounded-xl transition-colors z-10 ${isActive
                    ? 'text-[var(--color-primary)]'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-xl shadow-sm border border-gray-200/50"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >

              {/* Tab 0: General Settings */}
              {currentTab === 0 && (
                <div className="max-w-[800px]">
                  <h2 className="flex items-center gap-2 text-lg font-bold mb-1">
                    <SettingsIcon className="text-[var(--color-primary)]" /> ตั้งค่าทั่วไป
                  </h2>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                    จัดการการตั้งค่าพื้นฐานของระบบ
                  </p>

                  <div className="mb-8 p-1 bg-gradient-to-r from-gray-50 to-gray-100 rounded-3xl border border-gray-200">
                    <label className="flex items-start sm:items-center gap-5 p-6 bg-white rounded-[1.3rem] cursor-pointer hover:shadow-md transition-shadow">
                      <div className="relative flex-shrink-0 mt-1 sm:mt-0">
                        <input type="checkbox" className="sr-only" checked={leaveEnabled} onChange={(e) => handleToggleLeave(e.target.checked)} />
                        <div className={`block w-[3.25rem] h-8 rounded-full transition-colors duration-300 ${leaveEnabled ? 'bg-[#06C755]' : 'bg-gray-200'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 shadow-sm ${leaveEnabled ? 'transform translate-x-[1.25rem]' : ''}`}></div>
                      </div>
                      <div>
                        <span className="block font-bold text-gray-900 mb-1 text-base">{leaveEnabled ? 'เปิดใช้งานระบบลางาน' : 'ปิดใช้งานระบบลางานชั่วคราว'}</span>
                        <span className="block text-sm text-gray-500 leading-relaxed">
                          หากปิดการใช้งาน เมนูและระบบลางานจะถูกซ่อนจากกำลังพลและแอดมินทั้งหมด
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Tab 1: Role Management */}
              {currentTab === 1 && (
                <div>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="p-5 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
                      <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-50)] text-[var(--color-primary)] flex items-center justify-center mb-3">
                        <GroupIcon />
                      </div>
                      <h4 className="text-2xl font-bold text-[var(--color-text-primary)]">{users.length}</h4>
                      <p className="text-[13px] font-medium text-[var(--color-text-secondary)] mt-1">ผู้ใช้งานทั้งหมด</p>
                    </div>

                    <div className="p-5 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
                      <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center mb-3">
                        <AdminPanelSettingsIcon />
                      </div>
                      <h4 className="text-2xl font-bold text-[var(--color-text-primary)]">{users.filter(u => u.role === 'admin').length}</h4>
                      <p className="text-[13px] font-medium text-[var(--color-text-secondary)] mt-1">แอดมินระบบ</p>
                    </div>

                    <div className="p-5 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
                      <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center mb-3">
                        <BadgeIcon />
                      </div>
                      <h4 className="text-2xl font-bold text-[var(--color-text-primary)]">{users.filter(u => !u.personnelId).length}</h4>
                      <p className="text-[13px] font-medium text-[var(--color-text-secondary)] mt-1">รอผูกรหัส (ID)</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <h2 className="text-lg font-bold">
                      รายชื่อบุคลากร <span className="text-sm font-medium text-[var(--color-text-secondary)]">({filteredUsers.length})</span>
                    </h2>
                    <div className="relative w-full sm:w-[320px]">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <SearchIcon className="text-gray-400" fontSize="small" />
                      </div>
                      <input
                        type="text"
                        className="w-full bg-gray-100/80 border-transparent hover:bg-gray-200/60 focus:bg-white focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-full pl-11 pr-4 py-2.5 text-sm transition-all duration-300 outline-none"
                        placeholder="ค้นหาชื่อ หรือ ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex flex-col gap-4">
                      {[1, 2, 3].map(i => <div key={i} className="skeleton h-[76px] rounded-[var(--radius-lg)]"></div>)}
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="py-12 text-center bg-gray-50 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)]">
                      <PersonIcon className="text-gray-300 text-5xl mb-2" />
                      <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                        ไม่พบผู้ใช้งานที่ตรงกับ &quot;{searchQuery}&quot;
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {currentUsers.map((u) => (
                        <div
                          key={u.lineUserId}
                          onClick={() => setViewingUser(u)}
                          className="p-3.5 sm:px-5 flex flex-row items-center gap-4 rounded-[1.25rem] bg-gray-50/80 border border-transparent transition-all duration-300 hover:bg-white hover:border-gray-200 hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] cursor-pointer"
                        >
                          <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center text-gray-400 border border-gray-200/50">
                            {u.pictureUrl ? (
                              <img src={u.pictureUrl} alt={u.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <PersonIcon />
                            )}
                          </div>

                          <div className="flex-grow flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[15px] truncate">{u.displayName}</span>
                              {!u.personnelId && (
                                <span className="badge badge-red py-0.5 whitespace-nowrap">รอผูกรหัส</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] text-[var(--color-text-secondary)] truncate">
                                {u.personnelId ? `ID: ${u.personnelId}` : 'Line ID ยังไม่ผูกกับรหัสกำลังพล'}
                              </span>
                              {u.role === 'admin' && <span className="badge badge-red py-0.5 whitespace-nowrap">Admin</span>}
                            </div>
                          </div>

                          <div className="w-auto flex justify-end flex-shrink-0">
                            {updating === u.lineUserId ? (
                              <div className="flex items-center gap-2 px-2 h-10">
                                <svg className="animate-spin h-4 w-4 text-[var(--color-primary)]" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span className="text-xs text-[var(--color-text-secondary)]">กำลังบันทึก...</span>
                              </div>
                            ) : (
                              <select
                                onClick={(e) => e.stopPropagation()}
                                className={`select h-9 py-0 px-3 text-[13px] font-medium min-w-[120px] sm:min-w-[140px] ${u.role === 'admin' ? 'bg-red-50 text-red-600 border-red-200 focus:border-red-500 focus:ring-red-500' : ''}`}
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.lineUserId, e.target.value)}
                              >
                                {Object.entries(ROLE_LABELS).map(([val, label]) => (
                                  <option key={val} value={val}>{label}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      ))}

                      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 mb-2 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-[var(--color-text-secondary)]">แสดงรายการหน้าละ:</span>
                          <select
                            className="select h-8 py-0 px-2 text-[13px] w-auto bg-gray-50 border-transparent hover:border-gray-300"
                            value={rowsPerPage}
                            onChange={(e) => setRowsPerPage(Number(e.target.value))}
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                        {pageCount > 1 && (
                          <div className="flex gap-1">
                            <button
                              className="btn btn-sm btn-outline px-2 h-8 disabled:opacity-30 border-transparent"
                              disabled={page === 1}
                              onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                              ก่อนหน้า
                            </button>
                            {Array.from({ length: pageCount }).map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setPage(i + 1)}
                                className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-medium transition-colors ${page === i + 1 ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                              >
                                {i + 1}
                              </button>
                            ))}
                            <button
                              className="btn btn-sm btn-outline px-2 h-8 disabled:opacity-30 border-transparent"
                              disabled={page === pageCount}
                              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                            >
                              ถัดไป
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Admin Accounts */}
              {currentTab === 2 && (
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                      <h2 className="text-lg font-bold mb-1">บัญชีแอดมิน (Admin Accounts)</h2>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        บัญชีเหล่านี้ใช้สำหรับ Login เพื่อเข้าสู่ระบบในฐานะแอดมินโดยไม่ต้องผูก LINE
                      </p>
                    </div>
                    <button
                      className="btn btn-primary whitespace-nowrap px-5"
                      onClick={() => setOpenAdminDialog(true)}
                    >
                      <AddIcon fontSize="small" /> เพิ่มบัญชี
                    </button>
                  </div>

                  <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-[var(--color-border)] text-sm text-[var(--color-text-primary)]">
                            <th className="py-4 px-6 font-semibold">ชื่อผู้ใช้งาน (Username)</th>
                            <th className="py-4 px-6 font-semibold text-right w-[120px]">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminAccounts.length > 0 ? (
                            adminAccounts.map((account) => (
                              <tr key={account.username} className="border-b border-[var(--color-border)] last:border-0 hover:bg-gray-50/50 transition-colors">
                                <td className="py-3 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)] flex items-center justify-center">
                                      <AdminPanelSettingsIcon fontSize="small" />
                                    </div>
                                    <span className="font-semibold text-[15px]">{account.username}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-6 text-right">
                                  <button
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    onClick={() => handleDeleteAdminAccount(account.username)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={2} className="py-12 text-center text-sm text-[var(--color-text-secondary)]">
                                ยังไม่มีบัญชีในระบบ (ระบบใช้ค่าพื้นฐานจาก .env)
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tailwind Modal for Add Admin */}
                  {openAdminDialog && (
                    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !savingAdmin) setOpenAdminDialog(false); }}>
                      <div className="modal-sheet sm:max-w-sm sm:m-4 sm:rounded-2xl bg-[var(--color-surface)] shadow-2xl border border-[var(--color-border)] flex flex-col p-0 overflow-hidden" style={{ animation: 'slideUp 0.25s ease' }}>
                        <div className="p-6 pb-4">
                          <h3 className="text-[18px] font-bold text-[#0f172a] mb-2">เพิ่มบัญชีแอดมิน</h3>
                          <p className="text-[13px] text-[var(--color-text-secondary)]">
                            กำหนด Username และ Password สำหรับเข้าสู่ระบบหลังบ้าน
                          </p>
                        </div>
                        <div className="px-6 pb-6">
                          <div className="flex flex-col gap-4">
                            <div className="form-group mb-0">
                              <label className="label mb-1.5 text-xs text-gray-500">Username</label>
                              <input
                                type="text"
                                className="input h-10 text-sm"
                                value={newAdminUsername}
                                onChange={(e) => setNewAdminUsername(e.target.value)}
                                autoFocus
                              />
                            </div>
                            <div className="form-group mb-0">
                              <label className="label mb-1.5 text-xs text-gray-500">Password</label>
                              <input
                                type="password"
                                className="input h-10 text-sm"
                                value={newAdminPassword}
                                onChange={(e) => setNewAdminPassword(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="p-4 px-6 flex justify-end gap-2 bg-gray-50 border-t border-[var(--color-border)]">
                          <button
                            className="btn btn-sm btn-ghost text-gray-500 border-transparent hover:bg-gray-200"
                            onClick={() => setOpenAdminDialog(false)}
                            disabled={savingAdmin}
                          >
                            ยกเลิก
                          </button>
                          <button
                            className="btn btn-sm btn-primary px-4"
                            onClick={handleAddAdminAccount}
                            disabled={savingAdmin || !newAdminUsername || !newAdminPassword}
                          >
                            {savingAdmin ? <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : null}
                            บันทึกบัญชี
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Bot Settings */}
              {currentTab === 3 && (
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold mb-1">
                    <SmartToyIcon className="text-[var(--color-primary)]" /> ตั้งค่า LINE Bot &quot;น้อง บก.ร้อย&quot;
                  </h2>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-8 max-w-[600px]">
                    บอทสำหรับดึงเข้ากลุ่มเพื่อแจ้งเตือนเวรยามประจำวัน สรุปยอด และให้กำลังพลสามารถเช็คเวรผ่านการแชทได้
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <div className="p-5 bg-white border border-[var(--color-border)] rounded-2xl mb-8 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-[15px] flex items-center gap-2">
                            <GroupIcon className={botGroupId ? 'text-[#06C755]' : 'text-gray-400'} fontSize="small" /> 
                            สถานะการเชื่อมต่อกลุ่ม LINE
                          </h3>
                          <button 
                            onClick={handleRefreshBot} 
                            disabled={refreshingBot}
                            className="btn btn-sm btn-outline text-xs px-3 h-8 gap-1.5 border-gray-200 hover:bg-gray-50 flex items-center"
                          >
                            <RefreshIcon fontSize="small" className={refreshingBot ? 'animate-spin' : ''} /> 
                            รีเฟรชข้อมูล
                          </button>
                        </div>
                        
                        {botGroupId ? (
                          <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-green-600 uppercase tracking-wider">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                              Connected
                            </div>
                            <code className="text-sm text-green-800 font-mono break-all">{botGroupId}</code>
                          </div>
                        ) : (
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex flex-col gap-1 text-center py-6">
                            <span className="text-sm text-gray-500 font-medium">ยังไม่ได้ดึงบอทเข้ากลุ่ม</span>
                            <span className="text-xs text-gray-400">เมื่อดึงเข้ากลุ่มแล้ว กรุณากดปุ่มรีเฟรชข้อมูล</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="p-8 rounded-3xl bg-gradient-to-br from-[#06C755] to-[#00A040] text-white shadow-lg relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 text-white/10 transform rotate-12">
                          <SmartToyIcon sx={{ fontSize: 180 }} />
                        </div>
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 relative z-10">
                          <AutoAwesomeIcon /> วิธีการใช้งานน้องบอท
                        </h3>
                        <ul className="space-y-4 relative z-10 text-[15px] font-medium opacity-95">
                          <li className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                            <span>แอดบอท <b>&quot;น้อง บก.ร้อย&quot;</b> เป็นเพื่อนใน LINE</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                            <span>เชิญบอทเข้ากลุ่มกองร้อย (ระบบจะดึง Group ID อัตโนมัติเมื่อบอทเข้ากลุ่ม)</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                            <span>กำลังพลสามารถพิมพ์ <b>&quot;เช็คเวร&quot;</b> เพื่อเรียกดูตารางเวรในกลุ่มได้ทันที</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Org Chart */}
              {currentTab === 4 && (
                <div className="max-w-[800px] mx-auto">
                  <div className="mb-8 text-center">
                    <h2 className="text-xl font-bold mb-2">ผังองค์กร</h2>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-full max-w-[540px] bg-white p-2.5 rounded-[2rem] border border-gray-200 shadow-sm relative overflow-hidden flex flex-col items-center">
                      <div className="w-full bg-gray-50/50 rounded-[1.5rem] border-2 border-dashed border-gray-200 p-6 flex flex-col justify-center items-center min-h-[400px] transition-colors hover:bg-gray-50 hover:border-gray-300">
                        {imageUrl ? (
                          <img src={imageUrl} alt="Org Chart Preview" className="w-full h-auto max-h-[500px] object-contain rounded-xl shadow-sm" />
                        ) : (
                          <div className="flex flex-col items-center text-gray-400 gap-4 my-12">
                            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
                              <AccountTreeIcon sx={{ fontSize: 40 }} />
                            </div>
                            <span className="font-semibold text-sm">ยังไม่มีรูปภาพผังองค์กร</span>
                          </div>
                        )}
                      </div>

                      <div className="w-full p-4 px-6 mt-1 flex flex-col items-center">
                        <label className={`btn w-full max-w-[320px] justify-center h-12 text-[15px] font-bold rounded-xl ${uploadingImage ? 'opacity-50 pointer-events-none bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer'}`}>
                          {uploadingImage ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              กำลังอัปโหลด...
                            </span>
                          ) : (
                            <><UploadFileIcon fontSize="small" /> {imageUrl ? 'เปลี่ยนรูปผังองค์กรใหม่' : 'เลือกรูปภาพผังองค์กร'}</>
                          )}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                          />
                        </label>
                        <p className="text-center text-xs text-gray-500 mt-4 font-medium">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 5MB</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Integrations */}
              {currentTab === 5 && (
                <div className="max-w-[700px]">
                  <div className="mb-6">
                    <h2 className="text-lg font-bold mb-1">การเชื่อมต่อระบบภายนอก</h2>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      จัดการ API Keys สำหรับการเชื่อมต่อกับบริการคลาวด์ต่างๆ
                    </p>
                  </div>

                  <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                    <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-xl border border-[var(--color-border)] flex items-center justify-center text-gray-800 bg-gray-50 shrink-0">
                          <CloudIcon />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1.5">
                            <h3 className="font-bold text-[15px] leading-none">ImgBB API</h3>
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border ${imgbbApiKey ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-[var(--color-text-secondary)] border-[var(--color-border)]'}`}>
                              {imgbbApiKey ? "Connected" : "Not Configured"}
                            </span>
                          </div>
                          <p className="text-[13px] text-[var(--color-text-secondary)]">
                            บริการรับฝากไฟล์รูปภาพสำหรับระบบผังองค์กร
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="h-px w-full bg-[var(--color-border)]"></div>

                    <div className="p-6 bg-gray-50/50">
                      <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest mb-3">API Configuration</label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-grow">
                          <input
                            type={showKey ? 'text' : 'password'}
                            className="input h-10 pr-10 bg-[var(--color-surface)] text-sm"
                            placeholder="Enter ImgBB API Key"
                            value={imgbbApiKey}
                            onChange={(e) => setImgbbApiKey(e.target.value)}
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                            onClick={() => setShowKey(!showKey)}
                          >
                            {showKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </button>
                        </div>
                        <button
                          className="btn h-10 justify-center bg-gray-900 text-white hover:bg-gray-800 min-w-[120px] text-sm"
                          onClick={handleSaveApiKey}
                          disabled={savingKey}
                        >
                          {savingKey ? 'Saving...' : 'Save Config'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
