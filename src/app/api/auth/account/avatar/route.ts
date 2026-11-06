import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { demoRepository } from '@/lib/demo/json-repository'

export const dynamic = 'force-dynamic'
const directory = () => join(process.cwd(), '.demo-data', 'account-avatars')
export function GET(request: Request) {
  const session = sessionContextFromRequest(request)
  if (!session.authenticated) return new NextResponse(null, { status: 401 })
  const repo = demoRepository()
  const account = repo.find('user_accounts', row => row.user_id === session.userId)
  const file = repo.find('stored_files', row => row.file_id === account?.avatar_file_id && row.uploaded_by === session.userId)
  if (!file || !/^[0-9a-f-]{36}$/i.test(file.file_id) || !['image/png','image/jpeg'].includes(file.media_type)) return new NextResponse(null, { status: 404 })
  const path = join(directory(), file.file_id)
  if (!existsSync(path)) return new NextResponse(null, { status: 404 })
  return new NextResponse(readFileSync(path), { headers: { 'Content-Type': file.media_type, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
}
export async function POST(request: Request) {
  const session = sessionContextFromRequest(request)
  if (!session.authenticated) return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 })
  try {
    const form = await request.formData()
    const file = form.get('avatar')
    if (!(file instanceof File) || file.size === 0 || file.size > 2 * 1024 * 1024) throw new Error('INVALID')
    const bytes = Buffer.from(await file.arrayBuffer())
    const png = bytes.length >= 24 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    const jpeg = bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes[bytes.length-2] === 255 && bytes[bytes.length-1] === 217
    if (!png && !jpeg) throw new Error('INVALID')
    const id = randomUUID()
    mkdirSync(directory(), { recursive: true }); writeFileSync(join(directory(), id), bytes)
    const now = new Date().toISOString()
    demoRepository().applyBatch([
      { table: 'stored_files', row: { file_id: id, storage_key: `account-avatars/${id}`, file_name: file.name.slice(0,255), media_type: png ? 'image/png' : 'image/jpeg', file_size_bytes: String(bytes.length), width_px: '', height_px: '', uploaded_by: session.userId!, created_at: now } },
      { table: 'user_accounts', match: row => row.user_id === session.userId, changes: { avatar_file_id: id, updated_at: now } },
    ])
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Chọn ảnh JPG/PNG hợp lệ, tối đa 2 MB.' }, { status: 400 }) }
}
export function DELETE(request: Request) {
  const session = sessionContextFromRequest(request)
  if (!session.authenticated) return new NextResponse(null, { status: 401 })
  demoRepository().update('user_accounts', row => row.user_id === session.userId, { avatar_file_id: '', updated_at: new Date().toISOString() })
  return NextResponse.json({ success: true })
}
