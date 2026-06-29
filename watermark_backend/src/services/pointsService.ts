// 워터마크 서비스 운영자 포인트 — 이미지 업로드 +1, 워터마크 처리 +2, 로고 등록 +5
import { PrismaClient } from '@prisma/client'

const WEIGHTS = { image: 1, processed: 2, logo: 5 } as const

// 이번 달 1일 00:00 KST를 UTC Date로
function startOfMonthKST(now: Date = new Date()): Date {
  const kstNow = new Date(now.getTime() + 9 * 3600 * 1000)
  const y = kstNow.getUTCFullYear()
  const m = kstNow.getUTCMonth()
  return new Date(Date.UTC(y, m, 1) - 9 * 3600 * 1000)
}

interface Bucket { image: number; processed: number; logo: number; total: number }

function bucketWithTotal(image: number, processed: number, logo: number): Bucket {
  return {
    image,
    processed,
    logo,
    total: image * WEIGHTS.image + processed * WEIGHTS.processed + logo * WEIGHTS.logo
  }
}

export function createPointsService(prisma: PrismaClient) {
  return {
    async getPoints(externalId: string, now: Date = new Date()) {
      const user = await prisma.user.findUnique({ where: { externalId } })
      if (!user) {
        const empty = bucketWithTotal(0, 0, 0)
        return { thisMonth: empty, total: empty, byKind: { image: 0, processed: 0, logo: 0 } }
      }
      const monthStart = startOfMonthKST(now)
      const ownerId = user.id

      const [imgMonth, imgTotal, procMonth, procTotal, logoMonth, logoTotal] = await Promise.all([
        prisma.image.groupBy({ by: ['ownerId'], where: { ownerId, createdAt: { gte: monthStart } }, _count: { _all: true } }),
        prisma.image.groupBy({ by: ['ownerId'], where: { ownerId }, _count: { _all: true } }),
        prisma.processedImage.groupBy({ by: ['ownerId'], where: { ownerId, createdAt: { gte: monthStart } }, _count: { _all: true } }),
        prisma.processedImage.groupBy({ by: ['ownerId'], where: { ownerId }, _count: { _all: true } }),
        prisma.logo.groupBy({ by: ['ownerId'], where: { ownerId, createdAt: { gte: monthStart } }, _count: { _all: true } }),
        prisma.logo.groupBy({ by: ['ownerId'], where: { ownerId }, _count: { _all: true } })
      ])

      const m = bucketWithTotal(
        imgMonth[0]?._count._all ?? 0,
        procMonth[0]?._count._all ?? 0,
        logoMonth[0]?._count._all ?? 0
      )
      const t = bucketWithTotal(
        imgTotal[0]?._count._all ?? 0,
        procTotal[0]?._count._all ?? 0,
        logoTotal[0]?._count._all ?? 0
      )
      return {
        thisMonth: m,
        total: t,
        byKind: { image: t.image, processed: t.processed, logo: t.logo }
      }
    }
  }
}
