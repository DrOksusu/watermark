import prisma from '../config/database';

export const authService = {
  // 계정 동기화 (메인 프로젝트 → 워터마크 서비스)
  async syncAccount(data: {
    email: string;
    name: string;
    provider: string;
    userId: number;
    unifiedToken: string;
    clinicId: number;
  }) {
    const user = await prisma.user.upsert({
      where: { userId: data.userId },
      update: {
        email: data.email,
        name: data.name,
        provider: data.provider,
        unifiedToken: data.unifiedToken,
        clinicId: data.clinicId,
      },
      create: {
        userId: data.userId,
        email: data.email,
        name: data.name,
        provider: data.provider,
        unifiedToken: data.unifiedToken,
        clinicId: data.clinicId,
      },
    });

    return user;
  },
};
