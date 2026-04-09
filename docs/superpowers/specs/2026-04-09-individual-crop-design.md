# 이미지별 개별 크롭 기능 설계

- **작성일**: 2026-04-09
- **대상 브랜치**: v2
- **범위**: `watermark_frontend` 단독 변경 (백엔드 무영향)

## 1. 배경 및 목표

### 현재 상태
- `useCropStore`에 단일 `cropArea`가 존재하고, 모든 업로드된 이미지에 공통으로 적용된다.
- 크롭은 "내보내기 시에만" 적용되며, 캔버스에는 점선 박스와 어두운 오버레이만 표시된다.
- 크롭 비율을 고정하는 UI가 없어 사용자는 자유 비율로만 박스를 조절할 수 있다.

### 목표
1. **이미지별 개별 크롭**: 여러 장 업로드 시 각 이미지에 독립된 크롭 영역 저장.
2. **크롭 비율 프리셋**: 자유, 1:1, 4:3, 3:4, 16:9 지원.
3. **적용 즉시 결과 반영**: 편집 모드 종료 시 점선 박스가 아닌, 실제 잘린 이미지 형태로 캔버스에 즉시 표시.

### 비목표 (YAGNI)
- 크롭 히스토리 / Undo / Redo
- 크롭 회전
- 크롭 영역 스냅 그리드
- "편집 중 이미지 전환 시 저장할까요?" 모달
- 드래그 중 실시간 비율 변경 애니메이션
- 크롭 프리뷰 썸네일 (이미지 리스트 내 크롭 상태 표시)
- 전역 크롭 모드(기존 동작) 잔존 옵션

## 2. 설계 원칙

### 비파괴 (Non-destructive)
원본 이미지 파일은 변경하지 않는다. 각 이미지에 `crop` 메타데이터만 저장하고, 렌더링과 내보내기 시점에만 적용한다. 언제든 크롭 해제 시 원본 전체로 복귀할 수 있어야 한다.

### 이미지별 자동 활성
크롭 모드의 전역 on/off 토글은 제거한다. 이미지에 `crop` 데이터가 존재하면 자동으로 "크롭 적용" 상태로 렌더링되고, 없으면 원본 그대로 렌더링된다.

### 편집 세션과 영구 상태 분리
- **영구 상태**: `useImageStore`의 각 `ImageFile.crop` 필드.
- **편집 세션**: `useCropStore`에 임시 보관(`isEditing`, `editingImageId`, `draft`). 사용자가 "적용"을 누르면 draft가 영구 상태로 커밋되고 편집 모드 종료.

### 로고/날짜/주석 좌표의 불변
기존 `useLogoStore`, `useDateStore`, `useAnnotationStore`의 저장 좌표계(원본 이미지 기준 0-1 비율 또는 픽셀)는 **변경하지 않는다**. 크롭이 있을 때만 렌더링/내보내기 단계에서 크롭 영역 기준으로 좌표를 변환한다. 이는 크롭을 해제했을 때 요소들이 원래 위치로 자연스럽게 복귀하게 한다.

## 3. 데이터 모델

### `src/types/index.ts` 변경

```ts
export type CropAspectRatio = 'free' | '1:1' | '4:3' | '3:4' | '16:9';

export interface CropData {
  x: number;          // 0-1 (이미지 너비 대비)
  y: number;          // 0-1 (이미지 높이 대비)
  width: number;      // 0-1
  height: number;     // 0-1
  aspectRatio: CropAspectRatio;
}

export interface ImageFile {
  id: string;
  file: File;
  name: string;
  url: string;
  width: number;
  height: number;
  crop?: CropData;    // 신규. undefined이면 크롭 없음.
}
```

### `useImageStore` 변경

```ts
interface ImageStore {
  images: ImageFile[];
  selectedImageId: string | null;
  addImages: (files: File[]) => Promise<void>;
  removeImage: (id: string) => void;
  selectImage: (id: string) => void;
  clearImages: () => void;
  // 신규
  setImageCrop: (id: string, crop: CropData | null) => void;
}
```

