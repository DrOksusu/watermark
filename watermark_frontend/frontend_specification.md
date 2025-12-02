# Frontend Specification

## 기술 스택

| 구분 | 기술 |
|------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| State Management | Zustand |
| Canvas/이미지 편집 | Konva.js (react-konva) |
| 아이콘 | Lucide React |
| HTTP Client | Axios |
| 폼 관리 | React Hook Form + Zod |

**Port**: 3000

---

## 페이지 구조

```
/                     → 메인 에디터 페이지 (단일 페이지 앱)
/settings             → 기본 설정 페이지 (로고, 폰트, 위치 기본값)
```

---

## 화면 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│  Header (로고, 설정 버튼)                                         │
├────────────────┬────────────────────────────────────────────────┤
│                │                                                │
│   Left Panel   │              Canvas Area                       │
│   (도구 패널)   │         (이미지 편집 영역)                       │
│                │                                                │
│  - 이미지 목록  │    ┌────────────────────────────┐              │
│  - 로고 설정    │    │                            │              │
│  - 날짜 설정    │    │      선택된 이미지          │              │
│  - 강조 도구    │    │      + 워터마크 미리보기     │              │
│                │    │                            │              │
│                │    └────────────────────────────┘              │
│                │                                                │
├────────────────┴────────────────────────────────────────────────┤
│  Bottom Bar (이미지 썸네일 슬라이더 / 일괄 저장 버튼)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 컴포넌트 구조

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # 메인 에디터
│   └── settings/
│       └── page.tsx                # 설정 페이지
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx              # 상단 헤더
│   │   ├── LeftPanel.tsx           # 좌측 도구 패널
│   │   └── BottomBar.tsx           # 하단 썸네일 바
│   │
│   ├── editor/
│   │   ├── CanvasArea.tsx          # 메인 캔버스 영역
│   │   ├── ImageCanvas.tsx         # Konva 캔버스 (드래그/편집)
│   │   ├── LogoLayer.tsx           # 로고 레이어 (드래그 가능)
│   │   ├── DateLayer.tsx           # 날짜 텍스트 레이어
│   │   └── AnnotationLayer.tsx     # 강조 요소 레이어
│   │
│   ├── tools/
│   │   ├── ImageUploader.tsx       # 이미지 업로드 영역
│   │   ├── ImageList.tsx           # 업로드된 이미지 목록
│   │   ├── LogoUploader.tsx        # 로고 업로드
│   │   ├── LogoSettings.tsx        # 로고 위치/크기 설정
│   │   ├── DateSettings.tsx        # 촬영일자 입력 및 스타일
│   │   ├── FontSettings.tsx        # 글꼴, 크기, 색상 설정
│   │   └── AnnotationTools.tsx     # 강조 도구 (박스/화살표/텍스트)
│   │
│   ├── annotations/
│   │   ├── BoxAnnotation.tsx       # 박스 (실선/점선)
│   │   ├── ArrowAnnotation.tsx     # 화살표
│   │   └── TextAnnotation.tsx      # 텍스트 주석
│   │
│   ├── export/
│   │   ├── ExportModal.tsx         # 저장 모달
│   │   ├── ExportSettings.tsx      # 폴더/파일명 설정
│   │   └── BatchExport.tsx         # 일괄 저장 진행 상태
│   │
│   └── ui/                         # shadcn/ui 컴포넌트
│       ├── button.tsx
│       ├── input.tsx
│       ├── slider.tsx
│       ├── select.tsx
│       ├── dialog.tsx
│       ├── tabs.tsx
│       └── ...
│
├── stores/
│   ├── useImageStore.ts            # 이미지 상태 관리
│   ├── useLogoStore.ts             # 로고 상태 관리
│   ├── useDateStore.ts             # 날짜 설정 상태
│   ├── useAnnotationStore.ts       # 강조 요소 상태
│   └── useSettingsStore.ts         # 전역 설정 상태
│
├── hooks/
│   ├── useCanvasSize.ts            # 캔버스 크기 계산
│   ├── useDragPosition.ts          # 드래그 위치 관리
│   └── useExport.ts                # 이미지 내보내기 로직
│
├── lib/
│   ├── api.ts                      # API 클라이언트
│   ├── utils.ts                    # 유틸리티 함수
│   └── constants.ts                # 상수 정의
│
└── types/
    ├── image.ts                    # 이미지 타입
    ├── annotation.ts               # 강조 요소 타입
    └── settings.ts                 # 설정 타입
