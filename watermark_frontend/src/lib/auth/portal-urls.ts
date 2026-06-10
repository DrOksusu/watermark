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
