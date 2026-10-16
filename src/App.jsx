import { useState } from 'react'
import BottomNav from './components/BottomNav'
import QuickAdd from './components/QuickAdd'
import Toast from './components/Toast'
import Goals from './screens/Goals'
import Home from './screens/Home'
import Operations from './screens/Operations'
import Settings from './screens/Settings'
import Stats from './screens/Stats'

export default function App() {
  const [tab, setTab] = useState('home')
  // null | { txn?: existing transaction to edit, preset?: prefilled fields for a new one }
  const [entry, setEntry] = useState(null)

  const openNew = () => setEntry({})
  const openEdit = (txn) => setEntry({ txn })
  const openTransfer = (preset) => setEntry({ preset: { type: 'transfer', ...preset } })
  const goTab = (t) => {
    setTab(t)
    window.scrollTo({ top: 0 })
  }

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-md px-4 pt-[env(safe-area-inset-top)] pb-32">
        {tab === 'home' && <Home onEdit={openEdit} onAdd={openNew} onTab={goTab} />}
        {tab === 'list' && <Operations onEdit={openEdit} />}
        {tab === 'goals' && <Goals onEdit={openEdit} onTransfer={openTransfer} />}
        {tab === 'stats' && <Stats onEdit={openEdit} />}
        {tab === 'more' && <Settings />}
      </main>
      <BottomNav tab={tab} onTab={goTab} onAdd={openNew} />
      {entry && <QuickAdd key={entry.txn?.id ?? 'new'} initial={entry.txn} preset={entry.preset} onClose={() => setEntry(null)} />}
      <Toast />
    </>
  )
}
