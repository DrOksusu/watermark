'use client';

import { useImageStore } from '@/stores/useImageStore';
import { Button } from '@/components/ui/button';
import { X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ImageList() {
  const { images, selectedImageId, selectImage, removeImage, clearImages } =
    useImageStore();

  if (images.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        업로드된 이미지가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          이미지 목록 ({images.length}개)
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearImages}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          전체 삭제
        </Button>
      </div>

      <div className="space-y-1">
        {images.map((image) => (
          <div
            key={image.id}
            onClick={() => selectImage(image.id)}
            className={cn(
              'flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors',
              selectedImageId === image.id
                ? 'bg-primary/10 border border-primary/30'
                : 'hover:bg-muted'
            )}
          >
            <img
              src={image.url}
              alt={image.name}
              className="w-10 h-10 object-cover rounded"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{image.name}</p>
              <p className="text-xs text-muted-foreground">
                {image.width} x {image.height}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                removeImage(image.id);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
