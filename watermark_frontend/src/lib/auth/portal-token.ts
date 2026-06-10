import { importSPKI, jwtVerify } from 'jose'

export interface PortalTokenPayload {
  userId: string
  email: string | null
  name: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER'
  services: string[]
}

// Edge 런타임에서 RS256 offline 검증. 실패 시 null.
export async function verifyPortalTokenEdge(
  token: string,
  publicKeyPem: string,
): Promise<PortalTokenPayload | null> {
  try {
    const key = await importSPKI(publicKeyPem.replace(/\\n/g, '\n'), 'RS256')
    const { payload } = await jwtVerify(token, key, { issuer: 'koco-portal-auth' })
    return payload as unknown as PortalTokenPayload
  } catch {
    return null
  }
}
