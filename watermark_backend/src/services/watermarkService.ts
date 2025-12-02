import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { UPLOAD_PATHS } from '../config/multer';
import { WatermarkSettings, Annotation, OutputSettings } from '../types';
import { imageService } from './imageService';
import { logoService } from './logoService';

export interface ProcessedImageResult {
  originalName: string;
  outputName: string;
  url: string;
}

export const watermarkService = {
  async processImage(
    imageId: string,
    settings: WatermarkSettings,
    outputSettings: OutputSettings
  ): Promise<ProcessedImageResult | null> {
    const image = await imageService.getImageById(imageId);
    if (!image) return null;

    const imagePath = path.join(UPLOAD_PATHS.images, image.filename);
    if (!fs.existsSync(imagePath)) return null;

    // Load base image
    let pipeline = sharp(imagePath);
    const metadata = await pipeline.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Prepare composite layers
    const composites: sharp.OverlayOptions[] = [];

    // Add logo if specified
    if (settings.logoId) {
      const logo = await logoService.getLogoById(settings.logoId);
      if (logo) {
        const logoPath = path.join(UPLOAD_PATHS.logos, logo.filename);
        if (fs.existsSync(logoPath)) {
          const logoBuffer = await sharp(logoPath)
            .resize({
              width: Math.round(logo.width * settings.logoScale),
              height: Math.round(logo.height * settings.logoScale),
            })
            .png()
            .toBuffer();

          composites.push({
            input: logoBuffer,
            left: Math.round(settings.logoPosition.x),
            top: Math.round(settings.logoPosition.y),
          });
        }
      }
    }

    // Add date text using SVG
    if (settings.dateText) {
      const fontSize = settings.fontSettings.size;
      const textSvg = Buffer.from(`
        <svg width="${width}" height="${height}">
          <text
            x="${settings.datePosition.x}"
            y="${settings.datePosition.y + fontSize}"
            font-family="${settings.fontSettings.family}"
            font-size="${fontSize}"
            fill="${settings.fontSettings.color}"
          >${settings.dateText}</text>
        </svg>
      `);

      composites.push({
        input: textSvg,
        left: 0,
        top: 0,
      });
    }

    // Add annotations
    for (const annotation of settings.annotations) {
      const annotationSvg = this.createAnnotationSvg(annotation, width, height);
      if (annotationSvg) {
        composites.push({
          input: Buffer.from(annotationSvg),
          left: 0,
          top: 0,
        });
      }
    }

    // Apply composites
    if (composites.length > 0) {
      pipeline = pipeline.composite(composites);
    }

    // Generate output filename
    const ext = outputSettings.format === 'png' ? 'png' : 'jpg';
    const outputFilename = `${outputSettings.filenamePrefix}${uuidv4()}.${ext}`;
    const outputPath = path.join(UPLOAD_PATHS.processed, outputFilename);

    // Save processed image
    if (outputSettings.format === 'png') {
      await pipeline.png({ quality: outputSettings.quality }).toFile(outputPath);
    } else {
      await pipeline.jpeg({ quality: outputSettings.quality }).toFile(outputPath);
    }

    // Save to database
    await prisma.processedImage.create({
      data: {
        originalId: imageId,
        filename: outputFilename,
        url: `/uploads/processed/${outputFilename}`,
        settings: JSON.parse(JSON.stringify(settings)),
      },
    });

    return {
      originalName: image.originalName,
      outputName: outputFilename,
      url: `/uploads/processed/${outputFilename}`,
    };
  },

  createAnnotationSvg(
    annotation: Annotation,
    canvasWidth: number,
    canvasHeight: number
  ): string | null {
    const { type, position, size, style, text, points } = annotation;
    const strokeDasharray = style.lineStyle === 'dashed' ? 'stroke-dasharray="10,5"' : '';

    let content = '';

    switch (type) {
      case 'box':
      case 'dashed-box':
        content = `
          <rect
            x="${position.x}"
            y="${position.y}"
            width="${size.width}"
            height="${size.height}"
            stroke="${style.color}"
            stroke-width="${style.thickness}"
            fill="none"
            rx="${style.borderRadius}"
            ${strokeDasharray}
          />
        `;
        break;

      case 'arrow':
        if (points && points.length >= 4) {
          const endX = position.x + points[2];
          const endY = position.y + points[3];
          const angle = Math.atan2(points[3], points[2]);
          const headLength = 15;

          content = `
            <line
              x1="${position.x}"
              y1="${position.y}"
              x2="${endX}"
              y2="${endY}"
              stroke="${style.color}"
              stroke-width="${style.thickness}"
            />
            <polygon
              points="${endX},${endY}
                      ${endX - headLength * Math.cos(angle - Math.PI / 6)},${endY - headLength * Math.sin(angle - Math.PI / 6)}
                      ${endX - headLength * Math.cos(angle + Math.PI / 6)},${endY - headLength * Math.sin(angle + Math.PI / 6)}"
              fill="${style.color}"
            />
          `;
        }
        break;

      case 'text':
        if (text) {
          content = `
            <text
              x="${position.x}"
              y="${position.y + 16}"
              font-family="sans-serif"
              font-size="16"
              fill="${style.color}"
            >${text}</text>
          `;
        }
        break;

      default:
        return null;
    }

    return `<svg width="${canvasWidth}" height="${canvasHeight}">${content}</svg>`;
  },

  async batchProcess(
    imageIds: string[],
    settings: WatermarkSettings,
    outputSettings: OutputSettings
  ): Promise<{
    processedCount: number;
    files: ProcessedImageResult[];
  }> {
    const files: ProcessedImageResult[] = [];

    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i];
      const customOutputSettings = {
        ...outputSettings,
        filenamePrefix: `${outputSettings.filenamePrefix}${i + 1}_`,
      };

      const result = await this.processImage(imageId, settings, customOutputSettings);
      if (result) {
        files.push(result);
      }
    }

    return {
      processedCount: files.length,
      files,
    };
  },
};
