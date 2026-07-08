import { safeReturnUrl, portalLoginUrl } from '@/lib/auth/portal-urls'
import { RefreshRunner } from './RefreshRunner'

// 브리지는 매번 새로 렌더(정적 캐시 금지) — 갱신 시도 페이지라 캐싱하면 안 된다.
export const dynamic = 'force-dynamic'

const REFRESH_API = 'https://api.koco.me/auth/refresh'
const PORTAL_BASE = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://koco.me'
const DEFAULT_RETURN = 'https://watermark.koco.me/'

// silent-refresh 브리지 페이지.
// 미들웨어가 만료/미인증 페이지 진입을 여기로 보내면, 브라우저가 직접
// api.koco.me/auth/refresh를 credentials와 함께 호출해 새 access_token을 받고
// 원래 페이지로 복귀한다. 실패 시에만 포털 로그인으로 폴백한다.
export default async function RefreshPage({
  searchParams,
}: {
  searchParams: Promise<{ returnUrl?: string }>
}) {
  const sp = await searchParams
  // 오픈 리다이렉트 차단: koco.me 서브도메인으로만 복귀 허용
  const returnUrl = (sp.returnUrl && safeReturnUrl(sp.returnUrl)) || DEFAULT_RETURN
  const loginUrl = portalLoginUrl(PORTAL_BASE, returnUrl)

  return <RefreshRunner returnUrl={returnUrl} loginUrl={loginUrl} refreshApi={REFRESH_API} />
}
