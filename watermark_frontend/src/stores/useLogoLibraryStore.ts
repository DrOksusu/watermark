import { create } from 'zustand';
import { logoService, ServerLogo } from '@/services/logoService';
import { useLogoStore } from './useLogoStore';

interface LogoLibraryStore {
  logos: ServerLogo[];
  isLoading: boolean;
  error: string | null;
  selectedLogoId: string | null;

  // 로고 목록 관리
  fetchLogos: () => Promise<void>;

  // 로고 업로드
  uploadLogo: (file: File, name?: string) => Promise<boolean>;

  // 로고 선택 (캔버스에 적용)
  selectLogo: (logoId: string) => Promise<boolean>;

  // 로고 선택 해제
  clearLogoSelection: () => void;

  // 로고 삭제
  deleteLogo: (logoId: string) => Promise<boolean>;

  // 에러 초기화
  clearError: () => void;
}

export const useLogoLibraryStore = create<LogoLibraryStore>((set, get) => ({
  logos: [],
  isLoading: false,
  error: null,
  selectedLogoId: null,

  fetchLogos: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await logoService.getAll();
      if (response.success && response.data) {
        set({ logos: response.data, isLoading: false });
      } else {
        set({ error: response.error || '로고 목록을 불러오는데 실패했습니다', isLoading: false });
      }
    } catch {
      set({ error: '서버 연결에 실패했습니다', isLoading: false });
    }
  },

  uploadLogo: async (file: File, name?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await logoService.upload(file, name);
      if (response.success && response.data) {
        const { logos } = get();
        set({
          logos: [...logos, response.data],
          isLoading: false,
        });
        return true;
      } else {
        set({ error: response.error || '로고 업로드에 실패했습니다', isLoading: false });
        return false;
      }
    } catch {
      set({ error: '서버 연결에 실패했습니다', isLoading: false });
      return false;
    }
  },

  selectLogo: async (logoId: string) => {
    const { logos } = get();
    const logo = logos.find(l => l.id === logoId);

    if (!logo) {
      set({ error: '로고를 찾을 수 없습니다' });
      return false;
    }

    try {
      // 서버에서 이 로고를 활성화
      const response = await logoService.activate(logoId);
      if (!response.success) {
        set({ error: response.error || '로고 활성화에 실패했습니다' });
        return false;
      }

      // useLogoStore에 로고 설정
      const logoUrl = logoService.getLogoUrl(logo);

      // 이미지 로드하여 로고 설정
      await loadLogoToStore(logoUrl, logo.name);

      // 선택된 로고 업데이트
      set({ selectedLogoId: logoId });

      // 로고 목록의 isActive 상태 업데이트
      set({
        logos: logos.map(l => ({
          ...l,
          isActive: l.id === logoId
        }))
      });

      return true;
    } catch (error) {
      console.error('Error selecting logo:', error);
      set({ error: '로고 선택에 실패했습니다' });
      return false;
    }
  },

  clearLogoSelection: () => {
    const { logos } = get();
    const logoStore = useLogoStore.getState();

    // 로고 설정에서 제거
    logoStore.removeLogo();

    // 선택 해제 및 isActive 상태 초기화
    set({
      selectedLogoId: null,
      logos: logos.map(l => ({ ...l, isActive: false })),
    });
  },

  deleteLogo: async (logoId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await logoService.delete(logoId);
      if (response.success) {
        const { logos, selectedLogoId } = get();
        set({
          logos: logos.filter(l => l.id !== logoId),
          isLoading: false,
          selectedLogoId: selectedLogoId === logoId ? null : selectedLogoId,
        });

        // 삭제된 로고가 현재 사용 중인 로고였다면 제거
        if (selectedLogoId === logoId) {
          const logoStore = useLogoStore.getState();
          logoStore.removeLogo();
        }

        return true;
      } else {
        set({ error: response.error || '로고 삭제에 실패했습니다', isLoading: false });
        return false;
      }
    } catch {
      set({ error: '서버 연결에 실패했습니다', isLoading: false });
      return false;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// 로고 URL을 로드하여 useLogoStore에 설정하는 헬퍼 함수
async function loadLogoToStore(url: string, name: string): Promise<void> {
  try {
    console.log('Loading logo from URL:', url);

    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch logo: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    console.log('Logo blob loaded:', blob.type, blob.size);

    // 파일 확장자 추출
    const ext = blob.type.split('/')[1] || 'png';
    const fileName = name.includes('.') ? name : `${name}.${ext}`;

    const file = new File([blob], fileName, { type: blob.type });
    const logoStore = useLogoStore.getState();
    await logoStore.setLogo(file);

    console.log('Logo successfully loaded to store');
  } catch (error) {
    console.error('Error loading logo to store:', error);
    throw error;
  }
}
