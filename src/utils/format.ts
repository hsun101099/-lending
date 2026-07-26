const WAN = 10_000

export function formatCurrency(amount: number): string {
  return `NT$ ${amount.toLocaleString('zh-TW')}`
}

// Displays an NT$ amount in 萬 (ten-thousand) units, e.g. 5,000,000 -> "500萬"
export function formatWan(amount: number): string {
  return `${Math.round(amount / WAN).toLocaleString('zh-TW')}萬`
}

export function ntToWan(amountNt: number): number {
  return amountNt / WAN
}

export function wanToNt(amountWan: number): number {
  return Math.round(amountWan * WAN)
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
