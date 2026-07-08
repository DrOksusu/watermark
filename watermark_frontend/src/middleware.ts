import { NextRequest, NextResponse } from 'next/server'
import { verifyPortalTokenEdge } from '@/lib/auth/portal-token'
import { portalLoginUrl, refreshBridgeUrl } from '@/lib/auth/portal-urls'

const PORTAL_BASE = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://koco.me'
const PUBLIC_KEY = process.env.PORTAL_PUBLIC_KEY ?? ''

// 페이지 내비게이션(브라우저 주소창/링크 이동) 여부. 실 브라우저는 문서 요청에
// Sec-Fetch-Mode: navigate 또는 Accept: text/html을 보낸다. 이때만 silent-refresh
// 브리지로 보내고, API/fetch/RSC 프리페치는 기존 포털 로그인 리다이렉트를 유지한다.
function isNavigation(req: NextRequest): boolean {
  if (req.headers.get('sec-fetch-mode') === 'navigate') return true
  return (req.headers.get('accept') || '').includes('text/html')
}

// 토큰 문제(미인증·만료)일 때: 페이지 내비게이션이면 silent-refresh 브리지로,
// 그 외(API/fetch)는 기존 포털 로그인 리다이렉트를 유지한다.
function unauthRedirect(req: NextRequest, returnUrl: string): NextResponse {
  if (isNavigation(req)) {
    return NextResponse.redirect(refreshBridgeUrl(req.nextUrl.origin, returnUrl))
  }
  return NextResponse.redirect(portalLoginUrl(PORTAL_BASE, returnUrl))
}

export async function middleware(req: NextRequest) {
  // silent-refresh 브리지 페이지는 인증 없이 공개(무한 리다이렉트 방지)
  if (req.nextUrl.pathname === '/refresh') {
    return NextResponse.next()
  }

  const token = req.cookies.get('access_token')?.value
  const returnUrl = req.nextUrl.href

  // 토큰 없음 → 갱신 가능(미인증). 내비게이션이면 브리지, 아니면 포털 로그인.
  if (!token) {
    return unauthRedirect(req, returnUrl)
  }

  // RS256 서명 검증 실패(만료 포함) → 갱신 가능. 동일 처리.
  const payload = await verifyPortalTokenEdge(token, PUBLIC_KEY)
  if (!payload) {
    return unauthRedirect(req, returnUrl)
  }

  // watermark 서비스 권한 없음 → 403 페이지로 rewrite(갱신해도 해결 안 됨)
  if (!payload.services.includes('watermark')) {
    return NextResponse.rewrite(new URL('/403', req.url))
  }

  return NextResponse.next()
}

// 정적 자산·헬스 제외. 페이지 경로만 게이트.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|403|api/health).*)'],
}
