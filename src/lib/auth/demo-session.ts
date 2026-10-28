import type { NextRequest } from 'next/server'

export type DemoAccountKey = 'guest' | 'agency' | 'provider' | 'ubnd' | 'hdt'
export type DemoRole = 'Guest' | 'TourAgency' | 'LocalProvider' | 'UBND' | 'HDT'

export interface ActorSession {
  authenticated: boolean
  role: DemoRole
  userId: string | null
  agencyId: string | null
  providerId: string | null
  villageId: string | null
  adminType: 'UBND' | 'HDT' | null
}

export interface DemoSession extends ActorSession {
  accountKey: DemoAccountKey
  displayName: string
}

export const DEMO_SESSION_COOKIE = 'hab_demo_account'

export const DEMO_IDENTITIES: Record<DemoAccountKey, DemoSession> = {
  guest: { authenticated: false, accountKey: 'guest', role: 'Guest', userId: null, agencyId: null, providerId: null, villageId: null, adminType: null, displayName: 'Khách xem công khai' },
  agency: {
    authenticated: true,
    accountKey: 'agency',
    role: 'TourAgency',
    userId: 'ac233721-7dd3-5466-941b-dc7d5d1b0bfa',
    agencyId: '02e568d8-d65e-54b1-a554-b411150d1dcb',
    providerId: null,
    villageId: null,
    adminType: null,
    displayName: 'Công ty Du lịch Tràng An',
  },
  provider: {
    authenticated: true,
    accountKey: 'provider',
    role: 'LocalProvider',
    userId: 'c2c7fe0d-e2cb-5402-ac90-3cd427c2e669',
    providerId: '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374',
    agencyId: null,
    villageId: '20896522-6235-5699-aeaf-f48b8150d895',
    adminType: null,
    displayName: 'Xưởng thủ công Bát Tràng',
  },
  ubnd: {
    authenticated: true,
    accountKey: 'ubnd',
    role: 'UBND',
    userId: 'b52561f0-05e7-50fd-9661-b12e8847d46f',
    agencyId: null,
    providerId: null,
    villageId: '6dfbb5e9-f92e-58a0-b090-d67cea160f62',
    adminType: 'UBND',
    displayName: 'UBND Admin · Hạ Thái',
  },
  hdt: {
    authenticated: true,
    accountKey: 'hdt',
    role: 'HDT',
    userId: 'f1f62c57-bff1-572f-b921-7927c20dc9c3',
    agencyId: null,
    providerId: null,
    villageId: null,
    adminType: 'HDT',
    displayName: 'HDT Admin · Hà Nội',
  },
}

export function demoSessionFor(key: string | null | undefined): DemoSession {
  return DEMO_IDENTITIES[(key && key in DEMO_IDENTITIES ? key : 'guest') as DemoAccountKey]
}

export function demoSessionFromRequest(request: NextRequest | Request): DemoSession {
  const cookie = request.headers.get('cookie')
  const encoded = cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${DEMO_SESSION_COOKIE}=`))?.split('=')[1]
  if (encoded) return demoSessionFor(decodeURIComponent(encoded))

  // Temporary compatibility for existing PRF tests and clients while the UI moves to cookies.
  const legacy = request.headers.get('x-mock-session')
  if (legacy) {
    try {
      return JSON.parse(legacy) as DemoSession
    } catch {
      return DEMO_IDENTITIES.guest
    }
  }
  return DEMO_IDENTITIES.guest
}
