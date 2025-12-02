'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, ImageIcon } from 'lucide-react';
import { useImageStore } from '@/stores/useImageStore';
import { cn } from '@/lib/utils';

export default function ImageUploader() {
  const addImages = useImageStore((state) => state.addImages);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const imageFiles = acceptedFiles.filter((file) =>
        file.type.startsWith('image/')
      );
      if (imageFiles.length > 0) {
        addImages(imageFiles);
      }
    },
    [addImages]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-primary/50'
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2">
        {isDragActive ? (
          <Upload className="h-8 w-8 text-primary" />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        )}
        <div className="text-sm">
          {isDragActive ? (
            <span className="text-primary font-medium">파일을 놓으세요</span>
          ) : (
            <>
              <span className="font-medium">클릭</span> 또는{' '}
              <span className="font-medium">드래그 앤 드롭</span>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG 지원</p>
      </div>
    </div>
  );
}
