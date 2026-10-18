import { BarChart3, Home, List, PiggyBank, Plus, Settings2 } from 'lucide-react'
import { cn } from './ui'

const ITEMS = [
  { id: 'home', label: 'Главная', Icon: Home },
  { id: 'list', label: 'Операции', Icon: List },
  { id: 'goals', label: 'Цели', Icon: PiggyBank },
  { id: 'stats', label: 'Статистика', Icon: BarChart3 },
  { id: 'more', label: 'Ещё', Icon: Settings2 },
]

// Five equal tabs. The add button floats centered above the bar so it stays
// in the middle regardless of how many tabs sit on each side.
export default function BottomNav({ tab, onTab, onAdd }) {
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-md items-center px-0.5">
          {ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onTab(item.id)}
              className={cn(
                'flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] leading-none tracking-tight',
                tab === item.id ? 'text-ink' : 'text-faint',
              )}
            >
              <item.Icon size={20} strokeWidth={tab === item.id ? 2.4 : 1.8} />
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <button
        onClick={onAdd}
        aria-label="Добавить операцию"
        className="fixed left-1/2 z-30 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-accent text-bg shadow-lg shadow-accent/20 transition-transform active:scale-95"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 12px)' }}
      >
        <Plus size={30} strokeWidth={2.6} />
      </button>
    </>
  )
}