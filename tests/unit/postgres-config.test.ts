import { describe,expect,it } from 'vitest'
import { databaseConfig,safeDatabaseError } from '../../scripts/db/config.mjs'
const env={DATABASE_APP_URL:'postgresql://hab_app.fixture:synthetic%40password@localhost:5432/postgres'}
describe('PostgreSQL configuration',()=>{
  it('decodes credentials and uses verified TLS and bounded pooling',()=>{
    const config=databaseConfig(env)
    expect(config).toMatchObject({user:'hab_app.fixture',password:'synthetic@password',max:5,ssl:{rejectUnauthorized:true}})
  })
  it('refuses privileged owner credentials for application queries',()=>{
    expect(()=>databaseConfig({DATABASE_APP_URL:'postgresql://postgres.fixture:synthetic@localhost/postgres'})).toThrow('restricted hab_app')
  })
  it('fails closed on missing config, placeholders, malformed encoding and unencrypted URLs',()=>{
    expect(()=>databaseConfig({})).toThrow('not configured')
    expect(()=>databaseConfig({DATABASE_APP_URL:'postgresql://hab_app.fixture:YOUR-PASSWORD@localhost/postgres'})).toThrow('placeholders')
    expect(()=>databaseConfig({DATABASE_APP_URL:'postgresql://hab_app.fixture:%ZZ@localhost/postgres'})).toThrow('encoding')
    expect(()=>databaseConfig({DATABASE_APP_URL:env.DATABASE_APP_URL+'?sslmode=disable'})).toThrow('Unencrypted')
  })
  it('does not copy database messages or credentials into operational errors',()=>{
    expect(safeDatabaseError({code:'28P01',message:'synthetic secret'})).toContain('28P01')
    expect(safeDatabaseError({code:'28P01',message:'synthetic secret'})).not.toContain('synthetic secret')
  })
})
