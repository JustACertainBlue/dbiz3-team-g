/**
 * T006 – Visibility filter unit tests
 * Tests filterAgencyFields() and filterProviderFields() for all actor types.
 *
 * CONSTITUTION II (Test-First Non-Negotiable): Written before src/lib/prf/visibility.ts exists.
 * These tests MUST FAIL until T007 is implemented.
 *
 * Covers: BR-004 (actor-specific visibility), FR-001 §5.1, FR-003 §5.1
 */
import { describe, it, expect } from 'vitest'
import { filterAgencyFields, filterProviderFields } from '@/lib/prf/visibility'
import type { MockSession } from '../helpers/mockSession'
import {
  guestSession,
  agencyOwnerSession,
  providerSession,
  ubndSession,
  hdtSession,
} from '../helpers/mockSession'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const FULL_AGENCY = {
  agency_id: 'agency-001',
  agency_name: 'Hanoi Travel Co.',      // maps to company_name
  company_type: 'Tour Operator',
  location: { street: '1 Ba Dinh', ward: 'Ba Dinh', district: 'Ba Dinh', city_province: 'Hanoi' },
  team_size: 12,
  contact: { contact_person_name: 'Nguyen Van A', phone_number: '0901234567', business_email: 'contact@hanoitravel.vn' },
  tax_id: '0123456789',
  tour_types: ['Cultural', 'Eco'],
  description: 'A great agency.',
  images: [],
  account_status: 'Approved',
}

const FULL_PROVIDER = {
  provider_id: 'provider-001',
  provider_name: 'Bat Trang Ceramics',  // maps to business_name
  craft_type: 'Ceramics',
  general_description: 'Traditional pottery since 1500.',
  public_images: [],
  contact: { phone_number: '0912345678', business_email: 'bat@trang.vn' },
  pricing: 150000,
  capacity: 12,
  availability: {},
  booking_conditions: {},
  verification_status: 'Verified',
  quality_metrics: {
    total_bookings: 45,
    average_booking_value: 1800000,
    cancellation_rate: 0.02,
    profile_completeness_score: 0.95,
  },
}

// ─── Agency visibility (FR-001 / BR-004) ─────────────────────────────────────

describe('T006 | filterAgencyFields – BR-004 agency visibility', () => {
  describe('Guest actor', () => {
    const result = () => filterAgencyFields(guestSession(), FULL_AGENCY)

    it('returns public fields: agency_name, company_type, location, team_size', () => {
      const r = result()
      expect(r.agency_name).toBe(FULL_AGENCY.agency_name)
      expect(r.company_type).toBe(FULL_AGENCY.company_type)
      expect(r.location).toEqual(FULL_AGENCY.location)
      expect(r.team_size).toBe(FULL_AGENCY.team_size)
    })

    it('does NOT expose tax_id to Guest', () => {
      expect((result() as Record<string, unknown>).tax_id).toBeUndefined()
    })

    it('does NOT expose tour_types to Guest (FR-001: not public information)', () => {
      expect((result() as Record<string, unknown>).tour_types).toBeUndefined()
    })

    it('does NOT expose contact to Guest', () => {
      expect((result() as Record<string, unknown>).contact).toBeUndefined()
    })

    it('does NOT expose account_status to Guest', () => {
      expect((result() as Record<string, unknown>).account_status).toBeUndefined()
    })
  })

  describe('Local Provider actor (collaboration access)', () => {
    const result = () => filterAgencyFields(providerSession(), FULL_AGENCY)

    it('exposes contact info to Local Provider for collaboration', () => {
      expect(result().contact).toEqual(FULL_AGENCY.contact)
    })

    it('still does NOT expose tax_id to Local Provider', () => {
      expect((result() as Record<string, unknown>).tax_id).toBeUndefined()
    })

    it('still does NOT expose tour_types to Local Provider', () => {
      expect((result() as Record<string, unknown>).tour_types).toBeUndefined()
    })
  })

  describe('UBND actor (collaboration access)', () => {
    const result = () => filterAgencyFields(ubndSession(), FULL_AGENCY)

    it('exposes contact info to UBND for collaboration', () => {
      expect(result().contact).toEqual(FULL_AGENCY.contact)
    })

    it('does NOT expose tax_id to UBND', () => {
      expect((result() as Record<string, unknown>).tax_id).toBeUndefined()
    })
  })

  describe('Agency Owner (own profile — full detail)', () => {
    const result = () =>
      filterAgencyFields(agencyOwnerSession('agency-001'), { ...FULL_AGENCY, agency_id: 'agency-001' })

    it('exposes tax_id to own Agency', () => {
      expect(result().tax_id).toBe(FULL_AGENCY.tax_id)
    })

    it('exposes tour_types to own Agency', () => {
      expect(result().tour_types).toEqual(FULL_AGENCY.tour_types)
    })

    it('exposes account_status to own Agency', () => {
      expect(result().account_status).toBe(FULL_AGENCY.account_status)
    })
  })

  describe('Agency viewing another Agency profile (not owner)', () => {
    const result = () =>
      filterAgencyFields(agencyOwnerSession('agency-999'), FULL_AGENCY)

    it('does NOT expose tax_id to a different Agency', () => {
      expect((result() as Record<string, unknown>).tax_id).toBeUndefined()
    })
  })

  describe('HDT actor (full detail)', () => {
    const result = () => filterAgencyFields(hdtSession(), FULL_AGENCY)

    it('exposes tax_id to HDT', () => {
      expect(result().tax_id).toBe(FULL_AGENCY.tax_id)
    })

    it('exposes tour_types to HDT', () => {
      expect(result().tour_types).toEqual(FULL_AGENCY.tour_types)
    })

    it('exposes account_status to HDT', () => {
      expect(result().account_status).toBe(FULL_AGENCY.account_status)
    })
  })
})

