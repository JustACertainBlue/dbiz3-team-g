export interface PreferenceSignal {
  signal_type: string
  value: any
  confidence_score: number
  captured_at: string
}

export interface ReweightedSignal {
  signal: PreferenceSignal
  weight: number
}

export function calculateDecayWeight(ageInDays: number, halfLifeDays: number = 30): number {
  if (ageInDays <= 0) return 1.0
  return Math.pow(0.5, ageInDays / halfLifeDays)
}

export function applyTimeDecayToSignals(
  signals: PreferenceSignal[],
  referenceDate?: Date
): ReweightedSignal[] {
  if (!signals || signals.length === 0) return []

  const refTime = (referenceDate || new Date()).getTime()
  const MS_PER_DAY = 1000 * 60 * 60 * 24

  return signals.map(signal => {
    const signalTime = new Date(signal.captured_at).getTime()
    const ageDays = Math.max(0, (refTime - signalTime) / MS_PER_DAY)
    const decayFactor = calculateDecayWeight(ageDays, 30)
    const effectiveWeight = (signal.confidence_score ?? 1.0) * decayFactor

    return {
      signal,
      weight: effectiveWeight,
    }
  })
}
