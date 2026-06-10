import { NextRequest, NextResponse } from 'next/server'
import { verifyPortalTokenEdge } from '@/lib/auth/portal-token'
import { portalLoginUrl } from '@/lib/auth/portal-urls'

const PORTAL_BASE = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://koco.me'
const PUBLIC_KEY = process.env.PORTAL_PUBLIC_KEY ?? ''

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value
  const returnUrl = req.nextUrl.href

  // 토큰 없음 → 포털 로그인으로 리다이렉트
  if (!token) {
    return NextResponse.redirect(portalLoginUrl(PORTAL_BASE, returnUrl))
  }

  // RS256 서명 검증 실패 → 포털 로그인으로 리다이렉트
  const payload = await verifyPortalTokenEdge(token, PUBLIC_KEY)
  if (!payload) {
    return NextResponse.redirect(portalLoginUrl(PORTAL_BASE, returnUrl))
  }

  // watermark 서비스 권한 없음 → 403 페이지로 rewrite
  if (!payload.services.includes('watermark')) {
    return NextResponse.rewrite(new URL('/403', req.url))
  }

  return NextResponse.next()
}

// 정적 자산·헬스 제외. 페이지 경로만 게이트.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|403|api/health).*)'],
}
