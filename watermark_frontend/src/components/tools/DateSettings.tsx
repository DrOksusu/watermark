'use client';

import { useDateStore } from '@/stores/useDateStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

const FONT_FAMILIES = [
  { value: 'Pretendard', label: 'Pretendard' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Noto Sans KR', label: 'Noto Sans KR' },
  { value: 'Malgun Gothic', label: '맑은 고딕' },
];

const FONT_COLORS = [
  { value: '#FFFFFF', label: '흰색' },
  { value: '#000000', label: '검정' },
  { value: '#FF0000', label: '빨강' },
  { value: '#FFFF00', label: '노랑' },
  { value: '#00FF00', label: '초록' },
];

export default function DateSettings() {
  const { text, font, setText, setFont } = useDateStore();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          촬영일자
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">날짜 텍스트</Label>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="예: 22.03"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">글꼴</Label>
          <Select
            value={font.family}
            onValueChange={(value) => setFont({ family: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-xs">글자 크기</Label>
            <span className="text-xs text-muted-foreground">{font.size}px</span>
          </div>
          <Slider
            value={[font.size]}
            onValueChange={([value]) => setFont({ size: value })}
            min={12}
            max={72}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">글자 색상</Label>
          <div className="flex gap-2">
            {FONT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setFont({ color: color.value })}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  font.color === color.value
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-muted-foreground/30'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
            ))}
            <Input
              type="color"
              value={font.color}
              onChange={(e) => setFont({ color: e.target.value })}
              className="w-6 h-6 p-0 border-0 cursor-pointer"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          캔버스에서 드래그하여 위치를 조정하세요
        </p>
      </CardContent>
    </Card>
  );
}
