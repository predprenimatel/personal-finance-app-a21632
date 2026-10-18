import { useMemo } from 'react'
import { ChevronRight, Undo2 } from 'lucide-react'
import TxnList from '../components/TxnList'
import { Card, Empty, ProgressBar, SectionTitle, progressColor } from '../components/ui'
import { getRange, mediumDate, todayISO } from '../lib/dates'
import { money, percent } from '../lib/format'
import { goalFlows, goalOutlook, goalSaved, inRange, monthForecast, realTxns, sortTxns, summarize } from '../lib/stats'
import { useStore } from '../lib/store'

export default function Home({ onEdit, onAdd, onTab }) {
  const { transactions, currency, lastTxn, deleteTxn, restoreTxn, showToast, balances, debts, goals } = useStore()
  const month = getRange('month', 0)
  const today = todayISO()

  const { sum, todaySpent, recent, forecast } = useMemo(() => {
    const monthTxns = transactions.filter((t) => inRange(t, month))
    return {
      sum: summarize(monthTxns, month),
      todaySpent: realTxns(transactions).filter((t) => t.date === today && t.type !== 'income').reduce((s, t) => s + t.amount, 0),
      recent: sortTxns(transactions).slice(0, 5),
      forecast: monthForecast(transactions),
    }
  }, [transactions, month.from, today])

  const nextDebt = useMemo(() => {
    return debts
      .filter((d) => !d.archived && d.nextPaymentDate)
      .slice()
      .sort((a, b) => (a.nextPaymentDate < b.nextPaymentDate ? -1 : 1))[0] ?? null
  }, [debts])

  const goalCards = useMemo(() => {
    return goals
      .filter((g) => !g.archived)
      .slice()
      .sort((a, b) => {
        if (a.deadline && b.deadline) return a.deadline < b.deadline ? -1 : 1
        if (a.deadline) return -1
        if (b.deadline) return 1
        return 0
      })
      .slice(0, 2)
      .map((g) => {
        const saved = goalSaved(g, balances.jarBalance)
        const outlook = goalOutlook({ saved, target: g.targetAmount, deadline: g.deadline, flows: goalFlows(g, transactions) })
        return { goal: g, saved, outlook }
      })
  }, [goals, balances.jarBalance, transactions])

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

      <section className="px-1 pb-5">
        <div className="text-sm text-muted">Общий баланс</div>
        <div className="num mt-1 text-5xl font-semibold" style={{ color: balances.total < 0 ? 'var(--color-expense)' : undefined }}>
          {money(balances.total, currency, { round: Math.abs(balances.total) >= 100000 })}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="text-sm text-muted">Активный</div>
          <div className="num mt-1 text-2xl font-semibold" style={{ color: balances.active < 0 ? 'var(--color-expense)' : undefined }}>
            {money(balances.active, currency, { round: Math.abs(balances.active) >= 100000 })}
          </div>
        </Card>
        <Card role="button" onClick={() => onTab('goals', 'jars')} className="active:bg-surface-2">
          <div className="flex items-center justify-between text-sm text-muted">
            В копилках <ChevronRight size={16} className="text-faint" />
          </div>
          <div className="num mt-1 text-2xl font-semibold">{money(balances.saved, currency, { round: Math.abs(balances.saved) >= 100000 })}</div>
        </Card>
      </div>

      <Card className="mt-3 py-3">
        <div className="flex items-baseline justify-between">
          <div className="text-sm text-muted">Баланс месяца</div>
          <div className="num text-lg font-semibold" style={{ color: sum.balance < 0 ? 'var(--color-expense)' : undefined }}>
            {money(sum.balance, currency, { sign: true, round: Math.abs(sum.balance) >= 100000 })}
          </div>
        </div>
        <div className="mt-1 flex gap-4 text-sm">
          <span className="text-muted">
            Доход <span className="num font-medium text-income">{money(sum.income, currency)}</span>
          </span>
          <span className="text-muted">
            Расход <span className="num font-medium text-ink">{money(sum.outflow, currency)}</span>
          </span>
        </div>
      </Card>

      {(nextDebt || goalCards.length > 0) && (
        <div className="mt-3 space-y-2">
          {nextDebt && (
            <Card role="button" onClick={() => onTab('goals', 'debts')} className="py-3 active:bg-surface-2">
              <div className="text-sm text-muted">Ближайший платёж</div>
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <div className="min-w-0 truncate font-medium">{nextDebt.name}</div>
                <div className="num shrink-0 text-sm" style={{ color: nextDebt.nextPaymentDate < today ? 'var(--color-expense)' : undefined }}>
                  {mediumDate(nextDebt.nextPaymentDate)}
                  {nextDebt.regularPayment ? ` · ${money(nextDebt.regularPayment, currency, { round: true })}` : ''}
                </div>
              </div>
            </Card>
          )}
          {goalCards.map(({ goal, outlook }) => (
            <Card key={goal.id} role="button" onClick={() => onTab('goals', 'goals')} className="py-3 active:bg-surface-2">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <div className="min-w-0 truncate font-medium">
                  {goal.icon} {goal.name}
                </div>
                <div className="num shrink-0 text-sm text-muted">{percent(Math.min(outlook.pct, 1))}</div>
              </div>
              <ProgressBar value={outlook.pct} color={progressColor(Math.min(outlook.pct, 1))} />
            </Card>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3">
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
