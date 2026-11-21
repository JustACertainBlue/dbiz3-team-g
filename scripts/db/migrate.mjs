import { readFileSync,readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { listMigrations, migrationTarget, pendingMigrations } from './migrate-plan.mjs'

const dryRun=process.argv.includes('--dry-run')
const targetProd=process.argv.includes('--target-prod')
const confirmFromShell=process.env.CONFIRM_PROJECT_REF // typed with the command, not read from a .env file
const unknown=process.argv.slice(2).filter(arg=>!['--dry-run','--target-prod'].includes(arg)&&!arg.startsWith('--dir='))
if(unknown.length)throw new Error(`Unknown option ${unknown[0]}; use --dry-run, --target-prod or --dir=<folder>`)
const {command}=await import('./shared.mjs') // loads .env.local / .env (never overrides what the shell set)
const {projectRef,isProd}=migrationTarget({...process.env,CONFIRM_PROJECT_REF:confirmFromShell},{dryRun,targetProd})
const dirArg=process.argv.find(arg=>arg.startsWith('--dir='))?.slice('--dir='.length)
if(dirArg&&!dryRun)throw new Error('--dir is only accepted with --dry-run')

// --dry-run (human decision 2026-11-18): every pending migration runs in ONE transaction, in order, then ROLLBACK.
// The ledger is not written. Each migration reports OK or its error. Target rules (migrate-plan.mjs migrationTarget), all
// checked before connecting: PROD dry run needs CONFIRM_PROJECT_REF=<prod ref>; PROD apply needs --target-prod and
// CONFIRM_PROJECT_REF=<prod ref>; --target-prod on another project is refused.
// --dir=<folder> reads the migration files from another folder (to try files that are not on this branch yet).
if(dryRun){
  console.log(`[dry-run] project ref ${projectRef}${isProd?' (PROD)':''}; nothing will be committed`)
  await command(async client=>{
    const existing=await client.query("SELECT to_regclass('hab_internal.migrations') AS history")
    const applied=existing.rows[0].history?(await client.query('SELECT name FROM hab_internal.migrations')).rows.map(row=>row.name):[]
    const dir=dirArg||'supabase/migrations'
    const pending=pendingMigrations(listMigrations(dir),applied)
    console.log(`[dry-run] ${applied.length} applied in the ledger, ${pending.length} pending: ${pending.join(', ')||'none'}`)
    await client.query('BEGIN')
    try{
      await client.query("SELECT pg_advisory_xact_lock(hashtext('hab_schema_migrations'))")
      await client.query("SET LOCAL search_path=public,extensions; SET LOCAL statement_timeout='60s'")
      for(const name of pending){
        const sql=readFileSync(`${dir}/${name}`,'utf8').replace(/\r\n/g,'\n')
        await client.query('SAVEPOINT hab_dry_run')
        try{await client.query(sql);await client.query('RELEASE SAVEPOINT hab_dry_run');console.log(`[dry-run] OK    ${name}`)}
        catch(error){await client.query('ROLLBACK TO SAVEPOINT hab_dry_run');console.log(`[dry-run] ERROR ${name}: ${typeof error?.code==='string'?error.code:'UNKNOWN'} ${error?.message??''}`);process.exitCode=1}
      }
    }finally{await client.query('ROLLBACK');console.log('[dry-run] rolled back; ledger unchanged')}
  })
  process.exit()
}

console.log(`[apply] project ref ${projectRef}${isProd?' (PROD)':''}`)
await command(async client=>{
  await client.query("SELECT pg_advisory_lock(hashtext('hab_schema_migrations'))")
  try {
    const names=readdirSync('supabase/migrations').filter(name=>/^\d+_.+\.sql$/.test(name)).sort()
    const existing=await client.query("SELECT to_regclass('hab_internal.migrations') AS history")
    if(!existing.rows[0].history) {
      const count=await client.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'")
      if(count.rows[0].n!==0)throw {code:'REFUSE_UNTRACKED_NONEMPTY_DATABASE'}
      await client.query('CREATE SCHEMA IF NOT EXISTS hab_internal; REVOKE ALL ON SCHEMA hab_internal FROM PUBLIC, anon, authenticated; CREATE TABLE hab_internal.migrations(name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())')
    }
    for(const name of names) {
      const source=readFileSync(`supabase/migrations/${name}`,'utf8'),sql=source.replace(/\r\n/g,'\n')
      const hash=createHash('sha256').update(sql).digest('hex'),legacyHash=createHash('sha256').update(source).digest('hex')
      const previous=await client.query('SELECT sha256 FROM hab_internal.migrations WHERE name=$1',[name])
      if(previous.rowCount){
        if(previous.rows[0].sha256!==hash){
          if(previous.rows[0].sha256!==legacyHash)throw {code:'MIGRATION_CHECKSUM_MISMATCH'}
          await client.query('UPDATE hab_internal.migrations SET sha256=$1 WHERE name=$2',[hash,name])
        }
        console.log(`Already applied: ${name}`);continue
      }
      await client.query('BEGIN')
      try{
        await client.query("SET LOCAL search_path=public,extensions; SET LOCAL statement_timeout='60s'")
        await client.query(sql)
        await client.query('INSERT INTO hab_internal.migrations(name,sha256) VALUES($1,$2)',[name,hash])
        await client.query('COMMIT');console.log(`Applied: ${name}`)
      }catch(error){await client.query('ROLLBACK');throw error}
    }
  }finally{await client.query("SELECT pg_advisory_unlock(hashtext('hab_schema_migrations'))")}
})
