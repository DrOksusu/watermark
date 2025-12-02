import { Router, Request, Response } from 'express';
import { settingsService } from '../services/settingsService';
import { ApiResponse } from '../types';

const router = Router();

// GET /api/settings - Get default settings
router.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = await settingsService.getDefaultSettings();

    const response: ApiResponse = {
      success: true,
      data: settings,
    };
    res.json(response);
  } catch (error) {
    console.error('Error getting settings:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get settings',
    };
    res.status(500).json(response);
  }
});

// GET /api/settings/all - Get all settings
router.get('/all', async (_req: Request, res: Response) => {
  try {
    const settings = await settingsService.getAllSettings();

    const response: ApiResponse = {
      success: true,
      data: settings,
    };
    res.json(response);
  } catch (error) {
    console.error('Error getting settings:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get settings',
    };
    res.status(500).json(response);
  }
});

// GET /api/settings/:id - Get settings by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const settings = await settingsService.getSettingsById(id);

    if (!settings) {
      const response: ApiResponse = {
        success: false,
        error: 'Settings not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: settings,
    };
    res.json(response);
  } catch (error) {
    console.error('Error getting settings:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get settings',
    };
    res.status(500).json(response);
  }
});

// POST /api/settings - Create new settings
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = req.body;
    const settings = await settingsService.createSettings(input);

    const response: ApiResponse = {
      success: true,
      data: settings,
      message: 'Settings created successfully',
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating settings:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create settings',
    };
    res.status(500).json(response);
  }
});

// PUT /api/settings/:id - Update settings
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input = req.body;
    const settings = await settingsService.updateSettings(id, input);

    if (!settings) {
      const response: ApiResponse = {
        success: false,
        error: 'Settings not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: settings,
      message: 'Settings updated successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Error updating settings:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update settings',
    };
    res.status(500).json(response);
  }
});

// DELETE /api/settings/:id - Delete settings
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await settingsService.deleteSettings(id);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Settings not found or cannot delete default settings',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: 'Settings deleted successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Error deleting settings:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete settings',
    };
    res.status(500).json(response);
  }
});

export default router;
