# unified-login Design Document

> **Summary**: 메인 프로젝트(dba-portal.kr)와 워터마크 V2 간 통합로그인 상세 설계
>
> **Project**: Watermark Project (V2 통합 버전)
> **Version**: v2
> **Author**: AI
> **Date**: 2026-02-21
> **Status**: Draft
> **Planning Doc**: [unified-login.plan.md](../01-plan/features/unified-login.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. 백엔드 보호 API에 토큰 검증 미들웨어를 추가하여 보안 강화
2. 프론트엔드 서비스 레이어의 API 호출을 통일하여 토큰 누락 방지
3. User 모델과 기존 데이터 모델을 연결하여 사용자별 데이터 분리
4. 토큰 만료 감지 및 사용자 안내 흐름 구현

### 1.2 Design Principles

- **최소 변경 원칙**: 기존 동작하는 코드를 최대한 유지하면서 인증 레이어만 추가
- **점진적 마이그레이션**: DB 관계 추가 시 기존 데이터 호환성 유지 (userId nullable)
- **단일 진입점**: 모든 API 호출은 `api.ts`를 통해서만 이루어지도록 통일

---

## 2. Architecture

### 2.1 전체 인증 흐름

```
[메인 프로젝트 dba-portal.kr]
    │
    │ ① 사용자가 사이드바에서 "워터마크" 클릭
    │    → useSidebarNavigation.ts
    │    → window.open('https://watermark-v2-tau.vercel.app#unifiedToken={token}', '_blank')
    │
    │ ② 서버-서버: 계정 동기화 (이미 구현됨)
    │    → POST /api/auth/sync-account (x-api-key 인증)
    │    → body: { email, name, provider, userId, unifiedToken, clinicId }
    ▼
[워터마크 V2 프론트엔드]
    │
    │ ③ AuthProvider → initFromHash() → unifiedToken 추출 → localStorage 저장
    │ ④ 인증 성공 → 에디터 UI 렌더링
    │ ⑤ API 호출 시 api.ts → Authorization: Bearer {unifiedToken}
    ▼
[워터마크 V2 백엔드]
    │
    │ ⑥ 신규: authMiddleware → DB에서 unifiedToken으로 User 조회
    │    → 유효: req.user에 User 정보 설정 → 다음 핸들러로
    │    → 무효: 401 Unauthorized 반환
    │ ⑦ 라우트 핸들러 → req.user.id 기준으로 데이터 CRUD
    ▼
[MySQL DB]
    │
    │ ⑧ userId(FK) 기반 사용자별 데이터 분리
```

### 2.2 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐              │
│  │AuthStore │→ │api.ts    │→ │logoService   │ (리팩토링)    │
│  │(Zustand) │  │(fetchApi)│  │settingsService│ (유지)       │
│  └──────────┘  └────┬─────┘  └──────────────┘              │
│                     │ Authorization: Bearer {token}          │
└─────────────────────┼───────────────────────────────────────┘
                      │ HTTPS
┌─────────────────────┼───────────────────────────────────────┐
│  Backend (Express)  │                                       │
│                ┌────▼─────┐                                 │
│                │  CORS    │                                 │
│                │  JSON    │                                 │
│                └────┬─────┘                                 │
│           ┌─────────┼──────────┐                            │
│      ┌────▼───┐ ┌───▼────┐ ┌──▼────────┐                   │
│      │ /auth  │ │/health │ │ 보호 API   │                   │
│      │(APIKey)│ │(공개)  │ │(authMiddle)│                   │
│      └────────┘ └────────┘ └─────┬──────┘                   │
│                                  │ req.user                  │
│                          ┌───────▼──────┐                   │
│                          │  Services    │                   │
│                          │ (userId 기반) │                   │
│                          └───────┬──────┘                   │
│                                  │                          │
│                          ┌───────▼──────┐                   │
│                          │ Prisma (DB)  │                   │
│                          └──────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| authMiddleware (신규) | Prisma User 모델 | 토큰으로 사용자 조회 |
| 모든 보호 라우트 | authMiddleware | 인증 강제 |
| logoService (리팩토링) | api.ts | 토큰 자동 첨부 |
| api.ts (수정) | useAuthStore | 401 응답 시 토큰 만료 처리 |

---

## 3. Data Model

### 3.1 현재 모델 (As-Is)

```
[User]          [Image]         [Logo]          [Settings]
독립            독립             독립             독립
(관계 없음)     (관계 없음)      (관계 없음)      (관계 없음)
```

### 3.2 목표 모델 (To-Be)

```
[User] 1 ──── N [Image]
  │
  ├── 1 ──── N [Logo]
  │
  ├── 1 ──── N [Settings]
  │
  └── 1 ──── N [AnnotationTemplate]
```

### 3.3 Prisma Schema 변경

```prisma
model User {
  id           Int       @id @default(autoincrement())
  userId       Int       @unique @map("user_id")
  email        String    @db.VarChar(200)
  name         String    @db.VarChar(50)
  provider     String    @db.VarChar(20)
  clinicId     Int       @map("clinic_id")
  unifiedToken String    @map("unified_token") @db.Text
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  // 신규 관계
  images              Image[]
  logos                Logo[]
  settings            Settings[]
  annotationTemplates AnnotationTemplate[]

  @@map("users")
}

model Image {
  id           String   @id @default(uuid())
  originalName String   @map("original_name") @db.VarChar(500)
  filename     String   @db.VarChar(500)
  url          String   @db.Text
  width        Int
  height       Int
  size         Int
  mimeType     String   @map("mime_type") @db.VarChar(50)
  createdAt    DateTime @default(now()) @map("created_at")

  // 신규: User 관계 (nullable — 기존 데이터 호환)
  ownerId      Int?     @map("owner_id")
  owner        User?    @relation(fields: [ownerId], references: [id])

  @@map("images")
}

model Logo {
  id        String   @id @default(uuid())
  name      String   @db.VarChar(200)
  filename  String   @db.VarChar(500)
  url       String   @db.Text
  width     Int
  height    Int
  isActive  Boolean  @default(false) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // 신규: User 관계 (nullable)
  ownerId   Int?     @map("owner_id")
  owner     User?    @relation(fields: [ownerId], references: [id])

  @@map("logos")
}

model Settings {
  id             String   @id @default(uuid())
  name           String   @db.VarChar(100)
  // ... (기존 필드 유지)
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  // 신규: User 관계 (nullable)
  ownerId        Int?     @map("owner_id")
  owner          User?    @relation(fields: [ownerId], references: [id])

  @@map("settings")
}

model AnnotationTemplate {
  id           String   @id @default(uuid())
  name         String   @db.VarChar(100)
  // ... (기존 필드 유지)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // 신규: User 관계 (nullable)
  ownerId      Int?     @map("owner_id")
  owner        User?    @relation(fields: [ownerId], references: [id])

  @@map("annotation_templates")
}
```

**핵심 설계 결정**: `ownerId`를 **nullable**로 설정하여 기존 데이터(owner 없음)와의 호환성 유지. 마이그레이션 시 기존 행은 `owner_id = NULL`로 유지됨.

### 3.4 마이그레이션 전략

```
Step 1: ownerId 컬럼 추가 (nullable, FK)
        → 기존 데이터 영향 없음 (NULL 허용)
Step 2: 인덱스 추가 (owner_id 기반 조회 최적화)
Step 3: 향후 기존 데이터 정리 (필요 시)
```

---

## 4. API Specification

### 4.1 인증 분류

| 엔드포인트 | 인증 방식 | 변경사항 |
|-----------|----------|---------|
| `POST /api/auth/sync-account` | x-api-key (유지) | 변경 없음 |
| `GET /health` | 없음 (유지) | 변경 없음 |
| `GET /api/images` | **신규: Bearer Token** | authMiddleware 추가 |
| `POST /api/images/upload` | **신규: Bearer Token** | authMiddleware 추가 |
| `DELETE /api/images/:id` | **신규: Bearer Token** | authMiddleware 추가 |
| `DELETE /api/images` | **신규: Bearer Token** | authMiddleware 추가 |
| `GET /api/logo` | **신규: Bearer Token** | authMiddleware 추가 |
| `GET /api/logo/all` | **신규: Bearer Token** | authMiddleware 추가 |
| `POST /api/logo/upload` | **신규: Bearer Token** | authMiddleware 추가 |
| `PUT /api/logo/:id/activate` | **신규: Bearer Token** | authMiddleware 추가 |
| `DELETE /api/logo/:id` | **신규: Bearer Token** | authMiddleware 추가 |
| `GET /api/logo/:id/file` | 없음 (유지) | 로고 파일 프록시 — 공개 유지 |
| `GET /api/settings` | **신규: Bearer Token** | authMiddleware 추가 |
| `GET /api/settings/all` | **신규: Bearer Token** | authMiddleware 추가 |
| `POST /api/settings` | **신규: Bearer Token** | authMiddleware 추가 |
| `PUT /api/settings/:id` | **신규: Bearer Token** | authMiddleware 추가 |
| `DELETE /api/settings/:id` | **신규: Bearer Token** | authMiddleware 추가 |
| `POST /api/watermark/preview` | **신규: Bearer Token** | authMiddleware 추가 |
| `POST /api/watermark/batch` | **신규: Bearer Token** | authMiddleware 추가 |
| `GET /api/annotations` | **신규: Bearer Token** | authMiddleware 추가 |
| `POST /api/annotations` | **신규: Bearer Token** | authMiddleware 추가 |
| `PUT /api/annotations/:id` | **신규: Bearer Token** | authMiddleware 추가 |
| `DELETE /api/annotations/:id` | **신규: Bearer Token** | authMiddleware 추가 |

### 4.2 authMiddleware 상세 설계

```typescript
// src/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

// Express Request 타입 확장
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;        // User.id (내부 PK)
        userId: number;    // 메인 프로젝트 userId
        clinicId: number;  // 병원 ID
      };
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // 1. Authorization 헤더에서 Bearer 토큰 추출
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '인증 토큰이 필요합니다' });
    return;
  }

  const token = authHeader.slice(7); // 'Bearer ' 제거

  // 2. DB에서 토큰으로 사용자 조회
  const user = await prisma.user.findFirst({
    where: { unifiedToken: token },
  });

  if (!user) {
    res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다' });
    return;
  }

  // 3. req.user에 사용자 정보 설정
  req.user = {
    id: user.id,
    userId: user.userId,
    clinicId: user.clinicId,
  };

  next();
}
```

**토큰 검증 방식**: DB 조회 (`User.unifiedToken` 일치 확인)
- JWT 디코딩 대신 DB 조회를 선택한 이유: 메인 프로젝트의 토큰 포맷/시크릿에 의존하지 않음
- sync-account 시 저장된 unifiedToken과 일치하면 인증 성공

### 4.3 라우트 적용 방식

```typescript
// src/index.ts — 미들웨어 적용 방식

// 방법: 보호 라우트에 미들웨어 일괄 적용
app.use('/api/images', authMiddleware, imageRoutes);
app.use('/api/logo', authMiddleware, logoRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/watermark', authMiddleware, watermarkRoutes);
app.use('/api/annotations', authMiddleware, annotationRoutes);

// 인증 불필요 라우트 (기존 유지)
app.use('/api/auth', authRoutes);       // sync-account는 자체 API Key 인증
app.get('/health', (req, res) => ...);  // 헬스체크
```

**예외**: `GET /api/logo/:id/file` (로고 파일 프록시)는 캔버스에서 직접 로드하는 용도로 공개 유지 필요. logoRoutes 내부에서 이 라우트만 미들웨어 건너뛰기 처리.

### 4.4 서비스 레이어 변경 (userId 필터링)

기존 서비스에 `ownerId` 파라미터를 추가하여 사용자별 데이터 필터링:

```typescript
// 예시: imageService.ts 변경
export async function getImages(ownerId: number) {
  return prisma.image.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createImage(data: ImageData, ownerId: number) {
  return prisma.image.create({
    data: { ...data, ownerId },
  });
}
```

라우트 핸들러에서 `req.user!.id`를 서비스에 전달:

```typescript
// 예시: imageRoutes.ts 변경
router.get('/', async (req, res) => {
  const images = await imageService.getImages(req.user!.id);
  res.json({ success: true, data: images });
});
```

### 4.5 에러 응답 형식

```json
// 401 Unauthorized — 토큰 없음
{
  "success": false,
  "error": "인증 토큰이 필요합니다"
}

// 401 Unauthorized — 토큰 무효
{
  "success": false,
  "error": "유효하지 않은 토큰입니다"
}
```

---

## 5. Frontend 변경 설계

### 5.1 logoService.ts 리팩토링

**현재**: 직접 `fetch()` 호출 (토큰 미첨부)
**변경**: `api.ts`의 래퍼 사용으로 전환

```typescript
// src/services/logoService.ts — 리팩토링 후

import { api } from '@/lib/api';

export const logoService = {
  getAll: () => api.get<Logo[]>('/api/logo/all'),
  getActive: () => api.get<Logo>('/api/logo'),
  activate: (id: string) => api.put<Logo>(`/api/logo/${id}/activate`, {}),
  delete: (id: string) => api.delete<void>(`/api/logo/${id}`),

  // upload는 FormData 사용 → api.ts에 uploadFile 메서드 추가 필요
  upload: (file: File, name: string) => api.upload<Logo>('/api/logo/upload', file, name),
};
```

### 5.2 api.ts 수정 — FormData 업로드 지원 + 401 처리

```typescript
// src/lib/api.ts — 추가/수정 사항

// 1. FormData 업로드 메서드 추가
async function uploadFile<T>(endpoint: string, file: File, name: string) {
  const token = useAuthStore.getState().unifiedToken;
  const formData = new FormData();
  formData.append('logo', file);
  formData.append('name', name);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      // Content-Type은 설정하지 않음 (브라우저가 FormData boundary 자동 설정)
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  // ... 기존 응답 처리 로직
}

// 2. 401 응답 시 토큰 만료 처리 (fetchApi 내부)
if (response.status === 401) {
  useAuthStore.getState().clearToken();
  // isAuthenticated가 false로 변경 → AuthProvider가 접근 거부 화면 표시
  return { success: false, error: '인증이 만료되었습니다. 메인 서비스에서 다시 접근해주세요.' };
}

export const api = {
  get: <T>(endpoint) => fetchApi<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint, body) => fetchApi<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint, body) => fetchApi<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint) => fetchApi<T>(endpoint, { method: 'DELETE' }),
  upload: <T>(endpoint, file, name) => uploadFile<T>(endpoint, file, name),  // 신규
};
```

### 5.3 AuthProvider 토큰 만료 UX

현재 AuthProvider의 미인증 화면을 토큰 만료 상황에도 재활용:

```
토큰 만료 시 흐름:
1. API 호출 → 401 응답
2. api.ts → useAuthStore.clearToken()
3. isAuthenticated → false
4. AuthProvider → "접근 권한이 필요합니다" 화면 표시
   (이미 구현된 UI 재사용)
```

별도 만료 전용 UI는 불필요. 기존 AuthProvider의 미인증 화면이 적절.

---

## 6. Error Handling

### 6.1 에러 코드 정의

| Code | Message | 원인 | 처리 |
|------|---------|------|------|
| 401 | 인증 토큰이 필요합니다 | Authorization 헤더 없음 | 프론트: AuthProvider 미인증 화면 |
| 401 | 유효하지 않은 토큰입니다 | DB에서 토큰 미일치 | 프론트: clearToken → 미인증 화면 |
| 401 | 인증 실패 | sync-account API Key 불일치 | 서버간 통신 에러 (프론트 무관) |
| 403 | 접근 권한이 없습니다 | 다른 사용자의 리소스 접근 시도 | 향후 확장용 (현재 미구현) |
| 500 | 서버 오류 | 내부 에러 | 기존 에러 핸들러 유지 |

---

## 7. Security Considerations

- [x] HTTPS 강제 (Vercel + Caddy 리버스 프록시로 이미 적용)
- [ ] **인증 미들웨어 추가** (이번 구현 핵심)
- [ ] **토큰 DB 조회 방식**: unifiedToken이 Text 타입이라 인덱스 효율 고려 필요
- [x] sync-account는 x-api-key 이중 인증 유지
- [ ] CORS 설정 정리 (현재 미허용 origin도 통과하는 버그 수정)
- [ ] Rate Limiting (향후 과제 — 이번 범위 외)

### 7.1 토큰 보안 고려사항

| 항목 | 현재 | 이번 설계 |
|------|------|----------|
| 토큰 전달 | URL 해시 (HTTPS) | 유지 (해시는 서버로 전송되지 않음) |
| 토큰 저장 (FE) | localStorage | 유지 (탭 간 공유 필요) |
| 토큰 검증 (BE) | 없음 | **DB 조회로 검증** |
| 토큰 만료 | 없음 | **401 응답 시 클라이언트 측 처리** |

---

## 8. Test Plan

### 8.1 수동 테스트 시나리오 (테스트 프레임워크 미설정)

| # | 시나리오 | 예상 결과 |
|---|---------|----------|
| 1 | 메인 프로젝트에서 워터마크 클릭 | V2 에디터 자동 인증 진입 |
| 2 | 토큰 없이 직접 URL 접근 | AuthProvider 미인증 화면 |
| 3 | 잘못된 토큰으로 API 호출 | 401 응답 |
| 4 | 로고 업로드 (토큰 있음) | 정상 업로드, ownerId 설정됨 |
| 5 | 사용자 A의 로고가 사용자 B에게 미노출 | 데이터 분리 확인 |
| 6 | sync-account 후 즉시 에디터 접근 | 토큰 일치, 인증 성공 |
| 7 | 토큰 만료(DB에서 갱신됨) 후 API 호출 | 401 → 미인증 화면 |

---

## 9. Implementation Guide

### 9.1 파일 변경 목록

| # | 영역 | 파일 | 변경 내용 | 신규/수정 |
|---|------|------|----------|:---------:|
| 1 | BE | `src/middleware/authMiddleware.ts` | 토큰 검증 미들웨어 | **신규** |
| 2 | BE | `src/types/express.d.ts` | Request.user 타입 확장 | **신규** |
| 3 | BE | `prisma/schema.prisma` | ownerId 컬럼 + 관계 추가 | 수정 |
| 4 | BE | `src/index.ts` | 보호 라우트에 authMiddleware 적용 | 수정 |
| 5 | BE | `src/routes/logoRoutes.ts` | `/logo/:id/file` 미들웨어 예외 처리 | 수정 |
| 6 | BE | `src/services/imageService.ts` | ownerId 파라미터 추가 | 수정 |
| 7 | BE | `src/services/logoService.ts` | ownerId 파라미터 추가 | 수정 |
| 8 | BE | `src/services/settingsService.ts` | ownerId 파라미터 추가 | 수정 |
| 9 | BE | `src/services/annotationService.ts` | ownerId 파라미터 추가 | 수정 |
| 10 | BE | `src/routes/imageRoutes.ts` | req.user.id를 서비스에 전달 | 수정 |
| 11 | BE | `src/routes/logoRoutes.ts` | req.user.id를 서비스에 전달 | 수정 |
| 12 | BE | `src/routes/settingsRoutes.ts` | req.user.id를 서비스에 전달 | 수정 |
| 13 | BE | `src/routes/annotationRoutes.ts` | req.user.id를 서비스에 전달 | 수정 |
| 14 | BE | `src/routes/watermarkRoutes.ts` | req.user.id를 서비스에 전달 | 수정 |
| 15 | FE | `src/lib/api.ts` | upload 메서드 추가, 401 처리 | 수정 |
| 16 | FE | `src/services/logoService.ts` | api.ts 래퍼 사용으로 리팩토링 | 수정 |

### 9.2 Implementation Order

```
Phase 1: 백엔드 인증 인프라 (Critical)
  1. [ ] src/middleware/authMiddleware.ts 생성
  2. [ ] src/types/express.d.ts 타입 확장
  3. [ ] src/index.ts에 미들웨어 적용
  4. [ ] logoRoutes.ts — /logo/:id/file 예외 처리

Phase 2: DB 스키마 변경
  5. [ ] prisma/schema.prisma — ownerId + 관계 추가
  6. [ ] npx prisma migrate dev — 마이그레이션 실행

Phase 3: 백엔드 서비스/라우트 수정 (ownerId 필터링)
  7. [ ] imageService.ts — ownerId 파라미터 추가
  8. [ ] logoService.ts (BE) — ownerId 파라미터 추가
  9. [ ] settingsService.ts (BE) — ownerId 파라미터 추가
  10. [ ] annotationService.ts — ownerId 파라미터 추가
  11. [ ] 각 라우트 핸들러에서 req.user.id 전달

Phase 4: 프론트엔드 수정
  12. [ ] api.ts — upload 메서드 추가 + 401 처리
  13. [ ] logoService.ts (FE) — api.ts 래퍼 사용으로 전환

Phase 5: 메인 프로젝트 URL 변경 (별도 저장소)
  14. [ ] 메인 FE — sidebarMenu.ts 워터마크 URL 변경
  15. [ ] 메인 BE — sync-account 호출 URL 변경
```

---

## 10. Coding Convention Reference

### 10.1 이번 기능에 적용되는 컨벤션

| Item | Convention |
|------|-----------|
| 미들웨어 파일명 | camelCase (`authMiddleware.ts`) |
| 타입 확장 | `src/types/express.d.ts` — declare global |
| 서비스 함수 | camelCase, ownerId를 마지막 파라미터로 |
| 에러 응답 | `{ success: false, error: string }` 형식 유지 |
| API 클라이언트 | 모든 서비스는 반드시 `api.ts`를 통해 호출 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-21 | Initial draft | AI |
