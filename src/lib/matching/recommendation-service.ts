export interface RecommendationItem {
  experience_id: string
  provider_id?: string
  experience_name?: string
  provider_name?: string
  rank: number
  match_score: number
  explanation: string
}

export interface RecommendationOutput {
  top_matches: RecommendationItem[]
  additional_suggestions: RecommendationItem[]
}

export interface RelaxationSuggestion {
  criterion: 'Budget' | 'Distance' | 'Dates'
  suggested_value: string | number
}

export interface RelaxationOutput {
  relaxation_suggestions: RelaxationSuggestion[]
  conversation_prompt: string
}

export async function buildRecommendations(
  rankedCandidates: any[]
): Promise<RecommendationOutput> {
  const topMatchesRaw = rankedCandidates.slice(0, 5)
  const additionalRaw = rankedCandidates.slice(5, 10)

  const formatItem = (item: any, index: number, offset: number): RecommendationItem => {
    const expName = item.experience_name || item.name || `Experience ${item.experience_id}`
    const rank = item.rank || offset + index + 1
    const score = item.match_score ?? 85

    const explanation = `Matches requirements with a score of ${score}/100. Excellent fit for ${
      item.experience_type || item.category || 'craft workshops'
    } with verified local artisans.`

    return {
      experience_id: item.experience_id,
      provider_id: item.provider_id,
      experience_name: expName,
      provider_name: item.provider_name,
      rank,
      match_score: score,
      explanation,
    }
  }

  const top_matches = topMatchesRaw.map((item, idx) => formatItem(item, idx, 0))
  const additional_suggestions = additionalRaw.map((item, idx) => formatItem(item, idx, 5))

  return {
    top_matches,
    additional_suggestions,
  }
}

export async function buildRelaxationSuggestions(
  results: any[],
  criteria: any
): Promise<RelaxationOutput> {
  const suggestions: RelaxationSuggestion[] = []

  if (criteria?.max_budget_per_person) {
    suggestions.push({
      criterion: 'Budget',
      suggested_value: Math.round(criteria.max_budget_per_person * 1.3),
    })
  } else {
    suggestions.push({
      criterion: 'Budget',
      suggested_value: 600000,
    })
  }

  suggestions.push({
    criterion: 'Distance',
    suggested_value: 'Expand radius by 15km to include outer craft villages',
  })

  suggestions.push({
    criterion: 'Dates',
    suggested_value: 'Consider flexible dates (+/- 2 days)',
  })

  const conversation_prompt =
    'No experiences currently meet all criteria above the 60% threshold. You can relax your budget or travel distance, or adjust group size to see more artisan options.'

  return {
    relaxation_suggestions: suggestions,
    conversation_prompt,
  }
}