// ─── Provider visibility (FR-003 / BR-004) ───────────────────────────────────

describe('T006 | filterProviderFields – BR-004 provider visibility', () => {
  describe('Guest actor', () => {
    const result = () => filterProviderFields(guestSession(), FULL_PROVIDER)

    it('exposes public fields: provider_name, craft_type, general_description, public_images', () => {
      const r = result()
      expect(r.provider_name).toBe(FULL_PROVIDER.provider_name)
      expect(r.craft_type).toBe(FULL_PROVIDER.craft_type)
      expect(r.general_description).toBe(FULL_PROVIDER.general_description)
      expect(r.public_images).toEqual(FULL_PROVIDER.public_images)
    })

    it('does NOT expose pricing to Guest', () => {
      expect((result() as Record<string, unknown>).pricing).toBeUndefined()
    })

    it('does NOT expose contact to Guest', () => {
      expect((result() as Record<string, unknown>).contact).toBeUndefined()
    })

    it('does NOT expose verification_status to Guest', () => {
      expect((result() as Record<string, unknown>).verification_status).toBeUndefined()
    })

    it('does NOT expose quality_metrics to Guest', () => {
      expect((result() as Record<string, unknown>).quality_metrics).toBeUndefined()
    })
  })

  describe('Tour Agency actor (collaboration detail)', () => {
    const result = () => filterProviderFields(agencyOwnerSession(), FULL_PROVIDER)

    it('exposes pricing to Tour Agency', () => {
      expect(result().pricing).toBe(FULL_PROVIDER.pricing)
    })

    it('exposes capacity to Tour Agency', () => {
      expect(result().capacity).toBe(FULL_PROVIDER.capacity)
    })

    it('exposes contact to Tour Agency', () => {
      expect(result().contact).toEqual(FULL_PROVIDER.contact)
    })

    it('does NOT expose quality_metrics to Tour Agency', () => {
      expect((result() as Record<string, unknown>).quality_metrics).toBeUndefined()
    })
  })

  describe('Provider viewing own profile (full editable)', () => {
    const result = () =>
      filterProviderFields(
        providerSession('provider-001'),
        { ...FULL_PROVIDER, provider_id: 'provider-001' },
      )

    it('exposes verification_status to own Provider', () => {
      expect(result().verification_status).toBe(FULL_PROVIDER.verification_status)
    })

    it('does NOT expose quality_metrics to own Provider', () => {
      expect((result() as Record<string, unknown>).quality_metrics).toBeUndefined()
    })
  })

  describe('UBND actor (assigned village — full verification info)', () => {
    const result = () =>
      filterProviderFields(ubndSession(), { ...FULL_PROVIDER, village_id: '20896522-6235-5699-aeaf-f48b8150d895' })

    it('exposes verification_status to UBND', () => {
      expect(result().verification_status).toBe(FULL_PROVIDER.verification_status)
    })

    it('does NOT expose quality_metrics to UBND', () => {
      expect((result() as Record<string, unknown>).quality_metrics).toBeUndefined()
    })
  })

  describe('HDT actor (full monitoring access)', () => {
    const result = () => filterProviderFields(hdtSession(), FULL_PROVIDER)

    it('exposes quality_metrics to HDT only', () => {
      expect(result().quality_metrics).toEqual(FULL_PROVIDER.quality_metrics)
    })

    it('exposes verification_status to HDT', () => {
      expect(result().verification_status).toBe(FULL_PROVIDER.verification_status)
    })
  })
})
