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

    // 입력 검증
    const errors: string[] = [];
    if (typeof email !== 'string' || !email.includes('@')) errors.push('email: 유효한 이메일 필요');
    if (typeof name !== 'string' || name.trim().length === 0) errors.push('name: 비어있지 않은 문자열 필요');
    if (typeof provider !== 'string' || provider.trim().length === 0) errors.push('provider: 문자열 필요');
    if (typeof userId !== 'number' || !Number.isInteger(userId) || userId <= 0) errors.push('userId: 양의 정수 필요');
    if (typeof unifiedToken !== 'string' || unifiedToken.length < 10) errors.push('unifiedToken: 최소 10자 문자열 필요');
    if (typeof clinicId !== 'number' || !Number.isInteger(clinicId) || clinicId <= 0) errors.push('clinicId: 양의 정수 필요');

    if (errors.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: errors.join(', '),
      };
      res.status(400).json(response);
      return;
    }

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
