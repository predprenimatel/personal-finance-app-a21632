import { useRef, useState } from 'react'
import { Download, FileJson, FileSpreadsheet, RotateCcw, Upload } from 'lucide-react'
import { Card, SectionTitle, Sheet, cn } from '../components/ui'
import { exportCSV, exportJSON } from '../lib/backup'
import { CURRENCIES, currencySymbol } from '../lib/format'
import { useStore } from '../lib/store'

export default function Settings() {
  const { data, categoryMap, currency, setSettings, importData, resetAll, showToast, transactions } = useStore()
  const fileRef = useRef()
  const [confirmReset, setConfirmReset] = useState(false)
  const [pendingImport, setPendingImport] = useState(null)

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      if (!Array.isArray(parsed.transactions)) throw new Error()
      setPendingImport(parsed)
    } catch {
      showToast('Не удалось прочитать файл — нужен JSON-бэкап Копилки')
    }
  }

  return (
    <div className="anim-fade">
      <header className="px-1 pt-4 pb-3">
        <h1 className="text-2xl font-semibold">Ещё</h1>
      </header>

      <SectionTitle>Валюта</SectionTitle>
      <div className="grid grid-cols-5 gap-2">
        {CURRENCIES.map((c) => (
          <button key={c.code} onClick={() => setSettings({ currency: c.code })} className={cn('rounded-2xl py-3 text-center', currency === c.code ? 'bg-accent text-bg' : 'bg-surface')}>
            <div className="text-xl font-semibold">{c.symbol}</div>
            <div className={cn('text-[11px]', currency === c.code ? 'text-bg/70' : 'text-faint')}>{c.code}</div>
          </button>
        ))}
      </div>

      <SectionTitle>Стартовый остаток</SectionTitle>
      <StartBalance />

      <SectionTitle>Резервная копия</SectionTitle>
      <Card className="divide-y divide-line p-0">
        <Row icon={<FileJson size={20} />} title="Экспорт в JSON" sub="Полная копия для восстановления" onClick={() => exportJSON(data)} />
        <Row icon={<FileSpreadsheet size={20} />} title="Экспорт в CSV" sub="Для Excel и Google Таблиц" onClick={() => exportCSV(data, categoryMap)} />
        <Row icon={<Upload size={20} />} title="Импорт из JSON" sub="Заменит текущие данные" onClick={() => fileRef.current.click()} />
      </Card>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
      <p className="mt-2 px-1 text-xs text-faint">Данные хранятся только на этом устройстве. Делайте экспорт регулярно.</p>

      <SectionTitle>Данные</SectionTitle>
      <Card className="p-0">
        <Row icon={<RotateCcw size={20} />} title="Сбросить всё" sub={`${transactions.length} операций будут удалены`} danger onClick={() => setConfirmReset(true)} />
      </Card>

      <p className="mt-8 text-center text-xs text-faint">Копилка · работает офлайн</p>

      {confirmReset && (
        <Confirm
          title="Удалить все данные?"
          text="Все операции, копилки, долги, цели и свои категории будут удалены без возможности восстановления. Сначала сделайте экспорт, если нужна копия."
          action="Удалить всё"
          danger
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            resetAll()
            setConfirmReset(false)
            showToast('Все данные удалены')
          }}
          extra={<button onClick={() => exportJSON(data)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-surface py-3.5 font-medium"><Download size={18} /> Сначала скачать копию</button>}
        />
      )}
      {pendingImport && (
        <Confirm
          title="Восстановить из копии?"
          text={`В файле ${pendingImport.transactions.length} операций. Текущие данные будут заменены.`}
          action="Восстановить"
          onCancel={() => setPendingImport(null)}
          onConfirm={() => {
            try {
              importData(pendingImport)
              showToast('Данные восстановлены')
            } catch {
              showToast('Файл повреждён')
            }
            setPendingImport(null)
          }}
        />
      )}
    </div>
  )
}

/** Money the user had before they started tracking; the base of the active balance. */
function StartBalance() {
  const { settings, currency, setSettings } = useStore()
  const [text, setText] = useState(settings.startBalance ? String(settings.startBalance).replace('.', ',') : '')

  function commit() {
    const v = Number(text.replace(',', '.').replace(/\s/g, '').replace('−', '-'))
    const value = text.trim() === '' || !Number.isFinite(v) ? 0 : Math.round(v * 100) / 100
    if (value !== settings.startBalance) setSettings({ startBalance: value })
    setText(value ? String(value).replace('.', ',') : '')
  }

  return (
    <>
      <label className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-3">
        <input
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^\d.,\s\-−]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          placeholder="0"
          className="num w-full bg-transparent text-lg outline-none placeholder:text-faint"
        />
        <span className="text-muted">{currencySymbol(currency)}</span>
      </label>
      <p className="mt-2 px-1 text-xs text-faint">Сколько денег было на руках и на картах до начала учёта. С него считается активный баланс.</p>
    </>
  )
}

function Row({ icon, title, sub, onClick, danger }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2">
      <span className={danger ? 'text-expense' : 'text-muted'}>{icon}</span>
      <span className="flex-1">
        <span className={cn('block font-medium', danger && 'text-expense')}>{title}</span>
        <span className="block text-xs text-faint">{sub}</span>
      </span>
    </button>
  )
}

function Confirm({ title, text, action, onConfirm, onCancel, danger, extra }) {
  return (
    <Sheet title={title} onClose={onCancel}>
      <div className="space-y-3 px-5 pb-6">
        <p className="text-sm text-muted">{text}</p>
        {extra}
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 rounded-2xl bg-surface py-3.5 font-medium">Отмена</button>
          <button onClick={onConfirm} className={cn('flex-1 rounded-2xl py-3.5 font-semibold', danger ? 'bg-expense text-bg' : 'bg-accent text-bg')}>{action}</button>
        </div>
      </div>
    </Sheet>
  )
}
