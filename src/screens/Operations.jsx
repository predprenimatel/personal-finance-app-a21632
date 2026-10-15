import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import CategoryPicker from '../components/CategoryPicker'
import TxnList from '../components/TxnList'
import { Chip, Empty, Segmented, cn } from '../components/ui'
import { TYPES } from '../lib/categories'
import { money } from '../lib/format'
import { applyFilters, sortTxns } from '../lib/stats'
import { useStore } from '../lib/store'

const TYPE_FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'expense', label: 'Расходы' },
  { id: 'income', label: 'Доходы' },
  { id: 'debt', label: 'Долги' },
]

export default function Operations({ onEdit }) {
  const { transactions, categoryMap, currency } = useStore()
  const [filters, setFilters] = useState({ type: 'all', categoryId: null, query: '', min: '', max: '' })
  const [showAmount, setShowAmount] = useState(false)
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }))

  // Only categories that actually have transactions are offered as filters.
  const usedCats = useMemo(() => {
    const counts = new Map()
    for (const t of transactions) if (filters.type === 'all' || t.type === filters.type) counts.set(t.categoryId, (counts.get(t.categoryId) || 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => categoryMap.get(id)).filter(Boolean)
  }, [transactions, categoryMap, filters.type])

  const filtered = useMemo(() => sortTxns(applyFilters(transactions, filters, categoryMap)), [transactions, filters, categoryMap])
  const total = filtered.reduce((s, t) => s + TYPES[t.type].sign * t.amount, 0)
  const active = filters.categoryId || filters.query || filters.min || filters.max || filters.type !== 'all'

  return (
    <div className="anim-fade">
      <header className="px-1 pt-4 pb-3">
        <h1 className="text-2xl font-semibold">Операции</h1>
      </header>

      <div className="flex gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-2xl bg-surface px-3 py-2.5">
          <Search size={18} className="text-muted" />
          <input value={filters.query} onChange={(e) => set({ query: e.target.value })} placeholder="Поиск по заметке, категории, сумме" className="w-full bg-transparent text-sm outline-none placeholder:text-faint" />
          {filters.query && (
            <button onClick={() => set({ query: '' })} className="text-muted">
              <X size={16} />
            </button>
          )}
        </label>
        <button onClick={() => setShowAmount((v) => !v)} className={cn('grid w-12 place-items-center rounded-2xl', showAmount || filters.min || filters.max ? 'bg-surface-2 text-accent' : 'bg-surface text-muted')} aria-label="Фильтр по сумме">
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {showAmount && (
        <div className="anim-pop mt-2 flex items-center gap-2">
          <input inputMode="decimal" value={filters.min} onChange={(e) => set({ min: e.target.value.replace(',', '.') })} placeholder="Сумма от" className="num w-full rounded-2xl bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-faint" />
          <span className="text-faint">—</span>
          <input inputMode="decimal" value={filters.max} onChange={(e) => set({ max: e.target.value.replace(',', '.') })} placeholder="до" className="num w-full rounded-2xl bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-faint" />
        </div>
      )}

      <Segmented options={TYPE_FILTERS} value={filters.type} onChange={(type) => set({ type, categoryId: null })} size="sm" className="mt-3" />

      {usedCats.length > 1 && (
        <CategoryFilter cats={usedCats} value={filters.categoryId} onChange={(categoryId) => set({ categoryId })} type={filters.type} />
      )}

      {active && filtered.length > 0 && (
        <div className="mt-4 flex items-baseline justify-between px-2 text-sm">
          <span className="text-muted">{filtered.length} операций</span>
          <span className="num font-medium">{money(total, currency, { sign: true })}</span>
        </div>
      )}

      <div className="mt-4">
        {filtered.length ? (
          <TxnList txns={filtered} onEdit={onEdit} />
        ) : transactions.length ? (
          <Empty icon="🔍" title="Ничего не найдено" text="Попробуйте изменить фильтры" />
        ) : (
          <Empty icon="🧾" title="Операций пока нет" text="Нажмите «+», чтобы добавить первую" />
        )}
      </div>
    </div>
  )
}

function CategoryFilter({ cats, value, onChange, type }) {
  const { categoryMap } = useStore()
  const [pickerOpen, setPickerOpen] = useState(false)
  const selected = categoryMap.get(value)
  const list = selected && !cats.includes(selected) ? [selected, ...cats] : cats
  return (
    <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
      <Chip active={!value} onClick={() => onChange(null)}>
        Все категории
      </Chip>
      {list.map((c) => (
        <Chip key={c.id} active={value === c.id} color={c.color} onClick={() => onChange(value === c.id ? null : c.id)}>
          <span>{c.icon}</span>
          {c.name}
        </Chip>
      ))}
      {type !== 'all' && (
        <Chip onClick={() => setPickerOpen(true)} className="text-muted">
          <Search size={14} /> Найти
        </Chip>
      )}
      {pickerOpen && (
        <CategoryPicker
          type={type}
          onClose={() => setPickerOpen(false)}
          onPick={(c) => {
            onChange(c.id)
            setPickerOpen(false)
          }}
        />
      )}
    </div>
  )
}
