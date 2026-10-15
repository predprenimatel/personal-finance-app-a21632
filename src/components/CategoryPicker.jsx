import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { COLOR_CHOICES, ICON_CHOICES, TYPES } from '../lib/categories'
import { useStore } from '../lib/store'
import { CategoryIcon, Sheet, cn } from './ui'

/** Full category list (including hidden/unused ones) with search and custom category creation. */
export default function CategoryPicker({ type, onPick, onClose }) {
  const { categories, transactions, addCategory } = useStore()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const counts = useMemo(() => {
    const m = new Map()
    for (const t of transactions) m.set(t.categoryId, (m.get(t.categoryId) || 0) + 1)
    return m
  }, [transactions])

  const q = query.trim().toLowerCase()
  const list = categories.filter((c) => c.type === type && (!q || c.name.toLowerCase().includes(q)))

  return (
    <Sheet title={creating ? 'Новая категория' : `Все категории · ${TYPES[type].plural.toLowerCase()}`} onClose={onClose} z="z-50">
      {creating ? (
        <CreateForm
          initialName={query}
          onCancel={() => setCreating(false)}
          onSave={(fields) => onPick(addCategory({ ...fields, type }))}
        />
      ) : (
        <div className="px-4 pb-6">
          <label className="mb-3 flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5">
            <Search size={18} className="text-muted" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск категории" className="w-full bg-transparent outline-none placeholder:text-faint" />
          </label>
          <div className="space-y-0.5">
            {list.map((c) => (
              <button key={c.id} onClick={() => onPick(c)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left active:bg-surface">
                <CategoryIcon category={c} size={36} />
                <span className="flex-1">{c.name}</span>
                {counts.get(c.id) ? <span className="num text-sm text-faint">{counts.get(c.id)}</span> : null}
              </button>
            ))}
            {list.length === 0 && <div className="py-6 text-center text-sm text-muted">Ничего не найдено</div>}
          </div>
          <button onClick={() => setCreating(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-3 text-sm font-medium text-accent">
            <Plus size={18} /> Создать категорию
          </button>
        </div>
      )}
    </Sheet>
  )
}

function CreateForm({ initialName, onSave, onCancel }) {
  const [name, setName] = useState(initialName)
  const [icon, setIcon] = useState(ICON_CHOICES[0])
  const [color, setColor] = useState(COLOR_CHOICES[7])
  const valid = name.trim().length > 0

  return (
    <div className="space-y-5 px-5 pb-6">
      <div className="flex items-center gap-3">
        <CategoryIcon category={{ icon, color }} size={52} />
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={32} placeholder="Название" className="flex-1 rounded-2xl bg-surface px-4 py-3 text-lg outline-none placeholder:text-faint" />
      </div>
      <div>
        <div className="mb-2 text-sm text-muted">Иконка</div>
        <div className="grid grid-cols-7 gap-2">
          {ICON_CHOICES.map((i) => (
            <button key={i} onClick={() => setIcon(i)} className={cn('grid aspect-square place-items-center rounded-xl text-xl', icon === i ? 'bg-surface-2 ring-2 ring-accent' : 'bg-surface')}>
              {i}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-sm text-muted">Цвет</div>
        <div className="flex flex-wrap gap-2.5">
          {COLOR_CHOICES.map((c) => (
            <button key={c} onClick={() => setColor(c)} aria-label={c} className={cn('h-9 w-9 rounded-full', color === c && 'ring-2 ring-ink ring-offset-2 ring-offset-bg')} style={{ background: c }} />
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 rounded-2xl bg-surface py-3.5 font-medium">Назад</button>
        <button disabled={!valid} onClick={() => onSave({ name: name.trim(), icon, color })} className="flex-1 rounded-2xl bg-accent py-3.5 font-semibold text-bg disabled:opacity-40">
          Создать
        </button>
      </div>
    </div>
  )
}
