import { useState } from 'react'
import { COLOR_CHOICES, JAR_ICONS } from '../lib/categories'
import { currencySymbol, money } from '../lib/format'
import { useStore } from '../lib/store'
import { CategoryIcon, Sheet, cn } from './ui'

const parseAmount = (s) => (s.trim() === '' ? 0 : Number(s.replace(',', '.').replace(/\s/g, '')))

/** Create (no `jar`) or edit a jar: name, icon, color, amount already saved. Calls `onSaved(jar)`. */
export default function JarForm({ jar, onClose, onSaved }) {
  const { addJar, updateJar, balances, currency } = useStore()
  const [name, setName] = useState(jar?.name ?? '')
  const [icon, setIcon] = useState(jar?.icon ?? JAR_ICONS[0])
  const [color, setColor] = useState(jar?.color ?? COLOR_CHOICES[7])
  const [opening, setOpening] = useState(jar?.openingBalance ? String(jar.openingBalance).replace('.', ',') : '')

  const openingValue = parseAmount(opening)
  // Lowering the opening amount of an existing jar must not push its balance below zero.
  const minOpening = jar ? Math.max(0, jar.openingBalance - (balances.jarBalance.get(jar.id) || 0)) : 0
  const amountOk = Number.isFinite(openingValue) && openingValue >= minOpening
  const valid = name.trim().length > 0 && amountOk

  function save() {
    if (!valid) return
    const fields = { name: name.trim(), icon, color, openingBalance: Math.round(openingValue * 100) / 100 }
    const saved = jar ? { ...jar, ...fields } : addJar(fields)
    if (jar) updateJar(saved)
    onSaved?.(saved)
  }

  return (
    <Sheet title={jar ? 'Копилка' : 'Новая копилка'} onClose={onClose} z="z-50">
      <div className="space-y-5 px-5 pb-6">
        <div className="flex items-center gap-3">
          <CategoryIcon category={{ icon, color }} size={52} />
          <input autoFocus={!jar} value={name} onChange={(e) => setName(e.target.value)} maxLength={32} placeholder="Название, например «Отпуск»" className="min-w-0 flex-1 rounded-2xl bg-surface px-4 py-3 text-lg outline-none placeholder:text-faint" />
        </div>
        <div>
          <div className="mb-2 text-sm text-muted">{jar ? 'Начальная сумма' : 'Уже накоплено'}</div>
          <label className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-3">
            <input inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value.replace(/[^\d.,\s]/g, ''))} placeholder="0" className="num w-full bg-transparent text-lg outline-none placeholder:text-faint" />
            <span className="text-muted">{currencySymbol(currency)}</span>
          </label>
          <div className={cn('mt-1.5 px-1 text-xs', amountOk ? 'text-faint' : 'text-expense')}>
            {amountOk ? 'Деньги, которые уже лежат в копилке. Не списываются с активного баланса.' : `Не меньше ${money(minOpening, currency)} — столько уже снято из копилки`}
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm text-muted">Иконка</div>
          <div className="grid grid-cols-8 gap-2">
            {JAR_ICONS.map((i) => (
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
          <button onClick={onClose} className="flex-1 rounded-2xl bg-surface py-3.5 font-medium">Отмена</button>
          <button disabled={!valid} onClick={save} className="flex-1 rounded-2xl bg-accent py-3.5 font-semibold text-bg disabled:opacity-40">
            {jar ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
