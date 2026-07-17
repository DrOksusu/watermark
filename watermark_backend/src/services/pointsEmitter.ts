// 포털 중앙 리더보드로 포인트 이벤트를 발행한다(fire-and-forget).
// 이미지 처리(ProcessedImage)가 이미 저장된 뒤 호출되며, 발행 실패가 본 기능을 깨지 않도록
// 예외를 모두 삼키고 로깅만 한다. 재발행은 포털이 (serviceCode, sourceRef)로 멱등 처리한다.

const PORTAL_URL = process.env.PORTAL_INTERNAL_API_URL || 'https://api.koco.me';

interface EmitInput {
  externalId: string; // 포털 User.id (= watermark User.externalId)
  action: string; // 룰북 키: image | processed | logo (가중치: 1 / 2 / 5)
  sourceRef: string; // ProcessedImage.id 등 멱등 키
  occurredAt: Date;
}

export async function emitPointEvent({ externalId, action, sourceRef, occurredAt }: EmitInput): Promise<void> {
  const secret = process.env.INTERNAL_API_SECRET;
  // 시크릿 미설정(로컬/미구성)이거나 신원 없음이면 조용히 skip
  if (!secret || !externalId) return;
  try {
    const res = await fetch(`${PORTAL_URL}/auth/internal/points`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({
        userId: externalId,
        serviceCode: 'watermark',
        action,
        sourceRef,
        occurredAt: occurredAt.toISOString(),
      }),
    });
    if (!res.ok) console.error(`[points-emit] watermark ${action} 발행 실패: ${res.status}`);
  } catch (e) {
    console.error(`[points-emit] watermark ${action} 발행 예외: ${(e as Error).message}`);
  }
}
