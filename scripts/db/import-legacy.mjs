import { readFileSync,existsSync } from 'node:fs'
import { parse } from 'csv-parse/sync'
import { command } from './shared.mjs'

// Explicit one-time, three-way import. Never overwrite a value changed in PostgreSQL since seed.
const apply=process.argv.includes('--apply')
const selected=process.argv.find(arg=>arg.startsWith('--tables='))?.slice(9).split(',')
const quote=value=>{if(!/^[a-z][a-z0-9_]*$/.test(value))throw new Error('Invalid identifier');return `"${value}"`}
function sorted(value){return Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,sorted(v)])):value}
function normal(value,column){
  if(value===undefined||value===null||(value===''&&column.nullable))return null
  if(value instanceof Date)return value.toISOString()
  if(column.type.includes('timestamp'))return new Date(value).toISOString()
  if(column.type==='jsonb')return JSON.stringify(sorted(typeof value==='string'?JSON.parse(value):value))
  if(column.type==='boolean')return String(value)==='true'
  if(['integer','smallint','bigint','numeric','double precision'].includes(column.type))return Number(value)
  if(column.type==='time without time zone')return String(value).length===5?`${value}:00`:String(value)
  return String(value)
}
await command(async client=>{
  const file='.demo-data/runtime.json'
  if(!existsSync(file)){console.log('No legacy runtime file; nothing imported.');return}
  const local=JSON.parse(readFileSync(file,'utf8')).tables
  const manifest=readFileSync('data/seed/load_seed.sql','utf8')
  const order=[...manifest.matchAll(/\\copy\s+(\w+)/gi)].map(match=>match[1])
  if(apply){
    await client.query('BEGIN')
    // Coordinate with live aggregate writers before reading the three-way comparison.
    for(const table of order.filter(name=>name!=='sessions'&&(!selected||selected.includes(name))).sort())
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`hab:${table}`])
    await client.query('SET CONSTRAINTS ALL DEFERRED')
  }
  const meta=await client.query(`SELECT c.table_name,c.column_name,c.data_type,c.is_nullable='YES' AS nullable,
    EXISTS (SELECT 1 FROM information_schema.table_constraints t JOIN information_schema.key_column_usage k
      ON k.constraint_name=t.constraint_name AND k.table_schema=t.table_schema AND k.table_name=t.table_name
      WHERE t.constraint_type='PRIMARY KEY' AND t.table_schema=c.table_schema AND t.table_name=c.table_name AND k.column_name=c.column_name) AS key
    FROM information_schema.columns c WHERE c.table_schema='public' ORDER BY c.ordinal_position`)
  const operations=[],report=[]
  for(const table of order){
    if(table==='sessions'||(selected&&!selected.includes(table)))continue // Old login tokens are not restored.
    const columns=meta.rows.filter(row=>row.table_name===table).map(row=>({name:row.column_name,type:row.data_type,nullable:row.nullable,key:row.key}))
    const keys=columns.filter(c=>c.key).map(c=>c.name)
    if(!keys.length)throw new Error('Missing primary key')
    const id=row=>JSON.stringify(keys.map(key=>row[key]==null?null:String(row[key])))
    const seed=parse(readFileSync(`data/seed/${table}.csv`,'utf8'),{columns:true,skip_empty_lines:true,bom:true})
    const baseline=new Map(seed.map(row=>[id(row),row]))
    const current=new Map((await client.query(`SELECT * FROM public.${quote(table)}`)).rows.map(row=>[id(row),row]))
    let inserts=0,updates=0,conflicts=0
    for(const row of local[table]??[]){
      if(Object.keys(row).some(name=>!columns.some(c=>c.name===name)))throw new Error('Unmapped legacy field')
      const original=baseline.get(id(row)),remote=current.get(id(row))
      if(!original&&!remote){operations.push({table,row,keys,insert:true,columns});inserts++;continue}
      if(!remote){if(original)conflicts++;continue}
      const changes={}
      for(const column of columns){
        if(column.key||row[column.name]===undefined)continue
        const desired=normal(row[column.name],column),now=normal(remote[column.name],column)
        if(desired===now)continue
        if(original&&desired===normal(original[column.name],column))continue
        if(!original||now!==normal(original[column.name],column)){conflicts++;continue}
        changes[column.name]=row[column.name]
      }
      if(Object.keys(changes).length){operations.push({table,row:changes,identity:row,keys,columns});updates++}
    }
    if(inserts||updates||conflicts)report.push({table,inserts,updates,conflicting_fields:conflicts})
  }
  console.log(JSON.stringify({mode:apply?'apply':'read-only plan',tables:report,legacy_sessions:'excluded; sign in again',deletions:'never imported'},null,2))
  if(!apply)return
  if(report.some(row=>row.conflicting_fields)){await client.query('ROLLBACK');throw new Error('Legacy conflicts require explicit review; no records imported')}
  try{
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('hab:legacy-import',0))")
    await client.query('SET CONSTRAINTS ALL DEFERRED')
    for(const operation of operations){
      const entries=Object.entries(operation.row)
      const values=entries.map(([key,value])=>value===''&&operation.columns.find(c=>c.name===key)?.nullable?null:value)
      if(operation.insert)await client.query(`INSERT INTO public.${quote(operation.table)} (${entries.map(([key])=>quote(key)).join(',')}) VALUES (${entries.map((_,i)=>`$${i+1}`).join(',')})`,values)
      else await client.query(`UPDATE public.${quote(operation.table)} SET ${entries.map(([key],i)=>`${quote(key)}=$${i+1}`).join(',')} WHERE ${operation.keys.map((key,i)=>`${quote(key)}=$${entries.length+i+1}`).join(' AND ')}`,[...values,...operation.keys.map(key=>operation.identity[key])])
    }
    await client.query('COMMIT');console.log(`Imported ${operations.length} non-conflicting legacy records; original JSON preserved.`)
  }catch(error){await client.query('ROLLBACK');throw error}
})
