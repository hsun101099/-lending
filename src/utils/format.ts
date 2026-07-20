export function formatCurrency(amount: number): string {
  return `NT$ ${amount.toLocaleString('zh-TW')}`
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(2)}億`
  if (amount >= 10_000) return `${(amount / 10_000).toFixed(0)}萬`
  return amount.toLocaleString('zh-TW')
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${y}/${m}/${d}`
}

export function daysSince(iso: string, reference: Date): number {
  const then = new Date(`${iso}T00:00:00`)
  const diff = reference.getTime() - then.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
