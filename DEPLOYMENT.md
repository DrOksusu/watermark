# 배포 가이드 (Monorepo)

## 프로젝트 구조
```
Watermark_project/              ← GitHub 저장소 (1개)
├── .github/workflows/
│   └── deploy-backend.yml      ← 백엔드 자동 배포
├── watermark_frontend/         ← Vercel 배포
├── watermark_backend/          ← Lightsail 배포
└── DEPLOYMENT.md
```

## 아키텍처
```
┌─────────────┐     ┌─────────────────┐     ┌───────────┐
│   Vercel    │────▶│  AWS Lightsail  │────▶│  AWS RDS  │
│  (Frontend) │     │   (Backend)     │     │  (MySQL)  │
└─────────────┘     └─────────────────┘     └───────────┘
```

---

## 1. GitHub 저장소 생성 (Monorepo)

```bash
# 프로젝트 루트에서
cd Watermark_project

git init
git add .
git commit -m "Initial commit: Watermark project"
git remote add origin https://github.com/USERNAME/watermark-project.git
git push -u origin main
```

---

## 2. Frontend: Vercel 배포

### 2.1 Vercel 연결
1. [vercel.com](https://vercel.com) 로그인
2. "Add New Project" → GitHub 저장소 `watermark-project` 선택
3. **Root Directory**: `watermark_frontend` 입력 ⚠️ 중요!
4. Framework: Next.js (자동 감지)
5. Deploy 클릭

### 2.2 환경변수 설정 (Settings → Environment Variables)
| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | Lightsail 백엔드 URL |

---

## 3. Backend: AWS Lightsail 컨테이너

### 3.1 Lightsail 컨테이너 서비스 생성
1. [lightsail.aws.amazon.com](https://lightsail.aws.amazon.com) 접속
2. Containers → Create container service
3. 설정:
   - Region: `ap-northeast-2`
   - Name: `watermark-backend`
   - Power: `Nano` ($7/월)
   - Scale: `1`

### 3.2 IAM 사용자 생성 (GitHub Actions용)
AWS IAM에서 사용자 생성 후 아래 정책 연결:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "lightsail:*"
    ],
    "Resource": "*"
  }]
}
```

### 3.3 GitHub Secrets 설정
Repository → Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | IAM Access Key |
| `AWS_SECRET_ACCESS_KEY` | IAM Secret Key |
| `DATABASE_URL` | MySQL 연결 문자열 |
| `FRONTEND_URL` | Vercel URL |

### 3.4 자동 배포
- `watermark_backend/` 폴더 변경 시 GitHub Actions 자동 실행
- 수동 실행: Actions 탭 → Run workflow

---

## 4. 배포 후 설정

1. Lightsail Public Domain 확인
2. Vercel의 `NEXT_PUBLIC_API_URL` 업데이트
3. Vercel 재배포

---

## 5. 배포 트리거

| 변경 위치 | 배포 대상 |
|-----------|-----------|
| `watermark_frontend/**` | Vercel (자동) |
| `watermark_backend/**` | Lightsail (GitHub Actions) |

---

## 6. 비용 (월)
| 서비스 | 비용 |
|--------|------|
| Vercel (Hobby) | 무료 |
| Lightsail Nano | $7 |
| RDS | 기존 비용 |
