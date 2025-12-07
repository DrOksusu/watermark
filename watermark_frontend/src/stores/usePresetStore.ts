import { create } from 'zustand';
import { settingsService, SettingsPreset, SettingsPresetInput } from '@/services/settingsService';
import { useLogoStore } from './useLogoStore';
import { useDateStore } from './useDateStore';

interface PresetStore {
  presets: SettingsPreset[];
  isLoading: boolean;
  error: string | null;
  selectedPresetId: string | null;
  isManuallyCleared: boolean; // 사용자가 의도적으로 프리셋을 해제했는지

  // 프리셋 목록 관리
  fetchPresets: () => Promise<void>;

  // 현재 설정을 새 프리셋으로 저장
  saveCurrentAsPreset: (name: string) => Promise<boolean>;

  // 프리셋을 현재 설정에 적용
  applyPreset: (presetId: string) => Promise<boolean>;

  // 프리셋 삭제
  deletePreset: (presetId: string) => Promise<boolean>;

  // 선택된 프리셋 설정
  setSelectedPreset: (presetId: string | null) => void;

  // 기본 설정으로 되돌리기
  resetToDefaults: () => void;

  // 에러 초기화
  clearError: () => void;
}

export const usePresetStore = create<PresetStore>((set, get) => ({
  presets: [],
  isLoading: false,
  isManuallyCleared: false,
  error: null,
  selectedPresetId: null,

  fetchPresets: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await settingsService.getAll();
      if (response.success && response.data) {
        set({ presets: response.data, isLoading: false });
      } else {
        set({ error: response.error || '프리셋을 불러오는데 실패했습니다', isLoading: false });
      }
    } catch {
      set({ error: '서버 연결에 실패했습니다', isLoading: false });
    }
  },

  saveCurrentAsPreset: async (name: string) => {
    const logoStore = useLogoStore.getState();
    const dateStore = useDateStore.getState();

    const presetData: SettingsPresetInput = {
      name,
      logoPositionX: logoStore.position.x,
      logoPositionY: logoStore.position.y,
      logoAnchor: 'top-left',
      logoScale: logoStore.scale,
      logoOpacity: logoStore.opacity,
      datePositionX: dateStore.position.x,
      datePositionY: dateStore.position.y,
      dateFormat: dateStore.text || 'YY.MM',
      fontFamily: dateStore.font.family,
      fontSize: dateStore.font.size,
      fontColor: dateStore.font.color,
      dateScale: dateStore.scale,
      dateOpacity: dateStore.opacity,
    };

    set({ isLoading: true, error: null });
    try {
      const response = await settingsService.create(presetData);
      if (response.success && response.data) {
        const { presets } = get();
        set({
          presets: [...presets, response.data],
          isLoading: false,
          selectedPresetId: response.data.id,
        });
        return true;
      } else {
        set({ error: response.error || '프리셋 저장에 실패했습니다', isLoading: false });
        return false;
      }
    } catch {
      set({ error: '서버 연결에 실패했습니다', isLoading: false });
      return false;
    }
  },

  applyPreset: async (presetId: string) => {
    const { presets } = get();
    const preset = presets.find(p => p.id === presetId);

    if (!preset) {
      // 서버에서 가져오기 시도
      set({ isLoading: true, error: null });
      try {
        const response = await settingsService.getById(presetId);
        if (response.success && response.data) {
          applyPresetToStores(response.data);
          set({ isLoading: false, selectedPresetId: presetId, isManuallyCleared: false });
          return true;
        } else {
          set({ error: response.error || '프리셋을 찾을 수 없습니다', isLoading: false });
          return false;
        }
      } catch {
        set({ error: '서버 연결에 실패했습니다', isLoading: false });
        return false;
      }
    }

    applyPresetToStores(preset);
    set({ selectedPresetId: presetId, isManuallyCleared: false });
    return true;
  },

  deletePreset: async (presetId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await settingsService.delete(presetId);
      if (response.success) {
        const { presets, selectedPresetId } = get();
        set({
          presets: presets.filter(p => p.id !== presetId),
          isLoading: false,
          selectedPresetId: selectedPresetId === presetId ? null : selectedPresetId,
        });
        return true;
      } else {
        set({ error: response.error || '프리셋 삭제에 실패했습니다', isLoading: false });
        return false;
      }
    } catch {
      set({ error: '서버 연결에 실패했습니다', isLoading: false });
      return false;
    }
  },

  setSelectedPreset: (presetId: string | null) => {
    set({ selectedPresetId: presetId });
  },

  resetToDefaults: () => {
    const logoStore = useLogoStore.getState();
    const dateStore = useDateStore.getState();

    // 로고 설정 기본값으로
    logoStore.setPosition({ x: 0.02, y: 0.02 });
    logoStore.setScale(0.3);
    logoStore.setOpacity(1);

    // 날짜 설정 기본값으로
    dateStore.setPosition({ x: 0.02, y: 0.06 });
    dateStore.setFont({
      family: 'Pretendard',
      size: 24,
      color: '#FFFFFF'
    });
    dateStore.setScale(0.15);
    dateStore.setOpacity(1);

    // 선택 해제 및 수동 해제 플래그 설정
    set({ selectedPresetId: null, isManuallyCleared: true });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// 프리셋 데이터를 각 스토어에 적용하는 헬퍼 함수
function applyPresetToStores(preset: SettingsPreset) {
  const logoStore = useLogoStore.getState();
  const dateStore = useDateStore.getState();

  // 로고 설정 적용
  logoStore.setPosition({ x: preset.logoPositionX, y: preset.logoPositionY });
  logoStore.setScale(preset.logoScale);
  logoStore.setOpacity(preset.logoOpacity);

  // 날짜 설정 적용
  dateStore.setPosition({ x: preset.datePositionX, y: preset.datePositionY });
  dateStore.setFont({
    family: preset.fontFamily,
    size: preset.fontSize,
    color: preset.fontColor
  });
  if (preset.dateScale) {
    dateStore.setScale(preset.dateScale);
  }
  if (preset.dateOpacity) {
    dateStore.setOpacity(preset.dateOpacity);
  }
}
