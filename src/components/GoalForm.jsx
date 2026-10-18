import { useState } from 'react'
import { COLOR_CHOICES, GOAL_ICONS } from '../lib/categories'
import { currencySymbol } from '../lib/format'
import { useStore } from '../lib/store'
import { CategoryIcon, Chip, Segmented, Sheet, cn } from './ui'

const parseAmount = (s) => {
  const n = Number(String(s).trim().replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

/** Savings goal. Can follow a jar automatically or a number you top up by hand. */
export default function GoalForm({ goal, onClose, onSaved }) {
  const { addGoal, updateGoal, addJar, activeJars, jarMap, currency } = useStore()
  const [name, setName] = useState(goal?.name ?? '')
  const [icon, setIcon] = useState(goal?.icon ?? '🎯')
  const [color, setColor] = useState(goal?.color ?? COLOR_CHOICES[7])
  const [target, setTarget] = useState(goal ? String(goal.targetAmount).replace('.', ',') : '')
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const [mode, setMode] = useState(goal?.jarId ? 'jar' : 'manual')
  const [jarId, setJarId] = useState(goal?.jarId && jarMap.get(goal.jarId) ? goal.jarId : (activeJars[0]?.id ?? null))
  const [makeJar, setMakeJar] = useState(false)
  const [manual, setManual] = useState(goal && !goal.jarId ? String(goal.manualSaved).replace('.', ',') : '')

  const targetValue = parseAmount(target)
  const manualValue = parseAmount(manual === '' ? '0' : manual)
  const jarOk = mode !== 'jar' || makeJar || Boolean(jarId)
  const valid = name.trim().length > 0 && targetValue > 0 && jarOk && (mode === 'jar' || (Number.isFinite(manualValue) && manualValue >= 0))

  function save() {
    if (!valid) return
    let linked = null
    if (mode === 'jar') {
      if (makeJar || !jarId) {
        const jar = addJar({ name: name.trim(), icon, color, openingBalance: 0 })
        linked = jar.id
      } else linked = jarId
    }
    const fields = {
      name: name.trim(),
      icon,
      color,
      targetAmount: Math.round(targetValue * 100) / 100,
      deadline,
      jarId: linked,
      manualSaved: mode === 'manual' ? Math.round(manualValue * 100) / 100 : goal?.manualSaved ?? 0,
      topups: goal?.topups ?? [],
      archived: goal?.archived ?? false,
      reached: goal?.reached ?? false,
    }
    const saved = goal ? { ...goal, ...fields } : addGoal(fields)
    if (goal) updateGoal(saved)
    onSaved?.(saved)
  }

  const jars = jarMap.get(jarId)?.archived ? [jarMap.get(jarId), ...activeJars] : activeJars

  return (
    <Sheet title={goal ? 'Цель' : 'Новая цель'} onClose={onClose} z="z-50">
      <div className="space-y-4 px-5 pb-6">
        <div className="flex items-center gap-3">
          <CategoryIcon category={{ icon, color }} size={52} />
          <input
            autoFocus={!goal}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            placeholder="Например, «Машина»"
            className="min-w-0 flex-1 rounded-2xl bg-surface px-4 py-3 text-lg outline-none placeholder:text-faint"
          />
        </div>
        <label className="block">
          <div className="mb-1.5 text-sm text-muted">Нужно накопить</div>
          <label className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-3">
            <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d.,\s]/g, ''))} placeholder="0" className="num w-full bg-transparent text-lg outline-none placeholder:text-faint" />
            <span className="text-muted">{currencySymbol(currency)}</span>
          </label>
        </label>
        <label className="block">
          <div className="mb-1.5 text-sm text-muted">Срок</div>
          <div className="flex gap-2">
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="min-w-0 flex-1 rounded-2xl bg-surface px-4 py-3 outline-none" />
            {deadline && (
              <button onClick={() => setDeadline('')} className="rounded-2xl bg-surface px-3 text-sm text-muted">Убрать</button>
            )}
          </div>
        </label>
        <Segmented
          options={[
            { id: 'manual', label: 'Сумма вручную' },
            { id: 'jar', label: 'Копилка' },
          ]}
          value={mode}
          onChange={(id) => {
            setMode(id)
            if (id === 'jar' && !jarId && activeJars.length === 0) setMakeJar(true)
          }}
          size="sm"
        />
        {mode === 'jar' ? (
          <div>
            <div className="mb-2 text-xs text-faint">Прогресс считается по деньгам в копилке. Ручная сумма не переносится.</div>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
              {jars.filter(Boolean).map((j) => (
                <Chip key={j.id} active={!makeJar && j.id === jarId} color={j.color} onClick={() => { setMakeJar(false); setJarId(j.id) }}>
                  <span>{j.icon}</span>
                  {j.name}
                </Chip>
              ))}
              <Chip active={makeJar || jars.filter(Boolean).length === 0} onClick={() => setMakeJar(true)}>
                + {name.trim() ? `Копилка «${name.trim()}»` : 'Новая копилка'}
              </Chip>
            </div>
          </div>
        ) : (
          <label className="block">
            <div className="mb-1.5 text-sm text-muted">Уже отложено</div>
            <label className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-3">
              <input inputMode="decimal" value={manual} onChange={(e) => setManual(e.target.value.replace(/[^\d.,\s]/g, ''))} placeholder="0" className="num w-full bg-transparent outline-none placeholder:text-faint" />
              <span className="text-muted">{currencySymbol(currency)}</span>
            </label>
          </label>
        )}
        <div>
          <div className="mb-2 text-sm text-muted">Иконка</div>
          <div className="grid grid-cols-8 gap-2">
            {GOAL_ICONS.map((i) => (
              <button key={i} onClick={() => setIcon(i)} className={cn('grid aspect-square place-items-center rounded-xl text-xl', icon === i ? 'bg-surface-2 ring-2 ring-accent' : 'bg-surface')}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {COLOR_CHOICES.map((c) => (
            <button key={c} onClick={() => setColor(c)} aria-label={c} className={cn('h-8 w-8 rounded-full', color === c && 'ring-2 ring-ink ring-offset-2 ring-offset-bg')} style={{ background: c }} />
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 rounded-2xl bg-surface py-3.5 font-medium">Отмена</button>
          <button disabled={!valid} onClick={save} className="flex-1 rounded-2xl bg-accent py-3.5 font-semibold text-bg disabled:opacity-40">
            {goal ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
