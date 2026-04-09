import { create } from 'zustand';
import { CropData } from '@/types';
import { DEFAULT_CROP_AREA } from '@/lib/cropUtils';

interface CropStore {
  isEditing: boolean;
  editingImageId: string | null;
  draft: CropData | null;

  /**
   * 편집 모드 진입. initialCrop이 있으면 그 값을, 없으면 DEFAULT_CROP_AREA를 draft로 설정.
   */
  enterEdit: (imageId: string, initialCrop: CropData | null) => void;

  /**
   * draft의 일부 필드만 갱신.
   */
  updateDraft: (patch: Partial<CropData>) => void;

  /**
   * draft 전체 교체 (비율 프리셋 전환 등에 사용).
   */
  replaceDraft: (draft: CropData) => void;

  /**
   * 편집 모드 종료. draft 폐기.
   */
  exitEdit: () => void;
}

export const useCropStore = create<CropStore>((set) => ({
  isEditing: false,
  editingImageId: null,
  draft: null,

  enterEdit: (imageId, initialCrop) => {
    set({
      isEditing: true,
      editingImageId: imageId,
      draft: initialCrop ? { ...initialCrop } : { ...DEFAULT_CROP_AREA },
    });
  },

  updateDraft: (patch) => {
    set((state) => ({
      draft: state.draft ? { ...state.draft, ...patch } : state.draft,
    }));
  },

  replaceDraft: (draft) => {
    set({ draft: { ...draft } });
  },

  exitEdit: () => {
    set({
      isEditing: false,
      editingImageId: null,
      draft: null,
    });
  },
}));
