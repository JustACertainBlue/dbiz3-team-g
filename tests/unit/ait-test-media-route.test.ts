import { describe, expect, it } from 'vitest'
import { GET } from '@/app/api/ait/test-media/[...path]/route'

describe('AI Matching test media route', () => {
  it('serves a fixture image as JPEG bytes', async () => {
    const response = await GET(
      new Request('http://localhost/api/ait/test-media/activities/bat-trang-a01.jpg'),
      { params: { path: ['activities', 'bat-trang-a01.jpg'] } },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/jpeg')
    expect(new Uint8Array(await response.arrayBuffer()).length).toBeGreaterThan(0)
  })

  it('does not expose paths outside the fixture media categories', async () => {
    const response = await GET(
      new Request('http://localhost/api/ait/test-media/../media_manifest.json'),
      { params: { path: ['..', 'media_manifest.json'] } },
    )

    expect(response.status).toBe(404)
  })
})
