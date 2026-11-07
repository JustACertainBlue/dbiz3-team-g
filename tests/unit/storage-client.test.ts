import { describe,it,expect,vi } from 'vitest'
import { createStorageClient,storageConfig } from '../../scripts/storage/client.mjs'
const config={url:'https://example.supabase.co',key:'synthetic-test-secret',bucket:'hab-private'}
describe('private object storage contract',()=>{
  it('refuses missing configuration and untrusted project URLs',()=>{
    expect(()=>storageConfig({})).toThrow('not configured')
    expect(()=>storageConfig({SUPABASE_URL:'https://example.com/',SUPABASE_SECRET_KEY:'synthetic'})).toThrow('Invalid Supabase')
  })
  it('uploads bytes privately without exposing the key in the URL or upserting existing objects',async()=>{
    const request=vi.fn(async()=>new Response('{}',{status:200}))
    await createStorageClient(config,request).write('prf-media/00000000-0000-4000-8000-000000000001',Buffer.from('synthetic'),'image/jpeg')
    const [url,init]=request.mock.calls[0] as unknown as [string,RequestInit]
    expect(url).not.toContain(config.key)
    expect(init.headers).toMatchObject({'x-upsert':'false',apikey:config.key})
    expect(init.redirect).toBe('error')
  })
  it('never makes an existing public bucket acceptable',async()=>{
    const request=vi.fn(async()=>Response.json({public:true}))
    await expect(createStorageClient(config,request).ensureBucket()).rejects.toThrow('must remain private')
  })
  it('returns null only for a missing object and fails closed on denied access',async()=>{
    const key='chat-files/00000000-0000-4000-8000-000000000001'
    expect(await createStorageClient(config,async()=>new Response(null,{status:404})).read(key)).toBeNull()
    await expect(createStorageClient(config,async()=>new Response(null,{status:403})).read(key)).rejects.toThrow('(403)')
  })
  it('recognizes the Storage API missing-object envelope without hiding unrelated 400 errors',async()=>{
    const key='chat-files/00000000-0000-4000-8000-000000000001'
    const missing=async()=>Response.json({statusCode:'404',error:'not_found',message:'Object not found'},{status:400})
    expect(await createStorageClient(config,missing).read(key)).toBeNull()
    expect(await createStorageClient(config,missing).exists(key)).toBe(false)
    await expect(createStorageClient(config,async()=>Response.json({message:'Invalid request'},{status:400})).read(key)).rejects.toThrow('(400)')
  })
  it('rejects traversal and unexpected object prefixes before sending a request',async()=>{
    const request=vi.fn()
    await expect(createStorageClient(config,request).read('prf-media/../../secret')).rejects.toThrow('Invalid object key')
    expect(request).not.toHaveBeenCalled()
  })
})
