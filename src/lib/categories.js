// Preset categories. IDs are stable — they are stored in transactions and backups.
export const TYPES = {
  expense: { label: 'Расход', plural: 'Расходы', color: 'var(--color-expense)', sign: -1 },
  income: { label: 'Доход', plural: 'Доходы', color: 'var(--color-income)', sign: 1 },
  debt: { label: 'Долг', plural: 'Долги', color: 'var(--color-debt)', sign: -1 },
}

export const DEFAULT_CATEGORIES = [
  { id: 'salary', type: 'income', name: 'Зарплата', icon: '💼', color: '#5BD6A0' },
  { id: 'orders', type: 'income', name: 'Заказы / халтура', icon: '🧾', color: '#7FD4F5' },
  { id: 'sidejob', type: 'income', name: 'Подработка', icon: '🔧', color: '#A8E06B' },
  { id: 'income_other', type: 'income', name: 'Прочее', icon: '➕', color: '#9AA3AE' },

  { id: 'food', type: 'expense', name: 'Еда', icon: '🍽️', color: '#FF9F6B' },
  { id: 'groceries', type: 'expense', name: 'Продукты', icon: '🛒', color: '#FFC857' },
  { id: 'cafe', type: 'expense', name: 'Кафе', icon: '☕', color: '#D9825B' },
  { id: 'transport', type: 'expense', name: 'Транспорт', icon: '🚌', color: '#6BB8FF' },
  { id: 'rent', type: 'expense', name: 'Аренда', icon: '🏠', color: '#B48CFF' },
  { id: 'utilities', type: 'expense', name: 'Коммуналка', icon: '💡', color: '#E8D36B' },
  { id: 'mobile', type: 'expense', name: 'Связь', icon: '📱', color: '#66D9E8' },
  { id: 'cigarettes', type: 'expense', name: 'Сигареты', icon: '🚬', color: '#C9A27E' },
  { id: 'health', type: 'expense', name: 'Здоровье', icon: '💊', color: '#FF6B8B' },
  { id: 'clothes', type: 'expense', name: 'Одежда', icon: '👕', color: '#F78FB3' },
  { id: 'tech', type: 'expense', name: 'Техника', icon: '💻', color: '#8C9EFF' },
  { id: 'fun', type: 'expense', name: 'Развлечения', icon: '🎮', color: '#E879F9' },
  { id: 'subscriptions', type: 'expense', name: 'Подписки', icon: '🔁', color: '#4FD1C5' },
  { id: 'work_tools', type: 'expense', name: 'Инструменты / материалы', icon: '🧰', color: '#F6AD55' },
  { id: 'expense_other', type: 'expense', name: 'Прочее', icon: '📦', color: '#9AA3AE' },

  { id: 'credit', type: 'debt', name: 'Кредиты', icon: '🏦', color: '#F5B83D' },
  { id: 'microloan', type: 'debt', name: 'Микрозаймы', icon: '⚡', color: '#FF8A4C' },
  { id: 'installment', type: 'debt', name: 'Рассрочки', icon: '🧩', color: '#D6BCFA' },
  { id: 'personal_debt', type: 'debt', name: 'Личные долги', icon: '🤝', color: '#90CDF4' },
  { id: 'obligations', type: 'debt', name: 'Обязательства', icon: '📌', color: '#FBB6CE' },
]

export const ICON_CHOICES = ['🍔', '🍕', '🥦', '🍺', '🚕', '⛽', '🚗', '✈️', '🏋️', '🐶', '👶', '🎁', '📚', '🎓', '💇', '🧴', '🛠️', '🎨', '📷', '🎵', '🏥', '🧹', '💰', '📈', '🪙', '💳', '🏷️', '⭐']
export const COLOR_CHOICES = ['#FF7A6B', '#FF9F6B', '#FFC857', '#C6F36B', '#5BD6A0', '#4FD1C5', '#66D9E8', '#6BB8FF', '#8C9EFF', '#B48CFF', '#E879F9', '#F78FB3']

/**
 * Categories shown as chips: only ones the user has actually used for this type.
 * The 3 most recently used go first, then the rest by frequency.
 */
export function rankCategories(transactions, categories, type) {
  const ofType = transactions.filter((t) => t.type === type)
  const sorted = [...ofType].sort((a, b) => b.createdAt - a.createdAt)
  const counts = new Map()
  for (const t of ofType) counts.set(t.categoryId, (counts.get(t.categoryId) || 0) + 1)

  const recent = []
  for (const t of sorted) {
    if (!recent.includes(t.categoryId)) recent.push(t.categoryId)
    if (recent.length === 3) break
  }
  const rest = [...counts.keys()].filter((id) => !recent.includes(id)).sort((a, b) => counts.get(b) - counts.get(a))
  const byId = new Map(categories.map((c) => [c.id, c]))
  return [...recent, ...rest].map((id) => byId.get(id)).filter(Boolean)
}

/** IDs of categories that have at least one transaction. */
export function usedCategoryIds(transactions) {
  return new Set(transactions.map((t) => t.categoryId))
}