- `setImageCrop(id, crop)` — 특정 이미지의 `crop` 필드를 설정. `null`이면 필드 제거.
- 불변성 유지: spread 연산자로 새 객체/배열 생성.
- `addImages`는 새 이미지에 `crop: undefined`로 초기화(명시 불필요, 옵셔널 필드 생략).

### `useCropStore` 재정의 (전면 재작성)

기존 구조(`enabled`, `cropArea`)는 제거되고, 편집 세션 전용으로 축소된다.

```ts
interface CropStore {
  isEditing: boolean;
  editingImageId: string | null;
  draft: CropData | null;

  enterEdit: (imageId: string, initialCrop: CropData | null) => void;
  updateDraft: (patch: Partial<CropData>) => void;
  exitEdit: () => void;
}
```

- `enterEdit(id, initial)` — 편집 모드 진입. `initial`이 있으면 그 값을, 없으면 기본값 `{ x: 0.1, y: 0.1, width: 0.8, height: 0.8, aspectRatio: 'free' }`을 draft로 설정.
- `updateDraft(patch)` — 드래그/리사이즈/프리셋 변경에 따라 draft 갱신.
- `exitEdit()` — 편집 모드 종료. draft 폐기.
- **적용(커밋)**은 `setImageCrop(editingImageId, draft)` 호출 후 `exitEdit()` 순서로 호출하는 조합 액션이며, `CropTool` 컴포넌트 내부 핸들러에서 처리한다.

## 4. UI/UX 흐름

### `CropTool.tsx` — 3-뷰 상태 패널

**① 기본 상태** (이미지 선택됨, 편집 아님)
```
[ 크롭 편집 시작 ]

적용됨: 80% × 60% (4:3)       ← selectedImage.crop 있을 때만
[ 크롭 해제 ]
```

**② 편집 모드**
```
비율
[자유][1:1][4:3][3:4][16:9]

X: 10%   Y: 10%
W: 80%   H: 60%

[ ✓ 적용 ]  [ ✕ 취소 ]
[ ↺ 초기화 ]
```

**③ 이미지 미선택** — 기존 안내 문구 유지.

### 이미지 전환 시 동작

- 편집 모드 중 다른 이미지를 선택하면 **draft는 자동 폐기**되고 편집 모드 종료.
- 사용자 안내는 별도 토스트 없이 조용히 처리 (프로젝트에 토스트 라이브러리 미설치). 이미지 전환 자체가 명확한 컨텍스트 변경이므로 UX상 혼란 없음.
- 구현 위치: `CropTool.tsx`의 `useEffect`에서 `useCropStore.editingImageId`와 `useImageStore.selectedImageId`를 비교. 불일치 시 `exitEdit()` 호출.

### 캔버스 상태 분기

| 상태 | 캔버스 표시 |
|---|---|
| crop 없음 + 편집 아님 | 원본 전체 |
| crop 있음 + 편집 아님 | 크롭된 영역만 표시 (결과 이미지) |
| 편집 모드 진입 | 원본 전체 + 어두운 오버레이 + 점선 박스 + Transformer |
| 적용 | draft → `ImageFile.crop` 저장 → 편집 종료 → 크롭된 결과로 전환 |
| 취소 | draft 폐기 → 이전 상태 복귀 |

### 비율 프리셋 전환 수식

프리셋 변경 시 "중심 유지 + 최대 크기 재계산" 로직을 적용한다.

```ts
function applyAspectRatio(
  prev: CropData,
  ratio: CropAspectRatio,
  imgW: number,
  imgH: number,
): CropData {
  if (ratio === 'free') return { ...prev, aspectRatio: 'free' };

  const [rw, rh] = ratio.split(':').map(Number);
  const targetRatio = rw / rh;

  const centerX = prev.x + prev.width / 2;
  const centerY = prev.y + prev.height / 2;

  const maxWpx = Math.min(imgW, imgH * targetRatio);
  const maxHpx = maxWpx / targetRatio;

  const w = maxWpx / imgW;
  const h = maxHpx / imgH;

  let x = centerX - w / 2;
  let y = centerY - h / 2;

  x = Math.max(0, Math.min(1 - w, x));
  y = Math.max(0, Math.min(1 - h, y));

  return { x, y, width: w, height: h, aspectRatio: ratio };
}
```

