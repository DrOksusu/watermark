import prisma from '../config/database';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { UPLOAD_PATHS, USE_S3 } from '../config/multer';
import { uploadBufferToS3, deleteFromS3, getS3KeyFromUrl } from '../config/s3';

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
  async createLogo(file: Express.Multer.File, ownerId: number, customName?: string): Promise<LogoData> {
    console.log('=== createLogo called ===');
    console.log('USE_S3:', USE_S3);
    console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);
    console.log('File info:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      hasBuffer: !!file.buffer,
      hasPath: !!file.path,
    });

    let metadata;
    let url: string;
    let filename: string;

    if (USE_S3) {
      // S3 업로드 (메모리 스토리지 사용)
      console.log('Using S3 storage...');
      const buffer = file.buffer;

      if (!buffer) {
        console.error('ERROR: No buffer in file! This means multer is using disk storage, not memory storage.');
        throw new Error('File buffer is missing - multer configuration error');
      }
      metadata = await sharp(buffer).metadata();

      console.log('Uploading to S3...');
      const s3Result = await uploadBufferToS3(
        buffer,
        file.originalname,
        'logos',
        file.mimetype
      );

      console.log('S3 upload result:', s3Result);
      url = s3Result.url;
      filename = s3Result.filename;
    } else {
      // 로컬 저장소 사용 (디스크 스토리지)
      metadata = await sharp(file.path).metadata();
      filename = file.filename;
      url = `/uploads/logos/${filename}`;
    }

    // 해당 사용자의 기존 활성 로고 비활성화
    await prisma.logo.updateMany({
      where: { isActive: true, ownerId },
      data: { isActive: false },
    });

    // 사용자 지정 이름이 있으면 사용, 없으면 파일명 사용
    const logoName = customName?.trim() || file.originalname;

    const logo = await prisma.logo.create({
      data: {
        name: logoName,
        filename,
        url,
        width: metadata.width || 0,
        height: metadata.height || 0,
        isActive: true,
        ownerId,
      },
    });

    return logo;
  },

  async getActiveLogo(ownerId: number): Promise<LogoData | null> {
    const logo = await prisma.logo.findFirst({
      where: { isActive: true, ownerId },
    });
    return logo;
  },

  async getAllLogos(ownerId: number): Promise<LogoData[]> {
    const logos = await prisma.logo.findMany({
      where: { ownerId },
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

  async setActiveLogo(id: string, ownerId: number): Promise<LogoData | null> {
    // 해당 사용자의 활성 로고 비활성화
    await prisma.logo.updateMany({
      where: { isActive: true, ownerId },
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

    if (USE_S3) {
      // S3에서 삭제
      const s3Key = getS3KeyFromUrl(logo.url);
      if (s3Key) {
        await deleteFromS3(s3Key);
      }
    } else {
      // 로컬 파일 삭제
      const filePath = path.join(UPLOAD_PATHS.logos, logo.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from database
    await prisma.logo.delete({
      where: { id },
    });

    return true;
  },
};
