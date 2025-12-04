import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { LogoFile, Position } from '@/types';

interface LogoStore {
  logo: LogoFile | null;
  position: Position;
  scale: number;
  opacity: number;
  setLogo: (file: File) => Promise<void>;
  setPosition: (position: Position) => void;
  setScale: (scale: number) => void;
  setOpacity: (opacity: number) => void;
  removeLogo: () => void;
}

const loadImage = (file: File): Promise<{ width: number; height: number; url: string }> => {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height, url });
    };
    img.src = url;
  });
};

export const useLogoStore = create<LogoStore>((set, get) => ({
  logo: null,
  // 위치를 비율(0~1)로 저장 - 이미지 크기에 비례하여 적용
  position: { x: 0.02, y: 0.02 },
  // scale은 이미지 너비 대비 비율 (0.3 = 30%, 1.0 = 100% = 이미지 너비와 동일)
  scale: 0.3,
  opacity: 1,

  setLogo: async (file: File) => {
    const { logo: currentLogo } = get();
    if (currentLogo) {
      URL.revokeObjectURL(currentLogo.url);
    }

    const { width, height, url } = await loadImage(file);
    set({
      logo: {
        id: uuidv4(),
        file,
        name: file.name,
        url,
        width,
        height,
      },
    });
  },

  setPosition: (position: Position) => {
    set({ position });
  },

  setScale: (scale: number) => {
    set({ scale });
  },

  setOpacity: (opacity: number) => {
    set({ opacity });
  },

  removeLogo: () => {
    const { logo } = get();
    if (logo) {
      URL.revokeObjectURL(logo.url);
    }
    set({ logo: null });
  },
}));
