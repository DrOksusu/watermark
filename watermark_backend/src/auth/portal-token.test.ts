import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import { generateKeyPairSync } from 'crypto'
import { verifyPortalToken, extractToken } from './portal-token'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const priv = privateKey.export({ type: 'pkcs1', format: 'pem' }) as string
const pub = publicKey.export({ type: 'spki', format: 'pem' }) as string

function sign(payload: object) {
  return jwt.sign(payload, priv, { algorithm: 'RS256', issuer: 'koco-portal-auth', expiresIn: '15m' })
}

describe('verifyPortalToken', () => {
  it('유효 토큰은 payload 반환', () => {
    const token = sign({ userId: 'u1', email: 'a@b.com', name: '홍길동', role: 'USER', services: ['watermark'] })
    const p = verifyPortalToken(token, pub)
    expect(p.userId).toBe('u1')
    expect(p.services).toContain('watermark')
  })

  it('issuer 불일치는 throw', () => {
    const token = jwt.sign({ userId: 'u1' }, priv, { algorithm: 'RS256', issuer: 'wrong' })
    expect(() => verifyPortalToken(token, pub)).toThrow()
  })

  it('만료 토큰은 throw', () => {
    const token = jwt.sign({ userId: 'u1' }, priv, { algorithm: 'RS256', issuer: 'koco-portal-auth', expiresIn: -10 })
    expect(() => verifyPortalToken(token, pub)).toThrow()
  })
})

describe('extractToken', () => {
  it('Bearer 우선', () => {
    const req = { headers: { authorization: 'Bearer abc' }, cookies: { access_token: 'xyz' } } as any
    expect(extractToken(req)).toBe('abc')
  })
  it('Bearer 없으면 access_token 쿠키', () => {
    const req = { headers: {}, cookies: { access_token: 'xyz' } } as any
    expect(extractToken(req)).toBe('xyz')
  })
  it('둘 다 없으면 null', () => {
    const req = { headers: {}, cookies: {} } as any
    expect(extractToken(req)).toBeNull()
  })
})
