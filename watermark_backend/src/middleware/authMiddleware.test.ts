import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { generateKeyPairSync } from 'crypto'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const priv = privateKey.export({ type: 'pkcs1', format: 'pem' }) as string
const pub = publicKey.export({ type: 'spki', format: 'pem' }) as string
process.env.PORTAL_PUBLIC_KEY = pub.replace(/\n/g, '\\n')

vi.mock('../config/database', () => ({
  default: { user: { findUnique: vi.fn().mockResolvedValue({ id: 7, clinicId: 3, externalId: 'u1' }) }, clinic: { create: vi.fn() } },
}))

function sign(p: object) {
  return jwt.sign(p, priv, { algorithm: 'RS256', issuer: 'koco-portal-auth', expiresIn: '15m' })
}
function mockRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('authMiddleware', () => {
  beforeEach(() => vi.clearAllMocks())

  it('토큰 없으면 401', async () => {
    const { authMiddleware } = await import('./authMiddleware')
    const next = vi.fn(); const res = mockRes()
    await authMiddleware({ headers: {}, cookies: {} } as any, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('services에 watermark 없으면 403', async () => {
    const { authMiddleware } = await import('./authMiddleware')
    const token = sign({ userId: 'u1', email: 'a@b.com', name: 'n', role: 'USER', services: ['psa'] })
    const next = vi.fn(); const res = mockRes()
    await authMiddleware({ headers: { authorization: `Bearer ${token}` }, cookies: {} } as any, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('유효+권한 있으면 req.user에 로컬 User 싣고 next', async () => {
    const { authMiddleware } = await import('./authMiddleware')
    const token = sign({ userId: 'u1', email: 'a@b.com', name: 'n', role: 'USER', services: ['watermark'] })
    const next = vi.fn(); const res = mockRes(); const req: any = { headers: { authorization: `Bearer ${token}` }, cookies: {} }
    await authMiddleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toMatchObject({ id: 7, clinicId: 3 })
  })
})
