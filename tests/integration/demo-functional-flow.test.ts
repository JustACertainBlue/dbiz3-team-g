import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { createChatHandoff, createQuoteHandoff, listConversations, sendConversationMessage } from '@/lib/demo/commercial-handoff-service'
import { demoRepository } from '@/lib/demo/json-repository'
import { createExperience, deleteExperience } from '@/lib/prf/experience-service'
import { reviewProvider } from '@/lib/prf/provider-service'
import { buildExplorePage } from '@/lib/explore/catalog'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'

const experienceId = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
const pendingProviderId = '3a5d2ffc-79fa-5b75-a1e6-82beea3bed59'

describe('functional demo foundation', () => {
  beforeEach(() => demoRepository().reset())

  it('creates one Quote, reuses the pair Chat, keeps Experience context, and never creates a Booking', () => {
    const repository = demoRepository()
    const bookingsBefore = repository.all('bookings').length
    const first = createQuoteHandoff(DEMO_IDENTITIES.agency, experienceId)
    const second = createQuoteHandoff(DEMO_IDENTITIES.agency, experienceId)

    expect(first.is_new_request).toBe(true)
    expect(second).toMatchObject({ quote_request_id: first.quote_request_id, chat_session_id: first.chat_session_id, is_new_request: false })
    expect(repository.all('bookings')).toHaveLength(bookingsBefore)
    const conversation = listConversations(DEMO_IDENTITIES.agency).find(row => row.chat_session_id === first.chat_session_id)
    expect(conversation).toMatchObject({ experience_id: experienceId, quote_request_id: first.quote_request_id })
    expect(conversation?.messages[0].text).toContain('Nặn gốm thủ công')
  })

  it('opens direct Chat without creating a Quote and persists a reply for both participants', () => {
    const repository = demoRepository()
    const quotesBefore = repository.all('quote_requests').length
    const handoff = createChatHandoff(DEMO_IDENTITIES.agency, experienceId)
    sendConversationMessage(DEMO_IDENTITIES.provider, handoff.chat_session_id, 'Xưởng đã nhận được yêu cầu.')

    expect(repository.all('quote_requests')).toHaveLength(quotesBefore)
    const agencyView = listConversations(DEMO_IDENTITIES.agency).find(row => row.chat_session_id === handoff.chat_session_id)
    const providerView = listConversations(DEMO_IDENTITIES.provider).find(row => row.chat_session_id === handoff.chat_session_id)
    expect(agencyView?.messages.at(-1)?.text).toBe('Xưởng đã nhận được yêu cầu.')
    expect(providerView?.experience_id).toBe(experienceId)
  })

  it('persists Provider Experience CRUD and Explore reads the same records', async () => {
    const created = await createExperience(DEMO_IDENTITIES.provider, {
      name: 'Trải nghiệm demo liên module', description: 'Dữ liệu do Provider tạo và Agency nhìn thấy.', category: 'Ceramics',
      duration_minutes: 90, price_per_person: 220000, max_participants: 18, notice_period_hours: 24,
      images: [
        { url: 'https://example.invalid/demo/artisan.jpg', category: 'artisan_working' },
        { url: 'https://example.invalid/demo/workshop.jpg', category: 'workshop_space' },
        { url: 'https://example.invalid/demo/product.jpg', category: 'finished_product' },
      ],
    })
    const catalog = buildExplorePage(loadExploreRuntime(), { viewer: { kind: 'agency', agencyId: DEMO_IDENTITIES.agency.agencyId! }, pageSize: 50 })
    expect(catalog.experience_cards.some(card => card.id === created.experience_id)).toBe(true)
    await deleteExperience(created.experience_id, DEMO_IDENTITIES.provider)
    expect(demoRepository().find('experiences', row => row.experience_id === created.experience_id)).toBeUndefined()
  })

  it('persists UBND approval without changing unrelated Provider records', async () => {
    const repository = demoRepository()
    const countBefore = repository.all('provider_profiles').length
    await reviewProvider(pendingProviderId, DEMO_IDENTITIES.ubnd, 'Approve')
    expect(repository.find('provider_profiles', row => row.provider_id === pendingProviderId)?.verification_status).toBe('Verified')
    expect(repository.all('provider_profiles')).toHaveLength(countBefore)
    expect(repository.all('provider_verification_reviews').some(row => row.provider_id === pendingProviderId && row.decision === 'Approve')).toBe(true)
  })
})
