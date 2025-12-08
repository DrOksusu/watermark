'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useLogoStore } from '@/stores/useLogoStore';
import { useLogoLibraryStore } from '@/stores/useLogoLibraryStore';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Upload, X, Image as ImageIcon, Save, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LogoSettings() {
  const { logo, scale, opacity, setLogo, setScale, setOpacity, removeLogo } =
    useLogoStore();
  const { uploadLogo, logos, isLoading: isLibraryLoading } = useLogoLibraryStore();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [logoName, setLogoName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 현재 로고가 이미 라이브러리에 있는지 확인
  const isLogoInLibrary = logo && logos.some(l => l.name === logo.name);

  const handleSaveToLibrary = async () => {
    if (!logo?.file) return;

    setIsSaving(true);
    const success = await uploadLogo(logo.file, logoName.trim() || logo.name);
    setIsSaving(false);

    if (success) {
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveDialogOpen(false);
        setSaveSuccess(false);
        setLogoName('');
      }, 1000);
    }
  };

  const openSaveDialog = () => {
    if (logo) {
      setLogoName(logo.name.replace(/\.[^/.]+$/, '')); // 확장자 제거
      setSaveDialogOpen(true);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setLogo(acceptedFiles[0]);
      }
    },
    [setLogo]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    multiple: false,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          로고 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {logo ? (
          <div className="space-y-3">
            <div className="relative inline-block">
              <img
                src={logo.url}
                alt="로고"
                className="max-h-16 object-contain rounded border"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5"
                onClick={removeLogo}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">크기 (이미지 너비 기준)</Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round(scale * 100)}%
                </span>
              </div>
              <Slider
                value={[scale]}
                onValueChange={([value]) => setScale(value)}
                min={0.05}
                max={1}
                step={0.05}
              />
              <p className="text-[10px] text-muted-foreground">
                100% = 이미지 너비와 동일
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">투명도</Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
              <Slider
                value={[opacity]}
                onValueChange={([value]) => setOpacity(value)}
                min={0.1}
                max={1}
                step={0.05}
              />
            </div>

            {/* 라이브러리에 저장 버튼 */}
            {logo.file && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={openSaveDialog}
                disabled={isLibraryLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                라이브러리에 저장
              </Button>
            )}
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              로고 이미지 업로드 (PNG 권장)
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          캔버스에서 드래그하여 위치를 조정하세요
        </p>

        {/* 라이브러리 저장 다이얼로그 */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Save className="h-5 w-5" />
                로고 라이브러리에 저장
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* 미리보기 */}
              {logo && (
                <div className="flex justify-center">
                  <img
                    src={logo.url}
                    alt="미리보기"
                    className="max-h-24 object-contain rounded border"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>로고 이름</Label>
                <Input
                  value={logoName}
                  onChange={(e) => setLogoName(e.target.value)}
                  placeholder="예: 병원 로고, 부서 로고"
                  disabled={isSaving || saveSuccess}
                />
              </div>

              {isLogoInLibrary && (
                <p className="text-xs text-amber-600">
                  같은 이름의 로고가 이미 라이브러리에 있습니다.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSaveDialogOpen(false)}
                disabled={isSaving}
              >
                취소
              </Button>
              <Button
                onClick={handleSaveToLibrary}
                disabled={isSaving || saveSuccess || !logo?.file}
              >
                {saveSuccess ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    저장됨
                  </>
                ) : isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    저장
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
