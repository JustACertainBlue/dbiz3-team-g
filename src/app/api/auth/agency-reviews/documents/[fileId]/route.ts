import { readObject } from '@/lib/storage/object-store'
import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { demoRepository } from '@/lib/db/application-store'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, { params }: { params: { fileId: string } }) {
  const session = (await sessionContextFromRequest(request))
  if (!session.authenticated || session.role !== 'ADMIN' || session.adminType !== 'HDT' || !session.permissions.includes('manage_users')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const id = params.fileId
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const repo = demoRepository()
  const file = (await repo.find('stored_files', row => row.file_id === id))
  if (!file || file.storage_key !== `registration-documents/${id}` || !(await repo.find('registration_documents', row => row.file_id === id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const data = await readObject(file.storage_key)
    if(!data)return NextResponse.json({error:'Original file is unavailable'},{status:404})
    return new NextResponse(new Uint8Array(data), { headers: { 'Content-Type': file.media_type, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.file_name)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch { return NextResponse.json({ error: 'Original file is unavailable' }, { status: 404 }) }
}
