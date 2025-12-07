import prisma from '../config/database';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { UPLOAD_PATHS } from '../config/multer';

export interface LogoData {
  id: string;
  name: string;
  filename: string;
  url: string;
  width: number;
  height: number;
  isActive: boolean;
}

export const logoService = {
  async createLogo(file: Express.Multer.File, customName?: string): Promise<LogoData> {
    const metadata = await sharp(file.path).metadata();

    // Deactivate all existing logos
    await prisma.logo.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // 사용자 지정 이름이 있으면 사용, 없으면 파일명 사용
    const logoName = customName?.trim() || file.originalname;

    const logo = await prisma.logo.create({
      data: {
        name: logoName,
        filename: file.filename,
        url: `/uploads/logos/${file.filename}`,
        width: metadata.width || 0,
        height: metadata.height || 0,
        isActive: true,
      },
    });

    return logo;
  },

  async getActiveLogo(): Promise<LogoData | null> {
    const logo = await prisma.logo.findFirst({
      where: { isActive: true },
    });
    return logo;
  },

  async getAllLogos(): Promise<LogoData[]> {
    const logos = await prisma.logo.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return logos;
  },

  async getLogoById(id: string): Promise<LogoData | null> {
    const logo = await prisma.logo.findUnique({
      where: { id },
    });
    return logo;
  },

  async setActiveLogo(id: string): Promise<LogoData | null> {
    // Deactivate all logos
    await prisma.logo.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Activate selected logo
    const logo = await prisma.logo.update({
      where: { id },
      data: { isActive: true },
    });

    return logo;
  },

  async deleteLogo(id: string): Promise<boolean> {
    const logo = await prisma.logo.findUnique({
      where: { id },
    });

    if (!logo) {
      return false;
    }

    // Delete file from disk
    const filePath = path.join(UPLOAD_PATHS.logos, logo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await prisma.logo.delete({
      where: { id },
    });

    return true;
  },
};
