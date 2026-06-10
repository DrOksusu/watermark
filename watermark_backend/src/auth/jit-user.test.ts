import { describe, it, expect, vi } from 'vitest'
import { resolveLocalUser } from './jit-user'
import type { PortalTokenPayload } from './portal-token'

const payload: PortalTokenPayload = {
  userId: 'portal-123', email: 'a@b.com', name: '홍길동', role: 'USER', services: ['watermark'],
}

it('기존 User 있으면 그대로 반환(생성 안 함)', async () => {
  const prisma = {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 7, externalId: 'portal-123', clinicId: 3 }) },
    clinic: { create: vi.fn() },
  } as any
  const user = await resolveLocalUser(prisma, payload)
  expect(user.id).toBe(7)
  expect(prisma.clinic.create).not.toHaveBeenCalled()
})

it('없으면 개인 클리닉 생성 후 User 생성', async () => {
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 9, externalId: 'portal-123', clinicId: 5 }),
    },
    clinic: { create: vi.fn().mockResolvedValue({ id: 5, name: '홍길동' }) },
  } as any
  const user = await resolveLocalUser(prisma, payload)
  expect(prisma.clinic.create).toHaveBeenCalledWith({ data: { name: '홍길동' } })
  expect(prisma.user.create).toHaveBeenCalledWith({
    data: { externalId: 'portal-123', email: 'a@b.com', name: '홍길동', clinicId: 5 },
  })
  expect(user.id).toBe(9)
})
