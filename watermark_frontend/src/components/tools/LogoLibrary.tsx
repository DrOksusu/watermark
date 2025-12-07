'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useLogoLibraryStore } from '@/stores/useLogoLibraryStore';
import { logoService } from '@/services/logoService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FolderOpen,
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
  Plus,
  XCircle,
} from 'lucide-react';

export default function LogoLibrary() {
  const {
    logos,
    isLoading,
    error,
    selectedLogoId,
    fetchLogos,
    uploadLogo,
    selectLogo,
    clearLogoSelection,
    deleteLogo,
    clearError,
  } = useLogoLibraryStore();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logoName, setLogoName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // 컴포넌트 마운트 시 로고 목록 불러오기
  useEffect(() => {
    fetchLogos();
  }, [fetchLogos]);

  // 로고 목록 로드 후 활성 로고가 있으면 자동으로 로고 설정에 적용
  useEffect(() => {
    const activeLogo = logos.find(l => l.isActive);
    if (activeLogo && !selectedLogoId) {
      // 활성 로고를 로고 설정에 자동 적용
      selectLogo(activeLogo.id);
    }
  }, [logos, selectedLogoId, selectLogo]);

  // 에러 발생 시 3초 후 자동 제거
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 3000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
      setLogoName(file.name.replace(/\.[^/.]+$/, '')); // 확장자 제거
      setUploadDialogOpen(true);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    multiple: false,
    noClick: true,
    noKeyboard: true,
  });

  const handleUpload = async () => {
    if (!uploadFile) return;

    const success = await uploadLogo(uploadFile, logoName.trim() || uploadFile.name);
    if (success) {
      closeUploadDialog();
      // 업로드 후 목록 새로고침
      await fetchLogos();
    }
  };

  const closeUploadDialog = () => {
    setUploadDialogOpen(false);
    setUploadFile(null);
    if (uploadPreview) {
      URL.revokeObjectURL(uploadPreview);
      setUploadPreview(null);
    }
    setLogoName('');
  };

  const handleSelectLogo = async (logoId: string) => {
    console.log('handleSelectLogo called with:', logoId);
    if (logoId === 'none') {
      return;
    }
    if (logoId === 'clear') {
      clearLogoSelection();
      return;
    }
    try {
      const result = await selectLogo(logoId);
      console.log('selectLogo result:', result);
    } catch (err) {
      console.error('selectLogo error:', err);
    }
  };

  const handleDeleteLogo = async () => {
    const logoIdToDelete = selectedLogoId || logos.find(l => l.isActive)?.id;
    if (!logoIdToDelete) return;

    const success = await deleteLogo(logoIdToDelete);
    if (success) {
      setDeleteDialogOpen(false);
    }
  };

  const openUploadDialog = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/jpg';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setUploadFile(file);
        setUploadPreview(URL.createObjectURL(file));
        setLogoName(file.name.replace(/\.[^/.]+$/, ''));
        setUploadDialogOpen(true);
      }
    };
    input.click();
  };

  // 현재 선택된 로고 또는 활성화된 로고 찾기
  const currentLogoId = selectedLogoId || logos.find(l => l.isActive)?.id || '';
  const currentLogo = logos.find(l => l.id === currentLogoId);

  return (
    <Card {...getRootProps()}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          로고 라이브러리
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input {...getInputProps()} />

        {/* 에러 메시지 */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
            <AlertCircle className="h-3 w-3" />
            {error}
          </div>
        )}

        {/* 드롭다운 선택 */}
        <div className="space-y-2">
          <Label className="text-xs">저장된 로고 선택</Label>
          <div className="flex gap-2">
            <Select
              value={currentLogoId}
              onValueChange={handleSelectLogo}
              disabled={isLoading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="로고를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {logos.length === 0 ? (
                  <SelectItem value="none" disabled>
                    저장된 로고가 없습니다
                  </SelectItem>
                ) : (
                  <>
                    <SelectItem value="clear">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <XCircle className="w-4 h-4" />
                        <span>로고 선택 없음</span>
                      </div>
                    </SelectItem>
                    {logos.map((logo) => (
                      <SelectItem key={logo.id} value={logo.id}>
                        <div className="flex items-center gap-2">
                          <img
                            src={logoService.getLogoUrl(logo)}
                            alt={logo.name}
                            className="w-5 h-5 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <span>{logo.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>

            {/* 삭제 버튼 */}
            {currentLogoId && (
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isLoading}
                title="선택한 로고 삭제"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 선택된 로고 미리보기 */}
        {currentLogo && (
          <div className="flex justify-center p-3 bg-muted/30 rounded-lg border">
            <img
              src={logoService.getLogoUrl(currentLogo)}
              alt={currentLogo.name}
              className="max-h-16 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect fill="%23ddd" width="64" height="64"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="10">No Image</text></svg>';
              }}
            />
          </div>
        )}

        {/* 새 로고 업로드 버튼 */}
        <Button
          variant="outline"
          className="w-full"
          onClick={openUploadDialog}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          새 로고 추가
        </Button>

        {/* 드래그 안내 */}
        <p className={`text-[10px] text-center transition-colors ${isDragActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
          {isDragActive ? '여기에 로고를 드롭하세요!' : `${logos.length}개의 로고 저장됨 • 이미지를 드래그하여 추가`}
        </p>

        {/* 업로드 다이얼로그 */}
        <Dialog open={uploadDialogOpen} onOpenChange={(open) => !open && closeUploadDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                로고 업로드
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* 미리보기 */}
              {uploadPreview && (
                <div className="flex justify-center">
                  <img
                    src={uploadPreview}
                    alt="미리보기"
                    className="max-h-32 object-contain rounded border"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>로고 이름</Label>
                <Input
                  value={logoName}
                  onChange={(e) => setLogoName(e.target.value)}
                  placeholder="예: 병원 로고, 부서 로고"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                PNG 파일 권장 (투명 배경 지원)
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeUploadDialog}>
                취소
              </Button>
              <Button onClick={handleUpload} disabled={!uploadFile || isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                업로드
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
                로고 삭제
              </DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm">
                &apos;{currentLogo?.name}&apos; 로고를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteLogo}
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
