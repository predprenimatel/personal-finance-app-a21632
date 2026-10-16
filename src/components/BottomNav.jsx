import { BarChart3, Home, List, PiggyBank, Plus, Settings2 } from 'lucide-react'
import { cn } from './ui'

const ITEMS = [
  { id: 'home', label: 'Главная', Icon: Home },
  { id: 'list', label: 'Операции', Icon: List },
  null,
  { id: 'goals', label: 'Цели', Icon: PiggyBank },
  { id: 'stats', label: 'Статистика', Icon: BarChart3 },
  { id: 'more', label: 'Ещё', Icon: Settings2 },
]

// 5 tabs + the add button fit a 375px screen: tabs share the remaining width equally.
export default function BottomNav({ tab, onTab, onAdd }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-end px-1">
        {ITEMS.map((item, i) =>
          item ? (
            <button
              key={item.id}
              onClick={() => onTab(item.id)}
              className={cn('flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] tracking-tight', tab === item.id ? 'text-ink' : 'text-faint')}
            >
              <item.Icon size={22} strokeWidth={tab === item.id ? 2.4 : 1.8} />
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          ) : (
            <button
              key={i}
              onClick={onAdd}
              aria-label="Добавить операцию"
              className="-mt-5 mx-1 mb-2 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent text-bg shadow-lg shadow-accent/20 transition-transform active:scale-95"
            >
              <Plus size={30} strokeWidth={2.6} />
            </button>
          ),
        )}
      </div>
    </nav>
  )
}
