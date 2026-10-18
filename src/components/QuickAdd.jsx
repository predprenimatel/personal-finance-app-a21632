import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Delete, LayoutGrid, PencilLine, Plus, Trash2, X } from 'lucide-react'
import { kindMeta, rankCategories, transferTitle, TYPES } from '../lib/categories'
import { dayLabel, todayISO } from '../lib/dates'
import { currencySymbol, money } from '../lib/format'
import { debtRemaining } from '../lib/stats'
import { useStore } from '../lib/store'
import CategoryPicker from './CategoryPicker'
import JarForm from './JarForm'
import { Chip, Segmented } from './ui'

const TYPE_OPTIONS = [
  { id: 'expense', label: 'Расход', color: 'var(--color-expense)' },
  { id: 'income', label: 'Доход', color: 'var(--color-income)' },
  { id: 'debt', label: 'Долг', color: 'var(--color-debt)' },
  { id: 'transfer', label: 'Копилка' },
]
const DIRECTIONS = [
  { id: 'in', label: 'Положить' },
  { id: 'out', label: 'Снять' },
]
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']

/** Applies one keypad press to the amount string: max 9 integer digits, 2 decimals. */
function pressKey(value, key) {
  if (key === 'back') return value.slice(0, -1)
  if (key === '.') return value.includes('.') ? value : (value || '0') + '.'
  const [int, dec] = value.split('.')
  if (dec !== undefined) return dec.length >= 2 ? value : value + key
  if (int === '0') return key
  return int.length >= 9 ? value : value + key
}

function displayAmount(value) {
  if (!value) return '0'
  const [int, dec] = value.split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return dec !== undefined ? `${grouped},${dec}` : grouped
}

/**
 * Fast entry form: amount → category → save. Also used for editing (`initial`).
 * `preset` pre-fills a new entry, e.g. { type: 'transfer', direction: 'out', jarId } from the Goals tab.
 */