편집 중 드래그/리사이즈에도 비율 잠금 적용: Konva `Transformer`의 `keepRatio={aspectRatio !== 'free'}`로 동적 설정.

## 5. 캔버스 렌더링 (`ImageCanvas.tsx`)

### 좌표 체계

- **원본 좌표**: 원본 이미지 픽셀 기준. 저장된 `logoPosition`, `datePosition`, `annotation.position`은 모두 이 기준(0-1 비율 또는 픽셀).
- **표시 좌표**: 현재 Stage에 렌더링되는 픽셀 기준.
- **크롭 좌표**: 크롭 영역 내부를 0-1로 본 기준.

### 렌더링 파이프라인

```ts
const activeCrop: CropData | null = cropStore.isEditing
  ? null                                  // 편집 중에는 원본 전체 표시
  : selectedImage.crop ?? null;

const effectiveW = activeCrop ? activeCrop.width * mainImage.width : mainImage.width;
const effectiveH = activeCrop ? activeCrop.height * mainImage.height : mainImage.height;

const scale = Math.min(
  containerWidth / effectiveW,
  containerHeight / effectiveH
);

const stageWidth = effectiveW * scale;
const stageHeight = effectiveH * scale;
```

### 이미지 렌더

```tsx
<KonvaImage
  image={mainImage}
  x={activeCrop ? -activeCrop.x * mainImage.width * scale : 0}
  y={activeCrop ? -activeCrop.y * mainImage.height * scale : 0}
  width={mainImage.width * scale}
  height={mainImage.height * scale}
/>
```

원본 이미지를 음수 오프셋으로 이동시켜 크롭 영역만 Stage 내부에 들어오도록 한다. Stage 경계 밖은 Konva가 자동 클리핑한다.

### 로고 표시 좌표 변환

```ts
const displayX = activeCrop
  ? (logoPosition.x - activeCrop.x) * mainImage.width * scale
  : logoPosition.x * mainImage.width * scale;
const displayY = activeCrop
  ? (logoPosition.y - activeCrop.y) * mainImage.height * scale
  : logoPosition.y * mainImage.height * scale;
```

날짜 텍스트도 동일하게 변환한다.

### 드래그 후 저장 좌표 역변환

```ts
const newOriginalX = activeCrop
  ? (e.target.x() / scale) / mainImage.width + activeCrop.x
  : (e.target.x() / scale) / mainImage.width;
const newOriginalY = activeCrop
  ? (e.target.y() / scale) / mainImage.height + activeCrop.y
  : (e.target.y() / scale) / mainImage.height;

setLogoPosition({ x: newOriginalX, y: newOriginalY });
```

**결과**: 저장 좌표계는 항상 원본 기준 유지. 크롭 해제 시 요소들이 원래 위치로 자연스럽게 복귀.

### 주석(annotation) 좌표 처리

현재 annotation의 `position.x/y`는 원본 이미지 픽셀 기준. 크롭이 있을 때 표시 좌표로 변환:

```ts
const annDisplayX = activeCrop
  ? (annotation.position.x - activeCrop.x * mainImage.width) * scale
  : annotation.position.x * scale;
const annDisplayY = activeCrop
  ? (annotation.position.y - activeCrop.y * mainImage.height) * scale
  : annotation.position.y * scale;
```

역변환도 동일 원리로 처리.

### 크롭 영역 밖 요소 처리

- 렌더링 시 Stage 경계 밖으로 나가 자동으로 보이지 않음 (Konva clipping).
- 드래그 시작도 불가.
- **사용자 안내**: `CropTool.tsx`의 편집 모드 뷰에 고정 안내 텍스트를 표시 — *"크롭 영역 밖의 로고/날짜/주석은 최종 이미지에서 숨겨집니다."* (토스트 대신 패널 내 텍스트).

### 편집 모드 캔버스

- `activeCrop = null`로 처리해 원본 전체 표시.
- 위에 `draft` 값으로 기존 점선 박스 + 어두운 오버레이 덧그림 (기존 코드 재활용).
- Transformer `keepRatio`는 draft의 `aspectRatio`에 따라 동적 설정.
- 편집 종료 시 `activeCrop`이 크롭된 뷰로 전환.

