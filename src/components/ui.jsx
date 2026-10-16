import { useEffect } from 'react'
import { X } from 'lucide-react'

export const cn = (...c) => c.filter(Boolean).join(' ')

export function Segmented({ options, value, onChange, size = 'md', className }) {
  return (
    <div className={cn('flex rounded-2xl bg-surface p-1', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'flex-1 rounded-xl font-medium transition-colors',
            size === 'xs' ? 'px-1 py-1.5 text-xs' : size === 'sm' ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
            value === o.id ? 'bg-surface-2 text-ink shadow-sm' : 'text-muted',
          )}
          style={value === o.id && o.color ? { color: o.color } : undefined}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function CategoryIcon({ category, size = 40 }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, background: `${category?.color ?? '#9AA3AE'}22`, fontSize: size * 0.48 }}
    >
      {category?.icon ?? '•'}
    </span>
  )
}

export function Chip({ active, color, onClick, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors',
        active ? 'border-transparent text-bg font-medium' : 'border-line bg-surface text-ink',
        className,
      )}
      style={active ? { background: color ?? 'var(--color-accent)' } : undefined}
    >
      {children}
    </button>
  )
}

/** Bottom sheet; `full` makes it cover the whole viewport on phones. */
export function Sheet({ onClose, title, children, full = false, z = 'z-40' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className={cn('fixed inset-0 flex items-end justify-center', z)}>
      <div className="anim-fade absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={cn(
          'anim-sheet relative flex w-full max-w-md flex-col bg-bg pb-[env(safe-area-inset-bottom)]',
          full ? 'h-dvh sm:h-[92dvh] sm:rounded-t-3xl' : 'max-h-[88dvh] rounded-t-3xl border-t border-line',
        )}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="-mr-2 grid h-10 w-10 place-items-center rounded-full text-muted active:bg-surface" aria-label="Закрыть">
              <X size={22} />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export function Empty({ icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 text-4xl">{icon}</div>
      <div className="font-medium">{title}</div>
      {text && <div className="mt-1 text-sm text-muted">{text}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Card({ className, children, ...rest }) {
  return (
    <div className={cn('rounded-3xl bg-surface p-4', className)} {...rest}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, right }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <h3 className="text-sm font-medium text-muted">{children}</h3>
      {right}
    </div>
  )
}
