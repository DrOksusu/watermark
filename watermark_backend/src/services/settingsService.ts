import prisma from '../config/database';

export interface SettingsData {
  id: string;
  name: string;
  logoPositionX: number;
  logoPositionY: number;
  logoAnchor: string;
  logoScale: number;
  logoOpacity: number;
  datePositionX: number;
  datePositionY: number;
  dateFormat: string;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
}

export interface SettingsInput {
  name?: string;
  logoPosition?: { x: number; y: number };
  logoAnchor?: string;
  logoScale?: number;
  logoOpacity?: number;
  datePosition?: { x: number; y: number };
  dateFormat?: string;
  font?: {
    family?: string;
    size?: number;
    color?: string;
  };
}

export const settingsService = {
  async getDefaultSettings(): Promise<SettingsData> {
    let settings = await prisma.settings.findFirst({
      where: { name: 'default' },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: { name: 'default' },
      });
    }

    return settings;
  },

  async getSettingsById(id: string): Promise<SettingsData | null> {
    const settings = await prisma.settings.findUnique({
      where: { id },
    });
    return settings;
  },

  async getAllSettings(): Promise<SettingsData[]> {
    const settings = await prisma.settings.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return settings;
  },

  async createSettings(input: SettingsInput): Promise<SettingsData> {
    const settings = await prisma.settings.create({
      data: {
        name: input.name || 'custom',
        logoPositionX: input.logoPosition?.x ?? 20,
        logoPositionY: input.logoPosition?.y ?? 20,
        logoAnchor: input.logoAnchor || 'top-left',
        logoScale: input.logoScale ?? 1,
        logoOpacity: input.logoOpacity ?? 1,
        datePositionX: input.datePosition?.x ?? 20,
        datePositionY: input.datePosition?.y ?? 60,
        dateFormat: input.dateFormat || 'YY.MM',
        fontFamily: input.font?.family || 'Pretendard',
        fontSize: input.font?.size || 24,
        fontColor: input.font?.color || '#FFFFFF',
      },
    });

    return settings;
  },

  async updateSettings(id: string, input: SettingsInput): Promise<SettingsData | null> {
    const existing = await prisma.settings.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    const settings = await prisma.settings.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
        logoPositionX: input.logoPosition?.x ?? existing.logoPositionX,
        logoPositionY: input.logoPosition?.y ?? existing.logoPositionY,
        logoAnchor: input.logoAnchor ?? existing.logoAnchor,
        logoScale: input.logoScale ?? existing.logoScale,
        logoOpacity: input.logoOpacity ?? existing.logoOpacity,
        datePositionX: input.datePosition?.x ?? existing.datePositionX,
        datePositionY: input.datePosition?.y ?? existing.datePositionY,
        dateFormat: input.dateFormat ?? existing.dateFormat,
        fontFamily: input.font?.family ?? existing.fontFamily,
        fontSize: input.font?.size ?? existing.fontSize,
        fontColor: input.font?.color ?? existing.fontColor,
      },
    });

    return settings;
  },

  async deleteSettings(id: string): Promise<boolean> {
    const settings = await prisma.settings.findUnique({
      where: { id },
    });

    if (!settings || settings.name === 'default') {
      return false;
    }

    await prisma.settings.delete({
      where: { id },
    });

    return true;
  },
};
