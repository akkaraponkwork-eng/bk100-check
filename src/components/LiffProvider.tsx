'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LiffProvider({ children, hasSession = false }: { children: React.ReactNode, hasSession?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID || '' });
        
        if (liff.isInClient() || liff.isLoggedIn()) {
          // If already has session from Next.js server cookie, we don't need to re-login!
          if (!hasSession) {
            setLoading(true);
            const profile = await liff.getProfile();
            
            // Check session by hitting our new LIFF auth endpoint
            const res = await fetch('/api/auth/liff', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lineUserId: profile.userId,
                displayName: profile.displayName,
                pictureUrl: profile.pictureUrl
              })
            });

            if (res.ok) {
              // Success, session is set
              if (window.location.pathname === '/login') {
                const urlParams = new URLSearchParams(window.location.search);
                const callbackUrl = urlParams.get('callbackUrl') || '/';
                router.push(callbackUrl);
              } else {
                router.refresh();
              }
            } else {
              // Not linked, redirect to link-account with profile data
              const targetUrl = `/link-account?lineUserId=${profile.userId}&displayName=${encodeURIComponent(profile.displayName || '')}&pictureUrl=${encodeURIComponent(profile.pictureUrl || '')}`;
              if (window.location.pathname !== '/link-account' || !new URLSearchParams(window.location.search).get('lineUserId')) {
                router.push(targetUrl);
              }
            }
          }
        }
      } catch (e) {
        console.error('LIFF Init error', e);
      } finally {
        setLoading(false);
      }
    };

    if (process.env.NEXT_PUBLIC_LIFF_ID && typeof window !== 'undefined') {
      initLiff();
    }
  }, [router, hasSession]);

  return (
    <>
      {loading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="spinner" style={{ 
            width: 40, height: 40, 
            border: '4px solid #f3f3f3', borderTopColor: '#00B900', 
            borderRadius: '50%', animation: 'spin 1s linear infinite' 
          }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ marginTop: 16, color: '#00B900', fontWeight: 600 }}>กำลังเชื่อมต่อกับ LINE...</p>
        </div>
      )}
      {children}
    </>
  );
}
