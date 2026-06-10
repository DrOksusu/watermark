import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('loadPortalPublicKey', () => {
  beforeEach(() => vi.resetModules())

  it('PORTAL_PUBLIC_KEY 미설정 시 throw', async () => {
    delete process.env.PORTAL_PUBLIC_KEY
    const { loadPortalPublicKey } = await import('./env')
    expect(() => loadPortalPublicKey()).toThrow(/PORTAL_PUBLIC_KEY/)
  })

  it('설정 시 \\n 이스케이프를 실제 개행으로 변환해 반환', async () => {
    process.env.PORTAL_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\\nABC\\n-----END PUBLIC KEY-----'
    const { loadPortalPublicKey } = await import('./env')
    expect(loadPortalPublicKey()).toBe('-----BEGIN PUBLIC KEY-----\nABC\n-----END PUBLIC KEY-----')
  })
})
