export default function Forbidden() {
  return (
    <main style={{ padding: 48, textAlign: 'center' }}>
      <h1>접근 권한이 필요합니다</h1>
      <p>이 서비스(워터마크) 사용 권한이 없습니다. 포털 관리자에게 문의하세요.</p>
      <a href="https://koco.me/launcher">포털로 돌아가기</a>
    </main>
  )
}
