import { describe, it, expect } from 'vitest'
import { SignJWT, exportSPKI, generateKeyPair } from 'jose'
import { verifyPortalTokenEdge } from './portal-token'

it('유효 토큰 검증 + services 반환', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256')
  const spki = await exportSPKI(publicKey)
  const token = await new SignJWT({ userId: 'u1', name: 'n', email: 'a@b.com', role: 'USER', services: ['watermark'] })
    .setProtectedHeader({ alg: 'RS256' }).setIssuer('koco-portal-auth').setExpirationTime('15m').sign(privateKey)
  const payload = await verifyPortalTokenEdge(token, spki)
  expect(payload?.services).toContain('watermark')
})

it('서명 불일치는 null', async () => {
  const a = await generateKeyPair('RS256')
  const b = await generateKeyPair('RS256')
  const spki = await exportSPKI(b.publicKey)
  const token = await new SignJWT({ userId: 'u1', services: [] })
    .setProtectedHeader({ alg: 'RS256' }).setIssuer('koco-portal-auth').setExpirationTime('15m').sign(a.privateKey)
  expect(await verifyPortalTokenEdge(token, spki)).toBeNull()
})
