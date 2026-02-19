import { create } from 'zustand';

const TOKEN_KEY = 'unified_token';

interface AuthState {
  unifiedToken: string | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  clearToken: () => void;
  initFromHash: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  unifiedToken: null,
  isAuthenticated: false,

  setToken: (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ unifiedToken: token, isAuthenticated: true });
  },

  clearToken: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ unifiedToken: null, isAuthenticated: false });
  },

  initFromHash: () => {
    // 1. URL 해시에서 토큰 추출 시도
    const hash = window.location.hash;
    if (hash) {
      const match = hash.match(/unifiedToken=([^&]+)/);
      if (match) {
        const token = decodeURIComponent(match[1]);
        localStorage.setItem(TOKEN_KEY, token);
        // 해시 제거 (URL 정리)
        history.replaceState(null, '', window.location.pathname + window.location.search);
        set({ unifiedToken: token, isAuthenticated: true });
        return;
      }
    }

    // 2. localStorage에서 기존 토큰 복원
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      set({ unifiedToken: stored, isAuthenticated: true });
      return;
    }

    // 3. 토큰 없음
    set({ unifiedToken: null, isAuthenticated: false });
  },
}));
