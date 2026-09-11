'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Detect LINE in-app browser by UA (works even after middleware redirect strips liff.state)
function isLiffContext() {
  if (typeof window === 'undefined') return false;
  return (
    navigator.userAgent.includes('Line/') ||
    window.location.search.includes('liff.state') ||
    window.location.search.includes('liff_client_id')
  );
}

export default function LiffProvider({
  children,
  hasSession = false,
}: {
  children: React.ReactNode;
  hasSession?: boolean;
}) {
  const router = useRouter();
  // Start spinner immediately if URL/UA signals LIFF context → no white flash
  const [loading, setLoading] = useState(isLiffContext);

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '2011067034-H9LnJMX7';
    if (!liffId || typeof window === 'undefined') return;

    const initLiff = async () => {
      setLoading(true);
      try {
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });

        if (!liff.isInClient() && !liff.isLoggedIn()) return;

        // Already has a valid server session — nothing to do
        if (hasSession) return;

        const profile = await liff.getProfile();
        const res = await fetch('/api/auth/liff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineUserId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
          }),
        });

        if (res.ok) {
          if (window.location.pathname === '/login') {
            const params = new URLSearchParams(window.location.search);
            router.push(params.get('callbackUrl') || '/');
          } else {
            // Hard reload so the server layout picks up the new cookie
            window.location.reload();
          }
        } else {
          // Not linked → send to link-account
          const cur = window.location;
          const alreadyThere =
            cur.pathname === '/link-account' &&
            new URLSearchParams(cur.search).get('lineUserId');
          if (!alreadyThere) {
            router.push(
              `/link-account?lineUserId=${profile.userId}` +
              `&displayName=${encodeURIComponent(profile.displayName || '')}` +
              `&pictureUrl=${encodeURIComponent(profile.pictureUrl || '')}`
            );
          }
        }
      } catch (e) {
        console.error('LIFF Init error', e);
      } finally {
        setLoading(false);
      }
    };

    initLiff();
  }, [router, hasSession]);

  return (
    <>
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#ffffff',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: '4px solid #e5e7eb',
              borderTopColor: '#00B900',
              borderRadius: '50%',
              animation: 'liff-spin 0.8s linear infinite',
            }}
          />
          <style>{`@keyframes liff-spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ margin: 0, color: '#00B900', fontWeight: 600, fontSize: 15 }}>
            กำลังเชื่อมต่อกับ LINE...
          </p>
        </div>
      )}
      {children}
    </>
  );
}
