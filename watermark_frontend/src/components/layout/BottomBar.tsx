'use client';

import { useImageStore } from '@/stores/useImageStore';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface BottomBarProps {
  onExportClick: () => void;
}

export default function BottomBar({ onExportClick }: BottomBarProps) {
  const { images, selectedImageId, selectImage } = useImageStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="h-24 border-t bg-background flex items-center gap-2 px-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => scroll('left')}
        disabled={images.length === 0}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="flex gap-2 p-2">
          {images.length === 0 ? (
            <div className="text-sm text-muted-foreground flex items-center justify-center w-full">
              이미지를 업로드하세요
            </div>
          ) : (
            images.map((image) => (
              <button
                key={image.id}
                onClick={() => selectImage(image.id)}
                className={cn(
                  'flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all',
                  selectedImageId === image.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-transparent hover:border-muted-foreground/30'
                )}
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
              </button>
            ))
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => scroll('right')}
        disabled={images.length === 0}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button onClick={onExportClick} disabled={images.length === 0} className="ml-2">
        <Download className="h-4 w-4 mr-2" />
        일괄 저장
      </Button>
    </div>
  );
}
