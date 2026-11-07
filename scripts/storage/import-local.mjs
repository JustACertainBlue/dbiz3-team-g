import nextEnv from '@next/env'
import { existsSync,readFileSync,readdirSync } from 'node:fs'
import { join } from 'node:path'
import { storageClient } from './client.mjs'
nextEnv.loadEnvConfig(process.cwd())
const apply=process.argv.includes('--apply')
let count=0
try{
  const storage=apply?storageClient():null
  if(storage)await storage.ensureBucket()
  for(const prefix of ['prf-media','chat-files','registration-documents','account-avatars']){
    const directory=join(process.cwd(),'.demo-data',prefix)
    if(!existsSync(directory))continue
    for(const id of readdirSync(directory)){
      if(!/^[0-9a-f-]{36}$/i.test(id))continue
      const key=`${prefix}/${id}`
      if(storage&&!await storage.exists(key))await storage.write(key,readFileSync(join(directory,id)))
      count++
    }
  }
  console.log(`${apply?'Checked/imported':'Planned'} ${count} local upload objects. Original local files preserved.`)
}catch{console.error('Local upload migration failed; originals are preserved and no credentials were printed.');process.exitCode=1}
