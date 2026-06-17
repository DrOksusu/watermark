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
  X,
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

const TYPE_LABEL: Record<AnnotationType, string> = {
  'box': '실선 박스',
  'dashed-box': '점선 박스',
  'dashed-circle': '점선 원',
  'arrow': '화살표',
  'text': '텍스트',
};

const TYPE_ICON: Record<AnnotationType, React.ReactNode> = {
  'box': <Square className="h-3.5 w-3.5" />,
  'dashed-box': <SquareDashed className="h-3.5 w-3.5" />,
  'dashed-circle': <CircleDashed className="h-3.5 w-3.5" />,
  'arrow': <ArrowRight className="h-3.5 w-3.5" />,
  'text': <Type className="h-3.5 w-3.5" />,
};

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
    selectedAnnotationId,
    toolSettings,
    setTool,
    setToolSettings,
    setSelectedAnnotation,
    annotations,
    clearAnnotations,
    removeAnnotation,
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
          <div className="pt-2 border-t space-y-2">
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
            {/* 요소별 행: 좌측 타입/색상/라벨, 우측 X 삭제 버튼. 행 클릭 시 캔버스에서 선택 */}
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {currentAnnotations.map((a, i) => {
                const isSelected = selectedAnnotationId === a.id;
                const label = a.type === 'text'
                  ? `텍스트: ${(a.text ?? '').slice(0, 12) || '(빈 텍스트)'}`
                  : `${TYPE_LABEL[a.type]} #${i + 1}`;
                return (
                  <li
                    key={a.id}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded px-2 py-1 text-xs cursor-pointer transition',
                      isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted',
                    )}
                    onClick={() => setSelectedAnnotation(a.id)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm shrink-0 border border-black/10"
                        style={{ backgroundColor: a.style.color }}
                        aria-hidden="true"
                      />
                      <span className="shrink-0 text-muted-foreground">{TYPE_ICON[a.type]}</span>
                      <span className="truncate">{label}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`${label} 삭제`}
                      title="이 요소 삭제"
                      className="text-muted-foreground hover:text-destructive transition shrink-0"
                      onClick={(e) => {
                        e.stopPropagation(); // 행 클릭(선택)과 분리
                        if (selectedImageId) removeAnnotation(selectedImageId, a.id);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          도구 선택 후 캔버스에서 드래그하여 그리세요
        </p>
      </CardContent>
    </Card>
  );
}
