// HAB_DISABLE_SCHEDULERS=1 turns off in-process background jobs (the hold-expiry scanner). Unset = on, which is
// the production default. Reads still expire due holds, so switching the scanner off never changes a result,
// it only stops a developer's idle dev server from polling the shared database every minute.
export function schedulersEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.HAB_DISABLE_SCHEDULERS !== '1'
}
