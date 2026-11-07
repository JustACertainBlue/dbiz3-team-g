import { connection } from './shared.mjs'
import { safeDatabaseError } from './config.mjs'
const purpose=process.argv.includes('--application')?'application':'migration'
const client=connection(purpose)
try {
  await client.connect()
  const socket=client.connection.stream
  if(!socket.encrypted||!socket.authorized)throw {code:'TLS_NOT_VERIFIED'}
  const result=await client.query("SELECT current_database() AS database, current_setting('server_version') AS postgres_version, current_user AS database_role, (SELECT count(*)::int FROM pg_tables WHERE schemaname='public') AS public_tables")
  console.log(JSON.stringify({connected:true,tlsVerified:true,purpose,...result.rows[0]},null,2))
}catch(error){console.error(safeDatabaseError(error));process.exitCode=1}finally{await client.end()}
