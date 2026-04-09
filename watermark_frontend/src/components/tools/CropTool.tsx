'use client';

import { useEffect } from 'react';
import { useCropStore } from '@/stores/useCropStore';
import { useImageStore } from '@/stores/useImageStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crop, RotateCcw, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { applyAspectRatio, DEFAULT_CROP_AREA } from '@/lib/cropUtils';
import { CropAspectRatio } from '@/types';

const ASPECT_RATIOS: { value: CropAspectRatio; label: string }[] = [
  { value: 'free', label: '자유' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '16:9', label: '16:9' },
];

export default function CropTool() {
  const {
    isEditing,
    editingImageId,
    draft,
    enterEdit,
    replaceDraft,
    exitEdit,
  } = useCropStore();
  const { selectedImageId, images, setImageCrop } = useImageStore();

  const selectedImage = images.find((img) => img.id === selectedImageId);

  // 이미지 전환 시 편집 모드 자동 종료 (draft 폐기)
  useEffect(() => {
    if (isEditing && editingImageId !== selectedImageId) {
      exitEdit();
    }
  }, [selectedImageId, isEditing, editingImageId, exitEdit]);

  const handleStartEdit = () => {
    if (!selectedImageId || !selectedImage) return;
    enterEdit(selectedImageId, selectedImage.crop ?? null);
  };

  const handleApply = () => {
    if (!editingImageId || !draft) return;
    setImageCrop(editingImageId, draft);
    exitEdit();
  };

  const handleCancel = () => {
    exitEdit();
  };

  const handleReset = () => {
    if (!selectedImage) return;
    replaceDraft({ ...DEFAULT_CROP_AREA });
  };

  const handleRatioChange = (ratio: CropAspectRatio) => {
    if (!draft || !selectedImage) return;
    const next = applyAspectRatio(
      draft,
      ratio,
      selectedImage.width,
      selectedImage.height,
    );
    replaceDraft(next);
  };

  const handleRemoveCrop = () => {
    if (!selectedImageId) return;
    setImageCrop(selectedImageId, null);
  };

  // 이미지 미선택 상태
  if (!selectedImageId || !selectedImage) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Crop className="h-4 w-4" />
            이미지 크롭
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            이미지를 선택하면 크롭 기능을 사용할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  // 편집 모드
  if (isEditing && editingImageId === selectedImageId && draft) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Crop className="h-4 w-4" />
            크롭 편집 중
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">비율</p>
            <div className="grid grid-cols-5 gap-1">
              {ASPECT_RATIOS.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={draft.aspectRatio === value ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => handleRatioChange(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted rounded p-2">
              <span className="text-muted-foreground">X:</span>{' '}
              <span className="font-medium">{Math.round(draft.x * 100)}%</span>
            </div>
            <div className="bg-muted rounded p-2">
              <span className="text-muted-foreground">Y:</span>{' '}
              <span className="font-medium">{Math.round(draft.y * 100)}%</span>
            </div>
            <div className="bg-muted rounded p-2">
              <span className="text-muted-foreground">너비:</span>{' '}
              <span className="font-medium">{Math.round(draft.width * 100)}%</span>
            </div>
            <div className="bg-muted rounded p-2">
              <span className="text-muted-foreground">높이:</span>{' '}
              <span className="font-medium">{Math.round(draft.height * 100)}%</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            크롭 영역 밖의 로고/날짜/주석은 최종 이미지에서 숨겨집니다.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={handleApply}>
              <Check className="h-4 w-4 mr-1" />
              적용
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              취소
            </Button>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            크롭 영역 초기화
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 기본 상태 (이미지 선택됨, 편집 아님)
  const currentCrop = selectedImage.crop;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Crop className="h-4 w-4" />
          이미지 크롭
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          size="sm"
          className={cn('w-full', currentCrop && 'ring-2 ring-primary/20')}
          onClick={handleStartEdit}
        >
          <Crop className="h-4 w-4 mr-2" />
          {currentCrop ? '크롭 범위 편집' : '크롭 편집 시작'}
        </Button>

        {currentCrop && (
          <>
            <div className="text-xs text-muted-foreground">
              적용됨: {Math.round(currentCrop.width * 100)}% × {Math.round(currentCrop.height * 100)}%
              {currentCrop.aspectRatio !== 'free' && (
                <span className="ml-1">({currentCrop.aspectRatio})</span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleRemoveCrop}
            >
              <X className="h-4 w-4 mr-2" />
              크롭 해제
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
