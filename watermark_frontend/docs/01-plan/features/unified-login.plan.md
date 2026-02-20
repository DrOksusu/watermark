# unified-login Planning Document

> **Summary**: 메인 프로젝트(dba-portal.kr)와 워터마크 V2 간 통합로그인 완성
>
> **Project**: Watermark Project (V2 통합 버전)
> **Version**: v2
> **Author**: AI
> **Date**: 2026-02-21
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

메인 프로젝트(dba-portal.kr)에서 워터마크 에디터로 이동 시, 사용자가 별도 로그인 없이 자동으로 인증되는 통합로그인(SSO) 흐름을 완성한다.

### 1.2 Background

- 워터마크 에디터는 원래 독립 서비스(main 브랜치)로 운영 중
- V2 브랜치에서 메인 프로젝트의 서브 서비스로 통합 진행 중
- 메인 프로젝트에서 `unifiedToken`을 URL 해시로 전달하여 인증하는 방식
- **현재 상태**: 기본 흐름(토큰 전달 → 프론트 저장 → API 헤더 첨부)은 구현 완료, 그러나 보안 및 데이터 분리 등 미완성 항목 다수 존재

### 1.3 Related Documents

- 메인 프로젝트 분석: `memory/main-project-analysis.md`
- 통합로그인 진행 현황: `memory/auth-integration-status.md`

---

## 2. Scope

### 2.1 In Scope

- [ ] 백엔드 토큰 검증 미들웨어 구현
- [ ] logoService.ts 등 직접 fetch 사용하는 서비스에 토큰 첨부
- [ ] User와 기존 모델(Image, Logo, Settings) 간 관계 설정 (사용자별 데이터 분리)
- [ ] 토큰 만료/갱신 처리
- [ ] 메인 프로젝트 측 URL 변경 (워터마크 V2 URL로)
- [ ] 메인 백엔드 sync-account 호출 URL V2로 변경

### 2.2 Out of Scope

- 워터마크 자체 회원가입/로그인 화면 (V2는 메인 프로젝트 통합 전용)
- OAuth 직접 구현 (메인 프로젝트가 담당)
- main 브랜치(독립 버전) 변경

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 백엔드 인증 미들웨어: unifiedToken을 검증하여 보호 API 접근 제어 | High | Pending |
| FR-02 | logoService.ts에 Authorization 헤더 자동 첨부 (api 클라이언트 통일) | High | Pending |
| FR-03 | User ↔ Image/Logo/Settings 모델 관계 설정 (사용자별 데이터 분리) | High | Pending |
| FR-04 | 토큰 만료 감지 및 메인 프로젝트 재인증 안내 | Medium | Pending |
| FR-05 | 메인 프론트엔드 사이드바 워터마크 URL을 V2로 변경 | High | Pending |
| FR-06 | 메인 백엔드 sync-account 호출 URL을 V2(4001)로 변경 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Security | unifiedToken 서버 측 검증 필수 | 미인증 API 호출 시 401 응답 확인 |
| Security | API Key + Token 이중 인증 유지 | 수동 테스트 |
| Performance | 토큰 검증 추가로 인한 응답 지연 < 50ms | API 응답 시간 측정 |
| UX | 토큰 만료 시 사용자에게 명확한 안내 | 수동 QA |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 메인 프로젝트에서 워터마크 클릭 → V2 에디터 자동 인증 진입
- [ ] 백엔드 보호 API에 토큰 없이 접근 시 401 반환
- [ ] 사용자별 데이터(이미지, 로고, 설정)가 분리됨
- [ ] logoService 등 모든 API 호출에 토큰 첨부됨
- [ ] 토큰 만료 시 적절한 안내 메시지 표시

### 4.2 Quality Criteria

- [ ] Zero lint errors (프론트엔드 ESLint)
- [ ] 빌드 성공 (프론트 + 백엔드)
- [ ] 배포 후 E2E 수동 테스트 통과

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| unifiedToken 위조/탈취 | High | Medium | 서버 측 토큰 검증, HTTPS 필수, 토큰 만료 설정 |
| 메인 프로젝트 API 변경 | Medium | Low | API 스펙 문서화, 버전 관리 |
| DB 마이그레이션 시 기존 데이터 손실 | High | Low | 마이그레이션 전 백업, 단계적 적용 |
| logoService 등 누락된 토큰 첨부 | Medium | High | 모든 서비스를 api 클라이언트로 통일 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites, portfolios | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend | ☑ |
| **Enterprise** | Strict layer separation, microservices | High-traffic systems | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js / React | Next.js (App Router) | 기존 프로젝트 유지 |
| State Management | Context / Zustand | Zustand | 기존 프로젝트 패턴 유지 |
| API Client | fetch / axios | 커스텀 fetchApi | 기존 api.ts 유지, 토큰 자동 첨부 |
| Styling | Tailwind / CSS Modules | Tailwind CSS v4 | 기존 프로젝트 유지 |
| Backend | Custom Express | Express.js + Prisma | 기존 프로젝트 유지 |
| 토큰 검증 방식 | DB 조회 / JWT 디코딩 | DB 조회 (User.unifiedToken) | 메인 프로젝트 토큰 포맷 의존 최소화 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic

