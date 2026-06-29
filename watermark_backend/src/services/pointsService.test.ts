import { describe, it, expect, beforeEach, vi } from 'vitest'

// Prisma mock — 단위 테스트라 실 DB 사용 안 함
const prismaMock = {
  user: { findUnique: vi.fn() },
  image: { groupBy: vi.fn() },
  logo: { groupBy: vi.fn() },
  processedImage: { groupBy: vi.fn() }
}

vi.mock('../config/database', () => ({ default: prismaMock }))

const { createPointsService } = await import('./pointsService')

beforeEach(() => {
  prismaMock.user.findUnique.mockReset()
  prismaMock.image.groupBy.mockReset()
  prismaMock.logo.groupBy.mockReset()
  prismaMock.processedImage.groupBy.mockReset()
})

describe('pointsService', () => {
  it('Portal 사용자(externalId) 미존재 시 zero-fill', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    const svc = createPointsService(prismaMock as any)
    const r = await svc.getPoints('u_unknown')
    expect(r.thisMonth.total).toBe(0)
    expect(r.total.total).toBe(0)
    expect(r.byKind).toEqual({ image: 0, processed: 0, logo: 0 })
  })

  it('가중치 적용 — image=1, processed=2, logo=5', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 7, externalId: 'u1' })
    // 이번 달 + 전체 각 카운트 stub
    prismaMock.image.groupBy
      .mockResolvedValueOnce([{ _count: { _all: 3 } }]) // thisMonth
      .mockResolvedValueOnce([{ _count: { _all: 10 } }]) // total
    prismaMock.processedImage.groupBy
      .mockResolvedValueOnce([{ _count: { _all: 2 } }])
      .mockResolvedValueOnce([{ _count: { _all: 5 } }])
    prismaMock.logo.groupBy
      .mockResolvedValueOnce([{ _count: { _all: 1 } }])
      .mockResolvedValueOnce([{ _count: { _all: 2 } }])

    const svc = createPointsService(prismaMock as any)
    const r = await svc.getPoints('u1')
    expect(r.thisMonth.image).toBe(3)
    expect(r.thisMonth.processed).toBe(2)
    expect(r.thisMonth.logo).toBe(1)
    expect(r.thisMonth.total).toBe(3 * 1 + 2 * 2 + 1 * 5) // 12

    expect(r.total.total).toBe(10 * 1 + 5 * 2 + 2 * 5) // 30
    expect(r.byKind).toEqual({ image: 10, processed: 5, logo: 2 })
  })

  it('groupBy 인자에 ownerId + 이번 달 윈도우가 들어감', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 7, externalId: 'u1' })
    prismaMock.image.groupBy.mockResolvedValue([])
    prismaMock.processedImage.groupBy.mockResolvedValue([])
    prismaMock.logo.groupBy.mockResolvedValue([])
    const svc = createPointsService(prismaMock as any)
    await svc.getPoints('u1')
    const thisMonthCall = prismaMock.image.groupBy.mock.calls[0][0]
    expect(thisMonthCall.where.ownerId).toBe(7)
    expect(thisMonthCall.where.createdAt.gte).toBeInstanceOf(Date)
  })
})
