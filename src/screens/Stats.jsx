import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import TxnList, { TxnRow } from '../components/TxnList'
import { Card, Empty, Segmented, SectionTitle, Sheet, cn } from '../components/ui'
import { addDays, getPrevRange, getRange, PERIODS, shortDate, toISO, todayISO } from '../lib/dates'
import { compact, money, percent } from '../lib/format'
import { byCategory, change, inRange, monthForecast, realTxns, sortTxns, summarize, timeSeries } from '../lib/stats'
import { useStore } from '../lib/store'

// Highlighted spending groups; a tile appears only if the period has spending in it.
const FOCUS = [
  { label: 'Сигареты', ids: ['cigarettes'] },
  { label: 'Еда', ids: ['food', 'groceries', 'cafe'] },
  { label: 'Аренда', ids: ['rent'] },
  { label: 'Долги', type: 'debt' },
]

export default function Stats({ onEdit }) {
  const { transactions, categoryMap, currency } = useStore()
  const [kind, setKind] = useState('month')
  const [offset, setOffset] = useState(0)
  const [custom, setCustom] = useState(() => ({ from: toISO(addDays(new Date(), -29)), to: todayISO() }))
  const [pieType, setPieType] = useState('expense')
  const [openCat, setOpenCat] = useState(null)

  const range = getRange(kind, offset, custom)
  const prev = getPrevRange(kind, offset, custom)

  const s = useMemo(() => {
    const all = transactions.filter((t) => inRange(t, range))
    // Everything below is income / outflow only; transfers to jars are counted separately in sum.saved.
    const cur = realTxns(all)
    const before = transactions.filter((t) => inRange(t, prev))
    const outflowTxns = cur.filter((t) => t.type !== 'income')
    return {
      cur,
      sum: summarize(all, range),
      prevSum: summarize(before, prev),
      cats: byCategory(pieType === 'income' ? cur.filter((t) => t.type === 'income') : outflowTxns, categoryMap),
      series: timeSeries(cur, range),
      biggest: [...outflowTxns].sort((a, b) => b.amount - a.amount).slice(0, 5),
      focus: FOCUS.map((f) => ({
        ...f,
        value: outflowTxns.filter((t) => (f.type ? t.type === f.type : f.ids.includes(t.categoryId))).reduce((a, t) => a + t.amount, 0),
      })).filter((f) => f.value > 0),
    }
  }, [transactions, range.from, range.to, prev.from, prev.to, pieType, categoryMap])

  const { sum, prevSum } = s
  const isCurrentMonth = kind === 'month' && offset === 0
  const forecast = isCurrentMonth ? monthForecast(transactions) : null

  return (
    <div className="anim-fade">
      <header className="px-1 pt-4 pb-3">
        <h1 className="text-2xl font-semibold">Статистика</h1>
      </header>

      <Segmented options={PERIODS} value={kind} onChange={(k) => { setKind(k); setOffset(0) }} size="sm" />

      {kind === 'custom' ? (
        <div className="mt-3 flex items-center gap-2">
          <DateField value={custom.from} max={custom.to} onChange={(from) => setCustom((c) => ({ ...c, from }))} />
          <span className="text-faint">—</span>
          <DateField value={custom.to} min={custom.from} onChange={(to) => setCustom((c) => ({ ...c, to }))} />
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between">
          <button onClick={() => setOffset((o) => o - 1)} className="grid h-10 w-10 place-items-center rounded-full text-muted active:bg-surface" aria-label="Назад">
            <ChevronLeft size={22} />
          </button>
          <div className="font-medium">{range.label}</div>
          <button onClick={() => setOffset((o) => Math.min(0, o + 1))} disabled={offset >= 0} className="grid h-10 w-10 place-items-center rounded-full text-muted active:bg-surface disabled:opacity-20" aria-label="Вперёд">
            <ChevronRight size={22} />
          </button>
        </div>
      )}

      {sum.count === 0 && sum.transferCount === 0 ? (
        <Empty icon="📊" title="За этот период операций нет" text="Выберите другой период или добавьте операции" />
      ) : (
        <>
          <section className="px-1 pt-4">
            <div className="text-sm text-muted">Баланс</div>
            <div className="num mt-1 text-5xl font-semibold" style={{ color: sum.balance < 0 ? 'var(--color-expense)' : undefined }}>
              {money(sum.balance, currency, { sign: true, round: Math.abs(sum.balance) >= 100000 })}
            </div>
          </section>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric label="Доход" value={money(sum.income, currency)} color="var(--color-income)" delta={change(sum.income, prevSum.income)} diff={sum.income - prevSum.income} goodWhenUp />
            <Metric label="Расход" value={money(sum.outflow, currency)} delta={change(sum.outflow, prevSum.outflow)} diff={sum.outflow - prevSum.outflow} />
            <Metric label="Норма сбережений" value={sum.savingsRate === null ? '—' : percent(sum.savingsRate)} small />
            <Metric label="В среднем в день" value={money(sum.avgPerDay, currency, { round: true })} small />
          </div>

          {forecast && forecast.daysLeft > 0 && forecast.spent > 0 && (
            <Card className="mt-3 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted">Прогноз расходов к концу месяца</div>
                <div className="mt-0.5 text-xs text-faint">по текущему темпу · осталось {forecast.daysLeft} дн.</div>
              </div>
              <div className="num text-xl font-semibold">{money(forecast.forecast, currency, { round: true })}</div>
            </Card>
          )}

          {sum.transferCount > 0 && (
            <Card className="mt-3 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted">Отложено в копилки</div>
                <div className="num mt-0.5 text-xs text-faint">
                  положено {money(sum.savedIn, currency, { round: true })} · снято {money(sum.savedOut, currency, { round: true })}
                </div>
              </div>
              <div className="num text-xl font-semibold">{money(sum.saved, currency, { sign: true, round: Math.abs(sum.saved) >= 100000 })}</div>
            </Card>
          )}

          <SectionTitle
            right={<Segmented options={[{ id: 'expense', label: 'Расходы' }, { id: 'income', label: 'Доходы' }]} value={pieType} onChange={setPieType} size="sm" className="w-44" />}
          >
            По категориям
          </SectionTitle>
          <Card>
            {s.cats.length ? <CategoryDonut cats={s.cats} onOpen={setOpenCat} /> : <div className="py-8 text-center text-sm text-muted">Нет данных</div>}
          </Card>

          {s.focus.length > 0 && (
            <>
              <SectionTitle>Куда уходят деньги</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {s.focus.map((f) => (
                  <Card key={f.label} className="py-3">
                    <div className="text-sm text-muted">{f.label}</div>
                    <div className="num mt-0.5 text-lg font-semibold">{money(f.value, currency, { round: true })}</div>
                    <div className="text-xs text-faint">{percent(sum.outflow ? f.value / sum.outflow : 0)} расходов</div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {s.series.data.length > 1 && (
            <>
              <SectionTitle>Доход и расход {s.series.byMonth ? 'по месяцам' : 'по дням'}</SectionTitle>
              <Card className="pl-1">
                <IncomeExpenseBars data={s.series.data} />
              </Card>
            </>
          )}

          {s.biggest.length > 0 && (
            <>
              <SectionTitle>Крупнейшие траты</SectionTitle>
              <div>
                {s.biggest.map((t) => (
                  <TxnRow key={t.id} txn={t} onClick={onEdit} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {openCat && (
        <Sheet title={`${openCat.icon} ${openCat.name}`} onClose={() => setOpenCat(null)}>
          <div className="px-3 pb-6">
            <div className="num px-2 pb-3 text-2xl font-semibold">{money(openCat.value, currency)}</div>
            <TxnList txns={sortTxns(s.cur.filter((t) => t.categoryId === openCat.id))} onEdit={(t) => { setOpenCat(null); onEdit(t) }} />
          </div>
        </Sheet>
      )}
    </div>
  )
}

function DateField({ value, onChange, min, max }) {
  return (
    <label className="relative flex-1 rounded-2xl bg-surface px-4 py-2.5 text-center text-sm">
      {shortDate(value)}
      <input type="date" value={value} min={min} max={max} onChange={(e) => e.target.value && onChange(e.target.value)} className="absolute inset-0 opacity-0" />
    </label>
  )
}

function Metric({ label, value, color, delta, diff, goodWhenUp = false, small = false }) {
  const { currency } = useStore()
  const hasDelta = delta !== null && delta !== undefined && Math.abs(delta) >= 0.005
  const good = goodWhenUp ? delta > 0 : delta < 0
  return (
    <Card className="py-3">
      <div className="text-sm text-muted">{label}</div>
      <div className={cn('num mt-0.5 font-semibold', small ? 'text-lg' : 'text-xl')} style={{ color }}>
        {value}
      </div>
      {hasDelta && (
        <div className="mt-1 flex items-center gap-1 text-xs" style={{ color: good ? 'var(--color-income)' : 'var(--color-expense)' }}>
          {delta > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          <span className="num">
            {delta > 0 ? '+' : '−'}
            {percent(Math.abs(delta))} · {money(diff, currency, { sign: true, round: true })}
          </span>
        </div>
      )}
      {hasDelta && <div className="text-[11px] text-faint">к прошлому периоду</div>}
    </Card>
  )
}

function CategoryDonut({ cats, onOpen }) {
  const { currency } = useStore()
  const [expanded, setExpanded] = useState(false)
  const total = cats.reduce((a, c) => a + c.value, 0)
  const shown = expanded ? cats : cats.slice(0, 5)
  return (
    <>
      <div className="relative mx-auto h-56 w-56">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={cats} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="100%" paddingAngle={cats.length > 1 ? 2 : 0} stroke="none" animationDuration={500} onClick={(_, i) => onOpen(cats[i])} cornerRadius={4}>
              {cats.map((c) => (
                <Cell key={c.id} fill={c.color} className="cursor-pointer" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xs text-muted">Всего</div>
          <div className="num text-xl font-semibold">{money(total, currency, { round: true })}</div>
        </div>
      </div>
      <div className="mt-4 space-y-1">
        {shown.map((c) => (
          <button key={c.id} onClick={() => onOpen(c)} className="w-full rounded-xl px-1 py-1.5 text-left active:bg-surface-2">
            <div className="flex items-center gap-2 text-sm">
              <span>{c.icon}</span>
              <span className="flex-1 truncate">{c.name}</span>
              <span className="num text-faint">{percent(c.share)}</span>
              <span className="num w-24 text-right font-medium">{money(c.value, currency, { round: true })}</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${c.share * 100}%`, background: c.color }} />
            </div>
          </button>
        ))}
      </div>
      {cats.length > 5 && (
        <button onClick={() => setExpanded((v) => !v)} className="mt-2 w-full py-1 text-sm text-muted">
          {expanded ? 'Свернуть' : `Ещё ${cats.length - 5}`}
        </button>
      )}
    </>
  )
}

function BarsTooltip({ active, payload }) {
  const { currency } = useStore()
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 text-muted">{/^\d{4}-\d{2}-\d{2}$/.test(row.key) ? shortDate(row.key) : row.label}</div>
      <div className="num text-income">+{money(row.income, currency)}</div>
      <div className="num">−{money(row.outflow, currency)}</div>
    </div>
  )
}

function IncomeExpenseBars({ data }) {
  return (
    <>
      <div className="h-48">
        <ResponsiveContainer>
          <BarChart data={data} barGap={2} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#5a616c', fontSize: 11 }} interval="preserveStartEnd" minTickGap={8} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#5a616c', fontSize: 11 }} tickFormatter={compact} width={44} />
            <Tooltip content={<BarsTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="income" fill="var(--color-income)" radius={[3, 3, 0, 0]} maxBarSize={14} animationDuration={500} />
            <Bar dataKey="outflow" fill="var(--color-expense)" radius={[3, 3, 0, 0]} maxBarSize={14} animationDuration={500} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-4 pl-3 text-xs text-muted">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-income" /> Доход</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-expense" /> Расход</span>
      </div>
    </>
  )
}
