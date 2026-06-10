import jwt from 'jsonwebtoken'
import type { Request } from 'express'

// 포털 SSO 토큰 페이로드 — shared-auth TokenPayload와 동일 계약(별도 레포라 복제).
export interface PortalTokenPayload {
  userId: string
  email: string | null
  name: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER'
  services: string[]
  iat?: number
  exp?: number
}

export function verifyPortalToken(token: string, publicKey: string): PortalTokenPayload {
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'koco-portal-auth',
  }) as PortalTokenPayload
}

// Authorization: Bearer 우선, 없으면 access_token 쿠키(.koco.me 공유 쿠키)
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7)
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.access_token
  return cookieToken ?? null
}
