import { describe, it, expect } from 'vitest'
import { safeReturnUrl, portalLoginUrl, refreshBridgeUrl } from './portal-urls'

describe('safeReturnUrl', () => {
  it('koco.me 서브도메인 허용', () => {
    expect(safeReturnUrl('https://watermark.koco.me/edit')).toBe('https://watermark.koco.me/edit')
  })
  it('외부 도메인 차단 → null', () => {
    expect(safeReturnUrl('https://evil.com/x')).toBeNull()
  })
})

describe('portalLoginUrl', () => {
  it('returnUrl 쿼리 포함', () => {
    expect(portalLoginUrl('https://koco.me', 'https://watermark.koco.me/edit'))
      .toBe('https://koco.me/login?returnUrl=https%3A%2F%2Fwatermark.koco.me%2Fedit')
  })
})

describe('refreshBridgeUrl', () => {
  it('origin 기준 /refresh 절대 URL에 returnUrl 인코딩', () => {
    expect(refreshBridgeUrl('https://watermark.koco.me', 'https://watermark.koco.me/edit'))
      .toBe('https://watermark.koco.me/refresh?returnUrl=https%3A%2F%2Fwatermark.koco.me%2Fedit')
  })
})
