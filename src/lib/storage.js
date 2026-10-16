// All persistence goes through this module. Data lives only in this browser (localStorage).
// The key stays `kopilka:v1` so existing data opens as is; the schema version lives inside (`version`).
const KEY = 'kopilka:v1'
export const VERSION = 2

const TXN_TYPES = ['expense', 'income', 'debt', 'transfer']

export const emptyData = () => ({
  version: VERSION,
  transactions: [],
  customCategories: [],
  jars: [],
  settings: { currency: 'UAH', startBalance: 0 },
})

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyData()
    return normalize(JSON.parse(raw))
  } catch {
    return emptyData()
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Не удалось сохранить данные', e)
  }
}

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : fallback)

/**
 * Canonical transaction shape; returns null for invalid input.
 * Regular operations carry `categoryId`, transfers (`type: 'transfer'`) carry `direction` + `jarId` instead.
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
  return { ...base, categoryId: String(t.categoryId) }
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

/**
 * Validates and fills defaults; used for both loading and importing backups.
 * Migrations: v1 → v2 adds `jars`, transfers and `settings.startBalance` (all default to empty / 0).
 */
export function normalize(input) {
  const base = emptyData()
  if (!input || typeof input !== 'object') throw new Error('Неверный формат файла')
  const transactions = (Array.isArray(input.transactions) ? input.transactions : []).map(shapeTxn).filter(Boolean)
  const jars = (Array.isArray(input.jars) ? input.jars : []).filter((j) => j && typeof j === 'object').map(shapeJar)

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

  return {
    ...base,
    transactions,
    customCategories: Array.isArray(input.customCategories) ? input.customCategories : [],
    jars,
    settings,
  }
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
