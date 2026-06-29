import { Router } from 'express'
import prisma from '../config/database'
import { createPointsService } from '../services/pointsService'

const pointsService = createPointsService(prisma)

export const meRouter = Router()

// GET /api/me/points — 현재 로그인 사용자의 포인트 조회
meRouter.get('/points', async (req, res) => {
  try {
    const externalId = req.user!.externalId
    const points = await pointsService.getPoints(externalId)
    res.json(points)
  } catch (e) {
    res.status(500).json({ error: 'internal_error' })
  }
})
