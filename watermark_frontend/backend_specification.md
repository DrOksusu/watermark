# Backend Specification

## 기술 스택

| 구분 | 기술 |
|------|------|
| Runtime | Node.js |
| Framework | Express.js |
| Language | TypeScript |
| ORM | Prisma |
| Database | MySQL (AWS RDS) |
| Storage | AWS S3 (이미지 저장용) |

---

## API Routes

### 1. 이미지 관리

#### `POST /api/images/upload`
여러 장의 임상 사진 업로드
- **Request**: `multipart/form-data`
  - `images`: File[] (JPG, PNG)
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "originalName": "string",
      "url": "string",
      "width": number,
      "height": number
    }
  ]
}
```

#### `GET /api/images`
업로드된 이미지 목록 조회
- **Response**: 이미지 배열

#### `DELETE /api/images/:id`
이미지 삭제

---

### 2. 로고 관리

#### `POST /api/logo/upload`
병원 로고 이미지 업로드
- **Request**: `multipart/form-data`
  - `logo`: File (PNG 권장, 투명 배경 지원)
- **Response**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "url": "string",
    "width": number,
    "height": number
  }
}
```

#### `GET /api/logo`
현재 설정된 로고 조회

#### `DELETE /api/logo/:id`
로고 삭제

---

### 3. 설정 관리

#### `POST /api/settings`
워터마크 기본 설정 저장
- **Request Body**:
```json
{
  "logoPosition": {
    "x": number,
    "y": number,
    "anchor": "top-left" | "top-right" | "bottom-left" | "bottom-right"
  },
  "datePosition": {
    "x": number,
    "y": number
  },
  "dateFormat": "string",
  "font": {
    "family": "string",
    "size": number,
    "color": "string"
  }
}
```

#### `GET /api/settings`
저장된 설정 조회

#### `PUT /api/settings/:id`
설정 수정

---

### 4. 워터마크 처리

#### `POST /api/watermark/preview`
워터마크 미리보기 생성 (단일 이미지)
- **Request Body**:
```json
{
  "imageId": "string",
  "logoId": "string",
  "logoPosition": { "x": number, "y": number },
  "dateText": "string",
  "datePosition": { "x": number, "y": number },
  "fontSettings": {
    "family": "string",
    "size": number,
    "color": "string"
  },
  "annotations": [
    {
      "type": "box" | "arrow" | "text",
      "position": { "x": number, "y": number },
      "size": { "width": number, "height": number },
      "style": {
        "color": "string",
        "thickness": number,
        "lineStyle": "solid" | "dashed",
        "borderRadius": number
      },
      "text": "string"
    }
  ]
}
```
- **Response**: 미리보기 이미지 URL

#### `POST /api/watermark/batch`
일괄 워터마크 적용 및 저장
- **Request Body**:
```json
{
  "imageIds": ["string"],
  "logoId": "string",
  "logoPosition": { "x": number, "y": number },
  "dateText": "string",
  "datePosition": { "x": number, "y": number },
  "fontSettings": { ... },
  "annotations": [ ... ],
  "outputSettings": {
    "folder": "string",
    "filenamePrefix": "string",
    "format": "jpg" | "png",
    "quality": number
  }
}
```
- **Response**:
```json
{
  "success": true,
  "data": {
    "processedCount": number,
    "downloadUrl": "string",
    "files": [
      {
        "originalName": "string",
        "outputName": "string",
        "url": "string"
      }
    ]
  }
}
```

---

### 5. 강조 요소 (Annotations)

#### `POST /api/annotations`
강조 요소 템플릿 저장
- **Request Body**:
```json
{
  "name": "string",
  "type": "box" | "arrow" | "text",
  "style": {
    "color": "string",
    "thickness": number,
    "lineStyle": "solid" | "dashed",
    "borderRadius": number
  }
}
```

#### `GET /api/annotations`
저장된 강조 요소 템플릿 목록

#### `DELETE /api/annotations/:id`
템플릿 삭제

---

## Prisma Schema (예시)

```prisma
model Image {
  id          String   @id @default(uuid())
  originalName String
  url         String
  width       Int
  height      Int
  createdAt   DateTime @default(now())
}

model Logo {
  id        String   @id @default(uuid())
  url       String
  width     Int
  height    Int
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}

model Settings {
  id            String   @id @default(uuid())
  name          String   @default("default")
  logoPositionX Float
  logoPositionY Float
  logoAnchor    String
  datePositionX Float
  datePositionY Float
  dateFormat    String
  fontFamily    String
  fontSize      Int
  fontColor     String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model AnnotationTemplate {
  id           String   @id @default(uuid())
  name         String
  type         String
  color        String
  thickness    Int
  lineStyle    String
  borderRadius Int      @default(0)
  createdAt    DateTime @default(now())
}
```

---

## 추가 고려사항

### 이미지 처리 라이브러리
- **Sharp**: Node.js 고성능 이미지 처리
- 워터마크 합성, 리사이즈, 포맷 변환에 사용

### 파일 업로드
- **Multer**: Express 파일 업로드 미들웨어
- AWS S3 연동 시 `multer-s3` 사용

### 환경 변수
```env
DATABASE_URL="mysql://user:password@aws-rds-endpoint:3306/watermark_db"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="..."
AWS_REGION="ap-northeast-2"
```
