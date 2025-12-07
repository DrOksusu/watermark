'use client';

import { useState } from 'react';
import Konva from 'konva';
import JSZip from 'jszip';
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
import { Download, Loader2, FileArchive, Image as ImageIcon } from 'lucide-react';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageRef: React.RefObject<Konva.Stage | null>;
}

function buildFontString(size: number, family: string): string {
  return size.toString() + 'px ' + family;
}

export default function ExportModal({ open, onOpenChange, stageRef }: ExportModalProps) {
  const { images } = useImageStore();
  const { logo, position: logoPosition, scale: logoScale, opacity: logoOpacity } = useLogoStore();
  const { text: dateText, position: datePosition, font, scale: dateScale, opacity: dateOpacity } = useDateStore();
  const { getAnnotations } = useAnnotationStore();
  const { settings, setSettings, isExporting, setIsExporting, progress, setProgress } = useExportStore();

  const [currentExporting, setCurrentExporting] = useState('');

  const loadLogoImage = (): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      if (!logo) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.error('Failed to load logo image');
        resolve(null);
      };
      img.src = logo.url;
    });
  };

  const exportSingleImageWithLogo = async (
    imageFile: { id: string; url: string; name: string; width: number; height: number },
    preloadedLogo: HTMLImageElement | null
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

      mainImg.onerror = () => {
        console.error('Failed to load image:', imageFile.name);
        resolve('');
      };

      mainImg.onload = () => {
        ctx.drawImage(mainImg, 0, 0, imageFile.width, imageFile.height);

        // 미리 로드된 로고 이미지 사용 - 이미지 너비 기준 (logoScale=1.0 이면 이미지 너비와 동일)
        if (preloadedLogo && logo) {
          ctx.globalAlpha = logoOpacity;
          const logoX = logoPosition.x * imageFile.width;
          const logoY = logoPosition.y * imageFile.height;
          // 로고 가로세로 비율 유지
          const logoAspectRatio = preloadedLogo.height / preloadedLogo.width;
          // 로고 너비 = 이미지 너비 * logoScale (100% = 이미지 너비와 동일)
          const logoW = imageFile.width * logoScale;
          const logoH = logoW * logoAspectRatio;
          ctx.drawImage(
            preloadedLogo,
            logoX,
            logoY,
            logoW,
            logoH
          );
          ctx.globalAlpha = 1;
        }

        // 날짜 텍스트 그리기 - 5글자(22.03) 기준으로 폰트 크기 계산 (dateScale=1.0 이면 5글자가 이미지 너비를 채움)
        if (dateText && font) {
          ctx.globalAlpha = dateOpacity;
          const scaledFontSize = imageFile.width * dateScale / 3;
          ctx.font = buildFontString(scaledFontSize, font.family);
          ctx.fillStyle = font.color;
          const dateX = datePosition.x * imageFile.width;
          const dateY = datePosition.y * imageFile.height;
          ctx.fillText(dateText, dateX, dateY + scaledFontSize);
          ctx.globalAlpha = 1;
        }

        // 주석 그리기
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
            const ax = annotation.position.x;
            const ay = annotation.position.y;
            const aw = annotation.size.width;
            const ah = annotation.size.height;

            if (radius > 0) {
              ctx.beginPath();
              ctx.moveTo(ax + radius, ay);
              ctx.lineTo(ax + aw - radius, ay);
              ctx.quadraticCurveTo(ax + aw, ay, ax + aw, ay + radius);
              ctx.lineTo(ax + aw, ay + ah - radius);
              ctx.quadraticCurveTo(ax + aw, ay + ah, ax + aw - radius, ay + ah);
              ctx.lineTo(ax + radius, ay + ah);
              ctx.quadraticCurveTo(ax, ay + ah, ax, ay + ah - radius);
              ctx.lineTo(ax, ay + radius);
              ctx.quadraticCurveTo(ax, ay, ax + radius, ay);
              ctx.closePath();
              ctx.stroke();
            } else {
              ctx.strokeRect(ax, ay, aw, ah);
            }
          } else if (annotation.type === 'arrow' && annotation.points) {
            const pts = annotation.points;
            const dx = pts[2];
            const dy = pts[3];
            const endX = annotation.position.x + dx;
            const endY = annotation.position.y + dy;

            ctx.beginPath();
            ctx.moveTo(annotation.position.x, annotation.position.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();

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
            ctx.font = '16px sans-serif';
            ctx.fillText(annotation.text, annotation.position.x, annotation.position.y + 16);
          }
        });

        const mimeType = settings.format === 'png' ? 'image/png' : 'image/jpeg';
        const quality = settings.quality / 100;
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };

      mainImg.src = imageFile.url;
    });
  };

  // Data URL을 Blob으로 변환하는 헬퍼 함수
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleExport = async () => {
    if (images.length === 0) return;

    setIsExporting(true);
    setProgress(0);

    try {
      // 로고 이미지를 미리 한 번만 로드
      const preloadedLogo = await loadLogoImage();
      const extension = settings.format === 'png' ? 'png' : 'jpg';

      // 이미지가 1개일 때는 단일 파일로 다운로드
      if (images.length === 1) {
        const image = images[0];
        setCurrentExporting(image.name);
        setProgress(50);

        const dataUrl = await exportSingleImageWithLogo(image, preloadedLogo);
        if (dataUrl) {
          const originalName = image.name.replace(/\.[^/.]+$/, '');
          const filename = originalName + settings.filenamePrefix + '.' + extension;

          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        setProgress(100);
        onOpenChange(false);
        return;
      }

      // 이미지가 2개 이상일 때는 ZIP으로 다운로드
      const zip = new JSZip();

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        setCurrentExporting(image.name);
        setProgress(Math.round(((i + 1) / images.length) * 100));

        const dataUrl = await exportSingleImageWithLogo(image, preloadedLogo);
        if (dataUrl) {
          // 원본 파일명에서 확장자 제거
          const originalName = image.name.replace(/\.[^/.]+$/, '');
          const filename = originalName + settings.filenamePrefix + '.' + extension;

          // Data URL을 Blob으로 변환하여 ZIP에 추가
          const blob = dataUrlToBlob(dataUrl);
          zip.file(filename, blob);
        }
      }

      // ZIP 파일 생성 및 다운로드
      setCurrentExporting('ZIP 파일 생성 중...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = 'watermark_images.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setProgress(0);
      setCurrentExporting('');
    }
  };

  const progressWidth = progress.toString() + '%';

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
            <Label>파일명 접미어</Label>
            <Input
              value={settings.filenamePrefix}
              onChange={(e) => setSettings({ filenamePrefix: e.target.value })}
              placeholder="예: _watermark"
            />
            <p className="text-xs text-muted-foreground">
              저장될 파일명: 원본파일명{settings.filenamePrefix}.{settings.format}
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

          <div className="rounded-lg bg-muted p-3 space-y-1">
            <div className="flex items-center gap-2">
              {images.length === 1 ? (
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <FileArchive className="h-4 w-4 text-muted-foreground" />
              )}
              <p className="text-sm">
                {images.length === 1 ? (
                  <>
                    <span className="font-medium">1개</span>의 이미지가 {settings.format.toUpperCase()} 파일로 저장됩니다
                  </>
                ) : (
                  <>
                    <span className="font-medium">{images.length}개</span>의 이미지가 ZIP 파일로 저장됩니다
                  </>
                )}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {images.length === 1 ? (
                <>파일명: {images[0]?.name.replace(/\.[^/.]+$/, '')}{settings.filenamePrefix}.{settings.format}</>
              ) : (
                <>파일명: watermark_images.zip</>
              )}
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
                  style={{ width: progressWidth }}
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
            ) : images.length === 1 ? (
              <>
                <Download className="h-4 w-4 mr-2" />
                이미지 저장
              </>
            ) : (
              <>
                <FileArchive className="h-4 w-4 mr-2" />
                ZIP으로 저장
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
