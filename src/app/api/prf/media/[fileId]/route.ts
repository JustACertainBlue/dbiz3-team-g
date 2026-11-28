import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { MediaError, authorizeProfileMedia, logMediaError, openProfileMediaObject } from '@/lib/prf/media-store'
import { parseVariantWidth } from '../../../../../../scripts/storage/media-variants.mjs'

// Step 2A (human request 2026-11-20). Query: ?w=400|800|1600 → WebP variant (other values: 800; none: the original; the
// original is also served while a variant does not exist yet); ?v=<version> (mediaVersion: the stored size) → a public
// image is cached for a year. Only images every Guest may see are public; documents, drafts and unapproved images stay
// private, no-store.
const PRIVATE = 'private, no-store', IMMUTABLE = 'public, max-age=31536000, immutable', REVALIDATE = 'public, no-cache'

export async function GET(request:Request,{params}:{params:{fileId:string}}) {
  try{
    const url=new URL(request.url)
    const {file,public:isPublic,version}=await authorizeProfileMedia(await sessionContextFromRequest(request),params.fileId)
    const width=file.media_type.startsWith('image/')?parseVariantWidth(url.searchParams.get('w')):null
    const cacheControl=!isPublic?PRIVATE:url.searchParams.get('v')===version?IMMUTABLE:REVALIDATE
    const etagOf=(variant:string)=>`"${file.file_id}.${version}.${variant}"`
    if(isPublic && request.headers.get('If-None-Match')===etagOf(width?`w${width}`:'orig'))
      return new NextResponse(null,{status:304,headers:{'Cache-Control':cacheControl,'ETag':etagOf(width?`w${width}`:'orig')}})
    const object=await openProfileMediaObject(file,width)
    const name=object.variant==='orig'?file.file_name:file.file_name.replace(/\.[a-z0-9]+$/i,'')+'.webp'
    const headers:Record<string,string>={'Content-Type':object.contentType,'Content-Disposition':`${file.media_type==='application/pdf'?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control':cacheControl,'X-Content-Type-Options':'nosniff'}
    if(isPublic)headers.ETag=etagOf(object.variant)
    if(object.size)headers['Content-Length']=String(object.size)
    return new NextResponse(object.body,{headers})
  }
  catch(error){if(!(error instanceof MediaError))logMediaError('media route failed',error);return NextResponse.json({error:error instanceof MediaError?error.message:'Không thể đọc file.'},{status:error instanceof MediaError?error.status:500,headers:{'Cache-Control':PRIVATE}})}
}
