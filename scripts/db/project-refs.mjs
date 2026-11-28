// The only place a Supabase project ref is written (human decision 2026-11-28, docs/build/prod-migrate-supabase.md §1.1).
// Every guard imports from here; the other modules re-export what their callers already import.
//  - DEV_PROJECT_REF: the development project (old organisation).
//  - PROD_PROJECT_REF: the production project since 2026-11-28 (own organisation, Singapore).
//  - RETIRED_PROJECT_REFS: former production projects. They are refused outright, before any other comparison, with or
//    without --target-prod or CONFIRM_PROJECT_REF, so that a stale .env can never write to them.
// The refs are constants on purpose: CONFIRM_PROJECT_REF is only a guard while it is compared with a value the shell cannot set.
export const DEV_PROJECT_REF = 'jfrpnffknjpgmkyquxql'
export const PROD_PROJECT_REF = 'pdeioligjeksgfnodgzs'
export const RETIRED_PROJECT_REFS = Object.freeze(['euxclvszgiknjosbwjya'])

/**
 * Throws when `value` (a database URI, a Supabase URL or a bare ref) names a retired project. The match is a plain substring
 * test on the 20-character ref, so pooler users (`user.<ref>`), direct hosts (`db.<ref>.supabase.co`) and project URLs are all
 * caught. Only the label and the ref appear in the message, never the value (it can hold a password).
 * @param {string} label name of the setting, e.g. 'DATABASE_URL'
 * @param {string | undefined} value
 */
export function assertNoRetiredRef(label, value) {
  if (!value) return
  const text = String(value)
  const hit = RETIRED_PROJECT_REFS.find(ref => text.includes(ref))
  if (hit) throw new Error(`${label} names project ref "${hit}", which is retired (former PROD) and is never a valid target. Nothing was changed.`)
}
