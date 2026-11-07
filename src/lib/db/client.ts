import { Pool, type QueryResultRow } from 'pg'
import { AsyncLocalStorage } from 'node:async_hooks'
import { databaseConfig } from '../../../scripts/db/config.mjs'

export interface SqlExecutor {
  query<T extends QueryResultRow=QueryResultRow>(sql:string,params?:unknown[]):Promise<{rows:T[];rowCount:number|null}>
}
export interface DbClient extends SqlExecutor {
  transaction<T>(work:(connection:SqlExecutor)=>Promise<T>):Promise<T>
  close():Promise<void>
}

export function createDbClient(pool:Pool):DbClient {
  const active=new AsyncLocalStorage<SqlExecutor>()
  return {
    query:(sql,params)=>(active.getStore()??pool).query(sql,params),
    async transaction(work) {
      const existing=active.getStore()
      if(existing)return work(existing)
      const connection=await pool.connect()
      // Parallel service reads still share one transaction connection. Queue them explicitly:
      // pg 9 will no longer accept overlapping client.query calls.
      let tail:Promise<unknown>=Promise.resolve()
      const serial:SqlExecutor={query(sql,params){
        const result=tail.then(()=>connection.query(sql,params))
        tail=result.then(()=>undefined,()=>undefined)
        return result
      }}
      let released=false
      try {
        await connection.query('BEGIN')
        const result=await active.run(serial,()=>work(serial))
        await serial.query('COMMIT')
        return result
      }catch(error){
        try{await serial.query('ROLLBACK')}catch{connection.release(true);released=true;throw error}
        throw error
      }finally{if(!released)connection.release()}
    },
    close:()=>pool.end(),
  }
}

declare global { var __habPostgresClient:DbClient|undefined }
export function getDbClient():DbClient {
  if(!globalThis.__habPostgresClient) {
    const pool=new Pool(databaseConfig(process.env))
    pool.on('error',()=>console.error('PostgreSQL idle connection error; reconnect on the next request.'))
    globalThis.__habPostgresClient=createDbClient(pool)
  }
  return globalThis.__habPostgresClient
}
