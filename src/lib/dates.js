const pad = (n) => String(n).padStart(2, '0')

export const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
export const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
export const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayISO = () => toISO(new Date())
export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
/** Inclusive number of days between two ISO dates. */
export const daysBetween = (from, to) => Math.round((parseISO(to) - parseISO(from)) / 86400000) + 1

export function dayLabel(iso) {
  const today = todayISO()
  if (iso === today) return 'Сегодня'
  if (iso === toISO(addDays(new Date(), -1))) return 'Вчера'
  const d = parseISO(iso)
  const year = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}${year}, ${WEEKDAYS[d.getDay()]}`
}

export const shortDate = (iso) => {
  const d = parseISO(iso)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export function addMonths(iso, n) {
  const d = parseISO(iso)
  const day = d.getDate()
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const dim = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()
  x.setDate(Math.min(day, dim))
  return toISO(x)
}

/** Whole months until a deadline. 0 if the date is in the past, null if there is no date, at least 1 while it is still ahead. */
export function monthsLeft(iso) {
  if (!iso) return null
  const today = parseISO(todayISO())
  const d = parseISO(iso)
  if (d < today) return 0
  let m = (d.getFullYear() - today.getFullYear()) * 12 + (d.getMonth() - today.getMonth())
  if (d.getDate() < today.getDate()) m -= 1
  return Math.max(m, 1)
}

export function mediumDate(iso) {
  if (!iso) return ''
  const d = parseISO(iso)
  const year = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}${year}`
}

export const PERIODS = [
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'year', label: 'Год' },
  { id: 'custom', label: 'Период' },
]

/** Calendar range for a period kind, shifted by `offset` periods from now. */
export function getRange(kind, offset = 0, custom) {
  const now = new Date()
  if (kind === 'day') {
    const d = toISO(addDays(now, offset))
    return { from: d, to: d, label: dayLabel(d) }
  }
  if (kind === 'week') {
    const monday = addDays(now, -((now.getDay() + 6) % 7) + offset * 7)
    const sunday = addDays(monday, 6)
    const from = toISO(monday)
    const to = toISO(sunday)
    return { from, to, label: offset === 0 ? 'Эта неделя' : `${shortDate(from)} – ${shortDate(to)}` }
  }
  if (kind === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0)
    const year = first.getFullYear() !== now.getFullYear() ? ` ${first.getFullYear()}` : ''
    return { from: toISO(first), to: toISO(last), label: `${MONTHS[first.getMonth()]}${year}` }
  }
  if (kind === 'year') {
    const y = now.getFullYear() + offset
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: String(y) }
  }
  const { from, to } = custom
  return { from, to, label: `${shortDate(from)} – ${shortDate(to)}` }
}

/** The period right before the given one (same calendar unit, or same length for custom). */
export function getPrevRange(kind, offset, custom) {
  if (kind !== 'custom') return getRange(kind, offset - 1)
  const len = daysBetween(custom.from, custom.to)
  const to = addDays(parseISO(custom.from), -1)
  const from = addDays(to, -(len - 1))
  return getRange('custom', 0, { from: toISO(from), to: toISO(to) })
}
