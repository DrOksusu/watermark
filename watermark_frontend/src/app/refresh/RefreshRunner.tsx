'use client'

import { useEffect } from 'react'

// 10초 루프가드 키. 갱신에 실패해 /refresh로 다시 튕겨오면(짧은 시간 내 재진입)
// 무한 루프 대신 포털 로그인으로 보낸다.
const LOOP_GUARD_KEY = 'watermark_refresh_ts'
const LOOP_WINDOW_MS = 10_000

interface Props {
  returnUrl: string
  loginUrl: string
  refreshApi: string
}

export function RefreshRunner({ returnUrl, loginUrl, refreshApi }: Props) {
  useEffect(() => {
    const now = Date.now()
    const prev = Number(sessionStorage.getItem(LOOP_GUARD_KEY) || '0')
    // 최근 10초 내 재진입 = 직전 갱신이 실패한 것 → 로그인으로
    if (prev && now - prev < LOOP_WINDOW_MS) {
      window.location.replace(loginUrl)
      return
    }
    sessionStorage.setItem(LOOP_GUARD_KEY, String(now))

    // refresh_token 쿠키(path=/auth, Domain=.koco.me)는 same-site라 자동 전송됨.
    // credentials:'include'로 새 access_token 쿠키를 발급받는다.
    fetch(refreshApi, { method: 'POST', credentials: 'include' })
      .then((r) => {
        window.location.replace(r.ok ? returnUrl : loginUrl)
      })
      .catch(() => {
        window.location.replace(loginUrl)
      })
  }, [returnUrl, loginUrl, refreshApi])

  return (
    <div style={{ display: 'flex', minHeight: '40vh', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6b7280', fontSize: 14 }}>세션 갱신 중…</p>
    </div>
  )
}
