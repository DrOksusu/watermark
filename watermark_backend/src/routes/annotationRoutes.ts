import { Router, Request, Response } from 'express';
import { annotationService } from '../services/annotationService';
import { ApiResponse } from '../types';

const router = Router();

// GET /api/annotations - Get all annotation templates
router.get('/', async (_req: Request, res: Response) => {
  try {
    const templates = await annotationService.getAllTemplates();

    const response: ApiResponse = {
      success: true,
      data: templates,
    };
    res.json(response);
  } catch (error) {
    console.error('Error getting annotation templates:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get annotation templates',
    };
    res.status(500).json(response);
  }
});

// GET /api/annotations/:id - Get annotation template by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = await annotationService.getTemplateById(id);

    if (!template) {
      const response: ApiResponse = {
        success: false,
        error: 'Annotation template not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: template,
    };
    res.json(response);
  } catch (error) {
    console.error('Error getting annotation template:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get annotation template',
    };
    res.status(500).json(response);
  }
});

// POST /api/annotations - Create annotation template
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = req.body;

    if (!input.name || !input.type) {
      const response: ApiResponse = {
        success: false,
        error: 'Name and type are required',
      };
      res.status(400).json(response);
      return;
    }

    const template = await annotationService.createTemplate(input);

    const response: ApiResponse = {
      success: true,
      data: template,
      message: 'Annotation template created successfully',
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating annotation template:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create annotation template',
    };
    res.status(500).json(response);
  }
});

// PUT /api/annotations/:id - Update annotation template
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input = req.body;
    const template = await annotationService.updateTemplate(id, input);

    if (!template) {
      const response: ApiResponse = {
        success: false,
        error: 'Annotation template not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: template,
      message: 'Annotation template updated successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Error updating annotation template:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update annotation template',
    };
    res.status(500).json(response);
  }
});

// DELETE /api/annotations/:id - Delete annotation template
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await annotationService.deleteTemplate(id);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Annotation template not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: 'Annotation template deleted successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Error deleting annotation template:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete annotation template',
    };
    res.status(500).json(response);
  }
});

export default router;
