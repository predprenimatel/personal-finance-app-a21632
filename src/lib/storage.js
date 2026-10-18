// All persistence goes through this module. Data lives only in this browser (localStorage).
// The key stays `kopilka:v1` so existing data opens as is; the schema version lives inside (`version`).
const KEY = 'kopilka:v1'
export const VERSION = 3

const TXN_TYPES = ['expense', 'income', 'debt', 'transfer']
const DEBT_KINDS = ['credit', 'microloan', 'installment', 'personal', 'obligation']

export const emptyData = () => ({
  version: VERSION,
  transactions: [],
  customCategories: [],
  jars: [],
  debts: [],
  goals: [],
  settings: { currency: 'UAH', startBalance: 0 },
})

export function loadData() {
  try {
    if (typeof localStorage === 'undefined') return emptyData()
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyData()
    return normalize(JSON.parse(raw))
  } catch {
    return emptyData()
  }
}

export function saveData(data) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Не удалось сохранить данные', e)
  }
}

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : fallback)

/**
 * Canonical transaction shape; returns null for invalid input.
 * Regular operations carry `categoryId`, transfers (`type: 'transfer'`) carry `direction` + `jarId` instead.
 * Debt payments may carry `debtId` linking them to a debt entity.
 */
export function shapeTxn(t) {
  if (!t || typeof t !== 'object' || !TXN_TYPES.includes(t.type) || !t.date) return null
  const amount = Number(t.amount)
  if (!Number.isFinite(amount)) return null
  const base = {
    id: String(t.id ?? uid()),
    type: t.type,
    amount,
    date: String(t.date).slice(0, 10),
    note: t.note ? String(t.note) : '',
    createdAt: Number(t.createdAt) || Date.now(),
  }
  if (t.type === 'transfer') {
    if (!t.jarId || !['in', 'out'].includes(t.direction)) return null
    return { ...base, direction: t.direction, jarId: String(t.jarId) }
  }
  if (!t.categoryId) return null
  const txn = { ...base, categoryId: String(t.categoryId) }
  if (t.type === 'debt' && t.debtId) txn.debtId = String(t.debtId)
  return txn
}

export function shapeJar(j) {
  return {
    id: String(j.id ?? uid()),
    name: j.name ? String(j.name) : 'Копилка',
    icon: j.icon ? String(j.icon) : '🐷',
    color: j.color ? String(j.color) : '#6BB8FF',
    openingBalance: num(j.openingBalance),
    archived: Boolean(j.archived),
    createdAt: Number(j.createdAt) || Date.now(),
  }
}

export function shapeDebt(d) {
  const principal = Math.max(0, num(d.principal))
  const rate = d.rate === '' || d.rate == null ? null : num(d.rate, null)
  const regular = d.regularPayment === '' || d.regularPayment == null ? null : Math.max(0, num(d.regularPayment))
  return {
    id: String(d.id ?? uid()),
    name: d.name ? String(d.name) : 'Долг',
    kind: DEBT_KINDS.includes(d.kind) ? d.kind : 'credit',
    principal,
    openingRemaining: Math.max(0, num(d.openingRemaining, principal)),
    rate,
    nextPaymentDate: d.nextPaymentDate ? String(d.nextPaymentDate).slice(0, 10) : '',
    regularPayment: regular,
    archived: Boolean(d.archived),
    closed: Boolean(d.closed),
    createdAt: Number(d.createdAt) || Date.now(),
  }
}

export function shapeGoal(g) {
  const topups = Array.isArray(g.topups)
    ? g.topups
        .filter((t) => t && Number.isFinite(Number(t.amount)) && t.date)
        .map((t) => ({ amount: Number(t.amount), date: String(t.date).slice(0, 10) }))
    : []
  return {
    id: String(g.id ?? uid()),
    name: g.name ? String(g.name) : 'Цель',
    icon: g.icon ? String(g.icon) : '🎯',
    color: g.color ? String(g.color) : '#6BB8FF',
    targetAmount: Math.max(0, num(g.targetAmount)),
    deadline: g.deadline ? String(g.deadline).slice(0, 10) : '',
    jarId: g.jarId ? String(g.jarId) : null,
    manualSaved: Math.max(0, num(g.manualSaved)),
    topups,
    archived: Boolean(g.archived),
    reached: Boolean(g.reached),
    createdAt: Number(g.createdAt) || Date.now(),
  }
}

/**
 * Validates and fills defaults; used for both loading and importing backups.
 * Migrations:
 *   v1 → v2 adds `jars`, transfers and `settings.startBalance` (empty / 0).
 *   v2 → v3 adds `debts`, `goals` and optional `debtId` on debt payments.
 * Unknown transactions are dropped; known extra fields on transfers/debts are kept.
 */
export function normalize(input) {
  const base = emptyData()
  if (!input || typeof input !== 'object') throw new Error('Неверный формат файла')
  const transactions = (Array.isArray(input.transactions) ? input.transactions : []).map(shapeTxn).filter(Boolean)
  const jars = (Array.isArray(input.jars) ? input.jars : []).filter((j) => j && typeof j === 'object').map(shapeJar)
  const debts = (Array.isArray(input.debts) ? input.debts : []).filter((d) => d && typeof d === 'object').map(shapeDebt)
  const goals = (Array.isArray(input.goals) ? input.goals : []).filter((g) => g && typeof g === 'object').map(shapeGoal)

  // A transfer whose jar is missing from the file would silently vanish from balances — restore a placeholder jar.
  const jarIds = new Set(jars.map((j) => j.id))
  for (const t of transactions) {
    if (t.type === 'transfer' && !jarIds.has(t.jarId)) {
      jars.push(shapeJar({ id: t.jarId, createdAt: t.createdAt }))
      jarIds.add(t.jarId)
    }
  }

  const settings = { ...base.settings, ...(input.settings && typeof input.settings === 'object' ? input.settings : {}) }
  settings.startBalance = num(settings.startBalance)
  settings.currency = settings.currency || 'UAH'

  return {
    version: VERSION,
    transactions,
    customCategories: Array.isArray(input.customCategories) ? input.customCategories : [],
    jars,
    debts,
    goals,
    settings,
  }
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
