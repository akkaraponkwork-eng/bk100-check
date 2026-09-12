import { useState, useEffect } from 'react';

export function usePermissions() {
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; role: string; name: string; personnelId: string } | null>(null);

  useEffect(() => {
    async function loadAuthAndMetadata() {
      try {
        const meRes = await fetch('/api/auth/me');

        if (meRes.ok) {
          const data = await meRes.json();
          setUserRoles([data.role || 'personnel']);
          setUserPermissions(data.permissions || []);
          setUser({ id: data.id, role: data.role, name: data.name, personnelId: data.personnelId });
        }
      } catch (e) {
        console.error('Failed to load permissions', e);
      } finally {
        setLoading(false);
      }
    }

    // Initial load
    loadAuthAndMetadata();

    // Poll every 15 seconds to sync permissions across devices automatically
    const intervalId = setInterval(loadAuthAndMetadata, 15000);
    
    return () => clearInterval(intervalId);
  }, []);

  const can = (actionString: string) => {
    return userPermissions.includes(actionString);
  };

  return { can, loading, userRoles, user };
}