현재 폴더 구조 (유지):
┌─────────────────────────────────────────────────────┐
│ Frontend:                                           │
│   src/stores/useAuthStore.ts    (인증 상태)          │
│   src/components/auth/          (AuthProvider)       │
│   src/lib/api.ts                (API 클라이언트)      │
│   src/services/                 (도메인 서비스)       │
├─────────────────────────────────────────────────────┤
│ Backend:                                            │
│   src/routes/authRoutes.ts      (인증 라우트)        │
│   src/services/authService.ts   (인증 비즈니스 로직)   │
│   src/middleware/               (신규: 인증 미들웨어)  │
│   prisma/schema.prisma          (User + 관계 추가)   │
└─────────────────────────────────────────────────────┘
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [ ] `docs/01-plan/conventions.md` exists
- [ ] `CONVENTIONS.md` exists at project root
- [x] ESLint configuration (프론트엔드 only)
- [ ] Prettier configuration
- [x] TypeScript configuration (`tsconfig.json`)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | CLAUDE.md에 정의 | PascalCase 컴포넌트, camelCase 훅/유틸 | High |
| **Folder structure** | CLAUDE.md에 정의 | middleware/ 폴더 활용 규칙 | High |
| **API 인증 패턴** | 부분 구현 | 모든 서비스가 api.ts 클라이언트 사용 | High |
| **Error handling** | 부분 구현 | 401 응답 시 토큰 만료 처리 패턴 | Medium |

### 7.3 Environment Variables (이미 설정됨)

| Variable | Purpose | Scope | Status |
|----------|---------|-------|:------:|
| `NEXT_PUBLIC_API_URL` | V2 백엔드 URL | Client | ☑ 설정됨 |
| `DATABASE_URL_V2` | V2 전용 DB | Server | ☑ 설정됨 |
| `SUB_DOMAIN_API_KEY` | 메인↔워터마크 API 인증 | Server | ☑ 설정됨 |
| `FRONTEND_URL_V2` | CORS 허용 도메인 | Server | ☑ 설정됨 |

---

## 8. 현재 구현 상태 (As-Is)

### 8.1 완료된 항목

| 영역 | 내용 | 상태 |
|------|------|:----:|
| 백엔드 sync-account API | `POST /api/auth/sync-account` (x-api-key 인증) | ✅ |
| 백엔드 User 모델 | userId @unique, upsert 로직 | ✅ |
| 프론트 useAuthStore | URL 해시에서 unifiedToken 파싱, localStorage 관리 | ✅ |
| 프론트 AuthProvider | 인증 게이트 컴포넌트 | ✅ |
| 프론트 api.ts | fetchApi에 Bearer 헤더 자동 추가 | ✅ |
| V2 배포 | FE: Vercel, BE: Lightsail:4001 | ✅ |
| CI/CD | deploy-backend-v2.yml | ✅ |

### 8.2 미완료 항목 (Gap)

| 영역 | 내용 | 우선순위 |
|------|------|:--------:|
| 백엔드 | 토큰 검증 미들웨어 없음 (보호 API 무방비) | **Critical** |
| 프론트 | logoService.ts가 직접 fetch 사용 (토큰 미첨부) | High |
| DB | User와 Image/Logo/Settings 관계 없음 (데이터 미분리) | High |
| 프론트 | 토큰 만료/갱신 처리 없음 | Medium |
| 메인 FE | 사이드바 워터마크 URL 미변경 | High |
| 메인 BE | sync-account 호출 URL 미변경 | High |

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`/pdca design unified-login`)
2. [ ] 팀 리뷰 및 승인
3. [ ] 구현 시작 (우선순위: 백엔드 미들웨어 → 서비스 통일 → DB 관계 → 토큰 갱신)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-21 | Initial draft | AI |
