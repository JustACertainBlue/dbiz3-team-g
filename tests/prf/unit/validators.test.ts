import { describe, it, expect } from 'vitest'
import {
  AgencyProfilePatchSchema,
  ProviderProfilePatchSchema,
  ExperienceCreateSchema,
  VerifyProviderSchema,
  AIDescriptionSchema,
} from '@/lib/prf/validators'

describe('T057 | Boundary-value tests for Zod schemas', () => {
  describe('AgencyProfilePatchSchema', () => {
    it('rejects empty company_name string', () => {
      const res = AgencyProfilePatchSchema.safeParse({ company_name: '' })
      expect(res.success).toBe(false)
    })

    it('rejects invalid email address', () => {
      const res = AgencyProfilePatchSchema.safeParse({ business_email: 'not-an-email' })
      expect(res.success).toBe(false)
    })

    it('rejects tax_id with non-digits or wrong length', () => {
      expect(AgencyProfilePatchSchema.safeParse({ tax_id: '12345' }).success).toBe(false)
      expect(AgencyProfilePatchSchema.safeParse({ tax_id: '1234567890ABC' }).success).toBe(false)
      expect(AgencyProfilePatchSchema.safeParse({ tax_id: '0101234567' }).success).toBe(true)
    })

    it('rejects negative or zero team_size', () => {
      expect(AgencyProfilePatchSchema.safeParse({ team_size: 0 }).success).toBe(false)
      expect(AgencyProfilePatchSchema.safeParse({ team_size: -5 }).success).toBe(false)
      expect(AgencyProfilePatchSchema.safeParse({ team_size: 10 }).success).toBe(true)
    })

    it('rejects description longer than 2000 characters', () => {
      const overlong = 'a'.repeat(2001)
      expect(AgencyProfilePatchSchema.safeParse({ description: overlong }).success).toBe(false)
    })
  })

  describe('ProviderProfilePatchSchema', () => {
    it('rejects empty business_name', () => {
      expect(ProviderProfilePatchSchema.safeParse({ business_name: '' }).success).toBe(false)
    })

    it('rejects invalid operating hour weekday outside 0-6', () => {
      const invalid = {
        operating_hours: [
          { weekday: 7, local_start: '08:00', local_end: '17:00' },
        ],
      }
      expect(ProviderProfilePatchSchema.safeParse(invalid).success).toBe(false)
    })

    it('rejects deposit percentage outside 0-100', () => {
      expect(
        ProviderProfilePatchSchema.safeParse({
          booking_conditions: { deposit_percentage: 120 },
        }).success,
      ).toBe(false)
      expect(
        ProviderProfilePatchSchema.safeParse({
          booking_conditions: { deposit_percentage: -10 },
        }).success,
      ).toBe(false)
      expect(
        ProviderProfilePatchSchema.safeParse({
          booking_conditions: { deposit_percentage: 50 },
        }).success,
      ).toBe(true)
    })
  })

  describe('ExperienceCreateSchema', () => {
    const validExperience = {
      name: 'Làm gốm cùng nghệ nhân',
      description: 'Trải nghiệm làm gốm Bát Tràng truyền thống cùng nghệ nhân ưu tú.',
      category: 'Workshop',
      duration_minutes: 120,
      price_per_person: 250000,
      max_participants: 15,
      notice_period_hours: 24,
      images: [
        { url: 'https://example.com/artisan.jpg', category: 'artisan_working' },
        { url: 'https://example.com/space.jpg', category: 'workshop_space' },
        { url: 'https://example.com/product.jpg', category: 'finished_product' },
      ],
    }

    it('accepts valid experience payload', () => {
      expect(ExperienceCreateSchema.safeParse(validExperience).success).toBe(true)
    })

    it('rejects zero or negative price_per_person', () => {
      expect(
        ExperienceCreateSchema.safeParse({ ...validExperience, price_per_person: 0 }).success,
      ).toBe(false)
      expect(
        ExperienceCreateSchema.safeParse({ ...validExperience, price_per_person: -50000 }).success,
      ).toBe(false)
    })

    it('rejects zero or negative max_participants', () => {
      expect(
        ExperienceCreateSchema.safeParse({ ...validExperience, max_participants: 0 }).success,
      ).toBe(false)
      expect(
        ExperienceCreateSchema.safeParse({ ...validExperience, max_participants: -2 }).success,
      ).toBe(false)
    })

    it('rejects description under 10 chars or over 3000 chars', () => {
      expect(
        ExperienceCreateSchema.safeParse({ ...validExperience, description: 'Ngắn quá' }).success,
      ).toBe(false)
      expect(
        ExperienceCreateSchema.safeParse({ ...validExperience, description: 'x'.repeat(3001) }).success,
      ).toBe(false)
    })

    it('rejects invalid image url or invalid image category', () => {
      const invalidUrl = {
        ...validExperience,
        images: [
          { url: 'not-a-valid-url', category: 'artisan_working' },
          { url: 'https://example.com/2.jpg', category: 'workshop_space' },
          { url: 'https://example.com/3.jpg', category: 'finished_product' },
        ],
      }
      expect(ExperienceCreateSchema.safeParse(invalidUrl).success).toBe(false)

      const invalidCategory = {
        ...validExperience,
        images: [
          { url: 'https://example.com/1.jpg', category: 'invalid_category' },
          { url: 'https://example.com/2.jpg', category: 'workshop_space' },
          { url: 'https://example.com/3.jpg', category: 'finished_product' },
        ],
      }
      expect(ExperienceCreateSchema.safeParse(invalidCategory).success).toBe(false)
    })

    it('rejects fewer than 3 images', () => {
      const fewImages = {
        ...validExperience,
        images: [
          { url: 'https://example.com/1.jpg', category: 'artisan_working' },
          { url: 'https://example.com/2.jpg', category: 'workshop_space' },
        ],
      }
      expect(ExperienceCreateSchema.safeParse(fewImages).success).toBe(false)
    })
  })

  describe('VerifyProviderSchema', () => {
    it('accepts Approve decision without comments', () => {
      expect(VerifyProviderSchema.safeParse({ decision: 'Approve' }).success).toBe(true)
    })

    it('rejects Request Revision without revision_comments', () => {
      expect(VerifyProviderSchema.safeParse({ decision: 'Request Revision' }).success).toBe(false)
      expect(
        VerifyProviderSchema.safeParse({
          decision: 'Request Revision',
          revision_comments: '   ',
        }).success,
      ).toBe(false)
    })

    it('accepts Request Revision with valid revision_comments', () => {
      expect(
        VerifyProviderSchema.safeParse({
          decision: 'Request Revision',
          revision_comments: 'Thiếu giấy chứng nhận làng nghề',
        }).success,
      ).toBe(true)
    })
  })

  describe('AIDescriptionSchema', () => {
    it('rejects description under 10 chars or over 3000 chars', () => {
      expect(
        AIDescriptionSchema.safeParse({
          original_description: 'Ngắn',
          craft_type: 'Gốm',
        }).success,
      ).toBe(false)

      expect(
        AIDescriptionSchema.safeParse({
          original_description: 'z'.repeat(3005),
          craft_type: 'Gốm',
        }).success,
      ).toBe(false)
    })

    it('rejects invalid target_audience', () => {
      expect(
        AIDescriptionSchema.safeParse({
          original_description: 'Mô tả xưởng gốm làng nghề Bát Tràng đầy đủ thông tin.',
          craft_type: 'Gốm sứ',
          target_audience: 'unknown_audience',
        }).success,
      ).toBe(false)
    })
  })
})
