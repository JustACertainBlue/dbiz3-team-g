import { beforeEach,describe,expect,it } from 'vitest'
import { NextRequest } from 'next/server'
import { demoRepository } from '@/lib/demo/json-repository'
import { demoRuntime } from '@/lib/explore/demo-runtime'
import { POST } from '@/app/api/explore/events/route'

describe('persisted Explore session ownership',()=>{
  beforeEach(()=>demoRepository().reset())
  it('refuses a retained Agency tracking cookie after switching to a Provider',async()=>{
    const engine=await demoRuntime()
    const session=await engine.startSession({kind:'agency',agencyId:'02e568d8-d65e-54b1-a554-b411150d1dcb'},true)
    const before=demoRepository().all('explore_interactions').length
    const response=await POST(new NextRequest('http://localhost/api/explore/events',{method:'POST',headers:{cookie:`hab_demo_account=provider; explore_session=${session.session_id}`,'content-type':'application/json'},body:JSON.stringify({event_id:'synthetic-event',action_type:'scroll'})}))
    expect(response.status).toBe(403)
    expect(demoRepository().all('explore_interactions')).toHaveLength(before)
  })
})
