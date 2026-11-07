import nextEnv from '@next/env'
import { spawnSync } from 'node:child_process'
nextEnv.loadEnvConfig(process.cwd())
if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SECRET_KEY||!process.env.DATABASE_APP_URL){console.error('Configure Storage and the restricted database login before hosted tests.');process.exit(1)}
const result=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','tests/storage'],{stdio:'inherit',env:{...process.env,HAB_TEST_POSTGRES:'1',HAB_TEST_STORAGE:'1'}})
process.exitCode=result.status??1
