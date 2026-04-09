# 이미지별 개별 크롭 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 이미지에 공통 적용되던 전역 크롭을 이미지별 개별 크롭으로 전환하고, 비율 프리셋(자유/1:1/4:3/3:4/16:9)과 적용 즉시 결과 반영 기능을 추가한다.

**Architecture:** 비파괴 방식으로 `ImageFile.crop` 옵셔널 필드에 메타데이터만 저장한다. `useCropStore`는 편집 세션 전용 임시 상태(draft)만 담당하고, 영구 상태는 `useImageStore`가 보유한다. 좌표 변환 로직은 `lib/cropUtils.ts`의 순수 함수로 분리한다. 캔버스는 편집 모드에서는 원본 + 점선 박스, 편집 완료 후에는 음수 오프셋으로 이동한 원본 이미지를 Stage 경계로 자동 클리핑해 크롭된 결과를 표시한다.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, Zustand, Konva.js / react-konva, shadcn/ui

**Reference Spec:** `docs/superpowers/specs/2026-04-09-individual-crop-design.md`

**테스트 전략:** 프로젝트에 테스트 프레임워크가 없으므로 각 Task 끝에 **수동 검증**과 **타입 체크**(`npx tsc --noEmit`)를 수행한다. 최종 Task에서 전체 수동 테스트 체크리스트를 실행한다.

---

## 파일 구조

| 파일 | 액션 | 책임 |
|---|---|---|
| `watermark_frontend/src/types/index.ts` | 수정 | `CropAspectRatio`, `CropData` 타입 추가, `ImageFile.crop` 필드 |
| `watermark_frontend/src/lib/cropUtils.ts` | 신규 | `applyAspectRatio` 순수 함수 |
| `watermark_frontend/src/stores/useImageStore.ts` | 수정 | `setImageCrop` 액션 |
| `watermark_frontend/src/stores/useCropStore.ts` | 전면 재작성 | 편집 세션 전용 (`isEditing`, `editingImageId`, `draft`) |
| `watermark_frontend/src/components/tools/CropTool.tsx` | 전면 재작성 | 3-뷰 상태 패널, 비율 토글, 적용/취소/초기화, 자동 편집 종료 |
| `watermark_frontend/src/components/editor/ImageCanvas.tsx` | 수정 | `activeCrop` 기반 좌표 변환, Stage 크기 재계산, 편집 모드 분기 |
| `watermark_frontend/src/components/export/ExportModal.tsx` | 수정 | 이미지별 `drawImage(9-인자)` 방식, 사후 재크롭 삭제 |

---

## Task 1: 타입 추가

**목표:** `CropAspectRatio`, `CropData` 타입과 `ImageFile.crop` 옵셔널 필드를 추가한다.

**Files:**
- Modify: `watermark_frontend/src/types/index.ts`

- [ ] **Step 1.1: `types/index.ts` 파일 맨 아래에 새 타입 추가**

파일 마지막(`ExportSettings` interface 뒤)에 다음을 추가:

```ts
export type CropAspectRatio = 'free' | '1:1' | '4:3' | '3:4' | '16:9';

export interface CropData {
  x: number;          // 0-1 (이미지 너비 대비)
  y: number;          // 0-1 (이미지 높이 대비)
  width: number;      // 0-1
  height: number;     // 0-1
  aspectRatio: CropAspectRatio;
}
```

- [ ] **Step 1.2: `ImageFile` interface에 `crop?: CropData` 필드 추가**

기존:
```ts
export interface ImageFile {
  id: string;
  file: File;
  name: string;
  url: string;
  width: number;
  height: number;
}
```

변경:
```ts
export interface ImageFile {
  id: string;
  file: File;
  name: string;
  url: string;
  width: number;
  height: number;
  crop?: CropData;  // 이미지별 크롭 메타데이터 (없으면 크롭 없음)
}
```

- [ ] **Step 1.3: 타입 체크 실행**

```bash
cd watermark_frontend && npx tsc --noEmit
```

**Expected:** 에러 없이 종료. 기존 코드가 `crop` 필드를 참조하지 않으므로 통과해야 함.

- [ ] **Step 1.4: 커밋**

```bash
cd D:/ExpressProject/Watermark_project
git add watermark_frontend/src/types/index.ts
git commit -m "feat: CropAspectRatio, CropData 타입 및 ImageFile.crop 필드 추가"
```

---

## Task 2: `lib/cropUtils.ts` 순수 함수 작성

**목표:** 비율 프리셋 전환 시 "중심 유지 + 최대 크기 재계산" 로직을 순수 함수로 분리한다.

**Files:**
- Create: `watermark_frontend/src/lib/cropUtils.ts`

- [ ] **Step 2.1: 파일 생성 및 전체 내용 작성**

```ts
import { CropAspectRatio, CropData } from '@/types';

/**
 * 크롭 박스의 중심점을 유지하면서 새 비율에 맞는 최대 크기로 재계산한다.
 * 결과는 이미지 경계 내로 클램프된다.
 */
export function applyAspectRatio(
  prev: CropData,
  ratio: CropAspectRatio,
  imgW: number,
  imgH: number,
): CropData {
  if (ratio === 'free') {
    return { ...prev, aspectRatio: 'free' };
  }

  const [rw, rh] = ratio.split(':').map(Number);
  const targetRatio = rw / rh; // 폭 / 높이

  // 현재 박스 중심점
  const centerX = prev.x + prev.width / 2;
  const centerY = prev.y + prev.height / 2;

  // 이미지 전체에서 해당 비율로 가능한 최대 크기 (픽셀)
  const maxWpx = Math.min(imgW, imgH * targetRatio);
  const maxHpx = maxWpx / targetRatio;

  // 0-1 비율로 변환
  const w = maxWpx / imgW;
  const h = maxHpx / imgH;

  // 중심 유지 위치
  let x = centerX - w / 2;
  let y = centerY - h / 2;

  // 이미지 경계 클램프
  x = Math.max(0, Math.min(1 - w, x));
  y = Math.max(0, Math.min(1 - h, y));

  return { x, y, width: w, height: h, aspectRatio: ratio };
}

/**
 * 기본 크롭 영역 (이미지의 80% × 80%, 중앙 배치)
 */
export const DEFAULT_CROP_AREA: CropData = {
  x: 0.1,
  y: 0.1,
  width: 0.8,
  height: 0.8,
  aspectRatio: 'free',
};
```

- [ ] **Step 2.2: 타입 체크 실행**

```bash
cd watermark_frontend && npx tsc --noEmit
```

**Expected:** 에러 없이 종료.

- [ ] **Step 2.3: 커밋**

```bash
cd D:/ExpressProject/Watermark_project
git add watermark_frontend/src/lib/cropUtils.ts
git commit -m "feat: applyAspectRatio 순수 함수 및 DEFAULT_CROP_AREA 추가"
```

---

## Task 3: `useImageStore`에 `setImageCrop` 액션 추가

**목표:** 특정 이미지의 `crop` 필드를 설정/제거하는 액션을 추가한다.

**Files:**
- Modify: `watermark_frontend/src/stores/useImageStore.ts`

- [ ] **Step 3.1: import 추가**

파일 상단 import 블록에 `CropData` 추가. 기존:
```ts
import { ImageFile } from '@/types';
```
변경:
```ts
import { ImageFile, CropData } from '@/types';
```

- [ ] **Step 3.2: `ImageStore` interface에 `setImageCrop` 선언**

