import { describe, it, expect, vi, beforeEach } from 'vitest'

// 포털 토큰 검증은 목킹(단위 테스트는 미들웨어 분기 로직만 검증)
vi.mock('@/lib/auth/portal-token', () => ({ verifyPortalTokenEdge: vi.fn() }))
import { verifyPortalTokenEdge } from '@/lib/auth/portal-token'
import { middleware } from './middleware'

const mockVerify = verifyPortalTokenEdge as unknown as ReturnType<typeof vi.fn>

// NextRequest 최소 모킹 — 미들웨어가 쓰는 필드만 제공
function req(path: string, opts: { token?: string; nav?: boolean } = {}) {
  const url = `https://watermark.koco.me${path}`
  const nextUrl = new URL(url)
  return {
    nextUrl,
    url,
    cookies: { get: (n: string) => (opts.token && n === 'access_token' ? { value: opts.token } : undefined) },
    headers: { get: (n: string) => (opts.nav && n.toLowerCase() === 'accept' ? 'text/html' : null) },
  } as never
}

beforeEach(() => mockVerify.mockReset())

describe('watermark SSO 미들웨어 + silent-refresh 브리지', () => {
  it('/refresh 브리지 페이지는 인증 없이 공개(무한 리다이렉트 방지)', async () => {
    const res = await middleware(req('/refresh'))
    expect(res.headers.get('location')).toBeNull()
    expect(mockVerify).not.toHaveBeenCalled()
  })

  it('토큰 없음 + 페이지 내비게이션 → /refresh 브리지로', async () => {
    const res = await middleware(req('/edit', { nav: true }))
    const loc = decodeURIComponent(res.headers.get('location') || '')
    expect(loc).toContain('/refresh?returnUrl=')
    expect(loc).toContain('https://watermark.koco.me/edit')
    expect(loc).not.toContain('/login?returnUrl=')
  })

  it('토큰 없음 + 비내비게이션(API) → 포털 로그인 유지', async () => {
    const res = await middleware(req('/edit'))
    const loc = res.headers.get('location') || ''
    expect(loc).toContain('/login?returnUrl=')
    expect(loc).not.toContain('/refresh?returnUrl=')
  })

  it('만료/위조 토큰 + 내비게이션 → /refresh 브리지로', async () => {
    mockVerify.mockResolvedValue(null)
    const res = await middleware(req('/edit', { token: 'x', nav: true }))
    expect(decodeURIComponent(res.headers.get('location') || '')).toContain('/refresh?returnUrl=')
  })

  it('watermark 권한 없으면 403 rewrite(내비게이션이라도 브리지 아님)', async () => {
    mockVerify.mockResolvedValue({ services: ['psa'] })
    const res = await middleware(req('/edit', { token: 'x', nav: true }))
    expect(res.headers.get('location')).toBeNull()
    expect(res.headers.get('x-middleware-rewrite')).toContain('/403')
  })

  it('watermark 권한 있으면 통과', async () => {
    mockVerify.mockResolvedValue({ services: ['watermark'] })
    const res = await middleware(req('/edit', { token: 'x', nav: true }))
    expect(res.headers.get('location')).toBeNull()
    expect(res.headers.get('x-middleware-rewrite')).toBeNull()
  })
})
