import { describe,expect,it,vi } from 'vitest'
import { legacyRow,PostgresRepository } from '@/lib/db/repository'
describe('PostgreSQL repository contract',()=>{
  it('normalizes native SQL types at the legacy service boundary',()=>{
    expect(legacyRow({missing:null,active:true,count:3,created:new Date('2026-11-07T00:00:00Z'),json:{a:1}})).toEqual({missing:'',active:'true',count:'3',created:'2026-11-07T00:00:00.000Z',json:'{"a":1}'})
  })
  it('parameterizes filter values and applies pagination in the database',async()=>{
    const query=vi.fn(async()=>({rows:[],rowCount:0})),repo=new PostgresRepository({query} as never)
    await repo.list('experiences',{provider_id:"synthetic' OR TRUE --"},{limit:20,offset:40})
    expect(query.mock.calls[0]).toEqual(['SELECT * FROM public."experiences" WHERE "provider_id" IS NOT DISTINCT FROM $1 LIMIT $2 OFFSET $3',["synthetic' OR TRUE --",20,40]])
  })
  it('rejects identifiers and unscoped writes before calling the database',async()=>{
    const query=vi.fn(),repo=new PostgresRepository({query} as never)
    await expect(((repo.list('experiences;DROP TABLE roles')))).rejects.toThrow('identifier')
    await expect(((repo.update('experiences',{}, {name:'synthetic'})))).rejects.toThrow('Unscoped')
    await expect(((repo.remove('experiences',{})))).rejects.toThrow('Unscoped')
    expect(query).not.toHaveBeenCalled()
  })
})