기존:
```ts
interface ImageStore {
  images: ImageFile[];
  selectedImageId: string | null;
  addImages: (files: File[]) => Promise<void>;
  removeImage: (id: string) => void;
  selectImage: (id: string) => void;
  clearImages: () => void;
}
```
변경 (맨 아래에 한 줄 추가):
```ts
interface ImageStore {
  images: ImageFile[];
  selectedImageId: string | null;
  addImages: (files: File[]) => Promise<void>;
  removeImage: (id: string) => void;
  selectImage: (id: string) => void;
  clearImages: () => void;
  setImageCrop: (id: string, crop: CropData | null) => void;
}
```

- [ ] **Step 3.3: `setImageCrop` 구현 추가**

`clearImages` 구현 바로 아래에 다음을 추가 (store 객체의 마지막 속성):

```ts
  setImageCrop: (id: string, crop: CropData | null) => {
    set((state) => ({
      images: state.images.map((img) => {
        if (img.id !== id) return img;
        if (crop === null) {
          // crop 필드 제거
          const { crop: _removed, ...rest } = img;
          return rest;
        }
        return { ...img, crop };
      }),
    }));
  },
```

- [ ] **Step 3.4: 타입 체크 실행**

```bash
cd watermark_frontend && npx tsc --noEmit
```

**Expected:** 에러 없이 종료.

- [ ] **Step 3.5: 커밋**

```bash
cd D:/ExpressProject/Watermark_project
git add watermark_frontend/src/stores/useImageStore.ts
git commit -m "feat: useImageStore에 setImageCrop 액션 추가"
```

---

## Task 4: `useCropStore` 전면 재작성

**목표:** 기존 전역 상태(`enabled`, `cropArea`)를 제거하고 편집 세션 전용 상태(`isEditing`, `editingImageId`, `draft`)로 재작성한다. 이 Task 이후에는 `ImageCanvas`, `CropTool`, `ExportModal`에서 **컴파일 에러가 발생**하며, 이후 Task에서 순차적으로 해결한다.

**Files:**
- Modify: `watermark_frontend/src/stores/useCropStore.ts` (전면 재작성)

- [ ] **Step 4.1: 파일 전체 교체**

기존 내용을 전부 삭제하고 다음으로 교체:

```ts
import { create } from 'zustand';
import { CropData } from '@/types';
import { DEFAULT_CROP_AREA } from '@/lib/cropUtils';

interface CropStore {
  isEditing: boolean;
  editingImageId: string | null;
  draft: CropData | null;

  /**
   * 편집 모드 진입. initialCrop이 있으면 그 값을, 없으면 DEFAULT_CROP_AREA를 draft로 설정.
   */
  enterEdit: (imageId: string, initialCrop: CropData | null) => void;

  /**
   * draft의 일부 필드만 갱신.
   */
  updateDraft: (patch: Partial<CropData>) => void;

  /**
   * draft 전체 교체 (비율 프리셋 전환 등에 사용).
   */
  replaceDraft: (draft: CropData) => void;

  /**
   * 편집 모드 종료. draft 폐기.
   */
  exitEdit: () => void;
}

export const useCropStore = create<CropStore>((set) => ({
  isEditing: false,
  editingImageId: null,
  draft: null,

  enterEdit: (imageId, initialCrop) => {
    set({
      isEditing: true,
      editingImageId: imageId,
      draft: initialCrop ? { ...initialCrop } : { ...DEFAULT_CROP_AREA },
    });
  },

  updateDraft: (patch) => {
    set((state) => ({
      draft: state.draft ? { ...state.draft, ...patch } : state.draft,
    }));
  },

  replaceDraft: (draft) => {
    set({ draft: { ...draft } });
  },

  exitEdit: () => {
    set({
      isEditing: false,
      editingImageId: null,
      draft: null,
    });
  },
}));
```

- [ ] **Step 4.2: 타입 체크 실행하여 영향받는 파일 목록 확보**

```bash
cd watermark_frontend && npx tsc --noEmit
```

**Expected:** 여러 에러가 발생해야 함. 최소한 다음 파일에서:
- `src/components/tools/CropTool.tsx` — `enabled`, `cropArea`, `setEnabled`, `setCropArea` 참조
- `src/components/editor/ImageCanvas.tsx` — `enabled: cropEnabled`, `cropArea`, `setCropArea`, `isAdjusting`, `setIsAdjusting` 참조
- `src/components/export/ExportModal.tsx` — `enabled: cropEnabled`, `cropArea` 참조

이 에러 목록을 메모해두고 다음 Task에서 해결한다.

- [ ] **Step 4.3: 커밋 (이 시점 빌드 깨짐 상태 — Task 5-9에서 해결 예정)**

```bash
cd D:/ExpressProject/Watermark_project
git add watermark_frontend/src/stores/useCropStore.ts
git commit -m "refactor: useCropStore를 편집 세션 전용으로 재작성"
```

> **주의:** 이 커밋 시점에는 전체 프로젝트 타입 체크가 실패한다. Task 5-9를 순차 진행해야 전체가 복구된다.

---

## Task 5: `CropTool.tsx` 전면 재작성

**목표:** 3-뷰 상태 패널, 비율 토글 버튼, 적용/취소/초기화 버튼, 이미지 전환 자동 편집 종료를 구현한다.

**Files:**
- Modify: `watermark_frontend/src/components/tools/CropTool.tsx` (전면 재작성)

- [ ] **Step 5.1: 파일 전체 교체**

기존 내용을 전부 삭제하고 다음으로 교체:

