import { Router, Request, Response } from 'express';
import { uploadImages } from '../config/multer';
import { imageService } from '../services/imageService';
import { ApiResponse } from '../types';

const router = Router();

// POST /api/images/upload - Upload multiple images
router.post('/upload', uploadImages.array('images', 50), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'No files uploaded',
      };
      res.status(400).json(response);
      return;
    }

    const images = await imageService.createImages(files);

    const response: ApiResponse = {
      success: true,
      data: images,
      message: `${images.length} images uploaded successfully`,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Error uploading images:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to upload images',
    };
    res.status(500).json(response);
  }
});

// GET /api/images - Get all images
router.get('/', async (_req: Request, res: Response) => {
  try {
    const images = await imageService.getAllImages();

    const response: ApiResponse = {
      success: true,
      data: images,
    };
    res.json(response);
  } catch (error) {
    console.error('Error getting images:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get images',
    };
    res.status(500).json(response);
  }
});

// GET /api/images/:id - Get image by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const image = await imageService.getImageById(id);

    if (!image) {
      const response: ApiResponse = {
        success: false,
        error: 'Image not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: image,
    };
    res.json(response);
  } catch (error) {
    console.error('Error getting image:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get image',
    };
    res.status(500).json(response);
  }
});

// DELETE /api/images/:id - Delete image
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await imageService.deleteImage(id);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Image not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: 'Image deleted successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Error deleting image:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete image',
    };
    res.status(500).json(response);
  }
});

// DELETE /api/images - Delete all images
router.delete('/', async (_req: Request, res: Response) => {
  try {
    const count = await imageService.deleteAllImages();

    const response: ApiResponse = {
      success: true,
      message: `${count} images deleted successfully`,
    };
    res.json(response);
  } catch (error) {
    console.error('Error deleting images:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete images',
    };
    res.status(500).json(response);
  }
});

export default router;
