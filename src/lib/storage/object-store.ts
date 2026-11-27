import { mkdirSync,readFileSync,writeFileSync,rmSync } from 'node:fs'
import { join } from 'node:path'
import { storageClient } from '../../../scripts/storage/client.mjs'
import { SEED_STORAGE_KEY } from '../prf/seed-media'

// prf-media/<id>.w400|800|1600.webp: WebP display variants (scripts/storage/media-variants.mjs, step 2A 2026-11-20).
export function validObjectKey(key:string){
  if(!/^(prf-media|chat-files|registration-documents|account-avatars)\/[0-9a-f-]{36}$/i.test(key)
    &&!/^prf-media\/[0-9a-f-]{36}\.w(400|800|1600)\.webp$/i.test(key)
    &&!SEED_STORAGE_KEY.test(key))
    throw new Error('Invalid object key')
  return key
}
const fixturePath=(key:string)=>join(process.cwd(),'.demo-data',validObjectKey(key))
const fixtureMode=()=>process.env.NODE_ENV==='test'&&process.env.HAB_TEST_STORAGE!=='1'
/** Live storage never falls back to disk; disk remains an explicit automated-test fixture. */
export async function writeObject(key:string,bytes:Uint8Array,mediaType:string){
  validObjectKey(key)
  if(fixtureMode()){const path=fixturePath(key);mkdirSync(join(path,'..'),{recursive:true});writeFileSync(path,bytes,{mode:0o600});return}
  await storageClient().write(key,Buffer.from(bytes),mediaType)
}
export async function readObject(key:string):Promise<Buffer|null>{
  validObjectKey(key)
  if(fixtureMode()){try{return readFileSync(fixturePath(key))}catch{return null}}
  return storageClient().read(key)
}
/** Streams the object instead of loading it into memory (live storage); fixtures read the file. */
export async function readObjectStream(key:string):Promise<{body:ReadableStream<Uint8Array>,size:number|null}|null>{
  validObjectKey(key)
  if(fixtureMode()){const bytes=await readObject(key);return bytes?{body:new Blob([new Uint8Array(bytes)]).stream(),size:bytes.length}:null}
  return storageClient().readStream(key)
}
export async function objectExists(key:string):Promise<boolean>{validObjectKey(key);if(fixtureMode())return (await readObject(key))!==null;return storageClient().exists(key)}
export async function removeObject(key:string){validObjectKey(key);if(fixtureMode()){rmSync(fixturePath(key),{force:true});return}await storageClient().remove(key)}
