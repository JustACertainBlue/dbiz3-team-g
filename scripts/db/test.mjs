import nextEnv from '@next/env'
import { spawnSync } from 'node:child_process'
nextEnv.loadEnvConfig(process.cwd())
if(!process.env.DATABASE_APP_URL){console.error('Provision the application role before running hosted PostgreSQL tests.');process.exit(1)}
const result=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','tests/postgres'],{stdio:'inherit',env:{...process.env,HAB_TEST_POSTGRES:'1'}})
process.exitCode=result.status??1
