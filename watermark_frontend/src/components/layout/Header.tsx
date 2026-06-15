'use client';

import { Settings, ImagePlus, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 포털 런처 URL — client component라 NEXT_PUBLIC_ 접두사 env 사용 가능.
const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3300';

interface HeaderProps {
  onSettingsClick?: () => void;
}

export default function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {/* 포털 홈 네비게이션 — 어느 화면에서도 1클릭으로 포털 런처 복귀 */}
        <a
          href={`${PORTAL_URL}/launcher`}
          aria-label="포털 홈으로"
          title="포털 홈으로"
          className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          <Home className="h-5 w-5" />
        </a>
        <ImagePlus className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold">Clinical Watermark</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onSettingsClick}>
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