```

---

## 주요 기능별 UI 상세

### 1. 이미지 업로드 영역
```
┌─────────────────────────────┐
│  📁 이미지 불러오기          │
│  ─────────────────────────  │
│  [파일 선택] 또는 드래그 앤 드롭 │
│                             │
│  지원 형식: JPG, PNG         │
│  여러 파일 선택 가능          │
└─────────────────────────────┘
```

### 2. 로고 & 날짜 설정 패널
```
┌─────────────────────────────┐
│  🏥 로고 설정                │
│  ─────────────────────────  │
│  [로고 업로드]               │
│  미리보기: [로고 이미지]      │
│  크기: [────●────] 100%     │
│  투명도: [────●────] 100%   │
│                             │
│  📅 촬영일자                 │
│  ─────────────────────────  │
│  날짜: [22.03        ]      │
│  글꼴: [Pretendard    ▼]    │
│  크기: [24px          ▼]    │
│  색상: [■ #FFFFFF     ]     │
└─────────────────────────────┘
```

### 3. 강조 도구 패널
```
┌─────────────────────────────┐
│  ✏️ 강조 도구                │
│  ─────────────────────────  │
│  [□ 실선 박스] [┄ 점선 박스]  │
│  [→ 화살표]   [T 텍스트]     │
│                             │
│  스타일 설정                 │
│  색상: [■ #FF0000     ]     │
│  두께: [1px ▼]              │
│  모서리: [────●────] 0px    │
└─────────────────────────────┘
```

### 4. 하단 썸네일 바
```
┌─────────────────────────────────────────────────────────────┐
│ ◀ │ [img1] [img2] [img3] [img4] [img5] [img6] ... │ ▶ │ [일괄 저장] │
└─────────────────────────────────────────────────────────────┘
```

### 5. 저장 모달
```
┌─────────────────────────────────────┐
│  💾 일괄 저장                        │
│  ───────────────────────────────    │
│  저장 폴더: [D:/exports      ] [📁]  │
│  파일명 접두어: [섬유종_      ]       │
│  포맷: ○ JPG  ● PNG                 │
│  품질: [────●────] 90%              │
│                                     │
│  적용 대상: 12개 이미지               │
│                                     │
│         [취소]     [저장하기]         │
└─────────────────────────────────────┘
```

---

## 상태 관리 (Zustand Store)

### useImageStore
```typescript
interface ImageStore {
  images: ImageFile[];           // 업로드된 이미지 목록
  selectedImageId: string | null; // 현재 선택된 이미지
  addImages: (files: File[]) => void;
  removeImage: (id: string) => void;
  selectImage: (id: string) => void;
}
```

### useLogoStore
```typescript
interface LogoStore {
  logo: LogoFile | null;
  position: { x: number; y: number };
  scale: number;
  opacity: number;
  setLogo: (file: File) => void;
  setPosition: (pos: { x: number; y: number }) => void;
  setScale: (scale: number) => void;
}
```

### useDateStore
```typescript
interface DateStore {
  text: string;
  position: { x: number; y: number };
  font: {
    family: string;
    size: number;
    color: string;
  };
  setText: (text: string) => void;
  setPosition: (pos: { x: number; y: number }) => void;
  setFont: (font: Partial<FontSettings>) => void;
}
```

### useAnnotationStore
```typescript
interface AnnotationStore {
  annotations: Annotation[];      // 현재 이미지의 강조 요소
  selectedTool: 'box' | 'dashed-box' | 'arrow' | 'text' | null;
  toolSettings: ToolSettings;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  setTool: (tool: string | null) => void;
}
```

---

## 사용자 플로우

```
1. 페이지 진입
   ↓
2. 이미지 업로드 (드래그 앤 드롭 또는 파일 선택)
   ↓
3. 첫 번째 이미지 자동 선택 → 캔버스에 표시
   ↓
4. 로고 업로드 → 캔버스에 로고 표시 → 드래그로 위치 조정
   ↓
5. 촬영일자 입력 → 캔버스에 텍스트 표시 → 드래그로 위치 조정
   ↓
6. (선택) 강조 도구로 박스/화살표/텍스트 추가
   ↓
7. 하단 썸네일에서 다른 이미지 선택 → 로고/날짜 위치 동일 적용
   ↓
8. "일괄 저장" 클릭 → 저장 모달 → 폴더/파일명 설정 → 저장
```

---

## 반응형 고려사항

| 화면 크기 | 레이아웃 변경 |
|----------|-------------|
| Desktop (1200px+) | 3열 레이아웃 (좌측 패널 + 캔버스 + 우측 옵션) |
| Tablet (768px~1199px) | 2열 레이아웃 (탭으로 도구 전환) |
| Mobile (767px 이하) | 단일 열 (하단 도구바) - 권장하지 않음 |

---

## 핵심 라이브러리 선택 이유

### react-konva (Konva.js)
- 캔버스 기반 이미지 편집에 최적화
- 드래그 앤 드롭, 리사이즈 네이티브 지원
- 레이어 시스템으로 로고/텍스트/강조 요소 분리 관리
- 이미지 내보내기 기능 내장 (`stage.toDataURL()`)

### Zustand
- 가벼운 상태 관리 (Redux 대비 보일러플레이트 최소)
- 여러 스토어 분리 관리 용이
- TypeScript 지원 우수

---

## 파일명 규칙

- 컴포넌트: PascalCase (`ImageCanvas.tsx`)
- 훅/유틸: camelCase (`useCanvasSize.ts`)
- 타입: PascalCase (`ImageFile.ts`)
- 상수: UPPER_SNAKE_CASE
