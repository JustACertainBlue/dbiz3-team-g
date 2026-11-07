import nextEnv from '@next/env'
import pg from 'pg'
import { databaseConfig, safeDatabaseError } from './config.mjs'
nextEnv.loadEnvConfig(process.cwd())
export function connection(purpose='migration'){return new pg.Client(databaseConfig(process.env,purpose))}
export async function command(work){let client;try{client=connection();await client.connect();await work(client)}catch(error){console.error(safeDatabaseError(error));process.exitCode=1}finally{if(client)await client.end()}}
