import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Issue #96 (defect source #6: environment difference). On Windows, mkdir of the lock directory returns
// EPERM (not EEXIST) while another writer is still removing it. The shared JSON runtime must treat that as
// contention and retry within the same 5 s deadline as EEXIST, but still throw a real EPERM when no lock
// directory exists and the error repeats. `mkdirSync` is wrapped so each case can inject the Windows error.
const real = vi.hoisted(() => ({ mkdir: null as null | typeof fs.mkdirSync }))
const inject = vi.hoisted(() => ({ handler: null as null | ((path: string) => 'real' | Error) }))
vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>()
  real.mkdir = actual.mkdirSync
  const mkdirSync = ((path: fs.PathLike, options?: fs.MakeDirectoryOptions) => {
    const decision = String(path).endsWith('.lock') && inject.handler ? inject.handler(String(path)) : 'real'
    if (decision instanceof Error) throw decision
    return actual.mkdirSync(path, options as never)
  }) as typeof fs.mkdirSync
  return { ...actual, mkdirSync, default: { ...actual, mkdirSync } }
})

import { JsonDemoRepository } from '../../src/lib/demo/json-repository'

const eperm = (path: string) => Object.assign(new Error(`EPERM: operation not permitted, mkdir '${path}'`), { code: 'EPERM', syscall: 'mkdir', path })
let root = ''

describe('#96 JSON runtime lock | Windows EPERM during lock contention', () => {
  beforeEach(() => {
    root = fs.mkdtempSync(join(tmpdir(), 'hab-lock-'))
    fs.mkdirSync(join(root, 'data'))
    fs.cpSync(join(process.cwd(), 'data', 'seed'), join(root, 'data', 'seed'), { recursive: true })
  })
  afterEach(() => { inject.handler = null; fs.rmSync(root, { recursive: true, force: true }) })

  it('EPERM once while another writer still holds the lock directory, then success → the lock is acquired', () => {
    let calls = 0
    inject.handler = path => {
      calls++
      if (calls === 1) { real.mkdir!(path); return eperm(path) }       // the other writer's lock exists
      if (calls === 2) fs.rmdirSync(path)                               // …and is released before the retry
      return 'real'
    }
    const repo = new JsonDemoRepository(root, { volatile: false })
    expect(calls).toBeGreaterThanOrEqual(2)
    expect(repo.all('villages').length).toBeGreaterThan(0)
    expect(fs.existsSync(join(root, '.demo-data', 'runtime.json.lock'))).toBe(false)
  })

  it('EPERM once while the lock directory is being deleted (already gone), then success → the lock is acquired', () => {
    let calls = 0
    inject.handler = path => (++calls === 1 ? eperm(path) : 'real')
    const repo = new JsonDemoRepository(root, { volatile: false })
    expect(calls).toBe(2)
    expect(repo.all('villages').length).toBeGreaterThan(0)
  })

  it('EPERM that repeats with no lock directory (no contention) → the real EPERM is thrown, well before the 5 s deadline', () => {
    let calls = 0
    inject.handler = path => { calls++; return eperm(path) }
    const started = Date.now()
    expect(() => new JsonDemoRepository(root, { volatile: false })).toThrow(/EPERM/)
    expect(Date.now() - started).toBeLessThan(1000)
    expect(calls).toBeLessThan(5)
  })

  it('EPERM repeated while the other writer keeps the lock directory (boundary) → keeps waiting, then acquires it', () => {
    let calls = 0
    inject.handler = path => {
      calls++
      if (calls === 1) real.mkdir!(path)
      if (calls <= 3) return eperm(path)
      if (calls === 4) fs.rmdirSync(path)
      return 'real'
    }
    expect(new JsonDemoRepository(root, { volatile: false }).all('villages').length).toBeGreaterThan(0)
    expect(calls).toBe(4)
  })

  it('EACCES once while the lock directory is being deleted, then success → the lock is acquired (same rule as EPERM)', () => {
    let calls = 0
    inject.handler = path => (++calls === 1 ? Object.assign(eperm(path), { code: 'EACCES' }) : 'real')
    expect(new JsonDemoRepository(root, { volatile: false }).all('villages').length).toBeGreaterThan(0)
    expect(calls).toBe(2)
  })

  it('EEXIST contention still waits and acquires the lock (unchanged behaviour)', () => {
    let calls = 0
    inject.handler = path => {
      calls++
      if (calls === 1) { real.mkdir!(path); return 'real' }             // real mkdir now fails with EEXIST
      if (calls === 2) fs.rmdirSync(path)
      return 'real'
    }
    // calls 1: create dir then real mkdir → EEXIST thrown by fs; call 2: dir removed, real mkdir succeeds.
    const repo = new JsonDemoRepository(root, { volatile: false })
    expect(calls).toBe(2)
    expect(repo.all('villages').length).toBeGreaterThan(0)
  })
})
