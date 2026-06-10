import type { PrismaClient, User } from '@prisma/client'
import type { PortalTokenPayload } from './portal-token'

// externalId(포털 userId)로 로컬 User 조회. 없으면 개인 클리닉 생성 후 User 생성(JIT).
export async function resolveLocalUser(
  prisma: PrismaClient,
  payload: PortalTokenPayload,
): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { externalId: payload.userId } })
  if (existing) return existing

  const clinic = await prisma.clinic.create({ data: { name: payload.name } })
  return prisma.user.create({
    data: {
      externalId: payload.userId,
      email: payload.email ?? '',
      name: payload.name,
      clinicId: clinic.id,
    },
  })
}
