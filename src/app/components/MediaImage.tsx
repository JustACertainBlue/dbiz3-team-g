'use client'
import { useState } from 'react'
import { mediaUrl } from '@/lib/prf/media-urls'
export default function MediaImage({ src, alt, large=false }: { src?: string; alt:string; large?:boolean }) {
  const [failedUrl,setFailedUrl]=useState('')
  const url=src?mediaUrl(src):''
  return url && failedUrl!==url && /^(\/api\/prf\/media\/|https?:\/\/)/.test(url) ? <img src={url} alt={alt} onError={()=>setFailedUrl(url)} style={{width:'100%',maxWidth:large?960:undefined,aspectRatio:large?undefined:'16 / 9',maxHeight:large?'75vh':undefined,objectFit:large?'contain':'cover',borderRadius:12}}/> : <div role="img" aria-label={`${alt}: chưa có file ảnh`} style={{aspectRatio:'16 / 9',display:'grid',placeItems:'center',background:'var(--palette-gray-89)',color:'var(--palette-gray-36)',padding: 'var(--space-18)',borderRadius:12}}>{alt} · Chưa có ảnh</div>
}
