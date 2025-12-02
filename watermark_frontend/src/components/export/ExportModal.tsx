'use client';

import { useState } from 'react';
import Konva from 'konva';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useImageStore } from '@/stores/useImageStore';
import { useLogoStore } from '@/stores/useLogoStore';
import { useDateStore } from '@/stores/useDateStore';
import { useAnnotationStore } from '@/stores/useAnnotationStore';
import { useExportStore } from '@/stores/useExportStore';
import { Download, Loader2 } from 'lucide-react';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageRef: React.RefObject<Konva.Stage | null>;
}

export default function ExportModal({ open, onOpenChange, stageRef }: ExportModalProps) {
  const { images } = useImageStore();
  const { logo, position: logoPosition, scale: logoScale, opacity: logoOpacity } = useLogoStore();
  const { text: dateText, position: datePosition, font } = useDateStore();
  const { annotations, getAnnotations } = useAnnotationStore();
  const { settings, setSettings, isExporting, setIsExporting, progress, setProgress } = useExportStore();

  const [currentExporting, setCurrentExporting] = useState('');

  const exportSingleImage = async (
    imageFile: { id: string; url: string; name: string; width: number; height: number }
  ): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      canvas.width = imageFile.width;
      canvas.height = imageFile.height;

      const mainImg = new Image();
      mainImg.crossOrigin = 'anonymous';
      mainImg.src = imageFile.url;

      mainImg.onload = () => {
        // Draw main image
        ctx.drawImage(mainImg, 0, 0, imageFile.width, imageFile.height);

        // Draw logo
        if (logo) {
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          logoImg.src = logo.url;
          logoImg.onload = () => {
            ctx.globalAlpha = logoOpacity;
            ctx.drawImage(
              logoImg,
              logoPosition.x,
              logoPosition.y,
              logo.width * logoScale,
              logo.height * logoScale
            );
            ctx.globalAlpha = 1;
            drawDateAndAnnotations();
          };
        } else {
          drawDateAndAnnotations();
        }

        function drawDateAndAnnotations() {
          // Draw date text
          if (dateText) {
            ctx.font = `${font.size}px ${font.family}`;
            ctx.fillStyle = font.color;
            ctx.fillText(dateText, datePosition.x, datePosition.y + font.size);
          }

          // Draw annotations
          const imageAnnotations = getAnnotations(imageFile.id);
          imageAnnotations.forEach((annotation) => {
            ctx.strokeStyle = annotation.style.color;
            ctx.lineWidth = annotation.style.thickness;
            ctx.fillStyle = annotation.style.color;

            if (annotation.style.lineStyle === 'dashed') {
              ctx.setLineDash([10, 5]);
            } else {
              ctx.setLineDash([]);
            }

            if (annotation.type === 'box' || annotation.type === 'dashed-box') {
              const radius = annotation.style.borderRadius;
              const { x, y } = annotation.position;
              const { width, height } = annotation.size;

              if (radius > 0) {
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + width - radius, y);
                ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
                ctx.lineTo(x + width, y + height - radius);
                ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                ctx.lineTo(x + radius, y + height);
                ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.closePath();
                ctx.stroke();
              } else {
                ctx.strokeRect(x, y, width, height);
              }
            } else if (annotation.type === 'arrow' && annotation.points) {
              const [, , dx, dy] = annotation.points;
              const endX = annotation.position.x + dx;
              const endY = annotation.position.y + dy;

              // Draw line
              ctx.beginPath();
              ctx.moveTo(annotation.position.x, annotation.position.y);
              ctx.lineTo(endX, endY);
              ctx.stroke();

              // Draw arrowhead
              const angle = Math.atan2(dy, dx);
              const headLength = 15;
              ctx.beginPath();
              ctx.moveTo(endX, endY);
              ctx.lineTo(
                endX - headLength * Math.cos(angle - Math.PI / 6),
                endY - headLength * Math.sin(angle - Math.PI / 6)
              );
              ctx.moveTo(endX, endY);
              ctx.lineTo(
                endX - headLength * Math.cos(angle + Math.PI / 6),
                endY - headLength * Math.sin(angle + Math.PI / 6)
              );
              ctx.stroke();
            } else if (annotation.type === 'text' && annotation.text) {
              ctx.setLineDash([]);
              ctx.font = `${16}px sans-serif`;
              ctx.fillText(annotation.text, annotation.position.x, annotation.position.y + 16);
            }
          });

          // Get data URL
          const mimeType = settings.format === 'png' ? 'image/png' : 'image/jpeg';
          const quality = settings.quality / 100;
          const dataUrl = canvas.toDataURL(mimeType, quality);
          resolve(dataUrl);
        }
      };
    });
  };

  const handleExport = async () => {
    if (images.length === 0) return;

    setIsExporting(true);
    setProgress(0);

    try {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        setCurrentExporting(image.name);
        setProgress(Math.round(((i + 1) / images.length) * 100));

        const dataUrl = await exportSingleImage(image);
        if (dataUrl) {
          // Create download link
          const link = document.createElement('a');
          const extension = settings.format === 'png' ? 'png' : 'jpg';
          const filename = `${settings.filenamePrefix}${i + 1}.${extension}`;
          link.download = filename;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Small delay between downloads
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setProgress(0);
      setCurrentExporting('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            일괄 저장
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>파일명 접두어</Label>
            <Input
              value={settings.filenamePrefix}
              onChange={(e) => setSettings({ filenamePrefix: e.target.value })}
              placeholder="예: watermark_"
            />
            <p className="text-xs text-muted-foreground">
              저장될 파일명: {settings.filenamePrefix}1.{settings.format}, {settings.filenamePrefix}2.{settings.format}, ...
            </p>
          </div>

          <div className="space-y-2">
            <Label>포맷</Label>
            <Select
              value={settings.format}
              onValueChange={(value: 'jpg' | 'png') => setSettings({ format: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG (무손실)</SelectItem>
                <SelectItem value="jpg">JPG (압축)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>품질</Label>
              <span className="text-sm text-muted-foreground">{settings.quality}%</span>
            </div>
            <Slider
              value={[settings.quality]}
              onValueChange={([value]) => setSettings({ quality: value })}
              min={10}
              max={100}
              step={5}
            />
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm">
              <span className="font-medium">{images.length}개</span>의 이미지가 저장됩니다
            </p>
          </div>

          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{currentExporting} 저장 중...</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">{progress}%</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            취소
          </Button>
          <Button onClick={handleExport} disabled={isExporting || images.length === 0}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                저장하기
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
