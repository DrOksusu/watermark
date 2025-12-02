'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';
import Konva from 'konva';

const ImageCanvas = dynamic(() => import('./ImageCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/30">
      <p className="text-muted-foreground">캔버스 로딩 중...</p>
    </div>
  ),
});

interface CanvasAreaProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export default function CanvasArea({ stageRef }: CanvasAreaProps) {
  return (
    <div className="flex-1 bg-muted/10 p-4 overflow-hidden">
      <div className="w-full h-full rounded-lg border bg-background shadow-sm overflow-hidden">
        <ImageCanvas stageRef={stageRef} />
      </div>
    </div>
  );
}
