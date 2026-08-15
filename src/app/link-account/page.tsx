'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ShieldIcon from '@mui/icons-material/Shield';
import PersonIcon from '@mui/icons-material/Person';

function LinkAccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lineUserId = searchParams.get('lineUserId');
  const displayName = searchParams.get('displayName') || '';
  const pictureUrl = searchParams.get('pictureUrl') || '';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If no lineUserId is provided, someone might have navigated here directly
  if (!lineUserId) {
    return (
      <div className="card p-6 text-center">
        <h2 className="text-xl font-bold mb-4">ไม่พบข้อมูลการเข้าสู่ระบบ</h2>
        <p className="text-muted mb-6">กรุณาเข้าสู่ระบบผ่าน LINE อีกครั้ง</p>
        <button className="btn btn-primary w-full" onClick={() => router.push('/login')}>
          กลับไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('กรุณากรอกชื่อและนามสกุลให้ครบถ้วน');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName,
          pictureUrl
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Linked successfully!
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6" style={{ width: '100%', maxWidth: 400 }}>
      <div className="text-center mb-6">
        <div className="avatar mb-4 mx-auto" style={{ width: 64, height: 64, background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
          <ShieldIcon fontSize="large" />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-navy)' }}>
          ยืนยันตัวตน
        </h1>
        <p className="text-muted mt-2 text-sm">
          ระบบตรวจพบว่าคุณใช้งานครั้งแรก<br />
          กรุณากรอกชื่อและนามสกุลเพื่อเชื่อมโยงข้อมูล
        </p>
      </div>

      {error && (
        <div className="badge badge-red w-full flex-center mb-4 p-3" style={{ borderRadius: 8, whiteSpace: 'normal', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="label">ชื่อ (ไม่ต้องระบุยศ)</label>
          <div className="input" style={{ display: 'flex', alignItems: 'center', padding: 0 }}>
            <div style={{ padding: '0 12px', color: 'var(--color-border-dark)' }}><PersonIcon fontSize="small" /></div>
            <input
              type="text"
              placeholder=""
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, padding: '10px 0' }}
              disabled={loading}
              required
            />
          </div>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="label">นามสกุล</label>
          <input
            type="text"
            className="input"
            placeholder=""
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading} style={{ height: 48, fontSize: 16 }}>
          {loading ? 'กำลังตรวจสอบ...' : 'ยืนยันและเข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  );
}

export default function LinkAccountPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--color-bg)'
    }}>
      <Suspense fallback={<div className="skeleton" style={{ width: 400, height: 400, borderRadius: 24 }} />}>
        <LinkAccountForm />
      </Suspense>
    </div>
  );
}
