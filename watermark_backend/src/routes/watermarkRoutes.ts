import { Router, Request, Response } from 'express';
import { watermarkService } from '../services/watermarkService';
import { ApiResponse, WatermarkSettings, OutputSettings } from '../types';

const router = Router();

// POST /api/watermark/preview - Generate preview for single image
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { imageId, ...settings } = req.body as { imageId: string } & WatermarkSettings;

    const outputSettings: OutputSettings = {
      folder: 'processed',
      filenamePrefix: 'preview_',
      format: 'png',
      quality: 90,
    };

    const result = await watermarkService.processImage(imageId, settings, outputSettings);

    if (!result) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to generate preview. Image not found.',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        previewUrl: result.url,
      },
    };
    res.json(response);
  } catch (error) {
    console.error('Error generating preview:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate preview',
    };
    res.status(500).json(response);
  }
});

// POST /api/watermark/batch - Batch process multiple images
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const {
      imageIds,
      outputSettings,
      ...settings
    } = req.body as {
      imageIds: string[];
      outputSettings: OutputSettings;
    } & WatermarkSettings;

    if (!imageIds || imageIds.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'No images specified',
      };
      res.status(400).json(response);
      return;
    }

    const result = await watermarkService.batchProcess(imageIds, settings, outputSettings);

    const response: ApiResponse = {
      success: true,
      data: {
        processedCount: result.processedCount,
        files: result.files,
      },
      message: `${result.processedCount} images processed successfully`,
    };
    res.json(response);
  } catch (error) {
    console.error('Error batch processing:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to process images',
    };
    res.status(500).json(response);
  }
});

export default router;
