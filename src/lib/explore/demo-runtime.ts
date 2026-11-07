import { ExploreRuntime } from './runtime'
import { loadExploreRuntime } from './seed-repository'
import { demoRepository } from '../db/application-store'
import type { ExploreSeed, Viewer } from './catalog'

const stateTables=['explore_sessions','explore_interactions','agency_preference_profiles'] as const
class PersistentExploreRuntime {
  constructor(private seed:ExploreSeed){}
  private read(){return new ExploreRuntime(this.seed,true)}
  private async write<T>(work:(engine:ExploreRuntime)=>T):Promise<T>{
    return (await demoRepository().transaction(stateTables,tables=>{
      const engine=new ExploreRuntime({...this.seed,...tables},true)
      const result=work(engine);engine.persistInto(tables);this.seed=structuredClone({...this.seed,...tables});return result
    }))
  }
  async sessionFor(id:string){return this.read().sessionFor(id)}
  async eventsFor(id:string){return this.read().eventsFor(id)}
  async resultsFor(id:string){return this.read().resultsFor(id)}
  async startSession(viewer:Viewer,consent:boolean){return (await this.write(engine=>engine.startSession(viewer,consent)))}
  async recordEvent(id:string,input:Parameters<ExploreRuntime['recordEvent']>[1]){return (await this.write(engine=>engine.recordEvent(id,input)))}
}
export async function demoRuntime(){return new PersistentExploreRuntime(await loadExploreRuntime())}