## 6. 내보내기 파이프라인 (`ExportModal.tsx`)

### 의존성 제거
- `useCropStore` 의존 완전 제거.
- 각 이미지의 `image.crop` 필드를 직접 읽어 개별 처리.

### `exportSingleImageWithLogo` 재작성

```ts
async function exportSingleImageWithLogo(imageFile, preloadedLogo) {
  const mainImg = await loadImage(imageFile.url);

  // 유효 소스 영역 (크롭 있으면 크롭 영역, 없으면 전체)
  const crop = imageFile.crop;
  const srcX = crop ? crop.x * mainImg.width : 0;
  const srcY = crop ? crop.y * mainImg.height : 0;
  const srcW = crop ? crop.width * mainImg.width : mainImg.width;
  const srcH = crop ? crop.height * mainImg.height : mainImg.height;

  // 내보내기 크기 (crop 후 크기 기준)
  const { width: exportW, height: exportH } = getExportDimensions(srcW, srcH);

  canvas.width = exportW;
  canvas.height = exportH;

  // letterbox 중앙 정렬
  const imgScale = Math.min(exportW / srcW, exportH / srcH);
  const drawW = srcW * imgScale;
  const drawH = srcH * imgScale;
  const offsetX = (exportW - drawW) / 2;
  const offsetY = (exportH - drawH) / 2;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, exportW, exportH);

  // 원본에서 소스 영역만 선택해 그리기
  ctx.drawImage(
    mainImg,
    srcX, srcY, srcW, srcH,
    offsetX, offsetY, drawW, drawH
  );

  // 로고
  if (preloadedLogo && logo) {
    const logoXInCrop = crop
      ? (logoPosition.x - crop.x) / crop.width
      : logoPosition.x;
    const logoYInCrop = crop
      ? (logoPosition.y - crop.y) / crop.height
      : logoPosition.y;

    if (logoXInCrop >= 0 && logoXInCrop <= 1 &&
        logoYInCrop >= 0 && logoYInCrop <= 1) {
      const logoW = drawW * logoScale;
      const logoH = logoW * (preloadedLogo.height / preloadedLogo.width);
      const logoPxX = offsetX + logoXInCrop * drawW;
      const logoPxY = offsetY + logoYInCrop * drawH;
      ctx.drawImage(preloadedLogo, logoPxX, logoPxY, logoW, logoH);
    }
  }

  // 날짜 텍스트
  if (dateText && font) {
    const dateXInCrop = crop
      ? (datePosition.x - crop.x) / crop.width
      : datePosition.x;
    const dateYInCrop = crop
      ? (datePosition.y - crop.y) / crop.height
      : datePosition.y;

    if (dateXInCrop >= 0 && dateXInCrop <= 1 &&
        dateYInCrop >= 0 && dateYInCrop <= 1) {
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

  // 주석 — 아래 "주석 내보내기 변환" 섹션의 공식 적용

  return canvas.toDataURL(mimeType, quality);
}
```

### 주석 내보내기 변환

```ts
const annXInCrop = crop
  ? (annotation.position.x - srcX) / srcW
  : annotation.position.x / mainImg.width;
const annYInCrop = crop
  ? (annotation.position.y - srcY) / srcH
  : annotation.position.y / mainImg.height;

const annPxX = offsetX + annXInCrop * drawW;
const annPxY = offsetY + annYInCrop * drawH;
```

주석 크기/두께는 `imgScale = drawW / srcW`로 재정의한 값 사용.

### 삭제되는 블록

`ExportModal.tsx` 말미의 사후 재크롭 블록은 완전 삭제:

```ts
if (cropEnabled) {
  const cropCanvas = document.createElement('canvas');
  // ... 이 블록 전체 삭제
}
```

크롭은 이미 `drawImage(9-인자)` 단계에서 반영되므로 사후 재크롭 불필요.

### 모달 요약 표시

