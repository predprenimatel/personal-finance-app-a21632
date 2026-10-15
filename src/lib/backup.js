import { TYPES } from './categories'
import { todayISO } from './dates'

function download(name, content, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportJSON(data) {
  download(`kopilka-${todayISO()}.json`, JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2), 'application/json')
}

const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportCSV(data, categoryMap) {
  const header = ['date', 'type', 'type_ru', 'amount', 'currency', 'category_id', 'category', 'note']
  const rows = [...data.transactions]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((t) => [t.date, t.type, TYPES[t.type]?.label, t.amount, data.settings.currency, t.categoryId, categoryMap.get(t.categoryId)?.name, t.note])
  // BOM so Excel opens Cyrillic correctly.
  const csv = '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
  download(`kopilka-${todayISO()}.csv`, csv, 'text/csv;charset=utf-8')
}
