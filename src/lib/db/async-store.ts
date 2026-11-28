import { randomUUID } from 'node:crypto'
import type { DbClient,SqlExecutor } from './client'
import type { DemoRow,BatchOperation } from '../demo/types'
import { legacyRow } from './repository'
import { invalidateReadCache } from './read-cache'

type Table={schema:string;name:string;columns:Array<{name:string;nullable:boolean}>;keys:string[]}
const quote=(name:string)=>{if(!/^[a-z][a-z0-9_]*$/.test(name))throw new Error('Invalid identifier');return `"${name}"`}
const qualified=(table:Table)=>`${quote(table.schema)}.${quote(table.name)}`

/** Async compatibility contract for existing domain services, with SQL-enforced atomic writes. */
export class AsyncPostgresStore {
  private metadata?:Promise<Map<string,Table>>
  constructor(private readonly database:DbClient){}
  /** Direct keyed SQL for read paths that must not load whole tables (media access, step 2A). */
  executor():SqlExecutor{return this.database}
  private tables() {
    return this.metadata??=this.database.query(`SELECT n.nspname AS schema,c.relname AS name,
      (SELECT json_agg(json_build_object('name',a.attname,'nullable',NOT a.attnotnull) ORDER BY a.attnum)
       FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) AS columns,
      (SELECT array_agg(a.attname::text ORDER BY key.ordinality) FROM pg_index i
       CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS key(attnum,ordinality)
       JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=key.attnum WHERE i.indrelid=c.oid AND i.indisprimary) AS keys
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE c.relkind='r' AND (n.nspname='public' OR n.nspname='hab_runtime')`)
      .then(result=>new Map(result.rows.map(row=>[row.name,{schema:row.schema,name:row.name,columns:row.columns,keys:row.keys||[]} as Table])))
  }
  private async table(name:string){const table=(await this.tables()).get(name);if(!table)throw new Error(`Unknown persisted table: ${name}`);return table}
  private async lock(tx:SqlExecutor,names:readonly string[]) {
    for(const name of [...new Set(names)].sort())await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`hab:${name}`])
  }
  async atomic<T>(names:readonly string[],work:()=>Promise<T>):Promise<T> {
    return this.database.transaction(async tx=>{
      await this.lock(tx,names)
      await tx.query('SET CONSTRAINTS ALL DEFERRED')
      return work()
    })
  }
  /** Transitional aggregate unit of work: declared tables only, one connection, changed rows only.
   * Locks also cover empty tables, preventing duplicate registration/rate-limit races.
   */
  private async transactionRaw<T>(names:readonly string[],work:(tables:Record<string,DemoRow[]>)=>T):Promise<T> {
    const definitions=await Promise.all([...new Set(names)].sort().map(name=>this.table(name)))
    return this.database.transaction(async tx=>{
      await this.lock(tx,names)
      await tx.query('SET CONSTRAINTS ALL DEFERRED')
      const before:Record<string,DemoRow[]>={}
      for(const table of definitions)before[table.name]=(await tx.query(`SELECT * FROM ${qualified(table)} FOR UPDATE`)).rows.map(legacyRow)
      const tables=structuredClone(before)
      const result=work(tables)
      if(result instanceof Promise)throw new Error('Aggregate callbacks must be synchronous; use the SQL transaction API for async work')
      if(Object.keys(tables).some(name=>!names.includes(name)))throw new Error('Undeclared aggregate table')
      const identity=(table:Table,row:DemoRow)=>JSON.stringify(table.keys.map(key=>row[key]))
      for(const table of definitions){
        const original=new Map(before[table.name].map(row=>[identity(table,row),row]))
        const remaining=new Set<string>()
        for(const row of tables[table.name]){
          if(table.schema==='hab_runtime'&&!row.runtime_id)row.runtime_id=randomUUID()
          const id=identity(table,row),old=original.get(id)
          remaining.add(id)
          if(!old)await this.insertInto(tx,table,row)
          else {
            const changes=Object.fromEntries(Object.entries(row).filter(([key,value])=>old[key]!==value))
            if(Object.keys(changes).length)await this.updateRow(tx,table,old,changes)
          }
        }
        for(const [id,row] of original)if(!remaining.has(id)){const key=this.key(table,row);await tx.query(`DELETE FROM ${qualified(table)} WHERE ${key.sql}`,key.values)}
      }
      return result
    })
  }
  async all(name:string):Promise<DemoRow[]> {const table=await this.table(name);return(await this.database.query(`SELECT * FROM ${qualified(table)}`)).rows.map(legacyRow)}
  /** Keyed read in SQL (egress audit): reads only the matching rows instead of the whole table. */
  // Writes drop the in-process read cache for the tables they touch (see read-cache.ts), even when they fail.
  async transaction<T>(names:readonly string[],work:(tables:Record<string,DemoRow[]>)=>T):Promise<T>{try{return await this.transactionRaw(names,work)}finally{invalidateReadCache(names)}}
  async insert(name:string,row:DemoRow){try{return await this.insertRaw(name,row)}finally{invalidateReadCache([name])}}
  async update(name:string,predicate:(row:DemoRow)=>boolean,changes:Partial<DemoRow>){try{return await this.updateRaw(name,predicate,changes)}finally{invalidateReadCache([name])}}
  async remove(name:string,predicate:(row:DemoRow)=>boolean){try{return await this.removeRaw(name,predicate)}finally{invalidateReadCache([name])}}
  async applyBatch(operations:readonly BatchOperation[]){try{return await this.applyBatchRaw(operations)}finally{invalidateReadCache(operations.map(operation=>operation.table))}}
  async where(name:string,criteria:Readonly<Record<string,string>>):Promise<DemoRow[]> {
    const table=await this.table(name),entries=Object.entries(criteria)
    if(!entries.length||entries.some(([,value])=>value===''))throw new Error('where() needs non-empty criteria')
    const known=new Set(table.columns.map(column=>column.name))
    for(const [column] of entries)if(!known.has(column))throw new Error(`Unmapped persisted field: ${name}.${column}`)
    const filter=entries.map(([column],index)=>`${quote(column)}=$${index+1}`).join(' AND ')
    return(await this.database.query(`SELECT * FROM ${qualified(table)} WHERE ${filter}`,entries.map(([,value])=>value))).rows.map(legacyRow)
  }
  /** Only the named columns of every row. */
  async project(name:string,columns:readonly string[]):Promise<DemoRow[]> {
    const table=await this.table(name),known=new Set(table.columns.map(column=>column.name))
    for(const column of columns)if(!known.has(column))throw new Error(`Unmapped persisted field: ${name}.${column}`)
    return(await this.database.query(`SELECT ${columns.map(quote).join(',')} FROM ${qualified(table)}`)).rows.map(legacyRow)
  }
  /** Sweeper query: only the due On hold rows leave the database. */
  async dueHolds(at:Date):Promise<DemoRow[]> {
    const table=await this.table('bookings')
    return(await this.database.query(`SELECT * FROM ${qualified(table)} WHERE status='On hold' AND hold_expires_at<=$1`,[at.toISOString()])).rows.map(legacyRow)
  }
  async find(name:string,predicate:(row:DemoRow)=>boolean){return(await this.all(name)).find(predicate)}
  async snapshot(names:readonly string[]) {return Object.fromEntries(await Promise.all(names.map(async name=>[name,await this.all(name)])))}
  private values(table:Table,row:Partial<DemoRow>) {
    const byName=new Map(table.columns.map(column=>[column.name,column]))
    return Object.entries(row).map(([name,value])=>{
      const column=byName.get(name);if(!column)throw new Error(`Unmapped persisted field: ${table.name}.${name}`)
      return {name,value:value===''&&column.nullable?null:value}
    })
  }
  private async insertInto(tx:SqlExecutor,table:Table,input:DemoRow) {
    const row={...input}
    if(table.schema==='hab_runtime'&&table.keys.includes('runtime_id')&&!row.runtime_id)row.runtime_id=randomUUID()
    const fields=this.values(table,row)
    const result=await tx.query(`INSERT INTO ${qualified(table)} (${fields.map(field=>quote(field.name)).join(',')}) VALUES (${fields.map((_,index)=>`$${index+1}`).join(',')}) RETURNING *`,fields.map(field=>field.value))
    return legacyRow(result.rows[0])
  }
  private async insertRaw(name:string,row:DemoRow){const table=await this.table(name);return this.database.transaction(async tx=>{await this.lock(tx,[name]);return this.insertInto(tx,table,row)})}
  private key(table:Table,row:DemoRow,start=1) {
    if(!table.keys.length||table.keys.some(key=>row[key]===undefined))throw new Error(`Missing primary key for ${table.name}`)
    return {sql:table.keys.map((key,index)=>`${quote(key)}=$${start+index}`).join(' AND '),values:table.keys.map(key=>row[key])}
  }
  private async updateRow(tx:SqlExecutor,table:Table,row:DemoRow,changes:Partial<DemoRow>) {
    const fields=this.values(table,changes).filter(field=>!table.keys.includes(field.name))
    if(!fields.length)return row
    const key=this.key(table,row,fields.length+1)
    const result=await tx.query(`UPDATE ${qualified(table)} SET ${fields.map((field,index)=>`${quote(field.name)}=$${index+1}`).join(',')} WHERE ${key.sql} RETURNING *`,[...fields.map(field=>field.value),...key.values])
    return result.rows[0]?legacyRow(result.rows[0]):undefined
  }
  private async updateRaw(name:string,predicate:(row:DemoRow)=>boolean,changes:Partial<DemoRow>) {
    const table=await this.table(name)
    return this.database.transaction(async tx=>{
      await this.lock(tx,[name])
      const row=(await tx.query(`SELECT * FROM ${qualified(table)} FOR UPDATE`)).rows.map(legacyRow).find(predicate)
      return row?this.updateRow(tx,table,row,changes):undefined
    })
  }
  private async removeRaw(name:string,predicate:(row:DemoRow)=>boolean) {
    const table=await this.table(name)
    return this.database.transaction(async tx=>{
      await this.lock(tx,[name])
      const rows=(await tx.query(`SELECT * FROM ${qualified(table)} FOR UPDATE`)).rows.map(legacyRow).filter(predicate)
      for(const row of rows){const key=this.key(table,row);await tx.query(`DELETE FROM ${qualified(table)} WHERE ${key.sql}`,key.values)}
      return rows.length
    })
  }
  private async applyBatchRaw(operations:readonly BatchOperation[]) {
    return this.database.transaction(async tx=>{
      await this.lock(tx,operations.map(operation=>operation.table))
      await tx.query('SET CONSTRAINTS ALL DEFERRED')
      const results:DemoRow[]=[]
      for(const operation of operations){
        const table=await this.table(operation.table)
        if('row' in operation)results.push(await this.insertInto(tx,table,operation.row))
        else {
          const row=(await tx.query(`SELECT * FROM ${qualified(table)} FOR UPDATE`)).rows.map(legacyRow).find(operation.match)
          if(!row)throw new Error(`No ${operation.table} row matches the update`)
          const result=await this.updateRow(tx,table,row,operation.changes);if(result)results.push(result)
        }
      }
      return results
    })
  }
}
