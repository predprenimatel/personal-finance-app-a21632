export const CURRENCIES = [
  { code: 'UAH', symbol: '₴', name: 'Гривна' },
  { code: 'USD', symbol: '$', name: 'Доллар' },
  { code: 'EUR', symbol: '€', name: 'Евро' },
  { code: 'PLN', symbol: 'zł', name: 'Злотый' },
  { code: 'GBP', symbol: '£', name: 'Фунт' },
]

export const currencySymbol = (code) => CURRENCIES.find((c) => c.code === code)?.symbol ?? code

const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })
const nf0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

/** 12 345,5 ₴ — with optional explicit sign. */
export function money(value, code, { sign = false, round = false } = {}) {
  const abs = Math.abs(value)
  const s = (round ? nf0 : nf).format(round ? Math.round(abs) : abs)
  const prefix = sign ? (value > 0 ? '+' : value < 0 ? '−' : '') : value < 0 ? '−' : ''
  return `${prefix}${s} ${currencySymbol(code)}`
}

/** Compact axis labels: 1,2 тыс, 3,4 млн. */
export function compact(value) {
  const abs = Math.abs(value)
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1).replace('.', ',')} млн`
  if (abs >= 1e3) return `${(value / 1e3).toFixed(abs >= 1e4 ? 0 : 1).replace('.', ',')} тыс`
  return nf0.format(value)
}

export const percent = (v) => `${Math.round(v * 100)}%`
