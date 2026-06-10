import { Request, Response, NextFunction } from 'express'
import prisma from '../config/database'
import { loadPortalPublicKey } from '../config/env'
import { verifyPortalToken, extractToken } from '../auth/portal-token'
import { resolveLocalUser } from '../auth/jit-user'

// req.user = 로컬 워터마크 User (포털 신원 매핑 결과)
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; clinicId: number; externalId: string }
    }
  }
}

const SERVICE_CODE = 'watermark'
const publicKey = loadPortalPublicKey() // 기동 시 1회. 미설정이면 throw로 부팅 실패.

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ success: false, error: '인증 토큰이 필요합니다' })
    return
  }
  let payload
  try {
    payload = verifyPortalToken(token, publicKey)
  } catch {
    res.status(401).json({ success: false, error: '유효하지 않거나 만료된 토큰입니다' })
    return
  }
  if (!payload.services.includes(SERVICE_CODE)) {
    res.status(403).json({ success: false, error: '이 서비스에 대한 접근 권한이 없습니다' })
    return
  }
  try {
    const user = await resolveLocalUser(prisma, payload)
    req.user = { id: user.id, clinicId: user.clinicId, externalId: user.externalId }
    next()
  } catch (error) {
    // JIT 동시성(P2002 unique) 흡수: 재조회 1회
    const retried = await prisma.user.findUnique({ where: { externalId: payload.userId } })
    if (retried) {
      req.user = { id: retried.id, clinicId: retried.clinicId, externalId: retried.externalId }
      next()
      return
    }
    console.error('인증 처리 오류:', error)
    res.status(500).json({ success: false, error: '인증 처리 중 오류가 발생했습니다' })
  }
}
