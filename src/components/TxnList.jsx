import { dayLabel } from '../lib/dates'
import { money } from '../lib/format'
import { useStore } from '../lib/store'
import { realTxns } from '../lib/stats'
import { transferTitle, TYPES } from '../lib/categories'
import { CategoryIcon } from './ui'

export function TxnRow({ txn, onClick }) {
  const { categoryMap, jarMap, currency } = useStore()
  if (txn.type === 'transfer') {
    // Transfers aren't income or spending — shown in a neutral color, without a sign.
    const jar = jarMap.get(txn.jarId)
    return (
      <button onClick={() => onClick?.(txn)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left active:bg-surface">
        <CategoryIcon category={jar} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{transferTitle(txn, jar)}</div>
          {txn.note && <div className="truncate text-sm text-muted">{txn.note}</div>}
        </div>
        <div className="num shrink-0 font-semibold text-muted">{money(txn.amount, currency)}</div>
      </button>
    )
  }
  const cat = categoryMap.get(txn.categoryId)
  const sign = TYPES[txn.type].sign
  return (
    <button onClick={() => onClick?.(txn)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left active:bg-surface">
      <CategoryIcon category={cat} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{cat?.name ?? 'Без категории'}</div>
        {txn.note && <div className="truncate text-sm text-muted">{txn.note}</div>}
      </div>
      <div className="num shrink-0 font-semibold" style={{ color: txn.type === 'income' ? 'var(--color-income)' : txn.type === 'debt' ? 'var(--color-debt)' : undefined }}>
        {money(sign * txn.amount, currency, { sign: txn.type === 'income' })}
      </div>
    </button>
  )
}

/** Transactions grouped by day with a net total per day (income − outflow; transfers excluded). Expects sorted input. */
export default function TxnList({ txns, onEdit }) {
  const { currency } = useStore()
  const groups = []
  for (const t of txns) {
    const g = groups[groups.length - 1]
    if (g && g.date === t.date) g.items.push(t)
    else groups.push({ date: t.date, items: [t] })
  }
  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const real = realTxns(g.items)
        const net = real.reduce((s, t) => s + TYPES[t.type].sign * t.amount, 0)
        return (
          <section key={g.date}>
            <div className="flex items-baseline justify-between px-2 pb-1 text-sm">
              <span className="font-medium text-muted">{dayLabel(g.date)}</span>
              {real.length > 0 && <span className="num text-faint">{money(net, currency, { sign: true })}</span>}
            </div>
            {g.items.map((t) => (
              <TxnRow key={t.id} txn={t} onClick={onEdit} />
            ))}
          </section>
        )
      })}
    </div>
  )
}
