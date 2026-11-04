import { z } from 'zod'
import { imageMetadataError } from './experience-images'

/** T009 – Zod validation schemas for PRF module */

export const AgencyProfilePatchSchema = z.object({
  company_name: z.string().min(1).max(255).optional(),
  company_type: z.enum(['Tour Operator', 'Travel Agency', 'TMC', 'DMC']).optional(),
  contact_person_name: z.string().min(1).max(100).optional(),
  phone_number: z.string().regex(/^[0-9+() -]{8,20}$/).optional(),
  business_email: z.string().email().optional(),
  tax_id: z.string().regex(/^[0-9]{10,13}$/).optional(),
  street: z.string().max(255).optional(),
  ward: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  city_province: z.string().max(100).optional(),
  team_size: z.number().int().positive().optional(),
  tour_types: z.array(z.string()).optional(),
  description: z.string().max(2000).optional(),
})

export const ProviderProfilePatchSchema = z.object({
  business_name: z.string().min(1).max(255).optional(),
  craft_type: z.string().min(1).max(100).optional(),
  business_registration: z.string().max(100).optional(),
  artisan_names: z.array(z.string()).optional(),
  location_address: z.string().max(500).optional(),
  general_description: z.string().max(3000).optional(),
  phone_number: z.string().regex(/^[0-9+() -]{8,20}$/).optional(),
  business_email: z.string().email().optional(),
  operating_hours: z
    .array(
      z.object({
        weekday: z.number().int().min(1).max(7), // ISO 8601 (spec-BKG #28; data/schema.sql operating_weekday_chk)
        local_start: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
        local_end: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
        is_closed: z.boolean().default(false),
      }),
    )
    .optional(),
  booking_conditions: z
    .object({
      cancellation_notice_hours: z.number().int().nonnegative().optional(),
      deposit_percentage: z.number().min(0).max(100).optional(),
    })
    .optional(),
})

// Slice B: a new image (upload) carries its metadata (BR-008); categories are the data/ values (Q4).
export const ExperienceImageSchema = z.object({
  url: z.string().url(),
  file_name: z.string().min(1).max(255).optional(),
  category: z.enum(['Activity', 'Space', 'Product']),
  media_type: z.string(),
  file_size_bytes: z.number(),
  width_px: z.number(),
  height_px: z.number(),
  caption: z.string().max(255).optional(),
}).superRefine((image, ctx) => {
  const error = imageMetadataError(image)
  if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error })
})

/** On update an existing image is kept by its stored file id (BR-015). */
export const KeptImageSchema = z.object({ file_id: z.string().min(1) })

export const ExperienceCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(10).max(3000),
  category: z.string().min(1).max(100),
  duration_minutes: z.number().int().positive(),
  price_per_person: z.number().positive(),
  max_participants: z.number().int().positive(),
  notice_period_hours: z.number().int().nonnegative(),
  experience_location_address: z.string().max(500).optional(),
  cancellation_policy: z.unknown().optional(),
  images: z.array(ExperienceImageSchema).min(3),
})

export const ExperienceUpdateSchema = ExperienceCreateSchema.partial().extend({
  images: z.array(z.union([KeptImageSchema, ExperienceImageSchema])).optional(),
})

export const VerifyProviderSchema = z.object({
  decision: z.enum(['Approve', 'Request Revision']),
  revision_comments: z.string().max(1000).optional(),
}).refine(
  data => (data.decision === 'Request Revision' ? Boolean(data.revision_comments && data.revision_comments.trim().length > 0) : true),
  { message: 'revision_comments are required when decision is Request Revision', path: ['revision_comments'] },
)

export const AIDescriptionSchema = z.object({
  original_description: z.string().min(10).max(3000),
  craft_type: z.string().min(1).max(100),
  target_audience: z.enum(['international', 'family', 'student', 'general']).default('general'),
  language: z.enum(['vi', 'en']).default('vi'),
})
