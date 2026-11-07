import { describe,it,expect,vi } from 'vitest'
import { AsyncPostgresStore } from '../../src/lib/db/async-store'

describe('PostgreSQL aggregate transactions',()=>{
  it('writes only changed rows in the explicitly declared aggregate',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('pg_class'))return {rows:[{schema:'public',name:'sessions',columns:[{name:'session_id',nullable:false},{name:'revoked_at',nullable:true}],keys:['session_id']}],rowCount:1}
      if(sql.startsWith('SELECT *'))return {rows:[{session_id:'one',revoked_at:null},{session_id:'two',revoked_at:null}],rowCount:2}
      return {rows:[{session_id:'one',revoked_at:'now'}],rowCount:1}
    })
    const transaction=vi.fn(async(work:any)=>work({query}))
    const store=new AsyncPostgresStore({query:query as any,transaction,close:async()=>{}})
    await store.transaction(['sessions'],tables=>{tables.sessions[0].revoked_at='now'})
    const writes=query.mock.calls.filter(([sql])=>sql.startsWith('UPDATE'))
    expect(writes).toHaveLength(1)
    expect(query.mock.calls.some(([sql])=>sql.includes('pg_advisory_xact_lock'))).toBe(true)
    expect(transaction).toHaveBeenCalledTimes(1)
  })
})
