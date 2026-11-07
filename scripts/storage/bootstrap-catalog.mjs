import { readFileSync,existsSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { parse } from 'csv-parse/sync'
import { imageSize } from 'image-size'
import nextEnv from '@next/env'
import { command } from '../db/shared.mjs'
import { storageClient } from './client.mjs'
nextEnv.loadEnvConfig(process.cwd())
const apply=process.argv.includes('--apply')
const refresh=process.argv.includes('--refresh-seed-images')
const crafts={
 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69':'ceramics','c8281688-2dc1-5cb1-9ff6-139df04ba562':'silk',
 'd95bc77b-5e7b-53a6-a8af-5ccaabb485d8':'bamboo','b70bd0fa-6a81-5aec-9ff6-5303210b2fad':'conical-hats',
 'bad51dc8-1529-506a-8302-cb0b1d95954c':'embroidery','67a2cbab-850c-5f69-b496-59f2e9a5f594':'wood-carving',
 '800b5192-03c7-5953-849b-32a321e12a47':'lacquer','8e485337-5a2c-5703-9fbf-5e0c6492cd87':'water-puppets',
}
await command(async client=>{
 const manifest=JSON.parse(readFileSync('assets/demo-media/manifest.json','utf8'))
 const photos=new Map(manifest.map(photo=>[photo.slug,photo]))
 const seedIds=parse(readFileSync('data/seed/stored_files.csv','utf8'),{columns:true,skip_empty_lines:true}).map(row=>row.file_id)
 const candidates=await client.query(`SELECT DISTINCT f.*,COALESCE(pm.experience_id,e.experience_id) AS subject_experience
   FROM public.stored_files f
   LEFT JOIN public.profile_media pm ON pm.file_id=f.file_id
   LEFT JOIN public.provider_version_media pvm ON pvm.file_id=f.file_id
   LEFT JOIN public.experiences e ON e.provider_id=pvm.provider_id
   WHERE f.media_type LIKE 'image/%' AND f.file_id=ANY($1::uuid[])
     AND (f.storage_key LIKE 'seed/%' OR ($2 AND f.storage_key='prf-media/'||f.file_id::text))
     AND (pm.experience_id IS NOT NULL OR pvm.provider_id IS NOT NULL)`,[seedIds,refresh])
 const plan=candidates.rows.map(row=>({row,photo:photos.get(crafts[row.subject_experience])})).filter(item=>item.photo)
 const missing=[...new Set(candidates.rows.filter(row=>!photos.has(crafts[row.subject_experience])).map(row=>crafts[row.subject_experience]||'unmapped'))]
 console.log(JSON.stringify({mode:apply?'apply':'read-only plan',imageRecords:plan.length,missingCrafts:missing}))
 if(!apply)return
 if(missing.length)throw new Error('Prepare all catalog photographs before applying')
 for(const {photo}of plan){
  if(!/^[a-z-]+\.jpg$/.test(photo.file)||!existsSync(join('assets/demo-media',photo.file)))throw new Error('Missing licensed photo asset')
  const bytes=readFileSync(join('assets/demo-media',photo.file)),dimensions=imageSize(bytes)
  if(bytes.length!==photo.bytes||dimensions.width!==photo.width||dimensions.height!==photo.height)throw new Error('Photo does not match its manifest')
 }
 const storage=storageClient();await storage.ensureBucket()
 let updated=0
 for(const {row,photo}of plan){
  const key=`prf-media/${row.file_id}`,bytes=readFileSync(join('assets/demo-media',photo.file))
  const previous=await storage.read(key),existed=previous!==null
  const digest=buffer=>createHash('sha256').update(buffer).digest('hex')
  if(existed&&digest(previous)!==digest(bytes)&&!refresh)throw new Error('Existing catalog bytes differ; review and explicitly refresh seed images')
  if(!existed||digest(previous)!==digest(bytes)){
   try{await storage.write(key,bytes,'image/jpeg',{replace:existed&&refresh})}
   catch(error){console.error(`Catalog object upload failed (${error.name}); catalog record ${updated+1} was not changed.`);throw error}
  }
  try{
   const result=await client.query(`UPDATE public.stored_files SET storage_key=$1,media_type=$2,file_size_bytes=$3,width_px=$4,height_px=$5 WHERE file_id=$6 AND storage_key=$7`,[key,photo.file.endsWith('.png')?'image/png':'image/jpeg',bytes.length,photo.width,photo.height,row.file_id,row.storage_key])
   if(!result.rowCount)throw new Error('Catalog metadata changed during bootstrap')
   updated++;console.log(`Catalog image ${updated}/${plan.length} ready (${photo.slug}).`)
  }catch(error){if(!existed)await storage.remove(key);else if(digest(previous)!==digest(bytes))await storage.write(key,previous,row.media_type,{replace:true});throw error}
 }
 console.log(`Updated ${updated} seed gallery images; user uploads and business certificates were preserved.`)
})
