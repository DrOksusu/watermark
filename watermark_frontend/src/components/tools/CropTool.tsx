'use client';

import { useCropStore } from '@/stores/useCropStore';
import { useImageStore } from '@/stores/useImageStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crop, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CropTool() {
  const { enabled, cropArea, setEnabled, setCropArea } = useCropStore();
  const { selectedImageId } = useImageStore();

  const handleReset = () => {
    setCropArea({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Crop className="h-4 w-4" />
          이미지 크롭
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant={enabled ? 'default' : 'outline'}
          size="sm"
          className={cn('w-full', enabled && 'ring-2 ring-primary/20')}
          onClick={() => setEnabled(!enabled)}
          disabled={!selectedImageId}
        >
          <Crop className="h-4 w-4 mr-2" />
          {enabled ? '크롭 모드 해제' : '크롭 모드 활성화'}
        </Button>

        {enabled && (
          <>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>캔버스에서 크롭 영역을 드래그하여 조절하세요.</p>
              <p>크롭은 내보내기 시에만 적용됩니다.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted rounded p-2">
                <span className="text-muted-foreground">X:</span>{' '}
                <span className="font-medium">{Math.round(cropArea.x * 100)}%</span>
              </div>
              <div className="bg-muted rounded p-2">
                <span className="text-muted-foreground">Y:</span>{' '}
                <span className="font-medium">{Math.round(cropArea.y * 100)}%</span>
              </div>
              <div className="bg-muted rounded p-2">
                <span className="text-muted-foreground">너비:</span>{' '}
                <span className="font-medium">{Math.round(cropArea.width * 100)}%</span>
              </div>
              <div className="bg-muted rounded p-2">
                <span className="text-muted-foreground">높이:</span>{' '}
                <span className="font-medium">{Math.round(cropArea.height * 100)}%</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              크롭 영역 초기화
            </Button>
          </>
        )}

        {!selectedImageId && (
          <p className="text-xs text-muted-foreground">
            이미지를 선택하면 크롭 기능을 사용할 수 있습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
