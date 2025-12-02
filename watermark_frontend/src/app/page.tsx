'use client';

import { useRef, useState } from 'react';
import Konva from 'konva';
import Header from '@/components/layout/Header';
import LeftPanel from '@/components/layout/LeftPanel';
import BottomBar from '@/components/layout/BottomBar';
import CanvasArea from '@/components/editor/CanvasArea';
import ExportModal from '@/components/export/ExportModal';

export default function Home() {
  const stageRef = useRef<Konva.Stage>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        <CanvasArea stageRef={stageRef} />
      </div>

      <BottomBar onExportClick={() => setExportModalOpen(true)} />

      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        stageRef={stageRef}
      />
    </div>
  );
}
