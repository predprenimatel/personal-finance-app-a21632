import { useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import JarForm from '../components/JarForm'
import TxnList from '../components/TxnList'
import { Card, CategoryIcon, Empty, SectionTitle, Sheet } from '../components/ui'
import { money } from '../lib/format'
import { sortTxns } from '../lib/stats'
import { useStore } from '../lib/store'

/** Goals tab. For now: the list of jars (savings pots), each with its history. */
export default function Goals({ onEdit, onTransfer }) {
  const { jars, activeJars, balances, currency } = useStore()
  const [openId, setOpenId] = useState(null)
  const [form, setForm] = useState(null) // null | { jar?: jar to edit }
  const [showArchive, setShowArchive] = useState(false)
  const archived = jars.filter((j) => j.archived)
  const bal = (id) => balances.jarBalance.get(id) || 0

  return (
    <div className="anim-fade">
      <header className="flex items-end justify-between px-1 pt-4 pb-3">
        <div>
          <h1 className="text-2xl font-semibold">Цели</h1>
          {activeJars.length > 0 && <div className="mt-0.5 text-sm text-muted">В копилках <span className="num text-ink">{money(balances.saved, currency)}</span></div>}
        </div>
        {activeJars.length > 0 && (
          <button onClick={() => setForm({})} className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm text-muted active:bg-surface-2">
            <Plus size={16} /> Копилка
          </button>
        )}
      </header>

      {activeJars.length === 0 ? (
        <Empty
          icon="🐷"
          title="Копилок пока нет"
          text="Откладывайте на отпуск, ремонт или подушку. Деньги в копилке не считаются расходом."
          action={
            <button onClick={() => setForm({})} className="rounded-2xl bg-accent px-5 py-3 font-semibold text-bg">
              Создать копилку
            </button>
          }
        />
      ) : (
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
      )}

      {archived.length > 0 && (
        <>
          <SectionTitle
            right={
              <button onClick={() => setShowArchive((v) => !v)} className="flex items-center text-sm text-muted">
                {showArchive ? 'Скрыть' : archived.length} <ChevronDown size={16} className={showArchive ? 'rotate-180' : undefined} />
              </button>
            }
          >
            Архив
          </SectionTitle>
          {showArchive &&
            archived.map((j) => (
              <button key={j.id} onClick={() => setOpenId(j.id)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left opacity-60 active:bg-surface">
                <CategoryIcon category={j} size={36} />
                <span className="flex-1 truncate">{j.name}</span>
              </button>
            ))}
        </>
      )}

      {openId && (
        <JarSheet
          id={openId}
          onClose={() => setOpenId(null)}
          onEdit={onEdit}
          onTransfer={onTransfer}
          onEditJar={(jar) => setForm({ jar })}
        />
      )}
      {form && <JarForm jar={form.jar} onClose={() => setForm(null)} onSaved={() => setForm(null)} />}
    </div>
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
          {jar.openingBalance > 0 && <div className="mt-1 text-xs text-faint">из них начальная сумма {money(jar.openingBalance, currency)}</div>}
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
        {history.length ? (
          <TxnList txns={history} onEdit={onEdit} />
        ) : (
          <div className="py-6 text-center text-sm text-muted">Пока ни одного пополнения</div>
        )}
      </div>

      {confirmArchive && (
        <Sheet title="Удалить копилку?" onClose={() => setConfirmArchive(false)} z="z-50">
          <div className="space-y-3 px-5 pb-6">
            <p className="text-sm text-muted">
              В копилке {money(balance, currency)}. Сумма вернётся в активный баланс, копилка уйдёт в архив, история операций сохранится.
            </p>
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
