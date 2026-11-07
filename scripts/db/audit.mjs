import { command } from './shared.mjs'
await command(async client=>{
  await client.query('BEGIN READ ONLY')
  try{
    const tables=await client.query(`SELECT count(*)::int AS business_tables,
      count(*) FILTER(WHERE c.relrowsecurity)::int AS rls_enabled,
      count(*) FILTER(WHERE has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE'))::int AS anon_accessible,
      count(*) FILTER(WHERE has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE'))::int AS authenticated_accessible
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'`)
    const functions=await client.query("SELECT count(*) FILTER(WHERE p.prosecdef)::int AS definer_functions,count(*) FILTER(WHERE has_function_privilege('anon',p.oid,'EXECUTE'))::int AS anon_executable FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('chat_message_not_closed','chat_message_immutable','booking_group_within_capacity')")
    const row=tables.rows[0]
    if(row.business_tables!==47||row.rls_enabled!==47||row.anon_accessible||row.authenticated_accessible||functions.rows[0].definer_functions||functions.rows[0].anon_executable)throw {code:'DATABASE_SECURITY_AUDIT_FAILED'}
    console.log(JSON.stringify({passed:true,...row,...functions.rows[0]},null,2))
    await client.query('COMMIT')
  }catch(error){await client.query('ROLLBACK');throw error}
})
