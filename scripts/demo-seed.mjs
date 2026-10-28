import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parse } from 'csv-parse/sync'

const root = process.cwd()
const seedDir = join(root, 'data', 'seed')
const target = join(root, '.demo-data', 'runtime.json')
const reset = process.argv.includes('--reset')

if (existsSync(target) && !reset) {
  console.log(`Demo database already exists at ${target}. Use npm run demo:reset to replace it.`)
  process.exit(0)
}

const tables = {}
for (const file of readdirSync(seedDir).filter(name => name.endsWith('.csv')).sort()) {
  const table = file.slice(0, -4)
  tables[table] = parse(readFileSync(join(seedDir, file), 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  })
}

const database = {
  meta: {
    format: 'hab-demo-json-v1',
    seeded_at: new Date().toISOString(),
    source: 'data/seed/*.csv',
  },
  tables,
}

mkdirSync(dirname(target), { recursive: true })
const temporary = `${target}.tmp`
writeFileSync(temporary, `${JSON.stringify(database, null, 2)}\n`, 'utf8')
renameSync(temporary, target)
console.log(`Demo database seeded: ${Object.keys(tables).length} tables -> ${target}`)
