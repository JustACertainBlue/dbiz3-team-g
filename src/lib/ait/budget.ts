const EXPLICIT_MONEY_AMOUNT =
  /(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?|\d+)\s*(k\b(?!m)|nghìn|ngàn|triệu|đ|vnd)(?![\p{L}])/iu

export function parseExplicitBudgetAmount(text: string): number | undefined {
  const match = EXPLICIT_MONEY_AMOUNT.exec(text)
  if (!match) return undefined

  const rawAmount = match[1]
  const isThousandsGrouped = /^\d{1,3}(?:[.,]\d{3})+$/.test(rawAmount)
  const amount = isThousandsGrouped
    ? Number(rawAmount.replace(/[.,]/g, ''))
    : Number(rawAmount.replace(',', '.'))
  if (!Number.isFinite(amount) || amount <= 0) return undefined

  const unit = match[2].toLowerCase()
  const multiplier = unit === 'k' || unit === 'nghìn' || unit === 'ngàn'
    ? 1000
    : unit === 'triệu'
      ? 1_000_000
      : 1
  const result = amount * multiplier
  return Number.isFinite(result) ? result : undefined
}
