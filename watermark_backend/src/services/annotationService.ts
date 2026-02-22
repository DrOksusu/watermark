import prisma from '../config/database';

export interface AnnotationTemplateData {
  id: string;
  name: string;
  type: string;
  color: string;
  thickness: number;
  lineStyle: string;
  borderRadius: number;
}

export interface AnnotationTemplateInput {
  name: string;
  type: 'box' | 'dashed-box' | 'arrow' | 'text';
  style?: {
    color?: string;
    thickness?: number;
    lineStyle?: 'solid' | 'dashed';
    borderRadius?: number;
  };
}

export const annotationService = {
  async createTemplate(input: AnnotationTemplateInput, ownerId: number): Promise<AnnotationTemplateData> {
    const template = await prisma.annotationTemplate.create({
      data: {
        name: input.name,
        type: input.type,
        color: input.style?.color || '#FF0000',
        thickness: input.style?.thickness || 2,
        lineStyle: input.style?.lineStyle || 'solid',
        borderRadius: input.style?.borderRadius || 0,
        ownerId,
      },
    });

    return template;
  },

  async getAllTemplates(ownerId: number): Promise<AnnotationTemplateData[]> {
    const templates = await prisma.annotationTemplate.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return templates;
  },

  async getTemplateById(id: string, ownerId: number): Promise<AnnotationTemplateData | null> {
    const template = await prisma.annotationTemplate.findFirst({
      where: { id, ownerId },
    });
    return template;
  },

  async updateTemplate(
    id: string,
    input: Partial<AnnotationTemplateInput>,
    ownerId: number
  ): Promise<AnnotationTemplateData | null> {
    const existing = await prisma.annotationTemplate.findFirst({
      where: { id, ownerId },
    });

    if (!existing) {
      return null;
    }

    const template = await prisma.annotationTemplate.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
        type: input.type ?? existing.type,
        color: input.style?.color ?? existing.color,
        thickness: input.style?.thickness ?? existing.thickness,
        lineStyle: input.style?.lineStyle ?? existing.lineStyle,
        borderRadius: input.style?.borderRadius ?? existing.borderRadius,
      },
    });

    return template;
  },

  async deleteTemplate(id: string, ownerId: number): Promise<boolean> {
    const template = await prisma.annotationTemplate.findFirst({
      where: { id, ownerId },
    });

    if (!template) {
      return false;
    }

    await prisma.annotationTemplate.delete({
      where: { id },
    });

    return true;
  },
};
