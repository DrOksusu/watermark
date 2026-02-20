import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

// Express Request 타입 확장
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;       // User.id (내부 PK)
        userId: number;   // 메인 프로젝트 userId
        clinicId: number; // 병원 ID
      };
    }
  }
}

// unifiedToken 검증 미들웨어
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: '인증 토큰이 필요합니다' });
      return;
    }

    const token = authHeader.slice(7);

    // DB에서 토큰으로 사용자 조회
    const user = await prisma.user.findFirst({
      where: { unifiedToken: token },
    });

    if (!user) {
      res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다' });
      return;
    }

    // req.user에 사용자 정보 설정
    req.user = {
      id: user.id,
      userId: user.userId,
      clinicId: user.clinicId,
    };

    next();
  } catch (error) {
    console.error('인증 미들웨어 오류:', error);
    res.status(500).json({ success: false, error: '인증 처리 중 오류가 발생했습니다' });
  }
}