```tsx
'use client';

import { useEffect } from 'react';
import { useCropStore } from '@/stores/useCropStore';
import { useImageStore } from '@/stores/useImageStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crop, RotateCcw, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { applyAspectRatio, DEFAULT_CROP_AREA } from '@/lib/cropUtils';
import { CropAspectRatio } from '@/types';

const ASPECT_RATIOS: { value: CropAspectRatio; label: string }[] = [
  { value: 'free', label: '자유' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '16:9', label: '16:9' },
];

export default function CropTool() {
  const {
    isEditing,
    editingImageId,
    draft,
    enterEdit,
    replaceDraft,
    exitEdit,
  } = useCropStore();
  const { selectedImageId, images, setImageCrop } = useImageStore();

  const selectedImage = images.find((img) => img.id === selectedImageId);

  // 이미지 전환 시 편집 모드 자동 종료 (draft 폐기)
  useEffect(() => {
    if (isEditing && editingImageId !== selectedImageId) {
      exitEdit();
    }
  }, [selectedImageId, isEditing, editingImageId, exitEdit]);

  const handleStartEdit = () => {
    if (!selectedImageId || !selectedImage) return;
    enterEdit(selectedImageId, selectedImage.crop ?? null);
  };

  const handleApply = () => {
    if (!editingImageId || !draft) return;
    setImageCrop(editingImageId, draft);
    exitEdit();
  };

  const handleCancel = () => {
    exitEdit();
  };

  const handleReset = () => {
    if (!selectedImage) return;
    replaceDraft({ ...DEFAULT_CROP_AREA });
  };

  const handleRatioChange = (ratio: CropAspectRatio) => {
    if (!draft || !selectedImage) return;
    const next = applyAspectRatio(
      draft,
      ratio,
      selectedImage.width,
      selectedImage.height,
    );
    replaceDraft(next);
  };

  const handleRemoveCrop = () => {
    if (!selectedImageId) return;
    setImageCrop(selectedImageId, null);
  };

  // 이미지 미선택 상태
  if (!selectedImageId || !selectedImage) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Crop className="h-4 w-4" />
            이미지 크롭
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            이미지를 선택하면 크롭 기능을 사용할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  // 편집 모드
  if (isEditing && editingImageId === selectedImageId && draft) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Crop className="h-4 w-4" />
            크롭 편집 중
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">비율</p>
            <div className="grid grid-cols-5 gap-1">
              {ASPECT_RATIOS.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={draft.aspectRatio === value ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => handleRatioChange(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted rounded p-2">
              <span className="text-muted-foreground">X:</span>{' '}
              <span className="font-medium">{Math.round(draft.x * 100)}%</span>
            </div>
            <div className="bg-muted rounded p-2">
              <span className="text-muted-foreground">Y:</span>{' '}
              <span className="font-medium">{Math.round(draft.y * 100)}%</span>
            </div>
            <div className="bg-muted rounded p-2">
              <span className="text-muted-foreground">너비:</span>{' '}
              <span className="font-medium">{Math.round(draft.width * 100)}%</span>
            </div>
            <div className="bg-muted rounded p-2">
              <span className="text-muted-foreground">높이:</span>{' '}
              <span className="font-medium">{Math.round(draft.height * 100)}%</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            크롭 영역 밖의 로고/날짜/주석은 최종 이미지에서 숨겨집니다.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={handleApply}>
              <Check className="h-4 w-4 mr-1" />
              적용
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              취소
            </Button>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            크롭 영역 초기화
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 기본 상태 (이미지 선택됨, 편집 아님)
  const currentCrop = selectedImage.crop;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Crop className="h-4 w-4" />
          이미지 크롭
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          size="sm"
          className={cn('w-full', currentCrop && 'ring-2 ring-primary/20')}
          onClick={handleStartEdit}
        >
          <Crop className="h-4 w-4 mr-2" />
          {currentCrop ? '크롭 범위 편집' : '크롭 편집 시작'}
        </Button>

        {currentCrop && (
          <>
            <div className="text-xs text-muted-foreground">
              적용됨: {Math.round(currentCrop.width * 100)}% × {Math.round(currentCrop.height * 100)}%
              {currentCrop.aspectRatio !== 'free' && (
                <span className="ml-1">({currentCrop.aspectRatio})</span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleRemoveCrop}
            >
              <X className="h-4 w-4 mr-2" />
              크롭 해제
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5.2: 타입 체크 실행**

```bash
cd watermark_frontend && npx tsc --noEmit
```

**Expected:** `CropTool.tsx` 에러는 사라지고, `ImageCanvas.tsx`와 `ExportModal.tsx` 에러만 남아야 함. 남은 에러는 다음 Task에서 해결.

- [ ] **Step 5.3: 커밋**

```bash
cd D:/ExpressProject/Watermark_project
git add watermark_frontend/src/components/tools/CropTool.tsx
git commit -m "feat: CropTool에 3-뷰 상태 패널과 비율 프리셋 UI 구현"
```

---

## Task 6: `ImageCanvas` — 편집 모드 렌더링 교체

**목표:** `ImageCanvas`가 새 `useCropStore` 인터페이스(`isEditing`, `draft`)를 읽도록 변경하고, 편집 모드에서 `draft` 기반 점선 박스 + 어두운 오버레이를 표시한다. 이 Task에서는 **크롭 적용 상태 렌더링은 아직 구현하지 않는다** (Task 7에서). 편집 모드가 해제된 상태에서는 임시로 크롭이 없는 것처럼 동작한다.

**Files:**
- Modify: `watermark_frontend/src/components/editor/ImageCanvas.tsx`

- [ ] **Step 6.1: `useCropStore` 구독부 교체**

파일 상단 `const { enabled: cropEnabled, cropArea, setCropArea, isAdjusting: isCropAdjusting, setIsAdjusting: setIsCropAdjusting } = useCropStore();` 라인을 찾아 다음으로 교체:

```ts
  const {
    isEditing: cropIsEditing,
    editingImageId: cropEditingImageId,
    draft: cropDraft,
    updateDraft: updateCropDraft,
    replaceDraft: replaceCropDraft,
  } = useCropStore();
```

- [ ] **Step 6.2: `useEffect`의 크롭 transformer 처리 변경**

기존:
```ts
  // Update crop transformer
  useEffect(() => {
    if (!cropTransformerRef.current || !cropRectRef.current) return;

    if (cropEnabled) {
      cropTransformerRef.current.nodes([cropRectRef.current]);
    } else {
      cropTransformerRef.current.nodes([]);
    }
    cropTransformerRef.current.getLayer()?.batchDraw();
  }, [cropEnabled]);
```

변경:
```ts
  // Update crop transformer — 현재 선택된 이미지가 편집 대상일 때만 활성
  const cropEditingActive =
    cropIsEditing && cropEditingImageId === selectedImageId && cropDraft !== null;

  useEffect(() => {
    if (!cropTransformerRef.current || !cropRectRef.current) return;

    if (cropEditingActive) {
      cropTransformerRef.current.nodes([cropRectRef.current]);
    } else {
      cropTransformerRef.current.nodes([]);
    }
    cropTransformerRef.current.getLayer()?.batchDraw();
  }, [cropEditingActive]);
