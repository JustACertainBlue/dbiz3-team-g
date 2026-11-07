import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { GET as getExperience } from '@/app/api/prf/experience/[experienceId]/route'
import { GET as getVillage } from '@/app/api/demo/villages/[id]/route'
import { providerSession, guestSession, agencyOwnerSession, demoCookie } from '../helpers/mockSession'

const repo=demoRepository(),owner=providerSession()
beforeEach(()=>repo.reset())
describe('Provider UX API boundaries',()=>{
  it('keeps owner management detail private, including deletion and discount information',async()=>{
    const exp=repo.all('experiences').find(row=>row.provider_id===owner.providerId)!
    for(const actor of [guestSession(),agencyOwnerSession(),providerSession()]) {
      const response=await getExperience(new Request(`http://localhost/api/prf/experience/${exp.experience_id}`,{headers:{cookie:demoCookie(actor)}}),{params:{experienceId:exp.experience_id}})
      expect(response.status).toBe(actor.role==='LocalProvider'?200:403)
    }
    const other=repo.all('experiences').find(row=>row.provider_id!==owner.providerId)!
    const response=await getExperience(new Request(`http://localhost/api/prf/experience/${other.experience_id}`,{headers:{cookie:demoCookie(owner)}}),{params:{experienceId:other.experience_id}})
    expect(response.status).toBe(404)
  })
  it('links Village featured experiences to eligible Providers without exposing prices',async()=>{
    const provider=repo.find('provider_profiles',row=>row.provider_id===owner.providerId)!
    const response=getVillage(new Request('http://localhost'),{params:{id:provider.village_id}})
    const body=await response.json()
    expect(body.featured_experiences.length).toBeGreaterThan(0)
    for(const experience of body.featured_experiences) {
      expect(experience).not.toHaveProperty('price_per_person')
      const row=repo.find('experiences',item=>item.experience_id===experience.experience_id)!
      expect(body.providers.map((item:{provider_id:string})=>item.provider_id)).toContain(row.provider_id)
      expect(row.archived_at).toBeFalsy()
    }
    repo.update('user_accounts',row=>row.user_id===owner.userId,{account_status:'Suspended'})
    const hidden=await getVillage(new Request('http://localhost'),{params:{id:provider.village_id}}).json()
    expect(hidden.providers.map((row:{provider_id:string})=>row.provider_id)).not.toContain(owner.providerId)
    repo.update('villages',row=>row.village_id===provider.village_id,{is_active:'false'})
    expect(await getVillage(new Request('http://localhost'),{params:{id:provider.village_id}}).json()).toMatchObject({providers:[],featured_experiences:[]})
  })
})
