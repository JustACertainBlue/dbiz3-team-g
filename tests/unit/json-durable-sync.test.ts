import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, cpSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { buildSync } from 'esbuild'
import { JsonDemoRepository } from '../../src/lib/demo/json-repository'

describe('durable JSON synchronization', () => {
  it('refreshes stale readers and serializes independent processes without lost inserts', async () => {
    const root = mkdtempSync(join(tmpdir(), 'hab-sync-'))
    try {
      mkdirSync(join(root, 'data'))
      cpSync(join(process.cwd(), 'data', 'seed'), join(root, 'data', 'seed'), { recursive: true })
      const first = new JsonDemoRepository(root, { volatile: false })
      const second = new JsonDemoRepository(root, { volatile: false })
      first.insert('sync_probe', { id: 'first' })
      second.insert('sync_probe', { id: 'second' })
      expect(first.all('sync_probe')).toHaveLength(2)
      const bundle = buildSync({ entryPoints: ['src/lib/demo/json-repository.ts'], bundle: true, platform: 'node', format: 'cjs', write: false }).outputFiles[0].text
      const script = bundle + ';const repo = new module.exports.JsonDemoRepository(process.argv[2], {volatile:false});for(let i=0;i<15;i++)repo.insert("sync_probe",{id:process.argv[3]+i});'
      await Promise.all(['a','b','c'].map(prefix => new Promise<void>((resolve, reject) => {
        const child = spawn(process.execPath, ['-', root, prefix], { stdio: ['pipe','ignore','pipe'] })
        child.stdin.end(script)
        let error = ''; child.stderr.on('data', data => { error += data })
        child.on('error', reject)
        child.on('exit', code => code === 0 ? resolve() : reject(new Error(error)))
      })))
      expect(first.all('sync_probe')).toHaveLength(47)
      expect(new Set(first.all('sync_probe').map(row => row.id)).size).toBe(47)
      expect(second.all('sync_probe')).toHaveLength(47)
    } finally { rmSync(root, { recursive: true, force: true }) }
  }, 20000)
})