```

- [ ] **Step 6.3: 크롭 오버레이 렌더 블록 교체**

기존 `{cropEnabled && mainImage && (` 로 시작하는 `<Group>` 블록 전체를 찾아 다음으로 교체:

```tsx
          {/* Crop Overlay (편집 모드에서만 표시) */}
          {cropEditingActive && cropDraft && mainImage && (
            <Group>
              {/* 어두운 영역 (크롭 영역 바깥) */}
              <Rect
                x={0}
                y={0}
                width={mainImage.width * scale}
                height={cropDraft.y * mainImage.height * scale}
                fill="rgba(0, 0, 0, 0.5)"
                listening={false}
              />
              <Rect
                x={0}
                y={(cropDraft.y + cropDraft.height) * mainImage.height * scale}
                width={mainImage.width * scale}
                height={(1 - cropDraft.y - cropDraft.height) * mainImage.height * scale}
                fill="rgba(0, 0, 0, 0.5)"
                listening={false}
              />
              <Rect
                x={0}
                y={cropDraft.y * mainImage.height * scale}
                width={cropDraft.x * mainImage.width * scale}
                height={cropDraft.height * mainImage.height * scale}
                fill="rgba(0, 0, 0, 0.5)"
                listening={false}
              />
              <Rect
                x={(cropDraft.x + cropDraft.width) * mainImage.width * scale}
                y={cropDraft.y * mainImage.height * scale}
                width={(1 - cropDraft.x - cropDraft.width) * mainImage.width * scale}
                height={cropDraft.height * mainImage.height * scale}
                fill="rgba(0, 0, 0, 0.5)"
                listening={false}
              />
              {/* 크롭 영역 테두리 */}
              <Rect
                ref={cropRectRef}
                id="crop-rect"
                x={cropDraft.x * mainImage.width * scale}
                y={cropDraft.y * mainImage.height * scale}
                width={cropDraft.width * mainImage.width * scale}
                height={cropDraft.height * mainImage.height * scale}
                stroke="#ffffff"
                strokeWidth={2}
                dash={[5, 5]}
                draggable
                onDragEnd={(e) => {
                  if (!cropDraft) return;
                  const newX = Math.max(
                    0,
                    Math.min(1 - cropDraft.width, e.target.x() / scale / mainImage.width),
                  );
                  const newY = Math.max(
                    0,
                    Math.min(1 - cropDraft.height, e.target.y() / scale / mainImage.height),
                  );
                  updateCropDraft({ x: newX, y: newY });
                }}
                onTransformEnd={(e) => {
                  if (!cropDraft) return;
                  const node = e.target;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();

                  node.scaleX(1);
                  node.scaleY(1);

                  const newX = Math.max(0, node.x() / scale / mainImage.width);
                  const newY = Math.max(0, node.y() / scale / mainImage.height);
                  const newWidth = Math.min(
                    1 - newX,
                    (node.width() * scaleX) / scale / mainImage.width,
                  );
                  const newHeight = Math.min(
                    1 - newY,
                    (node.height() * scaleY) / scale / mainImage.height,
                  );

                  replaceCropDraft({
                    ...cropDraft,
                    x: newX,
                    y: newY,
                    width: newWidth,
                    height: newHeight,
                  });
                }}
              />
              {/* Crop Transformer — 비율 잠금 동적 */}
              <Transformer
                ref={cropTransformerRef}
                rotateEnabled={false}
                keepRatio={cropDraft.aspectRatio !== 'free'}
                enabledAnchors={
                  cropDraft.aspectRatio === 'free'
                    ? ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']
                    : ['top-left', 'top-right', 'bottom-left', 'bottom-right']
                }
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 20 || newBox.height < 20) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            </Group>
          )}
```

- [ ] **Step 6.4: 타입 체크 실행**

```bash
cd watermark_frontend && npx tsc --noEmit
```

**Expected:** `ImageCanvas.tsx`의 `useCropStore` 관련 에러는 사라지고, `ExportModal.tsx` 에러만 남아야 함.

- [ ] **Step 6.5: 수동 검증 — 편집 모드 동작**

```bash
cd watermark_frontend && npm run dev
```

브라우저에서:
1. 이미지 1장 업로드
2. 좌측 "도구" 탭 → "크롭 편집 시작" 클릭
3. 캔버스에 점선 박스와 어두운 오버레이가 표시되는지 확인
4. 박스를 드래그/리사이즈해 X/Y/W/H 수치가 갱신되는지 확인
5. 비율 버튼 1:1 클릭 → 박스가 정사각형으로 재설정되는지 확인
6. 비율 버튼 4:3, 3:4, 16:9 각각 테스트 — 중심 유지 확인
7. "적용" 클릭 → 편집 모드 종료. **이 Task에서는 아직 캔버스에 크롭된 결과가 반영되지 않음 (다음 Task에서)**. 다만 좌측 패널에 "적용됨: ..." 표시와 "크롭 해제" 버튼이 나타나야 함.
8. 다시 "크롭 범위 편집" → 이전 draft가 그대로 복원되는지
9. 다른 이미지로 전환 → 편집 모드 자동 종료되는지

- [ ] **Step 6.6: 커밋**

```bash
cd D:/ExpressProject/Watermark_project
git add watermark_frontend/src/components/editor/ImageCanvas.tsx
git commit -m "feat: ImageCanvas 편집 모드에서 draft 기반 크롭 박스 렌더"
```

---

## Task 7: `ImageCanvas` — 크롭 적용 상태 렌더링 (이미지 + 로고 + 날짜)

**목표:** 편집 모드가 아닐 때 `selectedImage.crop`이 있으면 Stage 크기와 이미지/로고/날짜의 좌표를 변환해 크롭된 결과로 표시한다.

**Files:**
- Modify: `watermark_frontend/src/components/editor/ImageCanvas.tsx`

- [ ] **Step 7.1: `activeCrop` 및 effective 크기 계산**

`const selectedImage = images.find((img) => img.id === selectedImageId);` 라인 아래에 다음을 추가:

```ts
  // 크롭 적용 상태 판단: 편집 중이면 원본 전체 표시, 아니면 selectedImage.crop 사용
  const activeCrop = cropIsEditing ? null : selectedImage?.crop ?? null;
```

- [ ] **Step 7.2: `updateSize` useEffect에서 effective 크기 기반 스케일 계산**

기존:
```ts
  // Calculate scale and container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && mainImage) {
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const scaleX = containerWidth / mainImage.width;
        const scaleY = containerHeight / mainImage.height;
        // 작은 이미지도 확대하여 캔버스 영역에 맞춤 (모든 이미지가 비슷한 크기로 표시)
        const newScale = Math.min(scaleX, scaleY);

        setScale(newScale);
        setContainerSize({
          width: mainImage.width * newScale,
          height: mainImage.height * newScale,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [mainImage]);
```

변경:
```ts
  // Calculate scale and container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && mainImage) {
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // 크롭이 적용된 상태면 크롭 영역 크기로 스케일 계산
        const effectiveW = activeCrop
          ? activeCrop.width * mainImage.width
          : mainImage.width;
        const effectiveH = activeCrop
          ? activeCrop.height * mainImage.height
          : mainImage.height;

        const scaleX = containerWidth / effectiveW;
        const scaleY = containerHeight / effectiveH;
        const newScale = Math.min(scaleX, scaleY);

        setScale(newScale);
        setContainerSize({
          width: effectiveW * newScale,
          height: effectiveH * newScale,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [mainImage, activeCrop]);
```

- [ ] **Step 7.3: `KonvaImage` 메인 이미지 렌더에 오프셋 적용**

기존 메인 이미지 렌더:
```tsx
          {/* Main Image */}
          <KonvaImage
            image={mainImage}
            width={mainImage.width * scale}
            height={mainImage.height * scale}
          />
```

변경:
```tsx
          {/* Main Image — activeCrop 있으면 음수 오프셋으로 이동해 Stage에서 자동 클리핑 */}
          <KonvaImage
            image={mainImage}
            x={activeCrop ? -activeCrop.x * mainImage.width * scale : 0}
            y={activeCrop ? -activeCrop.y * mainImage.height * scale : 0}
            width={mainImage.width * scale}
            height={mainImage.height * scale}
          />
```

- [ ] **Step 7.4: 로고 렌더 좌표 변환**

기존 로고 렌더 블록에서:
```tsx
            const logoX = logoPosition.x * mainImage.width * scale;
            const logoY = logoPosition.y * mainImage.height * scale;
```

변경:
```tsx
            const logoX = activeCrop
              ? (logoPosition.x - activeCrop.x) * mainImage.width * scale
              : logoPosition.x * mainImage.width * scale;
            const logoY = activeCrop
              ? (logoPosition.y - activeCrop.y) * mainImage.height * scale
              : logoPosition.y * mainImage.height * scale;
```

- [ ] **Step 7.5: 로고 드래그 핸들러 역변환**

`handleLogoDragEnd` 함수에서 기존:
```ts
      // 비율(0~1)로 변환하여 저장
      const newX = e.target.x() / scale / mainImage.width;
      const newY = e.target.y() / scale / mainImage.height;
```

변경:
```ts
      // 비율(0~1)로 변환하여 저장 (크롭이 적용된 상태면 오프셋 역변환)
      const rawX = e.target.x() / scale / mainImage.width;
      const rawY = e.target.y() / scale / mainImage.height;
      const newX = activeCrop ? rawX + activeCrop.x : rawX;
      const newY = activeCrop ? rawY + activeCrop.y : rawY;
```

그리고 `handleLogoDragEnd`의 `useCallback` deps 끝에 `activeCrop`을 추가:
```ts
    [scale, mainImage, setLogoPosition, activeCrop]
```

- [ ] **Step 7.6: 로고 transform 핸들러 역변환**

`handleLogoTransformEnd` 함수에서 기존:
```ts
      // 위치도 업데이트
      const newX = node.x() / scale / mainImage.width;
      const newY = node.y() / scale / mainImage.height;
```

변경:
```ts
      // 위치도 업데이트 (크롭이 적용된 상태면 오프셋 역변환)
      const rawX = node.x() / scale / mainImage.width;
      const rawY = node.y() / scale / mainImage.height;
      const newX = activeCrop ? rawX + activeCrop.x : rawX;
      const newY = activeCrop ? rawY + activeCrop.y : rawY;
```

그리고 `handleLogoTransformEnd`의 `useCallback` deps 끝에 `activeCrop`을 추가:
```ts
    [mainImage, scale, logoScale, setLogoScale, setLogoPosition, activeCrop]
```

- [ ] **Step 7.7: 날짜 텍스트 렌더 좌표 변환**

기존 `<Text ref={dateTextRef} ... />` 렌더에서:
```tsx
              x={datePosition.x * mainImage.width * scale}
              y={datePosition.y * mainImage.height * scale}
```

변경:
```tsx
              x={(activeCrop ? datePosition.x - activeCrop.x : datePosition.x) * mainImage.width * scale}
              y={(activeCrop ? datePosition.y - activeCrop.y : datePosition.y) * mainImage.height * scale}
```

- [ ] **Step 7.8: 날짜 드래그 핸들러 역변환**

`handleDateDragEnd` 함수에서 기존:
```ts
      const newX = e.target.x() / scale / mainImage.width;
      const newY = e.target.y() / scale / mainImage.height;
```

변경:
```ts
      const rawX = e.target.x() / scale / mainImage.width;
      const rawY = e.target.y() / scale / mainImage.height;
      const newX = activeCrop ? rawX + activeCrop.x : rawX;
      const newY = activeCrop ? rawY + activeCrop.y : rawY;
```

그리고 `handleDateDragEnd`의 `useCallback` deps 끝에 `activeCrop`을 추가:
```ts
    [scale, mainImage, setDatePosition, activeCrop]
```

- [ ] **Step 7.9: 날짜 transform 핸들러 역변환**

`handleDateTransformEnd` 함수에서 기존:
```ts
      // 위치도 업데이트
      const newX = node.x() / scale / mainImage.width;
      const newY = node.y() / scale / mainImage.height;
```

변경:
```ts
      // 위치도 업데이트 (크롭이 적용된 상태면 오프셋 역변환)
      const rawX = node.x() / scale / mainImage.width;
      const rawY = node.y() / scale / mainImage.height;
      const newX = activeCrop ? rawX + activeCrop.x : rawX;
      const newY = activeCrop ? rawY + activeCrop.y : rawY;
```

그리고 `handleDateTransformEnd`의 `useCallback` deps 끝에 `activeCrop`을 추가:
```ts
    [mainImage, scale, dateScale, setDateScale, setDateWidth, setDatePosition, activeCrop]
```

- [ ] **Step 7.10: 크롭 오버레이 블록의 조건 확인**

Task 6에서 추가한 크롭 오버레이 `<Group>` 블록의 조건이 `cropEditingActive`인지 다시 확인. (편집 모드에서만 표시되어야 함 — 이미 맞음.)

- [ ] **Step 7.11: 타입 체크**

```bash
cd watermark_frontend && npx tsc --noEmit
```

**Expected:** `ImageCanvas.tsx` 에러 없음. `ExportModal.tsx` 에러만 남아야 함.

- [ ] **Step 7.12: 수동 검증 — 크롭 적용 렌더링**

```bash
cd watermark_frontend && npm run dev
```

브라우저에서:
1. 이미지 업로드 → 로고 추가 → 로고를 중앙에 배치
2. 크롭 편집 시작 → 좌상단 40% 영역을 크롭 박스로 설정 → 적용
3. **캔버스가 크롭된 크기로 줄어들고, 로고가 크롭 영역 내에서 올바른 상대 위치에 표시되는지 확인**
4. 크롭 해제 → 원본 전체와 로고가 원래 위치로 복귀
5. 크롭 적용 후 로고를 드래그 → 새 위치로 저장되는지 (크롭 해제 후 원본 기준 좌표가 올바른지)
6. 날짜 텍스트 설정 → 크롭 적용 → 날짜가 크롭 영역 내 올바른 위치에 표시되는지
7. 크롭 편집 중에는 원본 전체가 표시되는지 (편집 모드가 뭘 하고 있는지 명확히 보이는지)

- [ ] **Step 7.13: 커밋**

```bash
cd D:/ExpressProject/Watermark_project
git add watermark_frontend/src/components/editor/ImageCanvas.tsx
git commit -m "feat: ImageCanvas에 크롭 적용 상태의 이미지/로고/날짜 렌더 구현"
```

---

## Task 8: `ImageCanvas` — 주석 좌표 변환

**목표:** 주석(annotation)도 크롭 적용 상태에서 올바르게 표시되도록 `renderAnnotation`에 좌표 변환을 적용한다. 주석 좌표는 **원본 이미지 픽셀 기준**임에 주의 (로고/날짜의 0-1 비율과 다름).

**Files:**
- Modify: `watermark_frontend/src/components/editor/ImageCanvas.tsx`

- [ ] **Step 8.1: `renderAnnotation` 내 공통 좌표 변환 헬퍼 추가**

`renderAnnotation` 함수 본문 시작 부분 (`const { id, type, position, size, style, text, points } = annotation;` 바로 아래)에 다음을 추가:

```ts
    // 주석 좌표를 표시 좌표로 변환 (크롭 적용 고려)
    // annotation.position은 원본 이미지 픽셀 기준
    const cropOffsetX = activeCrop ? activeCrop.x * mainImage.width : 0;
    const cropOffsetY = activeCrop ? activeCrop.y * mainImage.height : 0;
    const displayPosX = (position.x - cropOffsetX) * scale;
    const displayPosY = (position.y - cropOffsetY) * scale;
```

(`mainImage`는 이 시점에 null이 아님이 보장됨 — 이 컴포넌트는 `mainImage`가 null이면 초기 반환함.)

- [ ] **Step 8.2: `commonProps`의 `x`, `y` 교체**

기존:
```ts
    const commonProps = {
      id,
      x: position.x * scale,
      y: position.y * scale,
      draggable: !selectedTool,
      onClick: () => setSelectedAnnotation(id),
      onDragEnd: (e: KonvaEventObject<DragEvent>) => handleAnnotationDragEnd(id, e),
    };
```

변경:
```ts
    const commonProps = {
      id,
      x: displayPosX,
      y: displayPosY,
      draggable: !selectedTool,
      onClick: () => setSelectedAnnotation(id),
      onDragEnd: (e: KonvaEventObject<DragEvent>) => handleAnnotationDragEnd(id, e),
    };
```

- [ ] **Step 8.3: `dashed-circle` 분기의 좌표 계산 교체**

기존:
```tsx
    if (type === 'dashed-circle') {
      return (
        <Ellipse
          key={id}
          {...commonProps}
          x={(position.x + size.width / 2) * scale}
          y={(position.y + size.height / 2) * scale}
          radiusX={(size.width / 2) * scale}
          radiusY={(size.height / 2) * scale}
          stroke={style.color}
          strokeWidth={style.thickness}
          dash={[10, 5]}
        />
      );
    }
```

변경 (displayPosX/Y를 기준으로 재계산):
```tsx
    if (type === 'dashed-circle') {
      return (
        <Ellipse
          key={id}
          {...commonProps}
          x={displayPosX + (size.width / 2) * scale}
          y={displayPosY + (size.height / 2) * scale}
          radiusX={(size.width / 2) * scale}
          radiusY={(size.height / 2) * scale}
          stroke={style.color}
          strokeWidth={style.thickness}
          dash={[10, 5]}
        />
      );
    }
```

- [ ] **Step 8.4: `handleAnnotationDragEnd` 역변환**

기존:
```ts
  const handleAnnotationDragEnd = useCallback(
    (annotationId: string, e: KonvaEventObject<DragEvent>) => {
      if (!selectedImageId) return;
      updateAnnotation(selectedImageId, annotationId, {
        position: {
          x: e.target.x() / scale,
          y: e.target.y() / scale,
        },
      });
    },
    [selectedImageId, scale, updateAnnotation]
  );
```

변경:
```ts
  const handleAnnotationDragEnd = useCallback(
    (annotationId: string, e: KonvaEventObject<DragEvent>) => {
      if (!selectedImageId || !mainImage) return;
      const cropOffsetX = activeCrop ? activeCrop.x * mainImage.width : 0;
      const cropOffsetY = activeCrop ? activeCrop.y * mainImage.height : 0;
      updateAnnotation(selectedImageId, annotationId, {
        position: {
          x: e.target.x() / scale + cropOffsetX,
          y: e.target.y() / scale + cropOffsetY,
        },
      });
    },
    [selectedImageId, scale, updateAnnotation, mainImage, activeCrop]
  );
```

- [ ] **Step 8.5: `handleStageMouseDown` / `MouseMove`의 `adjustedPos`도 크롭 오프셋 반영**

현재 `adjustedPos`는 새 주석을 그릴 때 사용됨. 크롭이 적용된 상태에서 원본 기준 좌표로 저장해야 한다.

기존 `handleStageMouseDown` 내:
```ts
        const adjustedPos = { x: pos.x / scale, y: pos.y / scale };
```

변경 (함수 맨 위에서 `mainImage` 가드 추가 후):
```ts
        if (!mainImage) return;
        const cropOffsetX = activeCrop ? activeCrop.x * mainImage.width : 0;
        const cropOffsetY = activeCrop ? activeCrop.y * mainImage.height : 0;
        const adjustedPos = {
          x: pos.x / scale + cropOffsetX,
          y: pos.y / scale + cropOffsetY,
        };
```

그리고 `handleStageMouseDown`의 `useCallback` deps에 `mainImage`, `activeCrop` 추가:
```ts
    [selectedTool, selectedImageId, scale, toolSettings, addAnnotation, setSelectedAnnotation, setTool, mainImage, activeCrop]
```

동일하게 `handleStageMouseMove` 내 `adjustedPos` 계산도 변경:

기존:
```ts
      const adjustedPos = { x: pos.x / scale, y: pos.y / scale };
```

변경:
```ts
      if (!mainImage) return;
      const cropOffsetX = activeCrop ? activeCrop.x * mainImage.width : 0;
      const cropOffsetY = activeCrop ? activeCrop.y * mainImage.height : 0;
      const adjustedPos = {
        x: pos.x / scale + cropOffsetX,
        y: pos.y / scale + cropOffsetY,
      };
```

그리고 `handleStageMouseMove`의 `useCallback` deps에 `mainImage`, `activeCrop` 추가:
```ts
    [isDrawing, drawStart, selectedTool, scale, toolSettings, mainImage, activeCrop]
```

- [ ] **Step 8.6: `renderTempAnnotation`도 표시 좌표 변환**

`renderTempAnnotation` 함수 안의 각 `position.x * scale` / `position.y * scale` 등을 찾아 `displayPosX`/`displayPosY` 기반으로 교체.

함수 본문 시작부에 변환 헬퍼 추가:
```ts
  const renderTempAnnotation = () => {
    if (!tempAnnotation || !mainImage) return null;

    const { type, position, size, style, points } = tempAnnotation;
    if (!position) return null;

    const cropOffsetX = activeCrop ? activeCrop.x * mainImage.width : 0;
    const cropOffsetY = activeCrop ? activeCrop.y * mainImage.height : 0;
    const tempDisplayX = (position.x - cropOffsetX) * scale;
    const tempDisplayY = (position.y - cropOffsetY) * scale;
```

그 아래 각 분기에서 `position.x * scale` → `tempDisplayX`, `position.y * scale` → `tempDisplayY`로 교체.

`arrow` 분기:
```tsx
    if (type === 'arrow' && points && position) {
      return (
        <Arrow
          x={tempDisplayX}
          y={tempDisplayY}
          points={points.map((p) => p * scale)}
          stroke={style?.color || '#FF0000'}
          strokeWidth={style?.thickness || 2}
          fill={style?.color || '#FF0000'}
          pointerLength={10}
          pointerWidth={10}
        />
      );
    }
```

`box`/`dashed-box` 분기:
```tsx
    if ((type === 'box' || type === 'dashed-box') && position && size) {
      return (
        <Rect
          x={tempDisplayX}
          y={tempDisplayY}
          width={size.width * scale}
          height={size.height * scale}
          stroke={style?.color || '#FF0000'}
          strokeWidth={style?.thickness || 2}
          cornerRadius={style?.borderRadius || 0}
          dash={type === 'dashed-box' ? [10, 5] : undefined}
        />
      );
    }
```

`dashed-circle` 분기:
```tsx
    if (type === 'dashed-circle' && position && size) {
      return (
        <Ellipse
          x={tempDisplayX + (size.width / 2) * scale}
          y={tempDisplayY + (size.height / 2) * scale}
          radiusX={(size.width / 2) * scale}
          radiusY={(size.height / 2) * scale}
          stroke={style?.color || '#FF0000'}
          strokeWidth={style?.thickness || 2}
          dash={[10, 5]}
        />
      );
    }
```

- [ ] **Step 8.7: 타입 체크**

```bash
cd watermark_frontend && npx tsc --noEmit
```

**Expected:** `ImageCanvas.tsx` 에러 없음. `ExportModal.tsx`만 남음.

- [ ] **Step 8.8: 수동 검증 — 주석 좌표**

```bash
cd watermark_frontend && npm run dev
```

1. 이미지 업로드 → 주석 도구(박스)로 이미지 중앙에 사각형 주석 그림
2. 크롭 편집 시작 → 좌상단 50% 영역 크롭 → 적용
3. **주석이 크롭된 영역 내에서 올바른 상대 위치에 표시되는지 확인**
4. 주석 드래그 → 새 위치로 저장되고, 크롭 해제 후에도 원본 기준 좌표가 유지되는지
5. 크롭 적용 상태에서 새 화살표 주석 그리기 → 올바른 위치에 생성되고, 크롭 해제 후에도 유지되는지
6. 크롭 밖에 주석이 있는 상태에서 크롭 적용 → 주석이 화면에서 자동 숨김되는지

- [ ] **Step 8.9: 커밋**

```bash
cd D:/ExpressProject/Watermark_project
git add watermark_frontend/src/components/editor/ImageCanvas.tsx
git commit -m "feat: ImageCanvas 주석 렌더/드래그에 크롭 좌표 변환 적용"
```

---

## Task 9: `ExportModal` — 내보내기 파이프라인 재작성

**목표:** 이미지별 `crop` 필드를 기반으로 `drawImage(9-인자)` 방식으로 내보낸다. 기존 전역 `useCropStore` 의존과 사후 재크롭 블록을 완전히 제거한다.

**Files:**
- Modify: `watermark_frontend/src/components/export/ExportModal.tsx`

- [ ] **Step 9.1: `useCropStore` 관련 import와 구독 제거**

기존 import:
```ts
import { useCropStore } from '@/stores/useCropStore';
```
→ 완전히 삭제.

기존 구독부:
```ts
  const { enabled: cropEnabled, cropArea } = useCropStore();
```
→ 완전히 삭제.

- [ ] **Step 9.2: `exportSingleImageWithLogo`의 `getExportDimensions` 호출 기준 변경**

기존 함수 서명:
```ts
  const exportSingleImageWithLogo = async (
    imageFile: { id: string; url: string; name: string; width: number; height: number },
    preloadedLogo: HTMLImageElement | null
  ): Promise<string> => {
```

변경 (crop 필드 포함하도록 타입 갱신):
```ts
  const exportSingleImageWithLogo = async (
    imageFile: { id: string; url: string; name: string; width: number; height: number; crop?: import('@/types').CropData },
    preloadedLogo: HTMLImageElement | null
  ): Promise<string> => {
```

> 또는 파일 상단 import에 `import { CropData } from '@/types'`를 추가하고 타입을 `crop?: CropData`로 사용해도 됨.

- [ ] **Step 9.3: `exportSingleImageWithLogo` 내부 로직 전체 교체**

기존 함수 본문 (`return new Promise((resolve) => {` 부터 함수 끝까지)을 찾아 다음으로 교체:

```ts
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      const mainImg = new Image();

      mainImg.onerror = () => {
        console.error('Failed to load image:', imageFile.name);
        resolve('');
      };

      mainImg.onload = () => {
        // 유효 소스 영역 (크롭 있으면 크롭 영역, 없으면 전체)
        const crop = imageFile.crop;
        const srcX = crop ? crop.x * mainImg.width : 0;
        const srcY = crop ? crop.y * mainImg.height : 0;
        const srcW = crop ? crop.width * mainImg.width : mainImg.width;
        const srcH = crop ? crop.height * mainImg.height : mainImg.height;

        // 내보내기 크기 (잘린 후 크기 기준)
        const { width: exportWidth, height: exportHeight } = getExportDimensions(srcW, srcH);
        canvas.width = exportWidth;
        canvas.height = exportHeight;

        // letterbox 중앙 정렬
        const imgScale = Math.min(exportWidth / srcW, exportHeight / srcH);
        const drawW = srcW * imgScale;
        const drawH = srcH * imgScale;
        const offsetX = (exportWidth - drawW) / 2;
        const offsetY = (exportHeight - drawH) / 2;

        // 배경 흰색
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, exportWidth, exportHeight);

        // 원본에서 소스 영역만 선택해 그리기 (crop 있으면 크롭 부분만)
        ctx.drawImage(
          mainImg,
          srcX, srcY, srcW, srcH,
          offsetX, offsetY, drawW, drawH,
        );

        // 로고 그리기 — 크롭 기준 좌표 변환
        if (preloadedLogo && logo) {
          const logoXInCrop = crop
            ? (logoPosition.x - crop.x) / crop.width
            : logoPosition.x;
          const logoYInCrop = crop
            ? (logoPosition.y - crop.y) / crop.height
            : logoPosition.y;

          // 크롭 영역 내에 있을 때만 그림
          if (
            logoXInCrop >= 0 && logoXInCrop <= 1 &&
            logoYInCrop >= 0 && logoYInCrop <= 1
          ) {
            ctx.globalAlpha = logoOpacity;
            const logoAspectRatio = preloadedLogo.height / preloadedLogo.width;
            const logoW = drawW * logoScale;
            const logoH = logoW * logoAspectRatio;
            const logoPxX = offsetX + logoXInCrop * drawW;
            const logoPxY = offsetY + logoYInCrop * drawH;
            ctx.drawImage(preloadedLogo, logoPxX, logoPxY, logoW, logoH);
            ctx.globalAlpha = 1;
          }
        }

        // 날짜 텍스트 — 크롭 기준 좌표 변환
        if (dateText && font) {
          const dateXInCrop = crop
            ? (datePosition.x - crop.x) / crop.width
            : datePosition.x;
          const dateYInCrop = crop
            ? (datePosition.y - crop.y) / crop.height
            : datePosition.y;

          if (
            dateXInCrop >= 0 && dateXInCrop <= 1 &&
            dateYInCrop >= 0 && dateYInCrop <= 1
          ) {
            ctx.globalAlpha = dateOpacity;
            const scaledFontSize = drawW * dateScale / 3;
            ctx.font = buildFontString(scaledFontSize, font.family);
            ctx.fillStyle = font.color;
            const dateX = offsetX + dateXInCrop * drawW;
            const dateY = offsetY + dateYInCrop * drawH;
            ctx.fillText(dateText, dateX, dateY + scaledFontSize);
            ctx.globalAlpha = 1;
          }
        }

        // 주석 그리기 — annotation.position은 원본 이미지 픽셀 기준
        const imageAnnotations = getAnnotations(imageFile.id);
        imageAnnotations.forEach((annotation) => {
          // 크롭 기준으로 좌표 변환 (0-1)
          const annXInCrop = crop
            ? (annotation.position.x - srcX) / srcW
            : annotation.position.x / mainImg.width;
          const annYInCrop = crop
            ? (annotation.position.y - srcY) / srcH
            : annotation.position.y / mainImg.height;

          // 크롭 영역 밖이면 스킵
          if (annXInCrop < 0 || annXInCrop > 1 || annYInCrop < 0 || annYInCrop > 1) {
            return;
          }

          ctx.strokeStyle = annotation.style.color;
          ctx.lineWidth = annotation.style.thickness * imgScale;
          ctx.fillStyle = annotation.style.color;

          if (annotation.style.lineStyle === 'dashed') {
            ctx.setLineDash([10 * imgScale, 5 * imgScale]);
          } else {
            ctx.setLineDash([]);
          }

          const annPxX = offsetX + annXInCrop * drawW;
          const annPxY = offsetY + annYInCrop * drawH;

          if (annotation.type === 'box' || annotation.type === 'dashed-box') {
            const radius = annotation.style.borderRadius * imgScale;
            const aw = annotation.size.width * imgScale;
            const ah = annotation.size.height * imgScale;

            if (radius > 0) {
              ctx.beginPath();
              ctx.moveTo(annPxX + radius, annPxY);
              ctx.lineTo(annPxX + aw - radius, annPxY);
              ctx.quadraticCurveTo(annPxX + aw, annPxY, annPxX + aw, annPxY + radius);
              ctx.lineTo(annPxX + aw, annPxY + ah - radius);
              ctx.quadraticCurveTo(annPxX + aw, annPxY + ah, annPxX + aw - radius, annPxY + ah);
              ctx.lineTo(annPxX + radius, annPxY + ah);
              ctx.quadraticCurveTo(annPxX, annPxY + ah, annPxX, annPxY + ah - radius);
              ctx.lineTo(annPxX, annPxY + radius);
              ctx.quadraticCurveTo(annPxX, annPxY, annPxX + radius, annPxY);
              ctx.closePath();
              ctx.stroke();
            } else {
              ctx.strokeRect(annPxX, annPxY, aw, ah);
            }
          } else if (annotation.type === 'dashed-circle') {
            ctx.setLineDash([10 * imgScale, 5 * imgScale]);
            const cx = annPxX + (annotation.size.width / 2) * imgScale;
            const cy = annPxY + (annotation.size.height / 2) * imgScale;
            const rx = (annotation.size.width / 2) * imgScale;
            const ry = (annotation.size.height / 2) * imgScale;

            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
          } else if (annotation.type === 'arrow' && annotation.points) {
            const pts = annotation.points;
            const dx = pts[2] * imgScale;
            const dy = pts[3] * imgScale;
            const startX = annPxX;
            const startY = annPxY;
            const endX = startX + dx;
            const endY = startY + dy;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            const angle = Math.atan2(dy, dx);
            const headLength = 15 * imgScale;
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(
              endX - headLength * Math.cos(angle - Math.PI / 6),
              endY - headLength * Math.sin(angle - Math.PI / 6),
            );
            ctx.moveTo(endX, endY);
            ctx.lineTo(
              endX - headLength * Math.cos(angle + Math.PI / 6),
              endY - headLength * Math.sin(angle + Math.PI / 6),
            );
            ctx.stroke();
          } else if (annotation.type === 'text' && annotation.text) {
            ctx.setLineDash([]);
            const fontSize = 16 * imgScale;
            ctx.font = fontSize + 'px sans-serif';
            ctx.fillText(annotation.text, annPxX, annPxY + fontSize);
          }
        });

        const mimeType = settings.format === 'png' ? 'image/png' : 'image/jpeg';
        const quality = settings.quality / 100;
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };

      mainImg.src = imageFile.url;
    });
  };
```

이 교체로 **사후 재크롭 블록(`if (cropEnabled) { ... }`)이 함수에서 완전히 제거**된다.

- [ ] **Step 9.4: 모달 하단 요약 표시 수정**

기존:
```tsx
            {cropEnabled && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Crop className="h-3 w-3" />
                크롭 적용됨 ({Math.round(cropArea.width * 100)}% x {Math.round(cropArea.height * 100)}%)
              </p>
            )}
```

변경:
```tsx
            {images.some((img) => img.crop) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Crop className="h-3 w-3" />
                크롭 적용된 이미지: {images.filter((img) => img.crop).length} / {images.length}개
              </p>
            )}
```

- [ ] **Step 9.5: 타입 체크**

```bash
cd watermark_frontend && npx tsc --noEmit
```

**Expected:** 에러 없음. 전체 프로젝트 타입 체크 통과.

- [ ] **Step 9.6: 수동 검증 — 내보내기**

```bash
cd watermark_frontend && npm run dev
```

1. 이미지 2장 업로드 (A, B)
2. 이미지 A에만 크롭 적용 (4:3, 좌상단 영역)
3. 로고와 날짜를 이미지 중앙쯤에 배치
4. 이미지 B는 크롭 없이 유지
5. 우측 상단 "내보내기" → ZIP 다운로드
6. ZIP 내용 확인:
   - A: 잘린 4:3 이미지 + 크롭 기준 로고/날짜 위치
   - B: 원본 전체 이미지 + 원본 기준 로고/날짜 위치
7. 모달 하단에 "크롭 적용된 이미지: 1 / 2개" 표시 확인
8. 이미지 1장만 남기고 단일 크롭 적용 → 단일 파일(jpg/png) 다운로드 정상 동작 확인
9. 내보내기 사이즈 `640x400` 선택 + 크롭 조합 → letterbox 중앙 정렬 확인
10. 주석이 있는 이미지에 크롭 적용 → 내보내기에서 크롭 영역 내 주석만 표시되는지

- [ ] **Step 9.7: 커밋**

```bash
cd D:/ExpressProject/Watermark_project
git add watermark_frontend/src/components/export/ExportModal.tsx
git commit -m "feat: ExportModal에 이미지별 크롭 기반 내보내기 파이프라인 구현"
```

---

## Task 10: 전체 빌드, Lint, 수동 테스트 체크리스트

**목표:** 전체 프로젝트 빌드와 Lint가 통과하고, 스펙의 모든 수동 테스트 항목이 정상 동작하는지 확인한다.

- [ ] **Step 10.1: 빌드 검증**

```bash
cd watermark_frontend && npm run build
```

**Expected:** 빌드 성공. 경고는 허용, 에러 0.

- [ ] **Step 10.2: Lint 검증**

```bash
cd watermark_frontend && npm run lint
```

**Expected:** Lint 통과. 신규 에러 0.

- [ ] **Step 10.3: 수동 테스트 체크리스트 전체 실행**

```bash
cd watermark_frontend && npm run dev
```

다음 항목을 모두 확인 (스펙 섹션 10의 체크리스트 전체):

- [ ] 이미지 1장 업로드 → 편집 시작 → 자유 비율 드래그 → 적용 → 캔버스가 잘린 이미지로 표시
- [ ] 비율 1:1 선택 → 박스가 정사각형, 중심 유지
- [ ] 4:3, 3:4, 16:9 각각 선택 후 모서리 드래그 시 비율 유지
- [ ] 여러 이미지 업로드 → A에만 크롭, B에는 없음 → 전환 시 각자 상태 유지
- [ ] B 편집 중 → A로 전환 → B의 draft가 조용히 취소되고 A의 기본 상태 표시
- [ ] 크롭 적용 후 로고 추가 → 로고가 크롭 기준 영역에 배치
- [ ] 기존 로고가 크롭 밖 → 크롭 적용 → 로고 화면 숨김
- [ ] 크롭 해제 버튼 → 원본 전체 복귀, 로고 복원
- [ ] 내보내기: 크롭 있는 A + 없는 B 혼합 → ZIP에서 A는 잘린 이미지, B는 원본
- [ ] 이미지 삭제 시 다른 이미지 크롭 유지
- [ ] 편집 중 이미지 삭제 → 편집 모드 자동 종료
- [ ] ExportModal 요약: "크롭 적용된 이미지: N / M개" 표시
- [ ] 내보내기 사이즈 옵션(`640x400` 등)과 크롭 조합 정상 동작 (letterbox 중앙 정렬)
- [ ] 주석 있는 이미지에 크롭 적용 시 크롭 내부 주석만 표시/내보내기

- [ ] **Step 10.4: 실패 항목 처리**

위 체크리스트에서 실패한 항목이 있으면:
1. 실패 원인을 재현 가능한 최소 단계로 기록
2. 해당 Task로 돌아가 코드 수정
3. 수정 후 타입 체크 → 수동 검증 → 커밋(`fix: ...`) 순으로 재진행
4. 체크리스트 전체 재실행

- [ ] **Step 10.5: 최종 확인 커밋 (있을 경우)**

수동 테스트에서 문제가 없었다면 이 Task에서는 커밋이 없을 수 있음. 빌드 산출물 제외하고 작업 트리가 깨끗한지 확인:

```bash
cd D:/ExpressProject/Watermark_project && git status
```

**Expected:** `nothing to commit, working tree clean` (또는 빌드 아티팩트만).

---

## 완료 기준

- [ ] Task 1-9 모든 커밋 완료
- [ ] `npm run build` 성공
- [ ] `npm run lint` 통과
- [ ] Task 10 수동 테스트 체크리스트 전체 통과
- [ ] 스펙 문서의 모든 목표 (이미지별 크롭, 비율 프리셋, 즉시 결과 반영) 충족

## 주의사항

- **Task 4 커밋 시점에 프로젝트가 일시적으로 깨진다.** Task 5-9까지 순차 진행해야 복구된다. 중간에 중단하려면 Task 4 전에 멈추는 것이 안전하다.
- **이미지 1장 업로드 후 `useCanvasSize`가 호출되지 않는 경우**(기존 `updateSize` useEffect가 window resize에만 반응): `activeCrop` 변경 시에도 `updateSize`가 호출되도록 Task 7.2에서 deps에 `activeCrop`을 추가했다. 이를 빠뜨리면 크롭 적용 시 스케일 재계산이 되지 않는다.
- **주석 좌표 체계는 원본 이미지 픽셀 기준**이다. 로고/날짜의 0-1 비율과 다르므로 Task 8에서 변환 수식이 다르다. 혼동하지 않도록 주의.
- **모든 commit은 한국어 메시지**, 50자 이내, `feat:` / `refactor:` / `fix:` 중 적절한 prefix 사용.
- **푸시는 사용자 승인 후에만** 수행한다. 각 Task는 로컬 커밋으로만 종료.
