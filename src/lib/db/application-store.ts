import { AsyncPostgresStore } from './async-store'
import { getDbClient } from './client'
import { demoRepository as fixtureRepository } from '../demo/json-repository'
import type { BatchOperation, DemoRow } from '../demo/types'
import { AsyncLocalStorage } from 'node:async_hooks'

export interface ApplicationStore {
  all(name:string):Promise<DemoRow[]>
  find(name:string,predicate:(row:DemoRow)=>boolean):Promise<DemoRow|undefined>
  snapshot(names:readonly string[]):Promise<Record<string,DemoRow[]>>
  insert(name:string,row:DemoRow):Promise<DemoRow>
  update(name:string,predicate:(row:DemoRow)=>boolean,changes:Partial<DemoRow>):Promise<DemoRow|undefined>
  remove(name:string,predicate:(row:DemoRow)=>boolean):Promise<number>
  applyBatch(operations:readonly BatchOperation[]):Promise<DemoRow[]>
  transaction<T>(names:readonly string[],work:(tables:Record<string,DemoRow[]>)=>T):Promise<T>
  atomic<T>(names:readonly string[],work:()=>Promise<T>):Promise<T>
}

// Ordinary tests explicitly use isolated fixtures. Live failures never fall back to JSON.
const fixtures:ApplicationStore={
  all:async name=>fixtureRepository().all(name),
  find:async(name,predicate)=>fixtureRepository().find(name,predicate),
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
let postgres:ApplicationStore|undefined
export function demoRepository():ApplicationStore {
  if(override.getStore())return override.getStore()!
  if(process.env.NODE_ENV==='test'&&process.env.HAB_TEST_POSTGRES!=='1')return fixtures
  if(!process.env.DATABASE_APP_URL)return fixtures
  return postgres??=new AsyncPostgresStore(getDbClient())
}
