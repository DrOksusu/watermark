import { Router } from 'express';
import imageRoutes from './imageRoutes';
import logoRoutes from './logoRoutes';
import settingsRoutes from './settingsRoutes';
import watermarkRoutes from './watermarkRoutes';
import annotationRoutes from './annotationRoutes';

const router = Router();

router.use('/images', imageRoutes);
router.use('/logo', logoRoutes);
router.use('/settings', settingsRoutes);
router.use('/watermark', watermarkRoutes);
router.use('/annotations', annotationRoutes);

export default router;
