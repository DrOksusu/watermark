import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// watermark_frontend 단위 테스트 설정 (Node 환경, *.test.ts만 포함).
// tsconfig의 "@/*" -> "./src/*" 경로 별칭을 vitest에서도 해석하도록 매핑
// (middleware 등 '@/' import를 테스트하기 위해 필요).
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
