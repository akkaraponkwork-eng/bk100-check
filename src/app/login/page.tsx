'use client';

import { useState } from 'react';
import ShieldIcon from '@mui/icons-material/Shield';
import LockIcon from '@mui/icons-material/Lock';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'line' | 'admin'>('line');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLineLogin = () => {
    setLoading(true);
    window.location.href = '/api/auth/line';
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = data.redirectUrl || '/';
      } else {
        setErrorMsg(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: 0, right: 0, left: 0,
        height: '45%',
        background: 'linear-gradient(160deg, #0EA5E9 0%, #0284C7 100%)',
        zIndex: 0,
        clipPath: 'ellipse(130% 100% at 50% 0%)',
      }} />

      <div className="login-card" style={{ position: 'relative', zIndex: 1, padding: '32px 24px', width: '100%', maxWidth: 360 }}>
        {/* Logo */}
        <div className="login-logo" style={{ marginBottom: 16 }}>
          <ShieldIcon style={{ fontSize: 36, color: 'white' }} />
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-navy)', marginBottom: 6 }}>
          BK100 ERP
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24 }}>
          ระบบจัดการหน่วย<br />
          <span style={{ fontSize: 12 }}>ร้อย.บก.พัน.บร.กบร.ศบบ.</span>
        </p>

        {errorMsg && (
          <div style={{ padding: '10px 12px', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, fontSize: 13, marginBottom: 16, border: '1px solid #fca5a5' }}>
            {errorMsg}
          </div>
        )}

        {mode === 'line' && (
          <>
            <button
              className="btn btn-line w-full"
              onClick={handleLineLogin}
              disabled={loading}
              style={{ height: 50, fontSize: 15, gap: 10, marginBottom: 16 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
              {loading ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่ระบบด้วย LINE'}
            </button>
            <button
              type="button"
              onClick={() => setMode('admin')}
              style={{ width: '100%', height: 50, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
            >
              <AdminPanelSettingsIcon style={{ fontSize: 18 }} />
              เข้าสู่ระบบแอดมิน
            </button>
          </>
        )}

        {mode === 'admin' && (
          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#0f172a', fontWeight: 600, fontSize: 15 }}>
              <AdminPanelSettingsIcon color="primary" /> Admin Login
            </div>
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={{ width: '100%', height: 44, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 12px', fontSize: 14 }}
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', height: 44, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 12px', fontSize: 14 }}
            />
            <button type="submit" disabled={loading} style={{ width: '100%', height: 44, borderRadius: 8, background: '#0EA5E9', color: 'white', fontWeight: 600, marginTop: 8, border: 'none', cursor: 'pointer' }}>
              {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
            </button>
            <button type="button" onClick={() => { setMode('line'); setErrorMsg(''); }} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 13, marginTop: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <ArrowBackIcon style={{ fontSize: 14 }} /> กลับไปหน้าหลัก
            </button>
          </form>
        )}



        {/* Security note */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginTop: 24, justifyContent: 'center',
          color: 'var(--color-text-muted)', fontSize: 12,
        }}>
          <LockIcon style={{ fontSize: 14 }} />
          <span>ระบบเฉพาะบุคลากรในหน่วย</span>
        </div>
      </div>

      {/* Version */}
      <div style={{
        position: 'relative', zIndex: 1,
        marginTop: 24, fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
      }}>
        v2.0.0 ERP Edition
      </div>
    </div>
  );
}
