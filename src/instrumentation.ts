/** Next.js runs register() once when the server starts (ADR 0001: data is recreated at every start). */
export async function register(): Promise<void> {
  // Keep this exact form: Next.js replaces NEXT_RUNTIME at build time and drops the Node-only import from the
  // edge bundle; an early `return` is not removed and the edge build then fails on node:fs / node:crypto.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureTestAccounts } = await import('./lib/auth/test-accounts')
    await ensureTestAccounts()
  }
}
