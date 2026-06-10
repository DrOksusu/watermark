// PORTAL_PUBLIC_KEY는 GitHub Secrets/.env에서 한 줄 \n 이스케이프로 주입됨 → 실제 개행 복원.
export function loadPortalPublicKey(): string {
  const raw = process.env.PORTAL_PUBLIC_KEY
  if (!raw) {
    throw new Error('PORTAL_PUBLIC_KEY 환경변수가 설정되지 않았습니다')
  }
  return raw.replace(/\\n/g, '\n')
}
