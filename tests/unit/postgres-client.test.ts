import { describe, expect, it, vi } from 'vitest'
import { createDbClient } from '@/lib/db/client'

function fixture(failCommit=false) {
  const release=vi.fn()
  const connection={query:vi.fn(async(sql:string)=>{
    if(failCommit && sql==='COMMIT') throw new Error('commit failed')
    return {rows:[{ok:true}],rowCount:1}
  }),release}
  const pool={query:vi.fn(async()=>({rows:[],rowCount:0})),connect:vi.fn(async()=>connection),end:vi.fn(async()=>{})}
  return {pool,connection,release,db:createDbClient(pool as never)}
}
describe('PostgreSQL transaction boundaries',()=>{
  it('joins nested service operations and ambient queries to the same connection',async()=>{
    const {db,pool,connection}=fixture()
    await db.transaction(async()=>{
      await db.query('SELECT outer_operation')
      await db.transaction(async()=>{await db.query('SELECT nested_operation')})
    })
    expect(pool.connect).toHaveBeenCalledOnce()
    expect(pool.query).not.toHaveBeenCalled()
    expect(connection.query.mock.calls.map(call=>call[0])).toEqual(['BEGIN','SELECT outer_operation','SELECT nested_operation','COMMIT'])
  })
  it('uses one checked-out connection for BEGIN, work and COMMIT, then releases it',async()=>{
    const {db,pool,connection,release}=fixture()
    const value=await db.transaction(async tx=>(await tx.query('SELECT $1::int AS value',[3])).rows)
    expect(value).toEqual([{ok:true}])
    expect(connection.query.mock.calls.map(call=>call[0])).toEqual(['BEGIN','SELECT $1::int AS value','COMMIT'])
    expect(pool.query).not.toHaveBeenCalled();expect(release).toHaveBeenCalledOnce()
  })
  it('rolls back a failed operation and releases the connection',async()=>{
    const {db,connection,release}=fixture()
    await expect(((db.transaction(async()=>{throw new Error('business failure')})))).rejects.toThrow('business failure')
    expect(connection.query.mock.calls.map(call=>call[0])).toEqual(['BEGIN','ROLLBACK'])
    expect(release).toHaveBeenCalledOnce()
  })
  it('rolls back deferred constraint failures raised at commit',async()=>{
    const {db,connection,release}=fixture(true)
    await expect(((db.transaction(async()=>true)))).rejects.toThrow('commit failed')
    expect(connection.query.mock.calls.map(call=>call[0])).toEqual(['BEGIN','COMMIT','ROLLBACK'])
    expect(release).toHaveBeenCalledOnce()
  })
})
