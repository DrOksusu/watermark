import { create } from 'zustand';

export interface SessionUser {
  id: number;
  clinicId: number;
  externalId: string;
}

interface AuthState {
  user: SessionUser | null;
  status: 'loading' | 'authenticated' | 'error';
  fetchSession: () => Promise<void>;
  clearSession: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',

  // 쿠키 세션 기반: /api/me로 현재 사용자 정보 로딩
  fetchSession: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/me`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        set({ user: null, status: 'error' });
        return;
      }
      const json = await res.json();
      set({ user: json.data ?? null, status: 'authenticated' });
    } catch {
      set({ user: null, status: 'error' });
    }
  },

  clearSession: () => set({ user: null, status: 'error' }),
}));
