'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import ImageUploader from '@/components/tools/ImageUploader';
import ImageList from '@/components/tools/ImageList';
import LogoSettings from '@/components/tools/LogoSettings';
import LogoLibrary from '@/components/tools/LogoLibrary';
import DateSettings from '@/components/tools/DateSettings';
import PresetSettings from '@/components/tools/PresetSettings';
import AnnotationTools from '@/components/tools/AnnotationTools';
import CropTool from '@/components/tools/CropTool';

export default function LeftPanel() {
  return (
    <div className="w-80 border-r bg-background flex flex-col h-full overflow-hidden">
      <Tabs defaultValue="images" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start rounded-none border-b px-2 shrink-0">
          <TabsTrigger value="images">이미지</TabsTrigger>
          <TabsTrigger value="watermark">워터마크</TabsTrigger>
          <TabsTrigger value="tools">도구</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 min-h-0">
          <TabsContent value="images" className="mt-0 p-4 space-y-4">
            <ImageUploader />
            <ImageList />
          </TabsContent>

          <TabsContent value="watermark" className="mt-0 p-4 space-y-4">
            <PresetSettings />
            <LogoLibrary />
            <LogoSettings />
            <DateSettings />
          </TabsContent>

          <TabsContent value="tools" className="mt-0 p-4 space-y-4">
            <CropTool />
            <AnnotationTools />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
