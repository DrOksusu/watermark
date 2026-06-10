'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { status, fetchSession } = useAuthStore();

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // 세션 로딩 중 표시 (미인증 차단은 Edge 미들웨어가 담당)
  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">세션을 불러오는 중…</p>
      </div>
    );
  }

  return <>{children}</>;
}
