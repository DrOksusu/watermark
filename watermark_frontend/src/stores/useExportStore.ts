import { create } from 'zustand';
import { ExportSettings } from '@/types';

interface ExportStore {
  settings: ExportSettings;
  isExporting: boolean;
  progress: number;
  setSettings: (settings: Partial<ExportSettings>) => void;
  setIsExporting: (isExporting: boolean) => void;
  setProgress: (progress: number) => void;
}

export const useExportStore = create<ExportStore>((set) => ({
  settings: {
    folder: '',
    filenamePrefix: 'watermark_',
    format: 'png',
    quality: 90,
  },
  isExporting: false,
  progress: 0,

  setSettings: (settings: Partial<ExportSettings>) => {
    set((state) => ({
      settings: { ...state.settings, ...settings },
    }));
  },

  setIsExporting: (isExporting: boolean) => {
    set({ isExporting });
  },

  setProgress: (progress: number) => {
    set({ progress });
  },
}));
