import { addDays, daysBetween, MONTHS_SHORT, parseISO, toISO, todayISO } from './dates'

export const inRange = (t, { from, to }) => t.date >= from && t.date <= to

export const isTransfer = (t) => t.type === 'transfer'
/**
 * Income / expense / debt only. Transfers to and from jars are neither income nor spending,
 * so every income/outflow aggregation goes through this at its entry.
 */
export const realTxns = (txns) => txns.filter((t) => !isTransfer(t))

const cents = (v) => Math.round(v * 100) / 100

/**
 * The single source of truth for balances.
 * active = startBalance + income − expense − debt − Σ(transfer in) + Σ(transfer out)
 * jar    = openingBalance + Σ(in) − Σ(out);  saved = Σ jar over non-archived jars;  total = active + saved
 */
export function balances({ transactions, jars, settings }) {
  const jarBalance = new Map(jars.map((j) => [j.id, j.openingBalance]))
  let active = settings.startBalance || 0
  for (const t of transactions) {
    if (isTransfer(t)) {
      const d = t.direction === 'in' ? t.amount : -t.amount
      active -= d
      jarBalance.set(t.jarId, (jarBalance.get(t.jarId) || 0) + d)
    } else if (t.type === 'income') active += t.amount
    else active -= t.amount
  }
  for (const [id, v] of jarBalance) jarBalance.set(id, cents(v))
  const saved = cents(jars.filter((j) => !j.archived).reduce((s, j) => s + (jarBalance.get(j.id) || 0), 0))
  active = cents(active)
  return { active, saved, total: cents(active + saved), jarBalance }
}

/** Totals for a set of transactions already filtered to a period. `saved` = put into jars − taken out (transfers). */
export function summarize(all, range) {
  let income = 0, expense = 0, debt = 0, savedIn = 0, savedOut = 0
  for (const t of all) {
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
    else if (t.type === 'debt') debt += t.amount
    else if (isTransfer(t)) t.direction === 'in' ? (savedIn += t.amount) : (savedOut += t.amount)
  }
  const txns = realTxns(all)
  const outflow = expense + debt
  const balance = income - outflow
  // Average per elapsed day: future days of the current period don't count.
  const today = todayISO()
  const effectiveTo = range.to < today ? range.to : today
  const days = range.from > today ? 0 : daysBetween(range.from, effectiveTo)
  return {
    income, expense, debt, outflow, balance,
    savingsRate: income > 0 ? balance / income : null,
    avgPerDay: days > 0 ? outflow / days : 0,
    days,
    count: txns.length,
    savedIn, savedOut,
    saved: savedIn - savedOut,
    transferCount: all.length - txns.length,
  }
}

export function byCategory(txns, categoryMap) {
  const map = new Map()
  for (const t of realTxns(txns)) {
    const row = map.get(t.categoryId) || { id: t.categoryId, value: 0, count: 0 }
    row.value += t.amount
    row.count += 1
    map.set(t.categoryId, row)
  }
  const total = [...map.values()].reduce((s, r) => s + r.value, 0)
  return [...map.values()]
    .map((r) => {
      const c = categoryMap.get(r.id)
      return { ...r, name: c?.name ?? 'Без категории', icon: c?.icon ?? '•', color: c?.color ?? '#9AA3AE', share: total ? r.value / total : 0 }
    })
    .sort((a, b) => b.value - a.value)
}

/** Income vs outflow buckets: by day for short ranges, by month for long ones. */
export function timeSeries(txns, range) {
  const len = daysBetween(range.from, range.to)
  const byMonth = len > 62
  const buckets = new Map()

  if (byMonth) {
    let d = parseISO(range.from)
    d = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = parseISO(range.to)
    while (d <= end) {
      const key = toISO(d).slice(0, 7)
      buckets.set(key, { key, label: MONTHS_SHORT[d.getMonth()], income: 0, outflow: 0 })
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    }
  } else {
    for (let i = 0; i < len; i++) {
      const iso = toISO(addDays(parseISO(range.from), i))
      buckets.set(iso, { key: iso, label: String(parseISO(iso).getDate()), income: 0, outflow: 0 })
    }
  }

  for (const t of realTxns(txns)) {
    const b = buckets.get(byMonth ? t.date.slice(0, 7) : t.date)
    if (!b) continue
    if (t.type === 'income') b.income += t.amount
    else b.outflow += t.amount
  }
  return { data: [...buckets.values()], byMonth }
}

/** Relative change; null when there's nothing to compare against. */
export const change = (cur, prev) => (prev > 0 ? (cur - prev) / prev : null)

/** Outflow forecast to the end of the current month at the current daily pace. */
export function monthForecast(transactions) {
  const now = new Date()
  const from = toISO(new Date(now.getFullYear(), now.getMonth(), 1))
  const to = toISO(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  const today = todayISO()
  const spent = realTxns(transactions).filter((t) => t.type !== 'income' && t.date >= from && t.date <= today).reduce((s, t) => s + t.amount, 0)
  const elapsed = now.getDate()
  const total = daysBetween(from, to)
  return { spent, forecast: (spent / elapsed) * total, daysLeft: total - elapsed }
}

export function applyFilters(txns, { type = 'all', categoryId = null, query = '', min = '', max = '' }, categoryMap, jarMap = new Map()) {
  const q = query.trim().toLowerCase()
  const lo = min === '' ? null : Number(min)
  const hi = max === '' ? null : Number(max)
  return txns.filter((t) => {
    if (type !== 'all' && t.type !== type) return false
    if (categoryId && t.categoryId !== categoryId) return false
    if (lo !== null && t.amount < lo) return false
    if (hi !== null && t.amount > hi) return false
    if (q) {
      const name = (isTransfer(t) ? jarMap.get(t.jarId)?.name : categoryMap.get(t.categoryId)?.name)?.toLowerCase() ?? ''
      if (!t.note.toLowerCase().includes(q) && !name.includes(q) && !String(t.amount).includes(q)) return false
    }
    return true
  })
}

export const sortTxns = (txns) => [...txns].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))
