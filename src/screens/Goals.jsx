import { useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import DebtForm from '../components/DebtForm'
import GoalForm from '../components/GoalForm'
import JarForm from '../components/JarForm'
import TxnList from '../components/TxnList'
import { Card, CategoryIcon, Empty, ProgressBar, SectionTitle, Segmented, Sheet } from '../components/ui'
import { kindMeta } from '../lib/categories'
import { getRange, mediumDate, todayISO } from '../lib/dates'
import { currencySymbol, money, percent } from '../lib/format'
import { debtOutlook, debtRemaining, goalFlows, goalOutlook, goalSaved, inRange, sortTxns, summarize } from '../lib/stats'
import { useStore } from '../lib/store'

const SECTIONS = [
  { id: 'jars', label: 'Копилки' },
  { id: 'goals', label: 'Цели' },
  { id: 'debts', label: 'Долги' },
]

export default function Goals({ section, onSection, onEdit, onTransfer, onPayDebt }) {
  const { activeJars, activeDebts, activeGoals, balances, currency } = useStore()
  const [form, setForm] = useState(null)

  const addLabel = section === 'jars' ? 'Копилка' : section === 'goals' ? 'Цель' : 'Долг'
  const hasItems = section === 'jars' ? activeJars.length > 0 : section === 'goals' ? activeGoals.length > 0 : activeDebts.length > 0

  return (
    <div className="anim-fade">
      <header className="flex items-end justify-between px-1 pt-4 pb-3">
        <div>
          <h1 className="text-2xl font-semibold">Цели</h1>
          {section === 'jars' && activeJars.length > 0 && (
            <div className="mt-0.5 text-sm text-muted">
              В копилках <span className="num text-ink">{money(balances.saved, currency)}</span>
            </div>
          )}
        </div>
        {hasItems && (
          <button onClick={() => setForm({ kind: section })} className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm text-muted active:bg-surface-2">
            <Plus size={16} /> {addLabel}
          </button>
        )}
      </header>

      <Segmented options={SECTIONS} value={section} onChange={onSection} size="sm" className="mb-4" />

      {section === 'jars' && <Jars onEdit={onEdit} onTransfer={onTransfer} onCreate={() => setForm({ kind: 'jars' })} onEditJar={(jar) => setForm({ kind: 'jars', jar })} />}
      {section === 'goals' && <Savings onTransfer={onTransfer} onCreate={() => setForm({ kind: 'goals' })} onEditGoal={(goal) => setForm({ kind: 'goals', goal })} />}
      {section === 'debts' && <Debts onEdit={onEdit} onPayDebt={onPayDebt} onCreate={() => setForm({ kind: 'debts' })} onEditDebt={(debt) => setForm({ kind: 'debts', debt })} />}

      {form?.kind === 'jars' && <JarForm jar={form.jar} onClose={() => setForm(null)} onSaved={() => setForm(null)} />}
      {form?.kind === 'goals' && <GoalForm goal={form.goal} onClose={() => setForm(null)} onSaved={() => setForm(null)} />}
      {form?.kind === 'debts' && <DebtForm debt={form.debt} onClose={() => setForm(null)} onSaved={() => setForm(null)} />}
    </div>
  )
}

function ArchiveToggle({ count, open, onToggle, children }) {
  if (!count) return null
  return (
    <>
      <SectionTitle
        right={
          <button onClick={onToggle} className="flex items-center text-sm text-muted">
            {open ? 'Скрыть' : count} <ChevronDown size={16} className={open ? 'rotate-180' : undefined} />
          </button>
        }
      >
        Архив
      </SectionTitle>
      {open && children}
    </>
  )
}

function Jars({ onEdit, onTransfer, onCreate, onEditJar }) {
  const { jars, activeJars, balances, currency } = useStore()
  const [openId, setOpenId] = useState(null)
  const [showArchive, setShowArchive] = useState(false)
  const archived = jars.filter((j) => j.archived)
  const bal = (id) => balances.jarBalance.get(id) || 0

  if (activeJars.length === 0 && !openId) {
    return (
      <>
        <Empty icon="🐷" title="Копилок пока нет" text="Откладывайте на отпуск или подушку. Деньги в копилке не считаются расходом." action={<Primary onClick={onCreate}>Создать копилку</Primary>} />
        <ArchiveToggle count={archived.length} open={showArchive} onToggle={() => setShowArchive((v) => !v)}>
          {archived.map((j) => (
            <button key={j.id} onClick={() => setOpenId(j.id)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left opacity-60">
              <CategoryIcon category={j} size={36} />
              <span className="flex-1 truncate">{j.name}</span>
            </button>
          ))}
        </ArchiveToggle>
        {openId && <JarSheet id={openId} onClose={() => setOpenId(null)} onEdit={onEdit} onTransfer={onTransfer} onEditJar={onEditJar} />}
      </>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {activeJars.map((j) => (
          <Card key={j.id} className="flex items-center gap-3 py-3 active:bg-surface-2" role="button" onClick={() => setOpenId(j.id)}>
            <CategoryIcon category={j} size={44} />
            <div className="min-w-0 flex-1 truncate font-medium">{j.name}</div>
            <div className="num shrink-0 text-lg font-semibold">{money(bal(j.id), currency)}</div>
            <ChevronRight size={18} className="shrink-0 text-faint" />
          </Card>
        ))}
      </div>
      <ArchiveToggle count={archived.length} open={showArchive} onToggle={() => setShowArchive((v) => !v)}>
        {archived.map((j) => (
          <button key={j.id} onClick={() => setOpenId(j.id)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left opacity-60">
            <CategoryIcon category={j} size={36} />
            <span className="flex-1 truncate">{j.name}</span>
          </button>
        ))}
      </ArchiveToggle>
      {openId && <JarSheet id={openId} onClose={() => setOpenId(null)} onEdit={onEdit} onTransfer={onTransfer} onEditJar={onEditJar} />}
    </>
  )
}

function JarSheet({ id, onClose, onEdit, onTransfer, onEditJar }) {
  const { jarMap, transactions, balances, currency, archiveJar, updateJar, deleteTxn, showToast } = useStore()
  const [confirmArchive, setConfirmArchive] = useState(false)
  const jar = jarMap.get(id)
  const balance = balances.jarBalance.get(id) || 0
  const history = useMemo(() => sortTxns(transactions.filter((t) => t.type === 'transfer' && t.jarId === id)), [transactions, id])
  if (!jar) return null

  function archive() {
    const txn = archiveJar(id)
    setConfirmArchive(false)
    onClose()
    showToast(balance > 0 ? `Копилка удалена, ${money(balance, currency)} вернулись в активный баланс` : 'Копилка удалена', {
      label: 'Вернуть',
      fn: () => {
        if (balance > 0) deleteTxn(txn.id)
        updateJar({ ...jar, archived: false })
      },
    })
  }

  return (
    <Sheet title={`${jar.icon} ${jar.name}`} onClose={onClose}>
      <div className="px-3 pb-6">
        <div className="px-2 pb-4">
          <div className="text-sm text-muted">{jar.archived ? 'Копилка в архиве' : 'В копилке'}</div>
          <div className="num mt-0.5 text-4xl font-semibold" style={{ color: balance < 0 ? 'var(--color-expense)' : undefined }}>{money(balance, currency)}</div>
        </div>
        {jar.archived ? (
          <button onClick={() => updateJar({ ...jar, archived: false })} className="mx-2 mb-2 w-[calc(100%-1rem)] rounded-2xl bg-surface py-3.5 font-medium">
            Восстановить из архива
          </button>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 px-2">
              <button onClick={() => onTransfer({ direction: 'in', jarId: id })} className="flex items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 font-semibold text-bg">
                <ArrowDownToLine size={18} /> Положить
              </button>
              <button disabled={balance <= 0} onClick={() => onTransfer({ direction: 'out', jarId: id })} className="flex items-center justify-center gap-2 rounded-2xl bg-surface py-3.5 font-semibold disabled:opacity-40">
                <ArrowUpFromLine size={18} /> Снять
              </button>
            </div>
            <div className="mt-2 flex gap-2 px-2">
              <button onClick={() => onEditJar(jar)} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm text-muted active:bg-surface">
                <Pencil size={15} /> Изменить
              </button>
              <button onClick={() => (balance > 0 ? setConfirmArchive(true) : archive())} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm text-expense active:bg-surface">
                <Trash2 size={15} /> Удалить
              </button>
            </div>
          </>
        )}
        <SectionTitle>История</SectionTitle>
        {history.length ? <TxnList txns={history} onEdit={onEdit} /> : <div className="py-6 text-center text-sm text-muted">Пока ни одного пополнения</div>}
      </div>
      {confirmArchive && (
        <Sheet title="Удалить копилку?" onClose={() => setConfirmArchive(false)} z="z-50">
          <div className="space-y-3 px-5 pb-6">
            <p className="text-sm text-muted">В копилке {money(balance, currency)}. Сумма вернётся в активный баланс, история сохранится.</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setConfirmArchive(false)} className="flex-1 rounded-2xl bg-surface py-3.5 font-medium">Отмена</button>
              <button onClick={archive} className="flex-1 rounded-2xl bg-expense py-3.5 font-semibold text-bg">Вернуть сумму</button>
            </div>
          </div>
        </Sheet>
      )}
    </Sheet>
  )
}

function Savings({ onTransfer, onCreate, onEditGoal }) {
  const { goals, transactions, balances, currency, updateGoal, topUpGoal } = useStore()
  const [openId, setOpenId] = useState(null)
  const [showArchive, setShowArchive] = useState(false)
  const active = goals.filter((g) => !g.archived)
  const archived = goals.filter((g) => g.archived)

  if (!active.length && !openId) {
    return (
      <>
        <Empty icon="🎯" title="Целей пока нет" text="Например, «Машина». Укажите сумму и, если есть, срок." action={<Primary onClick={onCreate}>Создать цель</Primary>} />
        <GoalArchive archived={archived} open={showArchive} onToggle={() => setShowArchive((v) => !v)} onOpen={setOpenId} />
        {openId && <GoalSheet id={openId} onClose={() => setOpenId(null)} onTransfer={onTransfer} onEditGoal={onEditGoal} />}
      </>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {active.map((g) => {
          const saved = goalSaved(g, balances.jarBalance)
          const outlook = goalOutlook({ saved, target: g.targetAmount, deadline: g.deadline, flows: goalFlows(g, transactions) })
          return (
            <Card key={g.id} role="button" onClick={() => setOpenId(g.id)} className="active:bg-surface-2">
              <div className="mb-2 flex items-center gap-3">
                <CategoryIcon category={g} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{g.name}</div>
                  <div className="text-sm text-muted">{statusLine(outlook, currency)}</div>
                </div>
                <div className="num text-sm font-semibold">{percent(Math.min(outlook.pct, 1))}</div>
              </div>
              <ProgressBar value={outlook.pct} />
              <div className="mt-2 flex justify-between text-xs text-faint">
                <span className="num">{money(saved, currency, { round: true })}</span>
                <span className="num">{money(g.targetAmount, currency, { round: true })}</span>
              </div>
            </Card>
          )
        })}
      </div>
      <GoalArchive archived={archived} open={showArchive} onToggle={() => setShowArchive((v) => !v)} onOpen={setOpenId} />
      {openId && (
        <GoalSheet
          id={openId}
          onClose={() => setOpenId(null)}
          onTransfer={onTransfer}
          onEditGoal={onEditGoal}
          onArchive={(g) => {
            updateGoal({ ...g, archived: true })
            setOpenId(null)
          }}
          onTopUp={(id, amount) => topUpGoal(id, amount)}
        />
      )}
    </>
  )
}

function GoalArchive({ archived, open, onToggle, onOpen }) {
  return (
    <ArchiveToggle count={archived.length} open={open} onToggle={onToggle}>
      {archived.map((g) => (
        <button key={g.id} onClick={() => onOpen(g.id)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left opacity-70">
          <CategoryIcon category={g} size={36} />
          <span className="flex-1 truncate">{g.name}</span>
          {g.reached && <span className="text-xs text-income">Достигнута</span>}
        </button>
      ))}
    </ArchiveToggle>
  )
}

function GoalSheet({ id, onClose, onTransfer, onEditGoal, onArchive, onTopUp }) {
  const { goals, transactions, balances, currency, updateGoal, jarMap } = useStore()
  const [topUp, setTopUp] = useState(false)
  const goal = goals.find((g) => g.id === id)
  const saved = goal ? goalSaved(goal, balances.jarBalance) : 0
  const outlook = goal ? goalOutlook({ saved, target: goal.targetAmount, deadline: goal.deadline, flows: goalFlows(goal, transactions) }) : null
  const history = useMemo(
    () => (goal?.jarId ? sortTxns(transactions.filter((t) => t.type === 'transfer' && t.jarId === goal.jarId)) : []),
    [transactions, goal?.jarId],
  )
  if (!goal || !outlook) return null
  const jar = goal.jarId ? jarMap.get(goal.jarId) : null

  return (
    <Sheet title={`${goal.icon} ${goal.name}`} onClose={onClose}>
      <div className="px-5 pb-6">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="text-sm text-muted">{goal.reached ? 'Достигнута' : 'Накоплено'}</div>
            <div className="num text-4xl font-semibold">{money(saved, currency)}</div>
          </div>
          <div className="num text-right text-sm text-muted">
            из {money(goal.targetAmount, currency)}
            <div className="text-ink">{percent(Math.min(outlook.pct, 1))}</div>
          </div>
        </div>
        <ProgressBar value={outlook.pct} />
        <p className="mt-3 text-sm text-muted">{detailLine(outlook, currency, goal)}</p>
        {jar && <p className="mt-1 text-xs text-faint">Считается по копилке «{jar.name}»</p>}

        {goal.archived ? (
          <button onClick={() => updateGoal({ ...goal, archived: false })} className="mt-4 w-full rounded-2xl bg-surface py-3.5 font-medium">
            Вернуть из архива
          </button>
        ) : (
          <>
            {goal.jarId ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => onTransfer({ direction: 'in', jarId: goal.jarId })} className="flex items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 font-semibold text-bg">
                  <ArrowDownToLine size={18} /> Положить
                </button>
                <button disabled={saved <= 0} onClick={() => onTransfer({ direction: 'out', jarId: goal.jarId })} className="rounded-2xl bg-surface py-3.5 font-semibold disabled:opacity-40">
                  Снять
                </button>
              </div>
            ) : (
              <button onClick={() => setTopUp(true)} className="mt-4 w-full rounded-2xl bg-accent py-3.5 font-semibold text-bg">
                Пополнить
              </button>
            )}
            <div className="mt-2 flex gap-2">
              <button onClick={() => onEditGoal(goal)} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm text-muted">
                <Pencil size={15} /> Изменить
              </button>
              <button onClick={() => onArchive?.(goal)} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm text-expense">
                <Trash2 size={15} /> В архив
              </button>
            </div>
          </>
        )}

        {goal.jarId ? (
          <>
            <SectionTitle>История копилки</SectionTitle>
            {history.length ? <TxnList txns={history} /> : <div className="py-4 text-center text-sm text-muted">Пополнений ещё не было</div>}
          </>
        ) : goal.topups?.length > 0 ? (
          <>
            <SectionTitle>Пополнения</SectionTitle>
            <div className="space-y-1">
              {[...goal.topups].reverse().slice(0, 12).map((t, i) => (
                <div key={`${t.date}-${i}`} className="flex justify-between px-1 py-1.5 text-sm">
                  <span className="text-muted">{mediumDate(t.date)}</span>
                  <span className="num">{money(t.amount, currency)}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
      {topUp && (
        <AmountSheet
          title="Пополнить цель"
          hint="Это просто число. В доходах и расходах ничего не появится."
          confirm="Пополнить"
          onClose={() => setTopUp(false)}
          onSave={(n) => {
            onTopUp(goal.id, n)
            setTopUp(false)
          }}
        />
      )}
    </Sheet>
  )
}

function Debts({ onEdit, onPayDebt, onCreate, onEditDebt }) {
  const { debts, transactions, currency } = useStore()
  const [openId, setOpenId] = useState(null)
  const [showArchive, setShowArchive] = useState(false)
  const active = debts.filter((d) => !d.archived)
  const archived = debts.filter((d) => d.archived)
  const today = todayISO()
  const month = getRange('month', 0)

  const rows = active.map((d) => decorateDebt(d, transactions))
  const total = rows.reduce((s, r) => s + r.shown, 0)
  const monthSum = summarize(transactions.filter((t) => inRange(t, month)), month)
  const share = monthSum.income > 0 && monthSum.debt > 0 ? monthSum.debt / monthSum.income : null
  const next = rows.filter((r) => r.debt.nextPaymentDate).sort((a, b) => (a.debt.nextPaymentDate < b.debt.nextPaymentDate ? -1 : 1))[0]

  return (
    <>
      {active.length > 0 && (
        <div className="mb-4 px-1">
          <div className="text-sm text-muted">Осталось выплатить</div>
          <div className="num mt-0.5 text-4xl font-semibold">{money(total, currency)}</div>
          {share != null && <div className="mt-1 text-sm text-muted">Платежи в этом месяце — {percent(share)} дохода</div>}
          {next && (
            <button onClick={() => setOpenId(next.debt.id)} className="mt-3 flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3 text-left">
              <span>
                <span className="block text-xs text-faint">Ближайший платёж</span>
                <span className="font-medium">{next.debt.name}</span>
              </span>
              <span className="num text-sm" style={{ color: next.debt.nextPaymentDate < today ? 'var(--color-expense)' : undefined }}>
                {mediumDate(next.debt.nextPaymentDate)}
                {next.debt.regularPayment ? ` · ${money(next.debt.regularPayment, currency, { round: true })}` : ''}
              </span>
            </button>
          )}
        </div>
      )}

      {active.length === 0 && !openId ? (
        <Empty icon="🏦" title="Долгов нет" text="Кредит, микрозайм или рассрочка — остаток и дата платежа будут на виду." action={<Primary onClick={onCreate}>Добавить долг</Primary>} />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.debt.id} role="button" onClick={() => setOpenId(r.debt.id)} className="active:bg-surface-2">
              <div className="mb-2 flex items-center gap-3">
                <CategoryIcon category={{ icon: r.meta.icon, color: '#F5B83D' }} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.debt.name}</div>
                  <div className="text-sm text-muted">{r.meta.label}{r.debt.rate != null ? ` · ${String(r.debt.rate).replace('.', ',')}%` : ''}</div>
                </div>
                <div className="text-right">
                  <div className="num font-semibold">{money(r.shown, currency, { round: true })}</div>
                  <div className="text-xs text-faint">осталось</div>
                </div>
              </div>
              <ProgressBar value={r.progress} />
              {r.outlook && <div className="mt-2 text-xs text-faint">При текущем темпе закроется около {mediumDate(r.outlook.closeDate)}</div>}
            </Card>
          ))}
        </div>
      )}

      <ArchiveToggle count={archived.length} open={showArchive} onToggle={() => setShowArchive((v) => !v)}>
        {archived.map((d) => (
          <button key={d.id} onClick={() => setOpenId(d.id)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left opacity-70">
            <span className="text-xl">{kindMeta(d.kind).icon}</span>
            <span className="flex-1 truncate">{d.name}</span>
            {d.closed && <span className="text-xs text-income">Закрыт</span>}
          </button>
        ))}
      </ArchiveToggle>
      {openId && <DebtSheet id={openId} onClose={() => setOpenId(null)} onEdit={onEdit} onPayDebt={onPayDebt} onEditDebt={onEditDebt} />}
    </>
  )
}

function decorateDebt(debt, transactions) {
  const rem = debtRemaining(debt, transactions)
  const shown = Math.max(0, rem)
  const progress = debt.principal > 0 ? Math.max(0, Math.min(1, (debt.principal - rem) / debt.principal)) : rem <= 0 ? 1 : 0
  const payments = transactions.filter((t) => t.type === 'debt' && t.debtId === debt.id)
  return { debt, rem, shown, progress, payments, outlook: debtOutlook(payments, shown), meta: kindMeta(debt.kind) }
}

function DebtSheet({ id, onClose, onEdit, onPayDebt, onEditDebt }) {
  const { debts, transactions, currency, updateDebt, adjustDebtRemaining, showToast } = useStore()
  const [adjust, setAdjust] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const debt = debts.find((d) => d.id === id)
  const view = debt ? decorateDebt(debt, transactions) : null
  const history = view ? sortTxns(view.payments) : []
  if (!debt || !view) return null

  function archive() {
    updateDebt({ ...debt, archived: true })
    setConfirm(false)
    onClose()
    showToast('Долг в архиве', { label: 'Вернуть', fn: () => updateDebt({ ...debt, archived: false, closed: false }) })
  }

  return (
    <Sheet title={debt.name} onClose={onClose}>
      <div className="px-5 pb-6">
        <div className="text-sm text-muted">{view.meta.label}{debt.closed ? ' · закрыт' : ''}</div>
        <div className="num mt-0.5 text-4xl font-semibold">{money(view.shown, currency)}</div>
        <div className="mt-1 text-sm text-muted">осталось · {percent(view.progress)} выплачено из {money(debt.principal, currency, { round: true })}</div>
        {view.rem < -0.009 && <div className="mt-1 text-sm text-income">Переплата {money(-view.rem, currency)}</div>}
        <div className="mt-3"><ProgressBar value={view.progress} /></div>
        {debt.nextPaymentDate && (
          <div className="mt-3 text-sm" style={{ color: debt.nextPaymentDate < todayISO() ? 'var(--color-expense)' : undefined }}>
            Следующий платёж {mediumDate(debt.nextPaymentDate)}
            {debt.regularPayment ? ` · ${money(debt.regularPayment, currency)}` : ''}
          </div>
        )}
        {view.outlook && (
          <div className="mt-1 text-sm text-muted">
            Темп {money(view.outlook.pace, currency, { round: true })}/мес — закрытие около {mediumDate(view.outlook.closeDate)}
          </div>
        )}
        {!debt.archived && (
          <button onClick={() => onPayDebt(debt)} className="mt-4 w-full rounded-2xl bg-accent py-3.5 font-semibold text-bg">
            Внести платёж
          </button>
        )}
        <button onClick={() => setAdjust(true)} className="mt-2 w-full rounded-2xl bg-surface py-3.5 font-medium">
          Скорректировать остаток
        </button>
        <div className="mt-2 flex gap-2">
          <button onClick={() => onEditDebt(debt)} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm text-muted">
            <Pencil size={15} /> Изменить
          </button>
          {!debt.archived && (
            <button onClick={() => setConfirm(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm text-expense">
              <Trash2 size={15} /> В архив
            </button>
          )}
          {debt.archived && !debt.closed && (
            <button onClick={() => updateDebt({ ...debt, archived: false })} className="flex-1 rounded-2xl py-2.5 text-sm text-muted">
              Вернуть
            </button>
          )}
        </div>
        <SectionTitle>Платежи</SectionTitle>
        {history.length ? <TxnList txns={history} onEdit={onEdit} /> : <div className="py-4 text-center text-sm text-muted">Платежей по этому долгу ещё нет</div>}
      </div>
      {adjust && (
        <AmountSheet
          title="Остаток сейчас"
          hint="Проценты и штрафы в платежах не разделяются — сверьте остаток с банком и впишите его."
          initial={String(view.shown).replace('.', ',')}
          confirm="Сохранить"
          allowZero
          onClose={() => setAdjust(false)}
          onSave={(n) => {
            adjustDebtRemaining(debt.id, n)
            setAdjust(false)
          }}
        />
      )}
      {confirm && (
        <Sheet title="Убрать долг в архив?" onClose={() => setConfirm(false)} z="z-50">
          <div className="space-y-3 px-5 pb-6">
            <p className="text-sm text-muted">История платежей останется в операциях.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirm(false)} className="flex-1 rounded-2xl bg-surface py-3.5 font-medium">Отмена</button>
              <button onClick={archive} className="flex-1 rounded-2xl bg-expense py-3.5 font-semibold text-bg">В архив</button>
            </div>
          </div>
        </Sheet>
      )}
    </Sheet>
  )
}

function AmountSheet({ title, hint, confirm, initial = '', allowZero = false, onClose, onSave }) {
  const { currency } = useStore()
  const [value, setValue] = useState(initial)
  const n = Number(String(value).replace(/\s/g, '').replace(',', '.'))
  const ok = Number.isFinite(n) && n >= 0 && (allowZero || n > 0)
  return (
    <Sheet title={title} onClose={onClose} z="z-50">
      <div className="space-y-3 px-5 pb-6">
        {hint && <p className="text-sm text-muted">{hint}</p>}
        <label className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-3">
          <input autoFocus inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.,\s]/g, ''))} placeholder="0" className="num w-full bg-transparent text-2xl outline-none placeholder:text-faint" />
          <span className="text-muted">{currencySymbol(currency)}</span>
        </label>
        <button disabled={!ok} onClick={() => onSave(Math.round(n * 100) / 100)} className="w-full rounded-2xl bg-accent py-3.5 font-semibold text-bg disabled:opacity-40">
          {confirm}
        </button>
      </div>
    </Sheet>
  )
}

function Primary({ onClick, children }) {
  return (
    <button onClick={onClick} className="rounded-2xl bg-accent px-5 py-3 font-semibold text-bg">
      {children}
    </button>
  )
}

function statusLine(outlook, currency) {
  if (outlook.status === 'done') return 'Достигнута'
  if (outlook.neededPerMonth) return `${money(outlook.neededPerMonth, currency, { round: true })}/мес`
  if (outlook.left > 0) return `осталось ${money(outlook.left, currency, { round: true })}`
  return 'Без срока'
}

function detailLine(outlook, currency, goal) {
  if (outlook.status === 'done') return 'Сумма собрана.'
  const left = `Осталось ${money(outlook.left, currency)}`
  if (!goal.deadline) return left
  if (outlook.status === 'late') return `${left}. Срок прошёл.`
  const pace =
    outlook.status === 'ok' ? 'Успеваете при текущем темпе.' : outlook.status === 'behind' ? 'Не успеваете при текущем темпе.' : ''
  const need = outlook.neededPerMonth ? ` Нужно откладывать ${money(outlook.neededPerMonth, currency, { round: true })} в месяц.` : ''
  return `${left}.${need}${pace ? ' ' + pace : ''}`
}
