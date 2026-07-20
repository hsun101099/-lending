export function getToday(): Date {
  return new Date()
}

export function getTodayIso(): string {
  return getToday().toISOString().slice(0, 10)
}
