// npm run db:set-test-passwords — manual, one-off (ADR 0001; docs/test/test-plan.md §3). Not run at app start.
// Connects with DATABASE_APP_URL (restricted hab_app login) and creates or updates the synthetic test accounts
// planned by test-accounts.mjs. Names and passwords come from environment variables (see .env.example);
// passwords are never printed. Check the printed target database before relying on the result:
// nothing here tells a development database from the production one.
// `-- --lecturer [--dry-run] [--reset-passwords]` runs the lecturer mode instead (lecturer-accounts.mjs): it refuses to
// connect unless HAB_EXPECT_PROJECT_REF matches the project ref in DATABASE_APP_URL, and prints generated passwords once,
// to an interactive terminal only.
import bcrypt from 'bcryptjs'
import { connection } from './shared.mjs'
import { safeDatabaseError } from './config.mjs'
import { applyTestAccounts, planTestAccounts } from './test-accounts.mjs'
import { lecturerPreflight, runLecturer } from './lecturer-accounts.mjs'

const IDENTIFIER = /^[a-z][a-z0-9_]*$/
const quote = name => { if (!IDENTIFIER.test(name)) throw new Error('Invalid identifier'); return `"${name}"` }
const where = (criteria, start) => {
  const entries = Object.entries(criteria)
  return { sql: entries.map(([key], index) => `${quote(key)} IS NOT DISTINCT FROM $${start + index}`).join(' AND '), values: entries.map(([, value]) => value) }
}
const sqlValue = value => value !== null && typeof value === 'object' ? JSON.stringify(value) : value

function postgresPort(client) {
  return {
    async findAll(table, criteria) {
      const filter = where(criteria, 1)
      return (await client.query(`SELECT * FROM public.${quote(table)} WHERE ${filter.sql}`, filter.values)).rows
    },
    async findOne(table, criteria) {
      const filter = where(criteria, 1)
      return (await client.query(`SELECT * FROM public.${quote(table)} WHERE ${filter.sql} LIMIT 1`, filter.values)).rows[0]
    },
    async insert(table, row) {
      const entries = Object.entries(row)
      await client.query(`INSERT INTO public.${quote(table)} (${entries.map(([key]) => quote(key)).join(',')}) VALUES (${entries.map((_, index) => `$${index + 1}`).join(',')})`, entries.map(([, value]) => sqlValue(value)))
    },
    async update(table, criteria, changes) {
      if (!Object.keys(criteria).length) throw new Error('Unscoped updates are forbidden')
      const entries = Object.entries(changes)
      const filter = where(criteria, entries.length + 1)
      return (await client.query(`UPDATE public.${quote(table)} SET ${entries.map(([key], index) => `${quote(key)}=$${index + 1}`).join(',')} WHERE ${filter.sql}`, [...entries.map(([, value]) => sqlValue(value)), ...filter.values])).rowCount
    },
    async transaction(work) {
      await client.query('BEGIN')
      try { const value = await work(); await client.query('COMMIT'); return value } catch (error) { await client.query('ROLLBACK'); throw error }
    },
  }
}

const FLAGS = ['--lecturer', '--dry-run', '--reset-passwords']
const args = process.argv.slice(2)
const deps = { hash: plain => bcrypt.hash(plain, 12), verify: (plain, hash) => bcrypt.compare(plain, hash), now: () => new Date(), log: console }

async function lecturer(options) {
  // Before any connection: wrong project ref, missing village, or a non-terminal stdout stop here.
  const { projectRef } = lecturerPreflight(process.env)
  if (!options.dryRun && !process.stdout.isTTY) throw new Error('Passwords are printed only to an interactive terminal; run without redirecting or piping the output. Nothing was changed.')
  const client = connection('application')
  console.log(`[lecturer] target database: ${client.host}/${client.database}, project ref ${projectRef} (matches HAB_EXPECT_PROJECT_REF)`)
  await client.connect()
  try {
    const result = await runLecturer(postgresPort(client), process.env, deps, options)
    for (const line of result.lines) console.log(line)
    if (options.dryRun) { console.log('[lecturer] dry run: nothing was written.'); return }
    if (!result.credentials.length) { console.log('[lecturer] no password changed (use --reset-passwords to set new ones).'); return }
    process.stdout.write('\n=== Tester logins: shown once, not saved anywhere. Copy them now. ===\n')
    for (const { email, password } of result.credentials) process.stdout.write(`${email}  ${password}\n`)
    process.stdout.write('=== end ===\n\n')
  } finally { await client.end().catch(() => undefined) }
}

let client
try {
  const unknown = args.filter(arg => !FLAGS.includes(arg))
  if (unknown.length) throw new Error(`Unknown option(s): ${unknown.join(' ')}`)
  if (!args.includes('--lecturer') && args.length) throw new Error('--dry-run and --reset-passwords are only available with --lecturer. Nothing was changed.')
  if (args.includes('--lecturer')) {
    await lecturer({ dryRun: args.includes('--dry-run'), resetPasswords: args.includes('--reset-passwords') })
  } else {
  client = connection('application')
  console.log(`[test-accounts] target database: ${client.host}/${client.database}`)
  await client.connect()
  const plan = planTestAccounts(process.env, console)
  const result = await applyTestAccounts(postgresPort(client), plan, deps)
  const outcomes = Object.values(result)
  console.log(`[test-accounts] done: ${outcomes.filter(o => o === 'created').length} created, ${outcomes.filter(o => o === 'updated').length} updated, ${outcomes.filter(o => o === 'unchanged').length} unchanged, ${outcomes.filter(o => o === 'skipped').length} skipped.`)
  if (outcomes.includes('skipped')) process.exitCode = 2
  }
} catch (error) {
  // Guard and plan errors carry no credential or SQL value; database errors are reduced to their code.
  console.error(error?.code ? safeDatabaseError(error) : `[test-accounts] ${error?.message ?? error}`); process.exitCode = 1
} finally {
  if (client) await client.end().catch(() => undefined)
}
