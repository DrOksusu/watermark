// returnUrl 오픈 리다이렉트 차단: koco.me 서브도메인만 허용.
export function safeReturnUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname
    if (host === 'koco.me' || host.endsWith('.koco.me')) return url
    return null
  } catch {
    return null
  }
}

export function portalLoginUrl(portalBase: string, returnUrl: string): string {
  return `${portalBase}/login?returnUrl=${encodeURIComponent(returnUrl)}`
}

// silent-refresh 브리지 URL. 만료 시 포털 로그인 대신 이 페이지로 보내
// 브라우저가 api.koco.me/auth/refresh를 직접 호출해 무재로그인 갱신을 시도한다.
// origin(watermark.koco.me) 기준 절대 URL로 만든다(Edge redirect는 절대 URL 필요).
export function refreshBridgeUrl(origin: string, returnUrl: string): string {
  return `${origin}/refresh?returnUrl=${encodeURIComponent(returnUrl)}`
}
