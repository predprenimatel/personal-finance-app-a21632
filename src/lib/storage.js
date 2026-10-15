// All persistence goes through this module. Data lives only in this browser (localStorage).
const KEY = 'kopilka:v1'

export const emptyData = () => ({
  version: 1,
  transactions: [],
  customCategories: [],
  settings: { currency: 'UAH' },
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

/** Validates and fills defaults; used for both loading and importing backups. */
export function normalize(input) {
  const base = emptyData()
  if (!input || typeof input !== 'object') throw new Error('Неверный формат файла')
  const transactions = Array.isArray(input.transactions) ? input.transactions : []
  return {
    ...base,
    transactions: transactions
      .filter((t) => t && Number.isFinite(Number(t.amount)) && t.date && t.categoryId && t.type)
      .map((t) => ({
        id: String(t.id ?? uid()),
        type: t.type,
        amount: Number(t.amount),
        categoryId: String(t.categoryId),
        date: String(t.date).slice(0, 10),
        note: t.note ? String(t.note) : '',
        createdAt: Number(t.createdAt) || Date.now(),
      })),
    customCategories: Array.isArray(input.customCategories) ? input.customCategories : [],
    settings: { ...base.settings, ...(input.settings || {}) },
  }
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
