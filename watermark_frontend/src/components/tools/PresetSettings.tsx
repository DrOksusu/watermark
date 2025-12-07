'use client';

import { useEffect, useState } from 'react';
import { usePresetStore } from '@/stores/usePresetStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Save, FolderOpen, Trash2, Loader2, Settings2, AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PresetSettings() {
  const {
    presets,
    isLoading,
    error,
    selectedPresetId,
    isManuallyCleared,
    fetchPresets,
    saveCurrentAsPreset,
    applyPreset,
    deletePreset,
    resetToDefaults,
    clearError,
  } = usePresetStore();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetToDelete, setPresetToDelete] = useState<string | null>(null);

  // 컴포넌트 마운트 시 프리셋 목록 불러오기
  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  // 프리셋 로드 후 첫 번째 프리셋 자동 적용 (프리셋이 있고 아직 선택된 것이 없고, 수동 해제가 아닐 때)
  const presetsLength = presets.length;
  const firstPresetId = presets[0]?.id;
  useEffect(() => {
    if (presetsLength > 0 && !selectedPresetId && !isManuallyCleared && firstPresetId) {
      applyPreset(firstPresetId);
    }
  }, [presetsLength, selectedPresetId, isManuallyCleared, firstPresetId, applyPreset]);

  // 에러 발생 시 3초 후 자동 제거
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 3000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;

    const success = await saveCurrentAsPreset(presetName.trim());
    if (success) {
      setSaveDialogOpen(false);
      setPresetName('');
    }
  };

  const handleApplyPreset = async (presetId: string) => {
    if (presetId === 'reset') {
      resetToDefaults();
      return;
    }
    if (presetId === 'none') return;
    await applyPreset(presetId);
  };

  const handleDeletePreset = async () => {
    if (!presetToDelete) return;

    const success = await deletePreset(presetToDelete);
    if (success) {
      setDeleteDialogOpen(false);
      setPresetToDelete(null);
    }
  };

  const openDeleteDialog = (presetId: string) => {
    setPresetToDelete(presetId);
    setDeleteDialogOpen(true);
  };

  const selectedPreset = presets.find(p => p.id === selectedPresetId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          설정 프리셋
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 에러 메시지 */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
            <AlertCircle className="h-3 w-3" />
            {error}
          </div>
        )}

        {/* 프리셋 선택 드롭다운 */}
        <div className="space-y-2">
          <Label className="text-xs">프리셋 불러오기</Label>
          <div className="flex gap-2">
            <Select
              value={selectedPresetId || 'none'}
              onValueChange={handleApplyPreset}
              disabled={isLoading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="프리셋 선택..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">프리셋 선택...</SelectItem>
                <SelectItem value="reset">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RotateCcw className="h-3 w-3" />
                    <span>설정 없음 (기본값)</span>
                  </div>
                </SelectItem>
                {presets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 삭제 버튼 */}
            {selectedPresetId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-destructive hover:text-destructive"
                onClick={() => openDeleteDialog(selectedPresetId)}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 현재 선택된 프리셋 정보 */}
        {selectedPreset && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <span className="font-medium">{selectedPreset.name}</span> 프리셋 적용됨
          </div>
        )}

        {/* 현재 설정 저장 버튼 */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setSaveDialogOpen(true)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          현재 설정 저장
        </Button>

        {/* 프리셋 개수 표시 */}
        <p className="text-[10px] text-muted-foreground text-center">
          {presets.length}개의 프리셋 저장됨
        </p>

        {/* 저장 다이얼로그 */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Save className="h-5 w-5" />
                프리셋 저장
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>프리셋 이름</Label>
                <Input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="예: 임상사진용, 수술사진용"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSavePreset();
                  }}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                현재 로고 위치/크기/투명도와 날짜 위치/크기/투명도/글꼴 설정이 저장됩니다.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                취소
              </Button>
              <Button
                onClick={handleSavePreset}
                disabled={!presetName.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 삭제 확인 다이얼로그 */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                프리셋 삭제
              </DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm">
                정말로 이 프리셋을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeletePreset}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                삭제
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
