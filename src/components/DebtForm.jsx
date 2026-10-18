import { useState } from 'react'
import { DEBT_KINDS } from '../lib/categories'
import { currencySymbol } from '../lib/format'
import { useStore } from '../lib/store'
import { Chip, Sheet } from './ui'

const parseAmount = (s) => {
  const n = Number(String(s).trim().replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

/** Create or edit a debt. The remainder shown in the list is computed from payments, not typed here after the start. */
export default function DebtForm({ debt, onClose, onSaved }) {
  const { addDebt, updateDebt } = useStore()
  const [name, setName] = useState(debt?.name ?? '')
  const [kind, setKind] = useState(debt?.kind ?? 'credit')
  const [principal, setPrincipal] = useState(debt ? String(debt.principal).replace('.', ',') : '')
  const [remain, setRemain] = useState(debt ? String(debt.openingRemaining).replace('.', ',') : '')
  const [remainTouched, setRemainTouched] = useState(Boolean(debt))
  const [rate, setRate] = useState(debt?.rate != null ? String(debt.rate).replace('.', ',') : '')
  const [next, setNext] = useState(debt?.nextPaymentDate ?? '')
  const [regular, setRegular] = useState(debt?.regularPayment != null ? String(debt.regularPayment).replace('.', ',') : '')

  const principalValue = parseAmount(principal)
  const remainRaw = remainTouched ? remain : principal
  const remainValue = parseAmount(remainRaw === '' ? '0' : remainRaw)
  const rateValue = rate.trim() === '' ? null : parseAmount(rate)
  const regularValue = regular.trim() === '' ? null : parseAmount(regular)
  const valid =
    name.trim().length > 0 &&
    principalValue > 0 &&
    Number.isFinite(remainValue) &&
    remainValue >= 0 &&
    (rateValue == null || (rateValue >= 0 && rateValue < 1000)) &&
    (regularValue == null || regularValue >= 0)

  function save() {
    if (!valid) return
    const fields = {
      name: name.trim(),
      kind,
      principal: Math.round(principalValue * 100) / 100,
      openingRemaining: Math.round(remainValue * 100) / 100,
      rate: rateValue == null ? null : Math.round(rateValue * 100) / 100,
      nextPaymentDate: next,
      regularPayment: regularValue == null ? null : Math.round(regularValue * 100) / 100,
      archived: debt?.archived ?? false,
      closed: debt?.closed ?? false,
    }
    const saved = debt ? { ...debt, ...fields } : addDebt(fields)
    if (debt) updateDebt(saved)
    onSaved?.(saved)
  }

  return (
    <Sheet title={debt ? 'Долг' : 'Новый долг'} onClose={onClose} z="z-50">
      <div className="space-y-4 px-5 pb-6">
        <input
          autoFocus={!debt}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Название, например «Монобанк»"
          className="w-full rounded-2xl bg-surface px-4 py-3 text-lg outline-none placeholder:text-faint"
        />
        <div className="flex flex-wrap gap-2">
          {DEBT_KINDS.map((k) => (
            <Chip key={k.id} active={kind === k.id} color="var(--color-debt)" onClick={() => setKind(k.id)}>
              <span>{k.icon}</span>
              {k.label}
            </Chip>
          ))}
        </div>
        <Field label="Сумма долга">
          <MoneyInput value={principal} onChange={setPrincipal} />
        </Field>
        <Field label={debt ? 'Остаток на старте учёта' : 'Сколько осталось сейчас'}>
          <MoneyInput
            value={remainTouched ? remain : principal}
            onChange={(v) => {
              setRemainTouched(true)
              setRemain(v)
            }}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ставка, %">
            <input
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value.replace(/[^\d.,]/g, ''))}
              placeholder="необяз."
              className="num w-full rounded-2xl bg-surface px-4 py-3 outline-none placeholder:text-faint"
            />
          </Field>
          <Field label="Платёж">
            <MoneyInput value={regular} onChange={setRegular} />
          </Field>
        </div>
        <Field label="Следующий платёж">
          <input type="date" value={next} onChange={(e) => setNext(e.target.value)} className="w-full rounded-2xl bg-surface px-4 py-3 outline-none" />
        </Field>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 rounded-2xl bg-surface py-3.5 font-medium">Отмена</button>
          <button disabled={!valid} onClick={save} className="flex-1 rounded-2xl bg-accent py-3.5 font-semibold text-bg disabled:opacity-40">
            {debt ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm text-muted">{label}</div>
      {children}
    </label>
  )
}

function MoneyInput({ value, onChange }) {
  const { currency } = useStore()
  return (
    <label className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-3">
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,\s]/g, ''))}
        placeholder="0"
        className="num w-full bg-transparent outline-none placeholder:text-faint"
      />
      <span className="text-muted">{currencySymbol(currency)}</span>
    </label>
  )
}
