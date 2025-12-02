import { Router, Request, Response } from 'express';
import { uploadLogo } from '../config/multer';
import { logoService } from '../services/logoService';
import { ApiResponse } from '../types';

const router = Router();

// POST /api/logo/upload - Upload logo
router.post('/upload', uploadLogo.single('logo'), async (req: Request, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      const response: ApiResponse = {
        success: false,
        error: 'No file uploaded',
      };
      res.status(400).json(response);
      return;
    }

    const logo = await logoService.createLogo(file);

    const response: ApiResponse = {
      success: true,
      data: logo,
      message: 'Logo uploaded successfully',
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Error uploading logo:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to upload logo',
    };
    res.status(500).json(response);
  }
});

// GET /api/logo - Get active logo
router.get('/', async (_req: Request, res: Response) => {
  try {
    const logo = await logoService.getActiveLogo();

    const response: ApiResponse = {
      success: true,
      data: logo,
    };
    res.json(response);
  } catch (error) {
    console.error('Error getting logo:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get logo',
    };
    res.status(500).json(response);
  }
});

// GET /api/logo/all - Get all logos
router.get('/all', async (_req: Request, res: Response) => {
  try {
    const logos = await logoService.getAllLogos();

    const response: ApiResponse = {
      success: true,
      data: logos,
    };
    res.json(response);
  } catch (error) {
    console.error('Error getting logos:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get logos',
    };
    res.status(500).json(response);
  }
});

// PUT /api/logo/:id/activate - Set active logo
router.put('/:id/activate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const logo = await logoService.setActiveLogo(id);

    if (!logo) {
      const response: ApiResponse = {
        success: false,
        error: 'Logo not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: logo,
      message: 'Logo activated successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Error activating logo:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to activate logo',
    };
    res.status(500).json(response);
  }
});

// DELETE /api/logo/:id - Delete logo
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await logoService.deleteLogo(id);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Logo not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: 'Logo deleted successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Error deleting logo:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete logo',
    };
    res.status(500).json(response);
  }
});

export default router;
