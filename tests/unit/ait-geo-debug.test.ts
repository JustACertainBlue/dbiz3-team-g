import { afterEach, describe, expect, it, vi } from 'vitest'
import { logAitGeoDebug } from '@/lib/ait/geo-debug'

describe('AIT geo debug logging', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('does not log when AIT_DEBUG is not enabled', () => {
    vi.stubEnv('AIT_DEBUG', '')
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    logAitGeoDebug({ origin: undefined, radiusKm: 10, villages: [] })

    expect(info).not.toHaveBeenCalled()
  })

  it('does not log in production even when AIT_DEBUG is enabled', () => {
    vi.stubEnv('AIT_DEBUG', '1')
    vi.stubEnv('NODE_ENV', 'production')
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    logAitGeoDebug({ origin: undefined, radiusKm: 10, villages: [] })

    expect(info).not.toHaveBeenCalled()
  })

  it('logs per-village radius decisions when explicitly enabled outside production', () => {
    vi.stubEnv('AIT_DEBUG', '1')
    vi.stubEnv('NODE_ENV', 'test')
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    logAitGeoDebug({
      origin: undefined,
      radiusKm: 5,
      villages: [
        { village_id: 'bat-trang', name: 'Bát Tràng' },
        { village_id: 'ngu-xa', name: 'Ngũ Xã' },
      ],
    })

    expect(info).toHaveBeenCalledWith(
      'ref=21.0285,105.8542 (default: trung tâm Hà Nội); bán kính=5 km',
      expect.arrayContaining([
        expect.objectContaining({
          id: 'bat-trang',
          precision: 'plus_code',
          decision: 'loại',
          reason: expect.any(String),
        }),
        expect.objectContaining({
          id: 'ngu-xa',
          precision: 'district_centroid',
          decision: 'giữ-chưa xác nhận',
          reason: expect.any(String),
        }),
      ]),
    )
  })
})
