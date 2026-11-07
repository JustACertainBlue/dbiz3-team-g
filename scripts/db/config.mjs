import { readFileSync } from 'node:fs'
import { rootCertificates } from 'node:tls'

/**
 * Server-only config. Parse credentials explicitly so URL SSL options cannot override TLS.
 * @param {Record<string, string | undefined>} [env]
 */
export function databaseConfig(env=process.env, purpose='application') {
  const name=purpose==='migration'?'DATABASE_URL':'DATABASE_APP_URL'
  const value=env[name]
  if(!value)throw new Error(`${name} is not configured`)
  let url
  try{url=new URL(value)}catch{throw new Error(`${name} must be a PostgreSQL URI`)}
  if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error(`${name} must use PostgreSQL`)
  if(/PROJECT[_-]REF|YOUR[_-]PASSWORD|POOLER[_-]HOST|ENCODED_PASSWORD/i.test(value))throw new Error(`${name} still contains placeholders`)
  if(url.hash)throw new Error(`${name} has a URI fragment; encode special password characters`)
  if(url.searchParams.get('sslmode')==='disable')throw new Error('Unencrypted database connections are not supported')
  let user,password,database
  try{user=decodeURIComponent(url.username);password=decodeURIComponent(url.password);database=decodeURIComponent(url.pathname.slice(1))}catch{throw new Error('Invalid database credential URL encoding')}
  if(!user||!password||!database)throw new Error('Database credentials are incomplete')
  if(purpose==='application' && user.split('.')[0]!=='hab_app')throw new Error('Application connection must use the restricted hab_app role')
  return {host:url.hostname,port:Number(url.port||5432),user,password,database,
    ssl:{rejectUnauthorized:true,ca:env.DATABASE_SSL_CA_FILE?readFileSync(env.DATABASE_SSL_CA_FILE,'utf8'):[...rootCertificates,readFileSync(process.cwd()+'/supabase/certs/prod-ca-2021.crt','utf8')]},
    max:5,idleTimeoutMillis:10000,connectionTimeoutMillis:15000,statement_timeout:20000,
    application_name:`hab-${purpose}`}
}

export function safeDatabaseError(error) {
  // PostgreSQL error messages can contain SQL values. Operational output intentionally omits them.
  return `Database operation failed (${typeof error?.code==='string'?error.code:'UNKNOWN'}). No credentials were printed.`
}
