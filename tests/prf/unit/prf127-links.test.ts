/**
 * Issue #217 — PRF127 Provider Profile navigation (screen-spec-PRF127.md:33-34 §3 #7 "Experiences | Button / navigation |
 * Own Experience management", #8 "Village | Button / navigation | Read-only village"; :51-52 §5 "Experiences → EXP067",
 * "Village → VIL030"; §1 "The Village name links to Village Profile").
 * EXP067 is the owner's management screen (/provider/{id}/experiences); VIL030 (/village/{id}) is for
 * Tour Agency / Local Provider / Admin (screen-spec-VIL030.md:7), so a Guest gets no Village link.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { providerPageView } from '@/lib/prf/provider-page-view'
import { sessionContextFor } from '@/lib/auth/session'
import { agencyOwnerSession, guestSession, providerSession, ubndSession, SEED_IDS } from '../helpers/mockSession'

const BAT_TRANG = SEED_IDS.provider1Verified
const profile = { provider_id: BAT_TRANG, verification_status: 'Verified', village_id: SEED_IDS.village1 }
const owner = (await sessionContextFor(providerSession(BAT_TRANG, SEED_IDS.provider1VerifiedUserId)))

describe('#217 | PRF127 Experiences → EXP067 and Village → VIL030', () => {
  it('the owner gets the Experiences link to EXP067', () => {
    expect(providerPageView(profile, owner).experiencesHref).toBe(`/provider/${BAT_TRANG}/experiences`)
  })

  it('other viewers get no Experiences management link', async () => {
    for (const viewer of [(await sessionContextFor(agencyOwnerSession())), (await sessionContextFor(ubndSession(SEED_IDS.village1))), (await sessionContextFor(guestSession()))]) {
      expect(providerPageView(profile, viewer).experiencesHref).toBeNull()
    }
  })

  it('signed-in viewers get the Village link to VIL030; a Guest or a profile without village gets none', async () => {
    expect(providerPageView(profile, owner).villageHref).toBe(`/village/${SEED_IDS.village1}`)
    expect(providerPageView(profile, (await sessionContextFor(agencyOwnerSession()))).villageHref).toBe(`/village/${SEED_IDS.village1}`)
    expect(providerPageView(profile, (await sessionContextFor(guestSession()))).villageHref).toBeNull()
    expect(providerPageView({ provider_id: BAT_TRANG }, owner).villageHref).toBeNull()
  })

  it('the page renders both links from the view', () => {
    const page = readFileSync('src/app/provider/[providerId]/page.tsx', 'utf8')
    expect(page).toMatch(/<Link href=\{view\.experiencesHref\}[^>]*>[^<]*<\/Link>/)
    expect(page).toMatch(/<Link href=\{view\.villageHref\}[^>]*>\{village\}<\/Link>/)
  })
})
