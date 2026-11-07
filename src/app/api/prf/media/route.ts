import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { MediaError, uploadProfileMedia } from '@/lib/prf/media-store'
export async function POST(request:Request) {
  try { const form=await request.formData(),file=form.get('file'); if(!file || typeof file==='string')throw new MediaError('Chọn file.'); return NextResponse.json(await uploadProfileMedia(sessionContextFromRequest(request),String(form.get('provider_id')||''),file,form.get('purpose')==='certificate'),{status:201}) }
  catch(error){return NextResponse.json({error:error instanceof MediaError?error.message:'Không thể lưu file.'},{status:error instanceof MediaError?error.status:400})}
}
