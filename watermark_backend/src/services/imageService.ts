import prisma from '../config/database';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { UPLOAD_PATHS, USE_S3 } from '../config/multer';
import { uploadBufferToS3, deleteFromS3, getS3KeyFromUrl } from '../config/s3';

export interface ImageData {
  id: string;
  originalName: string;
  filename: string;
  url: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
  createdAt: Date; // 포인트 발행 occurredAt 용 (Prisma가 반환)
}

export const imageService = {
  async createImage(file: Express.Multer.File, ownerId: number): Promise<ImageData> {
    let metadata;
    let url: string;
    let filename: string;

    if (USE_S3) {
      // S3 업로드 (메모리 스토리지 사용)
      const buffer = file.buffer;
      metadata = await sharp(buffer).metadata();

      const s3Result = await uploadBufferToS3(
        buffer,
        file.originalname,
        'images',
        file.mimetype
      );

      url = s3Result.url;
      filename = s3Result.filename;
    } else {
      // 로컬 저장소 사용 (디스크 스토리지)
      metadata = await sharp(file.path).metadata();
      filename = file.filename;
      url = `/uploads/images/${filename}`;
    }

    const image = await prisma.image.create({
      data: {
        originalName: file.originalname,
        filename,
        url,
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: file.size,
        mimeType: file.mimetype,
        ownerId,
      },
    });

    return image;
  },

  async createImages(files: Express.Multer.File[], ownerId: number): Promise<ImageData[]> {
    const images: ImageData[] = [];

    for (const file of files) {
      const image = await this.createImage(file, ownerId);
      images.push(image);
    }

    return images;
  },

  async getAllImages(ownerId: number): Promise<ImageData[]> {
    const images = await prisma.image.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return images;
  },

  async getImageById(id: string, ownerId: number): Promise<ImageData | null> {
    const image = await prisma.image.findFirst({
      where: { id, ownerId },
    });
    return image;
  },

  async deleteImage(id: string, ownerId: number): Promise<boolean> {
    const image = await prisma.image.findFirst({
      where: { id, ownerId },
    });

    if (!image) {
      return false;
    }

    if (USE_S3) {
      // S3에서 삭제
      const s3Key = getS3KeyFromUrl(image.url);
      if (s3Key) {
        await deleteFromS3(s3Key);
      }
    } else {
      // 로컬 파일 삭제
      const filePath = path.join(UPLOAD_PATHS.images, image.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from database
    await prisma.image.delete({
      where: { id },
    });

    return true;
  },

  async deleteAllImages(ownerId: number): Promise<number> {
    const images = await prisma.image.findMany({ where: { ownerId } });

    // Delete all files
    for (const image of images) {
      if (USE_S3) {
        const s3Key = getS3KeyFromUrl(image.url);
        if (s3Key) {
          await deleteFromS3(s3Key);
        }
      } else {
        const filePath = path.join(UPLOAD_PATHS.images, image.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    // DB에서 해당 사용자의 이미지만 삭제
    const result = await prisma.image.deleteMany({ where: { ownerId } });
    return result.count;
  },
};
