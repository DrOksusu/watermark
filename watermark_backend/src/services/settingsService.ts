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
  dateScale: number;
  dateOpacity: number;
}

export interface SettingsInput {
  name?: string;
  // 직접 필드로 받기 (프론트엔드와 일치)
  logoPositionX?: number;
  logoPositionY?: number;
  logoAnchor?: string;
  logoScale?: number;
  logoOpacity?: number;
  datePositionX?: number;
  datePositionY?: number;
  dateFormat?: string;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  dateScale?: number;
  dateOpacity?: number;
}

export const settingsService = {
  async getDefaultSettings(ownerId: number): Promise<SettingsData> {
    let settings = await prisma.settings.findFirst({
      where: { name: 'default', ownerId },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: { name: 'default', ownerId },
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

  async getAllSettings(ownerId: number): Promise<SettingsData[]> {
    const settings = await prisma.settings.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return settings;
  },

  async createSettings(input: SettingsInput, ownerId: number): Promise<SettingsData> {
    const settings = await prisma.settings.create({
      data: {
        name: input.name || 'custom',
        ownerId,
        logoPositionX: input.logoPositionX ?? 0.02,
        logoPositionY: input.logoPositionY ?? 0.02,
        logoAnchor: input.logoAnchor || 'top-left',
        logoScale: input.logoScale ?? 0.3,
        logoOpacity: input.logoOpacity ?? 1,
        datePositionX: input.datePositionX ?? 0.02,
        datePositionY: input.datePositionY ?? 0.06,
        dateFormat: input.dateFormat || 'YY.MM',
        fontFamily: input.fontFamily || 'Pretendard',
        fontSize: input.fontSize || 24,
        fontColor: input.fontColor || '#FFFFFF',
        dateScale: input.dateScale ?? 0.15,
        dateOpacity: input.dateOpacity ?? 1,
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
        logoPositionX: input.logoPositionX ?? existing.logoPositionX,
        logoPositionY: input.logoPositionY ?? existing.logoPositionY,
        logoAnchor: input.logoAnchor ?? existing.logoAnchor,
        logoScale: input.logoScale ?? existing.logoScale,
        logoOpacity: input.logoOpacity ?? existing.logoOpacity,
        datePositionX: input.datePositionX ?? existing.datePositionX,
        datePositionY: input.datePositionY ?? existing.datePositionY,
        dateFormat: input.dateFormat ?? existing.dateFormat,
        fontFamily: input.fontFamily ?? existing.fontFamily,
        fontSize: input.fontSize ?? existing.fontSize,
        fontColor: input.fontColor ?? existing.fontColor,
        dateScale: input.dateScale ?? existing.dateScale,
        dateOpacity: input.dateOpacity ?? existing.dateOpacity,
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
