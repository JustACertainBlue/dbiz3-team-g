import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'

const MEDIA_CATEGORIES = new Set(['villages', 'providers', 'activities'])

export async function GET(
  _request: Request,
  { params }: { params: { path: string[] } },
) {
  const [category, filename, ...extra] = params.path
  if (
    extra.length > 0
    || !MEDIA_CATEGORIES.has(category)
    || !/^[a-z0-9][a-z0-9_-]*\.jpg$/i.test(filename)
  ) {
    return new Response('Not found', { status: 404 })
  }

  const mediaRoot = resolve(process.cwd(), 'tests', 'fixtures', 'ai-matching', 'media')
  const imagePath = resolve(mediaRoot, category, filename)
  if (!imagePath.startsWith(`${mediaRoot}${sep}`)) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const image = await readFile(imagePath)
    return new Response(new Uint8Array(image), {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'image/jpeg',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return new Response('Not found', { status: 404 })
    }
    throw error
  }
}