```tsx
{images.some(img => img.crop) && (
  <p className="text-xs text-muted-foreground flex items-center gap-1">
    <Crop className="h-3 w-3" />
    크롭 적용된 이미지: {images.filter(img => img.crop).length} / {images.length}개
  </p>
)}
```

## 7. 변경 파일 목록

| 파일 | 변경 내용 | 난이도 |
|---|---|---|
| `src/types/index.ts` | `CropAspectRatio`, `CropData` 추가, `ImageFile.crop` | 쉬움 |
| `src/stores/useImageStore.ts` | `setImageCrop` 액션 추가 | 쉬움 |
| `src/stores/useCropStore.ts` | 전면 재작성 (편집 세션 전용) | 중간 |
| `src/components/tools/CropTool.tsx` | 3-뷰 상태 UI, 비율 토글, 적용/취소/초기화 | 중간 |
| `src/components/editor/ImageCanvas.tsx` | `activeCrop` 기반 좌표 변환, Stage 크기 재계산, 음수 오프셋 렌더, 편집 모드 분기, 비율 잠금 Transformer | 어려움 |
| `src/components/export/ExportModal.tsx` | `useCropStore` 의존 제거, `image.crop` 기반 `drawImage(9-인자)`, 좌표 변환, 사후 재크롭 삭제, 요약 수정 | 중간 |
| `src/lib/cropUtils.ts` *(신규)* | `applyAspectRatio`, 좌표 변환 순수 함수 | 쉬움 |

## 8. 엣지 케이스

| 시나리오 | 처리 |
|---|---|
| 이미지 삭제 | `removeImage`가 객체 통째로 제거하므로 `crop`도 자동 제거 |
| 편집 중 다른 이미지 선택 | `exitEdit()` 자동 호출, draft 폐기, 토스트 안내 |
| 편집 중 이미지 전부 제거 | `exitEdit()` 호출, 편집 모드 종료 |
| 프리셋 변경 후 경계 초과 | `applyAspectRatio`에서 x/y 클램프 |
| 크롭 영역이 이미지 전체인데 비율 다름 | 중심 유지 로직이 자동으로 최대 크기로 축소 |
| 로고가 크롭 밖 → 크롭 적용 | 캔버스 자동 숨김, 내보내기 스킵, 토스트 1회 |
| 최소 크기 제한 | Konva Transformer `boundBoxFunc`로 20px 하한 |
| `addImages`의 혼합 상태 | 기존 이미지의 `crop`은 유지, 새 이미지는 `undefined` |
| 이미지 1장만 있을 때 | 동일 동작 (특수 분기 없음) |
| 비율 잠금 드래그 | `keepRatio={aspectRatio !== 'free'}` 동적 설정 |

## 9. 하위 호환성

- `ImageFile.crop`은 옵셔널이라 기존 코드의 `undefined` 체크로 충분.
- `useCropStore` 재작성으로 기존 전역 `enabled`/`cropArea` 참조는 **컴파일 에러**로 전부 드러남 → 파일 목록의 모든 위치에서 교체.
- 백엔드 / DB / API 변경 없음.

## 10. 테스트 전략

프로젝트에 테스트 프레임워크가 설정되어 있지 않으므로, 수동 테스트 체크리스트로 검증한다.

### 수동 테스트 체크리스트

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
- [ ] 빌드 성공 (`npm run build`), Lint 통과 (`npm run lint`)

## 11. 구현 순서 제안

1. 타입/스토어 스켈레톤 (`types/index.ts`, `useImageStore.setImageCrop`, `useCropStore` 재작성, `lib/cropUtils.ts`)
2. `CropTool.tsx` UI 교체 (편집 모드 진입/종료/적용/취소)
3. `ImageCanvas.tsx` 편집 모드 처리 (기존 점선 박스 + draft 연동)
4. `ImageCanvas.tsx` 크롭 적용 상태 렌더링 (activeCrop 좌표 변환)
5. 로고/날짜/주석 좌표 변환 적용
6. 이미지 전환 시 자동 편집 종료 로직
7. `ExportModal.tsx` 내보내기 파이프라인 교체
8. 수동 테스트 체크리스트 실행
9. 빌드 및 Lint 확인
