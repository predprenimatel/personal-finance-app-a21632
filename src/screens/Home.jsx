import { useMemo } from 'react'
import { ChevronRight, Undo2 } from 'lucide-react'
import TxnList from '../components/TxnList'
import { Card, Empty, SectionTitle } from '../components/ui'
import { getRange, todayISO } from '../lib/dates'
import { money } from '../lib/format'
import { inRange, monthForecast, sortTxns, summarize } from '../lib/stats'
import { useStore } from '../lib/store'

export default function Home({ onEdit, onAdd, onTab }) {
  const { transactions, currency, lastTxn, deleteTxn, restoreTxn, showToast } = useStore()
  const month = getRange('month', 0)
  const today = todayISO()

  const { sum, todaySpent, recent, forecast } = useMemo(() => {
    const monthTxns = transactions.filter((t) => inRange(t, month))
    return {
      sum: summarize(monthTxns, month),
      todaySpent: transactions.filter((t) => t.date === today && t.type !== 'income').reduce((s, t) => s + t.amount, 0),
      recent: sortTxns(transactions).slice(0, 5),
      forecast: monthForecast(transactions),
    }
  }, [transactions, month.from, today])

  function undoLast() {
    const t = lastTxn
    deleteTxn(t.id)
    showToast('Последняя операция отменена', { label: 'Вернуть', fn: () => restoreTxn(t) })
  }

  return (
    <div className="anim-fade">
      <header className="flex items-center justify-between px-1 pt-4 pb-3">
        <div className="text-sm font-medium text-muted">{month.label}</div>
        {lastTxn && (
          <button onClick={undoLast} className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs text-muted active:bg-surface-2">
            <Undo2 size={14} /> Отменить последнюю
          </button>
        )}
      </header>

      <section className="px-1 pb-6">
        <div className="text-sm text-muted">Баланс месяца</div>
        <div className="num mt-1 text-5xl font-semibold" style={{ color: sum.balance < 0 ? 'var(--color-expense)' : undefined }}>
          {money(sum.balance, currency, { round: Math.abs(sum.balance) >= 100000 })}
        </div>
        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <div className="text-muted">Доход</div>
            <div className="num mt-0.5 text-lg font-medium text-income">{money(sum.income, currency)}</div>
          </div>
          <div>
            <div className="text-muted">Расход</div>
            <div className="num mt-0.5 text-lg font-medium">{money(sum.outflow, currency)}</div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="text-sm text-muted">Сегодня</div>
          <div className="num mt-1 text-2xl font-semibold">{money(todaySpent, currency)}</div>
        </Card>
        <Card>
          <div className="text-sm text-muted">Прогноз месяца</div>
          <div className="num mt-1 text-2xl font-semibold">{money(forecast.forecast, currency, { round: true })}</div>
        </Card>
      </div>

      <SectionTitle
        right={
          recent.length > 0 && (
            <button onClick={() => onTab('list')} className="flex items-center text-sm text-muted">
              Все <ChevronRight size={16} />
            </button>
          )
        }
      >
        Последние операции
      </SectionTitle>
      {recent.length ? (
        <TxnList txns={recent} onEdit={onEdit} />
      ) : (
        <Empty
          icon="🪙"
          title="Пока пусто"
          text="Добавьте первую операцию — это займёт пару секунд"
          action={
            <button onClick={onAdd} className="rounded-2xl bg-accent px-5 py-3 font-semibold text-bg">
              Добавить
            </button>
          }
        />
      )}
    </div>
  )
}