export default function QuickAdd({ initial, preset, onClose }) {
  const { categories, categoryMap, transactions, currency, addTxn, updateTxn, deleteTxn, restoreTxn, showToast, activeJars, jarMap, balances, debts } = useStore()
  const [type, setType] = useState(initial?.type ?? preset?.type ?? 'expense')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : preset?.amount ? String(preset.amount) : '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? preset?.categoryId ?? null)
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [note, setNote] = useState(initial?.note ?? '')
  const [noteOpen, setNoteOpen] = useState(Boolean(initial?.note))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [extraChip, setExtraChip] = useState(null)
  const [direction, setDirection] = useState(initial?.direction ?? preset?.direction ?? 'in')
  const [debtId, setDebtId] = useState(initial?.debtId ?? preset?.debtId ?? null)
  // Default jar: the one used last, else the first one.
  const [jarId, setJarId] = useState(() => {
    if (initial?.jarId || preset?.jarId) return initial?.jarId ?? preset.jarId
    const last = transactions.reduce((a, t) => (t.type === 'transfer' && jarMap.get(t.jarId) && !jarMap.get(t.jarId).archived && (!a || t.createdAt > a.createdAt) ? t : a), null)
    return last?.jarId ?? activeJars[0]?.id ?? null
  })
  const [jarFormOpen, setJarFormOpen] = useState(false)
  const isTransfer = type === 'transfer'

  const ranked = useMemo(() => rankCategories(transactions, categories, type), [transactions, categories, type])
  const firstTime = ranked.length === 0
  const chips = useMemo(() => {
    const base = firstTime ? categories.filter((c) => c.type === type) : ranked
    // A category picked from "Все" (or the one being edited) is shown up front without reshuffling the rest.
    const inBase = new Set(base.map((c) => c.id))
    const pinned = [...new Set([extraChip, categoryId])].map((id) => categoryMap.get(id)).filter((c) => c && c.type === type && !inBase.has(c.id))
    return [...pinned, ...base]
  }, [firstTime, categories, ranked, extraChip, categoryId, categoryMap, type])

  const value = Number(amount) || 0

  // Jar balance without the transfer being edited, so limits are checked against what the jar would hold.
  const own = initial?.type === 'transfer' ? initial : null
  const jarBase = (id) => (balances.jarBalance.get(id) || 0) - (own?.jarId === id ? (own.direction === 'in' ? own.amount : -own.amount) : 0)
  const jar = jarMap.get(jarId)
  const jarChips = jar && jar.archived ? [jar, ...activeJars] : activeJars
  let jarError = null
  if (isTransfer && jar && value > 0) {
    const base = jarBase(jarId)
    if (base + (direction === 'in' ? value : -value) < 0) jarError = direction === 'out' ? `В копилке только ${money(Math.max(0, base), currency)}` : 'Из копилки уже снято больше этой суммы'
  }
  // Changing an existing deposit into something else must not leave its old jar below zero.
  if (!jarError && own && (!isTransfer || own.jarId !== jarId) && jarBase(own.jarId) < 0) jarError = `Эти деньги уже сняты из копилки «${jarMap.get(own.jarId)?.name ?? ''}»`

  const canSave = isTransfer ? value > 0 && Boolean(jar) && !jarError : value > 0 && categoryId && categoryMap.get(categoryId)?.type === type

  // Physical keyboard support on desktop.
  useEffect(() => {
    const onKey = (e) => {
      if (pickerOpen || jarFormOpen || ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (/^[0-9]$/.test(e.key)) setAmount((v) => pressKey(v, e.key))
      else if (e.key === '.' || e.key === ',') setAmount((v) => pressKey(v, '.'))
      else if (e.key === 'Backspace') setAmount((v) => pressKey(v, 'back'))
      else if (e.key === 'Enter' && canSave) save()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function changeType(t) {
    setType(t)
    if (t !== 'transfer' && categoryMap.get(categoryId)?.type !== t) setCategoryId(null)
  }

  function save() {
    if (!canSave) return
    const common = { amount: Math.round(value * 100) / 100, date, note: note.trim() }
    const fields = isTransfer ? { type, direction, jarId, ...common } : { type, categoryId, ...common, ...(type === 'debt' && debtId ? { debtId } : {}) }
    const label = isTransfer
      ? `${transferTitle(fields, jar)} ${money(fields.amount, currency)}`
      : `${categoryMap.get(categoryId).name} ${money(TYPES[type].sign * fields.amount, currency, { sign: true })}`
    if (initial) {
      updateTxn({ id: initial.id, createdAt: initial.createdAt, ...fields })
      showToast(`Изменено: ${label}`)
    } else {
      const txn = addTxn(fields)
      showToast(`Сохранено: ${label}`, { label: 'Отменить', fn: () => deleteTxn(txn.id) })
    }
    onClose()
  }

  function remove() {
    deleteTxn(initial.id)
    showToast('Операция удалена', { label: 'Вернуть', fn: () => restoreTxn(initial) })
    onClose()
  }

  const typeColor = jarError ? 'var(--color-expense)' : TYPE_OPTIONS.find((o) => o.id === type).color ?? 'var(--color-ink)'

  return (
    <div className="fixed inset-0 z-40 flex justify-center">
      <div className="anim-fade absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="anim-sheet relative flex h-dvh w-full max-w-md flex-col bg-bg px-4 pt-[max(env(safe-area-inset-top),12px)] pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-muted active:bg-surface" aria-label="Закрыть">
            <X size={22} />
          </button>
          <Segmented options={TYPE_OPTIONS} value={type} onChange={changeType} size="xs" className="flex-1" />
          {initial ? (
            <button onClick={remove} className="grid h-10 w-10 place-items-center rounded-full text-expense active:bg-surface" aria-label="Удалить">
              <Trash2 size={20} />
            </button>
          ) : (
            <span className="w-10" />
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-4">
          <div className="num flex items-baseline gap-2 font-semibold leading-none" style={{ color: value ? typeColor : 'var(--color-faint)' }}>
            <span className={amount.length > 9 ? 'text-5xl' : 'text-6xl'}>{displayAmount(amount)}</span>
            <span className="text-3xl opacity-70">{currencySymbol(currency)}</span>
          </div>
          <div className="mt-5 flex items-center gap-2">
            <label className="relative flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm text-muted">
              <CalendarDays size={15} />
              {dayLabel(date)}
              <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="absolute inset-0 opacity-0" aria-label="Дата" />
            </label>
            {!noteOpen && (
              <button onClick={() => setNoteOpen(true)} className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm text-muted">
                <PencilLine size={15} /> Заметка
              </button>
            )}
          </div>
          {jarError && <div className="anim-pop mt-3 text-sm text-expense">{jarError}</div>}
          {noteOpen && (
            <input autoFocus={!initial} value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="Заметка" onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className="mt-3 w-full max-w-xs rounded-2xl bg-surface px-4 py-2.5 text-center text-sm outline-none placeholder:text-faint" />
          )}
        </div>

        {isTransfer ? (
          <div className="mb-3">
            <Segmented options={DIRECTIONS} value={direction} onChange={setDirection} size="sm" className="mb-2" />
            {jarChips.length === 0 && <div className="mb-2 px-1 text-xs text-faint">Создайте копилку — деньги в ней не считаются расходом</div>}
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {jarChips.map((j) => (
                <Chip key={j.id} active={j.id === jarId} color={j.color} onClick={() => setJarId(j.id)}>
                  <span>{j.icon}</span>
                  {j.name}
                  <span className="num opacity-70">{money(balances.jarBalance.get(j.id) || 0, currency, { round: true })}</span>
                </Chip>
              ))}
              <Chip onClick={() => setJarFormOpen(true)} className="text-muted">
                <Plus size={15} /> Новая
              </Chip>
            </div>
          </div>
        ) : (
          <div className="mb-3">
            {type === 'debt' && (
              <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4">
                {debts.filter((d) => !d.archived || d.id === debtId).length === 0 && (
                  <div className="px-1 py-2 text-xs text-faint">Можно не привязывать — или завести долг во вкладке «Цели»</div>
                )}
                {debts
                  .filter((d) => !d.archived || d.id === debtId)
                  .map((d) => {
                    const meta = kindMeta(d.kind)
                    const rem = Math.max(0, debtRemaining(d, transactions))
                    return (
                      <Chip
                        key={d.id}
                        active={d.id === debtId}
                        color="var(--color-debt)"
                        onClick={() => {
                          if (d.id === debtId) {
                            setDebtId(null)
                            return
                          }
                          setDebtId(d.id)
                          setCategoryId(meta.categoryId)
                          setExtraChip(meta.categoryId)
                          if (!amount && d.regularPayment) setAmount(String(d.regularPayment))
                        }}
                      >
                        <span>{meta.icon}</span>
                        {d.name}
                        <span className="num opacity-70">{money(rem, currency, { round: true })}</span>
                      </Chip>
                    )
                  })}
              </div>
            )}
            {firstTime && type !== 'debt' && <div className="mb-2 px-1 text-xs text-faint">Выберите категорию — дальше здесь будут только ваши</div>}
            <div className="no-scrollbar -mx-4 grid auto-cols-max grid-flow-col grid-rows-2 gap-2 overflow-x-auto px-4">
              {chips.map((c) => (
                <Chip key={c.id} active={c.id === categoryId} color={c.color} onClick={() => setCategoryId(c.id)}>
                  <span>{c.icon}</span>
                  {c.name}
                </Chip>
              ))}
              <Chip onClick={() => setPickerOpen(true)} className="text-muted">
                <LayoutGrid size={15} /> Все
              </Chip>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setAmount((v) => pressKey(v, k))}
              className="num grid h-14 place-items-center rounded-2xl bg-surface text-2xl font-medium transition-colors active:bg-surface-2"
              aria-label={k === 'back' ? 'Стереть' : k}
            >
              {k === 'back' ? <Delete size={24} /> : k === '.' ? ',' : k}
            </button>
          ))}
        </div>
        <button disabled={!canSave} onClick={save} className="mt-3 h-14 rounded-2xl bg-accent text-lg font-semibold text-bg transition-opacity disabled:opacity-30">
          {initial ? 'Сохранить изменения' : 'Сохранить'}
        </button>
      </div>

      {jarFormOpen && (
        <JarForm
          onClose={() => setJarFormOpen(false)}
          onSaved={(j) => {
            setJarId(j.id)
            setJarFormOpen(false)
          }}
        />
      )}
      {pickerOpen && (
        <CategoryPicker
          type={type}
          onClose={() => setPickerOpen(false)}
          onPick={(c) => {
            setCategoryId(c.id)
            setExtraChip(c.id)
            setPickerOpen(false)
          }}
        />
      )}
    </div>
  )
}
