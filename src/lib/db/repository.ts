import type { DbClient,SqlExecutor } from './client'
import type { DemoRow } from '../demo/types'

export type Criteria=Record<string,string|null>
export function legacyRow(row:Record<string,unknown>):DemoRow {
  return Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value==null?'':value instanceof Date?value.toISOString():typeof value==='object'?JSON.stringify(value):String(value)]))
}
const name=/^[a-z][a-z0-9_]*$/
function quote(value:string){if(!name.test(value))throw new Error('Invalid database identifier');return `"${value}"`}

/** Parameterized asynchronous storage contract. Filters execute in PostgreSQL, not in JS. */
export class PostgresRepository {
  constructor(private readonly db:SqlExecutor){}
  private where(criteria:Criteria,start=1) {
    const entries=Object.entries(criteria)
    return {sql:entries.length?entries.map(([key],index)=>`${quote(key)} IS NOT DISTINCT FROM $${start+index}`).join(' AND '):'TRUE',values:entries.map(([,value])=>value)}
  }
  async list(table:string,criteria:Criteria={},options:{limit?:number;offset?:number}={}) {
    const limit=options.limit??100,offset=options.offset??0
    if(!Number.isInteger(limit)||limit<1||limit>1000||!Number.isInteger(offset)||offset<0)throw new Error('Invalid database pagination')
    const filter=this.where(criteria)
    const result=await this.db.query(`SELECT * FROM public.${quote(table)} WHERE ${filter.sql} LIMIT $${filter.values.length+1} OFFSET $${filter.values.length+2}`,[...filter.values,limit,offset])
    return result.rows.map(legacyRow)
  }
  async one(table:string,criteria:Criteria) {return (await this.list(table,criteria,{limit:1}))[0]}
  async insert(table:string,row:DemoRow) {
    const entries=Object.entries(row)
    if(!entries.length)throw new Error('Empty insert')
    const result=await this.db.query(`INSERT INTO public.${quote(table)} (${entries.map(([key])=>quote(key)).join(',')}) VALUES (${entries.map((_,index)=>`$${index+1}`).join(',')}) RETURNING *`,entries.map(([,value])=>value))
    return legacyRow(result.rows[0])
  }
  async update(table:string,criteria:Criteria,changes:DemoRow) {
    if(!Object.keys(criteria).length)throw new Error('Unscoped updates are forbidden')
    const entries=Object.entries(changes)
    if(!entries.length)return this.one(table,criteria)
    const filter=this.where(criteria,entries.length+1)
    const result=await this.db.query(`UPDATE public.${quote(table)} SET ${entries.map(([key],index)=>`${quote(key)}=$${index+1}`).join(',')} WHERE ${filter.sql} RETURNING *`,[...entries.map(([,value])=>value),...filter.values])
    return result.rows[0]?legacyRow(result.rows[0]):undefined
  }
  async remove(table:string,criteria:Criteria) {
    if(!Object.keys(criteria).length)throw new Error('Unscoped deletes are forbidden')
    const filter=this.where(criteria)
    return (await this.db.query(`DELETE FROM public.${quote(table)} WHERE ${filter.sql}`,filter.values)).rowCount??0
  }
}
export function repositoryTransaction<T>(db:DbClient,work:(repo:PostgresRepository)=>Promise<T>) {
  return db.transaction(connection=>work(new PostgresRepository(connection)))
}
