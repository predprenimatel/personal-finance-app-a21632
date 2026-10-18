import { useStore } from '../lib/store'

export default function Toast() {
  const { toast, hideToast } = useStore()
  if (!toast) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 9.75rem)' }}>
      <div key={toast.key} className="anim-pop pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 shadow-2xl shadow-black/50">
        <span className="flex-1 text-sm">{toast.message}</span>
        {toast.action && (
          <button
            className="text-sm font-semibold text-accent"
            onClick={() => {
              toast.action.fn()
              hideToast()
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
    </div>
  )
}
