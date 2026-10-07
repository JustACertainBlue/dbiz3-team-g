import { z } from 'zod'

export const MessageTextSchema = z.string().min(1).max(2000)

export const TargetDateOrRangeSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  date: z.string().optional(),
}).optional()

export const OriginOrRouteSchema = z.object({
  origin_address: z.string().optional(),
  destination_address: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  waypoints: z.array(z.string()).optional(),
}).optional()

export const TourContextSchema = z.object({
  tour_purpose: z.string().optional(),
  group_size: z.number().int().positive().optional(),
  visitor_profile: z.string().optional(),
  target_date_or_range: TargetDateOrRangeSchema,
  desired_duration: z.number().optional(),
  origin_or_route: OriginOrRouteSchema,
  travel_intensity: z.enum(['Low', 'Medium', 'High']).optional(),
  distance_preference: z.record(z.unknown()).optional(),
  experience_types: z.array(z.string()).optional(),
  experience_intensity: z.enum(['Low', 'Medium', 'High']).optional(),
  budget: z.object({
    max_per_person: z.number().optional(),
    currency: z.string().optional(),
  }).optional(),
  special_requirements: z.array(z.string()).optional(),
})

export const HardConstraintsSchema = z.object({
  group_size: z.number().int().positive().optional(),
  min_group_size: z.number().int().optional(),
  max_participants: z.number().int().optional(),
  max_budget_per_person: z.number().min(0, 'Budget cannot be negative').optional(),
  budget_per_person: z.number().min(0).optional(),
  target_date_or_range: TargetDateOrRangeSchema,
  origin: OriginOrRouteSchema,
})

export const PreferenceWeightsSchema = z
  .record(z.number())
  .refine(
    weights => {
      const vals = Object.values(weights)
      if (vals.length === 0) return true
      const sum = vals.reduce((acc, curr) => acc + curr, 0)
      return Math.abs(sum - 1.0) < 0.001
    },
    { message: 'Preference weights must sum to 1.0' }
  )

export const TourPreferenceProfileSchema = z.object({
  hard_constraints: HardConstraintsSchema,
  matching_attributes: z.array(z.any()).default([]),
  inferred_preferences: z.array(z.any()).optional().default([]),
  preference_weights: z.record(z.number()),
})

export type MessageText = z.infer<typeof MessageTextSchema>
export type TourContext = z.infer<typeof TourContextSchema>
export type HardConstraints = z.infer<typeof HardConstraintsSchema>
export type PreferenceWeights = z.infer<typeof PreferenceWeightsSchema>
export type TourPreferenceProfile = z.infer<typeof TourPreferenceProfileSchema>
