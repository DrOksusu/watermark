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
import { Download, Loader2, FileArchive, Image as ImageIcon, Crop } from 'lucide-react';

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

  // 사이즈 설정에 따른 출력 크기 계산
  const getExportDimensions = (originalWidth: number, originalHeight: number): { width: number; height: number; scale: number } => {
    if (settings.size === 'original') {
      return { width: originalWidth, height: originalHeight, scale: 1 };
    }

    const [targetWidth, targetHeight] = settings.size.split('x').map(Number);
    const scale = Math.min(targetWidth / originalWidth, targetHeight / originalHeight);
    return {
      width: targetWidth,
      height: targetHeight,
      scale,
    };
  };

  const exportSingleImageWithLogo = async (
    imageFile: { id: string; url: string; name: string; width: number; height: number; crop?: import('@/types').CropData },
    preloadedLogo: HTMLImageElement | null
  ): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      const mainImg = new Image();

      mainImg.onerror = () => {
        console.error('Failed to load image:', imageFile.name);
        resolve('');
      };

      mainImg.onload = () => {
        // 유효 소스 영역 (크롭 있으면 크롭 영역, 없으면 전체)
        const crop = imageFile.crop;
        const srcX = crop ? crop.x * mainImg.width : 0;
        const srcY = crop ? crop.y * mainImg.height : 0;
        const srcW = crop ? crop.width * mainImg.width : mainImg.width;
        const srcH = crop ? crop.height * mainImg.height : mainImg.height;

        // 내보내기 크기 (잘린 후 크기 기준)
        const { width: exportWidth, height: exportHeight } = getExportDimensions(srcW, srcH);
        canvas.width = exportWidth;
        canvas.height = exportHeight;

        // letterbox 중앙 정렬
        const imgScale = Math.min(exportWidth / srcW, exportHeight / srcH);
        const drawW = srcW * imgScale;
        const drawH = srcH * imgScale;
        const offsetX = (exportWidth - drawW) / 2;
        const offsetY = (exportHeight - drawH) / 2;

        // 배경 흰색
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, exportWidth, exportHeight);

        // 원본에서 소스 영역만 선택해 그리기 (crop 있으면 크롭 부분만)
        ctx.drawImage(
          mainImg,
          srcX, srcY, srcW, srcH,
          offsetX, offsetY, drawW, drawH,
        );

        // 로고 그리기 — 크롭 기준 좌표 변환
        if (preloadedLogo && logo) {
          const logoXInCrop = crop
            ? (logoPosition.x - crop.x) / crop.width
            : logoPosition.x;
          const logoYInCrop = crop
            ? (logoPosition.y - crop.y) / crop.height
            : logoPosition.y;

          // 크롭 영역 내에 있을 때만 그림
          if (
            logoXInCrop >= 0 && logoXInCrop <= 1 &&
            logoYInCrop >= 0 && logoYInCrop <= 1
          ) {
            ctx.globalAlpha = logoOpacity;
            const logoAspectRatio = preloadedLogo.height / preloadedLogo.width;
            const logoW = drawW * logoScale;
            const logoH = logoW * logoAspectRatio;
            const logoPxX = offsetX + logoXInCrop * drawW;
            const logoPxY = offsetY + logoYInCrop * drawH;
            ctx.drawImage(preloadedLogo, logoPxX, logoPxY, logoW, logoH);
            ctx.globalAlpha = 1;
          }
        }

        // 날짜 텍스트 — 크롭 기준 좌표 변환
        if (dateText && font) {
          const dateXInCrop = crop
            ? (datePosition.x - crop.x) / crop.width
            : datePosition.x;
          const dateYInCrop = crop
            ? (datePosition.y - crop.y) / crop.height
            : datePosition.y;

          if (
            dateXInCrop >= 0 && dateXInCrop <= 1 &&
            dateYInCrop >= 0 && dateYInCrop <= 1
          ) {
            ctx.globalAlpha = dateOpacity;
            const scaledFontSize = drawW * dateScale / 3;
            ctx.font = buildFontString(scaledFontSize, font.family);
            ctx.fillStyle = font.color;
            const dateX = offsetX + dateXInCrop * drawW;
            const dateY = offsetY + dateYInCrop * drawH;
            ctx.fillText(dateText, dateX, dateY + scaledFontSize);
            ctx.globalAlpha = 1;
          }
        }

        // 주석 그리기 — annotation.position은 원본 이미지 픽셀 기준
        const imageAnnotations = getAnnotations(imageFile.id);
        imageAnnotations.forEach((annotation) => {
          // 크롭 기준으로 좌표 변환 (0-1)
          const annXInCrop = crop
            ? (annotation.position.x - srcX) / srcW
            : annotation.position.x / mainImg.width;
          const annYInCrop = crop
            ? (annotation.position.y - srcY) / srcH
            : annotation.position.y / mainImg.height;

          // 크롭 영역 밖이면 스킵
          if (annXInCrop < 0 || annXInCrop > 1 || annYInCrop < 0 || annYInCrop > 1) {
            return;
          }

          ctx.strokeStyle = annotation.style.color;
          ctx.lineWidth = annotation.style.thickness * imgScale;
          ctx.fillStyle = annotation.style.color;

          if (annotation.style.lineStyle === 'dashed') {
            ctx.setLineDash([10 * imgScale, 5 * imgScale]);
          } else {
            ctx.setLineDash([]);
          }

          const annPxX = offsetX + annXInCrop * drawW;
          const annPxY = offsetY + annYInCrop * drawH;

          if (annotation.type === 'box' || annotation.type === 'dashed-box') {
            const radius = annotation.style.borderRadius * imgScale;
            const aw = annotation.size.width * imgScale;
            const ah = annotation.size.height * imgScale;

            if (radius > 0) {
              ctx.beginPath();
              ctx.moveTo(annPxX + radius, annPxY);
              ctx.lineTo(annPxX + aw - radius, annPxY);
              ctx.quadraticCurveTo(annPxX + aw, annPxY, annPxX + aw, annPxY + radius);
              ctx.lineTo(annPxX + aw, annPxY + ah - radius);
              ctx.quadraticCurveTo(annPxX + aw, annPxY + ah, annPxX + aw - radius, annPxY + ah);
              ctx.lineTo(annPxX + radius, annPxY + ah);
              ctx.quadraticCurveTo(annPxX, annPxY + ah, annPxX, annPxY + ah - radius);
              ctx.lineTo(annPxX, annPxY + radius);
              ctx.quadraticCurveTo(annPxX, annPxY, annPxX + radius, annPxY);
              ctx.closePath();
              ctx.stroke();
            } else {
              ctx.strokeRect(annPxX, annPxY, aw, ah);
            }
          } else if (annotation.type === 'dashed-circle') {
            ctx.setLineDash([10 * imgScale, 5 * imgScale]);
            const cx = annPxX + (annotation.size.width / 2) * imgScale;
            const cy = annPxY + (annotation.size.height / 2) * imgScale;
            const rx = (annotation.size.width / 2) * imgScale;
            const ry = (annotation.size.height / 2) * imgScale;

            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
          } else if (annotation.type === 'arrow' && annotation.points) {
            const pts = annotation.points;
            const dx = pts[2] * imgScale;
            const dy = pts[3] * imgScale;
            const startX = annPxX;
            const startY = annPxY;
            const endX = startX + dx;
            const endY = startY + dy;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            const angle = Math.atan2(dy, dx);
            const headLength = 15 * imgScale;
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(
              endX - headLength * Math.cos(angle - Math.PI / 6),
              endY - headLength * Math.sin(angle - Math.PI / 6),
            );
            ctx.moveTo(endX, endY);
            ctx.lineTo(
              endX - headLength * Math.cos(angle + Math.PI / 6),
              endY - headLength * Math.sin(angle + Math.PI / 6),
            );
            ctx.stroke();
          } else if (annotation.type === 'text' && annotation.text) {
            ctx.setLineDash([]);
            const fontSize = 16 * imgScale;
            ctx.font = fontSize + 'px sans-serif';
            ctx.fillText(annotation.text, annPxX, annPxY + fontSize);
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

      // 파일명 생성 헬퍼 함수
      const generateFilename = (index: number, originalName: string): string => {
        if (settings.filename) {
          // 사용자 지정 파일명 사용
          if (images.length === 1) {
            return settings.filename + '.' + extension;
          } else {
            // 여러 장: 파일명, 파일명(1), 파일명(2)...
            return index === 0
              ? settings.filename + '.' + extension
              : settings.filename + '(' + index + ').' + extension;
          }
        } else {
          // 원본 파일명 사용
          return originalName.replace(/\.[^/.]+$/, '') + '.' + extension;
        }
      };

      // 이미지가 1개일 때는 단일 파일로 다운로드
      if (images.length === 1) {
        const image = images[0];
        setCurrentExporting(image.name);
        setProgress(50);

        const dataUrl = await exportSingleImageWithLogo(image, preloadedLogo);
        if (dataUrl) {
          const filename = generateFilename(0, image.name);

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
          const filename = generateFilename(i, image.name);

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
            <Label>파일명</Label>
            <Input
              value={settings.filename}
              onChange={(e) => setSettings({ filename: e.target.value })}
              placeholder="저장할 파일명 입력"
            />
            <p className="text-xs text-muted-foreground">
              {settings.filename ? (
                images.length > 1 ? (
                  <>저장될 파일명: {settings.filename}.{settings.format}, {settings.filename}(1).{settings.format}, ...</>
                ) : (
                  <>저장될 파일명: {settings.filename}.{settings.format}</>
                )
              ) : (
                <>파일명을 입력하지 않으면 원본 파일명이 사용됩니다</>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label>사이즈</Label>
            <Select
              value={settings.size}
              onValueChange={(value: 'original' | '640x400' | '500x400') => setSettings({ size: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original">원본 크기</SelectItem>
                <SelectItem value="640x400">640 x 400 px</SelectItem>
                <SelectItem value="500x400">500 x 400 px</SelectItem>
              </SelectContent>
            </Select>
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
                <>파일명: {settings.filename || images[0]?.name.replace(/\.[^/.]+$/, '')}.{settings.format}</>
              ) : (
                <>파일명: watermark_images.zip</>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              사이즈: {settings.size === 'original' ? '원본 크기' : settings.size.replace('x', ' x ') + ' px'}
            </p>
            {images.some((img) => img.crop) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Crop className="h-3 w-3" />
                크롭 적용된 이미지: {images.filter((img) => img.crop).length} / {images.length}개
              </p>
            )}
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
