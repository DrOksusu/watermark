import { create } from 'zustand';
import { Position, FontSettings } from '@/types';

interface DateStore {
  text: string;
  position: Position;
  font: FontSettings;
  setText: (text: string) => void;
  setPosition: (position: Position) => void;
  setFont: (font: Partial<FontSettings>) => void;
}

export const useDateStore = create<DateStore>((set) => ({
  text: '',
  position: { x: 20, y: 60 },
  font: {
    family: 'Pretendard',
    size: 24,
    color: '#FFFFFF',
  },

  setText: (text: string) => {
    set({ text });
  },

  setPosition: (position: Position) => {
    set({ position });
  },

  setFont: (font: Partial<FontSettings>) => {
    set((state) => ({
      font: { ...state.font, ...font },
    }));
  },
}));
