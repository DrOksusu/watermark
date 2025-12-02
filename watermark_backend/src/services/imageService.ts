import prisma from '../config/database';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { UPLOAD_PATHS } from '../config/multer';

export interface ImageData {
  id: string;
  originalName: string;
  filename: string;
  url: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
}

export const imageService = {
  async createImage(file: Express.Multer.File): Promise<ImageData> {
    const metadata = await sharp(file.path).metadata();

    const image = await prisma.image.create({
      data: {
        originalName: file.originalname,
        filename: file.filename,
        url: `/uploads/images/${file.filename}`,
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: file.size,
        mimeType: file.mimetype,
      },
    });

    return image;
  },

  async createImages(files: Express.Multer.File[]): Promise<ImageData[]> {
    const images: ImageData[] = [];

    for (const file of files) {
      const image = await this.createImage(file);
      images.push(image);
    }

    return images;
  },

  async getAllImages(): Promise<ImageData[]> {
    const images = await prisma.image.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return images;
  },

  async getImageById(id: string): Promise<ImageData | null> {
    const image = await prisma.image.findUnique({
      where: { id },
    });
    return image;
  },

  async deleteImage(id: string): Promise<boolean> {
    const image = await prisma.image.findUnique({
      where: { id },
    });

    if (!image) {
      return false;
    }

    // Delete file from disk
    const filePath = path.join(UPLOAD_PATHS.images, image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await prisma.image.delete({
      where: { id },
    });

    return true;
  },

  async deleteAllImages(): Promise<number> {
    const images = await prisma.image.findMany();

    // Delete all files
    for (const image of images) {
      const filePath = path.join(UPLOAD_PATHS.images, image.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from database
    const result = await prisma.image.deleteMany();
    return result.count;
  },
};
