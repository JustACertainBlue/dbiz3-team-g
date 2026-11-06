import { NextResponse } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { demoRepository } from '@/lib/demo/json-repository'
export const dynamic = 'force-dynamic'
export function GET(request: Request, { params }: { params: { fileId: string } }) {
  const session = sessionContextFromRequest(request)
  if (!session.authenticated || session.role !== 'ADMIN' || session.adminType !== 'HDT' || !session.permissions.includes('manage_users')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const id = params.fileId
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const repo = demoRepository()
  const file = repo.find('stored_files', row => row.file_id === id)
  if (!file || file.storage_key !== `registration-documents/${id}` || !repo.find('registration_documents', row => row.file_id === id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const data = readFileSync(join(process.cwd(), '.demo-data', 'registration-documents', id))
    return new NextResponse(data, { headers: { 'Content-Type': file.media_type, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.file_name)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch { return NextResponse.json({ error: 'Original file is unavailable' }, { status: 404 }) }
}
