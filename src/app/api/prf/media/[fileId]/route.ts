import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { MediaError, readProfileMedia } from '@/lib/prf/media-store'
export async function GET(request:Request,{params}:{params:{fileId:string}}) {
  try{const {file,bytes}=(await readProfileMedia((await sessionContextFromRequest(request)),params.fileId));return new NextResponse(bytes,{headers:{'Content-Type':file.media_type,'Content-Disposition':`${file.media_type==='application/pdf'?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}
  catch(error){return NextResponse.json({error:error instanceof MediaError?error.message:'Không thể đọc file.'},{status:error instanceof MediaError?error.status:500})}
}
