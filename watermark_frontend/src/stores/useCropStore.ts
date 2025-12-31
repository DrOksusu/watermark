import { create } from 'zustand';

interface CropArea {
  x: number;      // 0-1 비율 (이미지 너비 대비)
  y: number;      // 0-1 비율 (이미지 높이 대비)
  width: number;  // 0-1 비율
  height: number; // 0-1 비율
}

interface CropStore {
  enabled: boolean;
  cropArea: CropArea;
  isAdjusting: boolean;
  setEnabled: (enabled: boolean) => void;
  setCropArea: (area: Partial<CropArea>) => void;
  setIsAdjusting: (isAdjusting: boolean) => void;
  reset: () => void;
}

const DEFAULT_CROP_AREA: CropArea = {
  x: 0.1,
  y: 0.1,
  width: 0.8,
  height: 0.8,
};

export const useCropStore = create<CropStore>((set) => ({
  enabled: false,
  cropArea: DEFAULT_CROP_AREA,
  isAdjusting: false,

  setEnabled: (enabled: boolean) => {
    set({ enabled });
  },

  setCropArea: (area: Partial<CropArea>) => {
    set((state) => ({
      cropArea: { ...state.cropArea, ...area },
    }));
  },

  setIsAdjusting: (isAdjusting: boolean) => {
    set({ isAdjusting });
  },

  reset: () => {
    set({
      enabled: false,
      cropArea: DEFAULT_CROP_AREA,
      isAdjusting: false,
    });
  },
}));
