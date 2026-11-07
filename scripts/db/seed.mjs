import { readFileSync } from 'node:fs'
import { parse } from 'csv-parse/sync'
import { command } from './shared.mjs'

await command(async client=>{
  await client.query('BEGIN')
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('hab_seed')); SET CONSTRAINTS ALL DEFERRED")
    const previous=await client.query("SELECT to_regclass('hab_internal.seed_runs') AS history")
    if(previous.rows[0].history) {
      const result=await client.query("SELECT count(*)::int AS n FROM hab_internal.seed_runs")
      if(result.rows[0].n){console.log('Seed already loaded; no data changed.');await client.query('ROLLBACK');return}
    }
    const loader=readFileSync('data/seed/load_seed.sql','utf8')
    const imports=[...loader.matchAll(/\\copy (\w+) \(([^)]+)\) FROM '([^']+)'/g)]
    if(imports.length!==47)throw {code:'UNEXPECTED_SEED_MANIFEST'}
    for(const [,table] of imports){const result=await client.query(`SELECT count(*)::int AS n FROM public."${table}"`);if(result.rows[0].n)throw {code:'REFUSE_SEED_NONEMPTY_TABLE'}}
    let total=0
    for(const [,table,columnList,path] of imports) {
      const columns=columnList.split(',').map(name=>name.trim())
      if(!columns.every(name=>/^\w+$/.test(name)))throw {code:'INVALID_SEED_COLUMNS'}
      const records=parse(readFileSync(path,'utf8'),{columns:true,skip_empty_lines:true,bom:true})
      for(const row of records) {
        const values=columns.map(name=>row[name]===''?null:row[name])
        await client.query(`INSERT INTO public."${table}" (${columns.map(name=>`"${name}"`).join(',')}) VALUES (${columns.map((_,index)=>`$${index+1}`).join(',')})`,values)
      }
      total+=records.length;console.log(`Loaded ${table}: ${records.length}`)
    }
    await client.query('CREATE TABLE IF NOT EXISTS hab_internal.seed_runs(id int PRIMARY KEY, loaded_at timestamptz NOT NULL DEFAULT now(), records int NOT NULL)')
    await client.query('INSERT INTO hab_internal.seed_runs(id,records) VALUES(1,$1)',[total])
    await client.query('COMMIT');console.log(`PASS: 47 seed tables, ${total} rows committed atomically.`)
  }catch(error){await client.query('ROLLBACK');throw error}
})
