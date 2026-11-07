import nextEnv from '@next/env'
import { storageClient,storageConfig } from './client.mjs'
nextEnv.loadEnvConfig(process.cwd())
try{const c=storageConfig(),database=process.env.DATABASE_APP_URL&&new URL(process.env.DATABASE_APP_URL),project=database?.username.split('.').at(-1);if(project&&new URL(c.url).hostname!==project+'.supabase.co')throw new Error('Storage and database project do not match');await storageClient().ensureBucket();console.log('Private application bucket is ready. No credential was printed.')}
catch(error){console.error(error.name==='StorageUnavailableError'?error.message:'Storage setup failed; verify server-only configuration and bucket permissions.');process.exitCode=1}
