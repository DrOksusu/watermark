'use client';

import { useAnnotationStore } from '@/stores/useAnnotationStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Square,
  SquareDashed,
  CircleDashed,
  ArrowRight,
  Type,
  Pencil,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnnotationType } from '@/types';
import { useImageStore } from '@/stores/useImageStore';

const TOOLS: { type: AnnotationType; icon: React.ReactNode; label: string }[] = [
  { type: 'box', icon: <Square className="h-4 w-4" />, label: '실선 박스' },
  { type: 'dashed-box', icon: <SquareDashed className="h-4 w-4" />, label: '점선 박스' },
  { type: 'dashed-circle', icon: <CircleDashed className="h-4 w-4" />, label: '점선 원' },
  { type: 'arrow', icon: <ArrowRight className="h-4 w-4" />, label: '화살표' },
  { type: 'text', icon: <Type className="h-4 w-4" />, label: '텍스트' },
];

const COLORS = [
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#FF00FF',
  '#00FFFF',
  '#FFFFFF',
  '#000000',
];

export default function AnnotationTools() {
  const {
    selectedTool,
    toolSettings,
    setTool,
    setToolSettings,
    annotations,
    clearAnnotations,
  } = useAnnotationStore();
  const selectedImageId = useImageStore((state) => state.selectedImageId);
  const currentAnnotations = selectedImageId ? annotations[selectedImageId] || [] : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Pencil className="h-4 w-4" />
          강조 도구
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-5 gap-2">
          {TOOLS.map((tool) => (
            <Button
              key={tool.type}
              variant={selectedTool === tool.type ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'flex flex-col items-center gap-1 h-auto py-2',
                selectedTool === tool.type && 'ring-2 ring-primary/20'
              )}
              onClick={() =>
                setTool(selectedTool === tool.type ? null : tool.type)
              }
            >
              {tool.icon}
              <span className="text-[10px]">{tool.label}</span>
            </Button>
          ))}
        </div>

        {selectedTool && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">색상</Label>
              <div className="flex gap-1 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setToolSettings({ color })}
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      toolSettings.color === color
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-muted-foreground/30'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <Input
                  type="color"
                  value={toolSettings.color}
                  onChange={(e) => setToolSettings({ color: e.target.value })}
                  className="w-6 h-6 p-0 border-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">두께</Label>
                <span className="text-xs text-muted-foreground">
                  {toolSettings.thickness}px
                </span>
              </div>
              <Slider
                value={[toolSettings.thickness]}
                onValueChange={([value]) => setToolSettings({ thickness: value })}
                min={1}
                max={10}
                step={1}
              />
            </div>

            {(selectedTool === 'box' || selectedTool === 'dashed-box') && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">모서리 라운드</Label>
                  <span className="text-xs text-muted-foreground">
                    {toolSettings.borderRadius}px
                  </span>
                </div>
                <Slider
                  value={[toolSettings.borderRadius]}
                  onValueChange={([value]) =>
                    setToolSettings({ borderRadius: value })
                  }
                  min={0}
                  max={20}
                  step={1}
                />
              </div>
            )}

            {selectedTool === 'text' && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">글자 크기</Label>
                  <span className="text-xs text-muted-foreground">
                    {toolSettings.fontSize}px
                  </span>
                </div>
                <Slider
                  value={[toolSettings.fontSize]}
                  onValueChange={([value]) =>
                    setToolSettings({ fontSize: value })
                  }
                  min={12}
                  max={48}
                  step={1}
                />
              </div>
            )}
          </>
        )}

        {currentAnnotations.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {currentAnnotations.length}개의 강조 요소
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-6 px-2"
                onClick={() => selectedImageId && clearAnnotations(selectedImageId)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                전체 삭제
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          도구 선택 후 캔버스에서 드래그하여 그리세요
        </p>
      </CardContent>
    </Card>
  );
}
