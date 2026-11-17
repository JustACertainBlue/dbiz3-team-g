import { describe, expect, it } from 'vitest'
import { runAitMatchingPipeline } from '@/lib/ait/matching-pipeline'
import { buildResultsMessage } from '@/lib/ait/messages'

const candidate = {
  experience_id: 'experience-1',
  provider_id: 'provider-1',
  name: 'Dệt lụa truyền thống',
  experience_name: 'Dệt lụa truyền thống',
  village_name: 'Vạn Phúc',
  craft_type: 'Silk/Textile',
  category: 'Workshop/Hands-on',
  experience_type: 'Workshop/Hands-on',
  price_per_person: 175000,
  max_participants: 20,
  notice_period_hours: 24,
  provider_status: 'Verified',
  provider_verification_status: 'Approved',
  has_published_profile_version: true,
}

const profile = (date: string) => ({
  hard_constraints: {
    group_size: 10,
    target_date_or_range: { start_date: date },
  },
  matching_attributes: [{ type: 'craft_preference', value: 'silk', polarity: 'include' }],
  preference_weights: {
    experience_fit: 0.4,
    route_convenience: 0.25,
    agency_preferences: 0.2,
    provider_quality: 0.15,
  },
})

const weekday = (date: string) => new Date(`${date}T00:00:00.000Z`).getUTCDay() || 7

describe('AIT requested-date schedule checks', () => {
  it.each(['2026-11-20', '2027-01-01'])(
    'reports date-specific schedule uncertainty for %s with weekly hours and without schedule rows',
    async (date) => {
      const operatingHours = [{
        provider_id: 'provider-1',
        weekday: weekday(date),
        local_start: '08:00:00',
        local_end: '17:00:00',
      }]

      for (const hours of [operatingHours, []]) {
        const result = await runAitMatchingPipeline({
          candidates: [candidate],
          profile: profile(date),
          operatingHours: hours,
          now: Date.parse('2025-01-01T00:00:00+07:00'),
        })
        const message = buildResultsMessage({
          count: result.topMatches.length,
          start_date: date,
          dateScheduleUnconfirmed: true,
          matches: result.topMatches.map((card) => ({
            experience_name: card.experience_name,
            price_per_person: card.price_per_person,
            distance_km: card.distance_km,
            distance_source: card.distance_source,
          })),
        })

        expect(result.eligibleCandidates).toHaveLength(1)
        expect(message).toContain('Chưa có dữ liệu về lịch ngày này')
        expect(message).toMatch(/xác nhận với nhà cung cấp/i)
        expect(message).not.toMatch(/còn chỗ|đang mở cửa|đã đóng cửa/i)
      }
    }
  )

  it('rejects a provider with known weekly hours when the requested weekday has no operating window', async () => {
    const result = await runAitMatchingPipeline({
      candidates: [candidate],
      profile: profile('2026-11-20'),
      operatingHours: [{
        provider_id: 'provider-1',
        weekday: 1,
        local_start: '08:00:00',
        local_end: '17:00:00',
      }],
      now: Date.parse('2025-01-01T00:00:00+07:00'),
    })

    expect(result.eligibleCandidates).toHaveLength(0)
    expect(result.rejected).toContainEqual({ id: 'experience-1', reason: 'operating_hours' })
  })

  it('rejects an experience with an existing booking that overlaps the requested date', async () => {
    const result = await runAitMatchingPipeline({
      candidates: [candidate],
      profile: profile('2026-11-20'),
      bookings: [{
        experience_id: 'experience-1',
        start_at: '2026-11-20T10:00:00+07:00',
        end_at: '2026-11-20T12:00:00+07:00',
        status: 'Confirmed',
      }],
      now: Date.parse('2025-01-01T00:00:00+07:00'),
    })

    expect(result.eligibleCandidates).toHaveLength(0)
    expect(result.rejected).toContainEqual({ id: 'experience-1', reason: 'date_conflict' })
  })
})
