import { readFileSync,readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { command } from './shared.mjs'

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
