import { AsyncPostgresStore } from './async-store'
import { getDbClient } from './client'
import { demoRepository as fixtureRepository } from '../demo/json-repository'
import type { BatchOperation, DemoRow } from '../demo/types'
import { AsyncLocalStorage } from 'node:async_hooks'

export interface ApplicationStore {
  all(name:string):Promise<DemoRow[]>
  find(name:string,predicate:(row:DemoRow)=>boolean):Promise<DemoRow|undefined>
  /** Keyed read: equality on non-empty values, executed in SQL. Prefer it to all()/find() on any table that grows. */
  where?(name:string,criteria:Readonly<Record<string,string>>):Promise<DemoRow[]>
  /** Only the named columns of every row (for example page data without password_hash). */
  project?(name:string,columns:readonly string[]):Promise<DemoRow[]>
  /** On hold bookings whose hold_expires_at is at or before `at`; the filter runs in SQL. */
  dueHolds?(at:Date):Promise<DemoRow[]>
  snapshot(names:readonly string[]):Promise<Record<string,DemoRow[]>>
  insert(name:string,row:DemoRow):Promise<DemoRow>
  update(name:string,predicate:(row:DemoRow)=>boolean,changes:Partial<DemoRow>):Promise<DemoRow|undefined>
  remove(name:string,predicate:(row:DemoRow)=>boolean):Promise<number>
  applyBatch(operations:readonly BatchOperation[]):Promise<DemoRow[]>
  transaction<T>(names:readonly string[],work:(tables:Record<string,DemoRow[]>)=>T):Promise<T>
  atomic<T>(names:readonly string[],work:()=>Promise<T>):Promise<T>
}

const matches=(criteria:Readonly<Record<string,string>>)=>(row:DemoRow)=>Object.entries(criteria).every(([key,value])=>row[key]===value)
// Ordinary tests explicitly use isolated fixtures. Live failures never fall back to JSON.
// Also used as a read-only fallback when DATABASE_APP_URL is not configured (local dev without Postgres).
export const fixtures:KeyedStore={
  all:async name=>fixtureRepository().all(name),
  find:async(name,predicate)=>fixtureRepository().find(name,predicate),
  where:async(name,criteria)=>(await fixtureRepository().all(name)).filter(matches(criteria)),
  project:async(name,columns)=>(await fixtureRepository().all(name)).map(row=>Object.fromEntries(columns.map(column=>[column,row[column]??'']))),
  dueHolds:async at=>(await fixtureRepository().all('bookings')).filter(row=>row.status==='On hold'&&Date.parse(row.hold_expires_at)<=at.getTime()),
  snapshot:async names=>fixtureRepository().snapshot(names),
  insert:async(name,row)=>fixtureRepository().insert(name,row),
  update:async(name,predicate,changes)=>fixtureRepository().update(name,predicate,changes),
  remove:async(name,predicate)=>fixtureRepository().remove(name,predicate),
  applyBatch:async operations=>fixtureRepository().applyBatch(operations),
  transaction:async(_names,work)=>fixtureRepository().transaction(work),
  atomic:async(_names,work)=>work(),
}
const override=new AsyncLocalStorage<ApplicationStore>()
/** Isolate hosted rollback tests without changing the process-wide production adapter. */
export function withApplicationStore<T>(store:ApplicationStore,work:()=>Promise<T>):Promise<T>{return override.run(store,work)}
let postgres:KeyedStore|undefined
/** Every store the app can run on offers keyed reads; a hand-made test store without them falls back to scanning all(). */
export type KeyedStore=ApplicationStore&Required<Pick<ApplicationStore,'where'|'project'|'dueHolds'>>
function keyed(store:ApplicationStore):KeyedStore {
  if(store.where&&store.project&&store.dueHolds)return store as KeyedStore
  return Object.assign(Object.create(store),{
    where:store.where??(async(name:string,criteria:Readonly<Record<string,string>>)=>(await store.all(name)).filter(matches(criteria))),
    project:store.project??(async(name:string,columns:readonly string[])=>(await store.all(name)).map(row=>Object.fromEntries(columns.map(column=>[column,row[column]??''])))),
    dueHolds:store.dueHolds??(async(at:Date)=>(await store.all('bookings')).filter(row=>row.status==='On hold'&&Date.parse(row.hold_expires_at)<=at.getTime())),
  }) as KeyedStore
}
export function demoRepository():KeyedStore {
  if(override.getStore())return keyed(override.getStore()!)
  if(process.env.NODE_ENV==='test'&&process.env.HAB_TEST_POSTGRES!=='1')return fixtures
  return postgres??=keyed(new AsyncPostgresStore(getDbClient()))
}
