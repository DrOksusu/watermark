import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { ApiResponse } from '../types';

const router = Router();

// POST /api/auth/sync-account - 메인 프로젝트 계정 동기화
router.post('/sync-account', async (req: Request, res: Response) => {
  try {
    // API Key 검증
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.SUB_DOMAIN_API_KEY) {
      const response: ApiResponse = {
        success: false,
        error: '인증 실패',
      };
      res.status(401).json(response);
      return;
    }

    const { email, name, provider, userId, unifiedToken, clinicId } = req.body;

    const user = await authService.syncAccount({
      email,
      name,
      provider,
      userId,
      unifiedToken,
      clinicId,
    });

    const response: ApiResponse = {
      success: true,
      data: { userId: user.id },
      message: '계정 동기화 완료',
    };
    res.status(200).json(response);
  } catch (error) {
    console.error('Error syncing account:', error);
    const response: ApiResponse = {
      success: false,
      error: '계정 동기화 실패',
    };
    res.status(500).json(response);
  }
});

export default router;
