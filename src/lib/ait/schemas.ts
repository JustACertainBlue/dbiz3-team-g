import { z } from 'zod';

function isValidYMD(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const dateRangeSchema = z
  .object({
    start_date: z.string(),
    end_date: z.string().optional(),
  })
  .refine(
    (d) => {
      if (!isValidYMD(d.start_date)) return false;
      if (d.end_date !== undefined) {
        if (!isValidYMD(d.end_date)) return false;
        if (d.end_date < d.start_date) return false;
      }
      return true;
    },
    { message: 'Invalid start_date or end_date < start_date' }
  );

export const profileSchema = z
  .object({
    hard_constraints: z
      .object({
        group_size: z.number().int().min(1).max(1000).nullable().optional(),
        max_budget_per_person: z.number().positive().nullable().optional(),
        radius_km: z.number().positive().nullable().optional(),
        target_date_or_range: dateRangeSchema.nullable().optional(),
        origin: z.any().optional(),
      })
      .strip()
      .optional()
      .default({}),
    matching_attributes: z
      .array(
        z
          .object({
            type: z.string(),
            value: z.string(),
            polarity: z.enum(['include', 'exclude']).optional().default('include'),
          })
          .strip()
      )
      .optional()
      .default([]),
    preference_weights: z.record(z.string(), z.number()).optional(),
    visitor_profile: z.enum(['school', 'corporate', 'family', 'senior', 'other']).optional(),
  })
  .strip();

export const matchCardSchema = z
  .object({
    experience_id: z.string(),
    provider_id: z.string(),
    rank: z.number(),
    match_score: z.number().min(0).max(100),
    experience_name: z.string(),
    provider_name: z.string(),
    village_name: z.string(),
    price_per_person: z.number().nullable(),
    distance_km: z.number().nullable().optional(),
    distance_source: z.literal('haversine').optional(),
    max_participants: z.number().nullable(),
    notice_period_hours: z.number().nullable().optional(),
    image_url: z.string().nullable(),
    reasons: z.array(
      z.object({
        key: z.string(),
        text: z.string().min(1),
      })
    ),
    caveats: z
      .array(
        z.object({
          key: z.string(),
          text: z.string(),
        })
      )
      .default([]),
    flags: z.array(z.string()).default([]),
    badges: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    trust: z.object({
      status: z.string(),
      label: z.string(),
      source_count: z.number().nullable(),
    }),
    display: z.object({
      price: z.string(),
      capacity: z.string(),
      notice: z.string(),
    }),
    actions: z
      .array(z.enum(['view_detail', 'request_quote', 'chat_provider']))
      .default([]),
  })
  .strip();

export const AIT_INTENTS = [
  'provide_requirements',
  'refine_results',
  'catalog_query',
  'compare_items',
  'explain_method',
  'system_info',
  'verification_info',
  'result_followup',
  'smalltalk',
  'out_of_scope',
  'restricted_request',
  'unclear',
] as const;

export type AitIntent = (typeof AIT_INTENTS)[number];

export const intentClassificationSchema = z
  .object({
    intent: z.enum(AIT_INTENTS),
    confidence: z.number().min(0).max(1),
  })
  .strip();

export type IntentClassification = z.infer<typeof intentClassificationSchema>;

export const turnSchema = z
  .object({
    turn_type: z.enum([
      'ask_info',
      'results',
      'no_results',
      'answer',
      'refusal',
      'clarify',
      'smalltalk',
    ]),
    message: z.string().min(1).max(500),
    top_matches: z.array(matchCardSchema).max(5).default([]),
    additional_suggestions: z.array(matchCardSchema).default([]),
    comparison: z.any().nullable().optional().default(null),
    quick_replies: z.array(z.any()).default([]),
    follow_up_questions: z.array(z.string()).max(3).default([]),
    relaxation_suggestions: z.array(z.any()).default([]),
    sources: z
      .array(
        z
          .object({
            type: z.string(),
            ref: z.string(),
          })
          .passthrough()
      )
      .default([]),
    used_llm: z.boolean(),
  })
  .strip()
  .superRefine((val, ctx) => {
    if (val.turn_type === 'results') {
      if (val.top_matches.length + val.additional_suggestions.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'results phải có ít nhất 1 card (top hoặc additional)',
          path: ['top_matches'],
        });
      }
    }
    if (val.turn_type === 'no_results') {
      if (val.top_matches.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'no_results không được có top_matches',
          path: ['top_matches'],
        });
      }
    }
    if (val.turn_type === 'answer') {
      if (!val.sources || val.sources.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'answer bắt buộc có sources',
          path: ['sources'],
        });
      }
    }
    if (val.turn_type === 'refusal') {
      if (val.used_llm !== false) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'refusal không được dùng LLM (used_llm=false)',
          path: ['used_llm'],
        });
      }
    }
    for (let i = 0; i < val.top_matches.length; i++) {
      const card = val.top_matches[i];
      if (!card.actions || card.actions.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'card nhóm chính phải có actions',
          path: ['top_matches', i, 'actions'],
        });
      }
    }
  });

export type Profile = z.infer<typeof profileSchema>;
export type MatchCard = z.infer<typeof matchCardSchema>;
export type Turn = z.infer<typeof turnSchema>;
