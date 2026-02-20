import { Router } from 'express';
import imageRoutes from './imageRoutes';
import logoRoutes from './logoRoutes';
import { logoFileRoute } from './logoRoutes';
import settingsRoutes from './settingsRoutes';
import watermarkRoutes from './watermarkRoutes';
import annotationRoutes from './annotationRoutes';
import authRoutes from './authRoutes';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// 인증 불필요 라우트
router.use('/auth', authRoutes);
router.use('/logo', logoFileRoute);  // GET /api/logo/:id/file (캔버스 로드용 공개)

// 인증 필요 라우트 (authMiddleware 적용)
router.use('/images', authMiddleware, imageRoutes);
router.use('/logo', authMiddleware, logoRoutes);
router.use('/settings', authMiddleware, settingsRoutes);
router.use('/watermark', authMiddleware, watermarkRoutes);
router.use('/annotations', authMiddleware, annotationRoutes);

export default router;
