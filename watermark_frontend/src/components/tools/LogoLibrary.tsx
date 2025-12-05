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
  FolderOpen,
  Upload,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LogoLibrary() {
  const {
    logos,
    isLoading,
    error,
    selectedLogoId,
    fetchLogos,
    uploadLogo,
    selectLogo,
    deleteLogo,
    clearError,
  } = useLogoLibraryStore();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logoToDelete, setLogoToDelete] = useState<string | null>(null);
  const [logoName, setLogoName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // 컴포넌트 마운트 시 로고 목록 불러오기
  useEffect(() => {
    fetchLogos();
  }, [fetchLogos]);

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
  });

  const handleUpload = async () => {
    if (!uploadFile) return;

    const success = await uploadLogo(uploadFile, logoName.trim() || uploadFile.name);
    if (success) {
      closeUploadDialog();
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
    await selectLogo(logoId);
  };

  const handleDeleteLogo = async () => {
    if (!logoToDelete) return;

    const success = await deleteLogo(logoToDelete);
    if (success) {
      setDeleteDialogOpen(false);
      setLogoToDelete(null);
    }
  };

  const openDeleteDialog = (e: React.MouseEvent, logoId: string) => {
    e.stopPropagation();
    setLogoToDelete(logoId);
    setDeleteDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          로고 라이브러리
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 에러 메시지 */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
            <AlertCircle className="h-3 w-3" />
            {error}
          </div>
        )}

        {/* 로고 그리드 */}
        <div className="grid grid-cols-4 gap-2">
          {logos.map((logo) => (
            <div
              key={logo.id}
              onClick={() => handleSelectLogo(logo.id)}
              className={cn(
                'relative aspect-square rounded-md border-2 cursor-pointer transition-all overflow-hidden group',
                selectedLogoId === logo.id || logo.isActive
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-muted hover:border-primary/50'
              )}
            >
              <img
                src={logoService.getLogoUrl(logo)}
                alt={logo.name}
                className="w-full h-full object-contain p-1"
              />

              {/* 선택됨 표시 */}
              {(selectedLogoId === logo.id || logo.isActive) && (
                <div className="absolute top-0.5 right-0.5 bg-primary rounded-full p-0.5">
                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              )}

              {/* 삭제 버튼 (호버 시 표시) */}
              <button
                onClick={(e) => openDeleteDialog(e, logo.id)}
                className="absolute bottom-0.5 right-0.5 bg-destructive/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-2.5 w-2.5 text-white" />
              </button>

              {/* 로고 이름 툴팁 */}
              <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity truncate px-1">
                {logo.name}
              </div>
            </div>
          ))}

          {/* 업로드 버튼 */}
          <div
            {...getRootProps()}
            className={cn(
              'aspect-square rounded-md border-2 border-dashed cursor-pointer transition-all flex items-center justify-center',
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            )}
          >
            <input {...getInputProps()} />
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {/* 로고 개수 표시 */}
        <p className="text-[10px] text-muted-foreground text-center">
          {logos.length}개의 로고 저장됨 • 클릭하여 선택
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
                정말로 이 로고를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
