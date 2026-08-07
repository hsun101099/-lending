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

/**
 * 檢查「貸款金額（萬）」欄位。回傳空字串代表沒問題。
 *
 * 金額從 0 起跳，任何數字都可以填，也接受小數（0.5 萬＝5 千）；
 * 不限定要是整數或 10 的倍數，85 萬、125 萬這類金額都能正常輸入。
 */
export function validateAmountWan(raw: string): string {
  const text = raw.trim()
  if (!text) return '請輸入貸款金額'
  const value = Number(text)
  if (!Number.isFinite(value)) return '金額請輸入數字'
  if (value < 0) return '金額不能是負數'
  return ''
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
