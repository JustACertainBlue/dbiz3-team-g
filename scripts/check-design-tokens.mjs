// Warn-only check (not part of CI yet): hard-coded colours outside src/app/tokens.css.
// New UI code should use var(--...) tokens. Exit code is always 0; the list is a migration to-do.
// Usage: npm run lint:tokens            (summary per file)
//        npm run lint:tokens -- --all   (also print each occurrence)
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(process.cwd(), 'src')
const TOKENS = join(ROOT, 'app', 'tokens.css')
const COLOUR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z_-])|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}/g
const showAll = process.argv.includes('--all')

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* files(path)
    else if (/\.(css|tsx|ts)$/.test(name) && path !== TOKENS) yield path
  }
}

let total = 0
const perFile = []
for (const path of files(ROOT)) {
  const lines = readFileSync(path, 'utf8').split('\n')
  const hits = []
  lines.forEach((line, i) => { for (const m of line.matchAll(COLOUR)) hits.push(`${i + 1}: ${m[0]}`) })
  if (hits.length) { perFile.push([relative(process.cwd(), path), hits]); total += hits.length }
}
perFile.sort((a, b) => b[1].length - a[1].length)
for (const [file, hits] of perFile) {
  console.warn(`warning  ${file}: ${hits.length} hard-coded colour(s); use var(--...) from src/app/tokens.css`)
  if (showAll) for (const h of hits) console.warn(`           ${h}`)
}
console.warn(`\n${total} hard-coded colour(s) in ${perFile.length} file(s) outside src/app/tokens.css (warning only).`)
