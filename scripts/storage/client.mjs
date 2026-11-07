
export class StorageUnavailableError extends Error { constructor(){super('Supabase Storage is not configured');this.name='StorageUnavailableError'} }
/** Server-only Storage REST adapter; credentials must never be passed through NEXT_PUBLIC variables. */
/** @param {Record<string,string|undefined>} [env] */
export function storageConfig(env=process.env){
  if(!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY)throw new StorageUnavailableError()
  const url=new URL(env.SUPABASE_URL)
  if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.username||url.password||url.pathname!=='/')throw new Error('Invalid Supabase project URL')
  return {url:url.origin,key:env.SUPABASE_SECRET_KEY,bucket:env.SUPABASE_STORAGE_BUCKET||'hab-private'}
}
export function createStorageClient(config,request=fetch){
  if(!/^[a-z0-9-]+$/.test(config.bucket))throw new Error('Invalid bucket')
  function objectPath(key){if(!/^(prf-media|chat-files|registration-documents|account-avatars)\/[0-9a-f-]{36}$/i.test(key))throw new Error('Invalid object key');return key.split('/').map(encodeURIComponent).join('/')}
  async function call(path,init={}){
    return request(`${config.url}/storage/v1/${path}`,{...init,headers:{apikey:config.key,Authorization:`Bearer ${config.key}`,...init.headers},signal:AbortSignal.timeout(30000),cache:'no-store',redirect:'error'})
  }
  async function missing(response){
    if(response.status===404)return true
    if(response.status!==400)return false
    try{const error=await response.json();return String(error.statusCode)==='404'||error.error==='not_found'||error.message==='Object not found'}catch{return false}
  }
  function failed(response){throw new Error(`Storage operation failed (${response.status}); no credentials were logged`)}
  return {
    async ensureBucket(){
      const existing=await call(`bucket/${config.bucket}`)
      if(existing.ok){const bucket=await existing.json();if(bucket.public)throw new Error('Application bucket must remain private');return}
      if(existing.status!==404&&existing.status!==400)failed(existing)
      const response=await call('bucket',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:config.bucket,name:config.bucket,public:false,file_size_limit:10485760})})
      if(!response.ok)failed(response)
    },
    async write(key,bytes,contentType='application/octet-stream',options={replace:false}){
      const response=await call(`object/${config.bucket}/${objectPath(key)}`,{method:'POST',headers:{'Content-Type':contentType,'x-upsert':String(options.replace===true)},body:bytes})
      if(!response.ok)failed(response)
    },
    async read(key){const response=await call(`object/authenticated/${config.bucket}/${objectPath(key)}`);if(!response.ok){if(await missing(response))return null;failed(response)};return Buffer.from(await response.arrayBuffer())},
    async exists(key){const response=await call(`object/authenticated/${config.bucket}/${objectPath(key)}`,{headers:{Range:'bytes=0-0'}});if(!response.ok){if(await missing(response))return false;failed(response)}await response.body?.cancel();return true},
    async remove(key){const response=await call(`object/${config.bucket}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[objectPath(key)]})});if(!response.ok)failed(response)},
  }
}
let client
export function storageClient(){return client??=createStorageClient(storageConfig())}
