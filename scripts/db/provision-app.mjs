import { readFileSync,appendFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { command } from './shared.mjs'

// Provision once; never rotate an existing app password on an ordinary rerun.
await command(async client=>{
  const env=readFileSync('.env.local','utf8')
  if(/^\s*DATABASE_APP_URL\s*=/m.test(env)){console.log('DATABASE_APP_URL already exists; no credentials changed.');return}
  const role=await client.query("SELECT rolcanlogin,rolsuper,rolcreaterole,rolcreatedb,rolbypassrls FROM pg_roles WHERE rolname='hab_app'")
  if(role.rowCount!==1||role.rows[0].rolcanlogin)throw {code:'APP_ROLE_NOT_READY'}
  if(role.rows[0].rolsuper||role.rows[0].rolcreaterole||role.rows[0].rolcreatedb||role.rows[0].rolbypassrls)throw {code:'APP_ROLE_TOO_PRIVILEGED'}
  const password=randomBytes(32).toString('hex')
  const url=new URL(process.env.DATABASE_URL)
  const adminUser=decodeURIComponent(url.username)
  url.username=adminUser.includes('.')?`hab_app.${adminUser.split('.').slice(1).join('.')}`:'hab_app'
  url.password=password
  await client.query('BEGIN')
  try{
    // Password is generated hex, never user input, and is never printed or committed.
    await client.query(`ALTER ROLE hab_app LOGIN PASSWORD '${password}'`)
    appendFileSync('.env.local',`\n# Restricted server application login. Keep DATABASE_URL for migration commands only.\nDATABASE_APP_URL="${url.toString()}"\n`,{mode:0o600})
    await client.query('COMMIT')
    console.log('Restricted application login created; credentials saved only in git-ignored .env.local.')
  }catch(error){await client.query('ROLLBACK');throw error}
})
