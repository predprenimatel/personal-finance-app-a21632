import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { DEFAULT_CATEGORIES } from './categories'
import { emptyData, loadData, normalize, saveData, uid } from './storage'

const StoreContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'add':
      return { ...state, transactions: [...state.transactions, action.txn] }
    case 'update':
      return { ...state, transactions: state.transactions.map((t) => (t.id === action.txn.id ? action.txn : t)) }
    case 'delete':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id) }
    case 'addCategory':
      return { ...state, customCategories: [...state.customCategories, action.category] }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'replace':
      return action.data
    default:
      return state
  }
}

export function StoreProvider({ children }) {
  const [data, dispatch] = useReducer(reducer, null, loadData)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef()

  useEffect(() => saveData(data), [data])

  const showToast = useCallback((message, action) => {
    clearTimeout(toastTimer.current)
    setToast({ message, action, key: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }, [])

  const categories = useMemo(() => [...DEFAULT_CATEGORIES, ...data.customCategories], [data.customCategories])
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const api = useMemo(
    () => ({
      addTxn(fields) {
        const txn = { id: uid(), createdAt: Date.now(), note: '', ...fields }
        dispatch({ type: 'add', txn })
        return txn
      },
      updateTxn: (txn) => dispatch({ type: 'update', txn }),
      deleteTxn: (id) => dispatch({ type: 'delete', id }),
      restoreTxn: (txn) => dispatch({ type: 'add', txn }),
      addCategory(fields) {
        const category = { id: `custom_${uid()}`, custom: true, ...fields }
        dispatch({ type: 'addCategory', category })
        return category
      },
      setSettings: (patch) => dispatch({ type: 'settings', patch }),
      importData: (raw) => dispatch({ type: 'replace', data: normalize(raw) }),
      resetAll: () => dispatch({ type: 'replace', data: emptyData() }),
    }),
    [],
  )

  /** The most recently created transaction — target of "undo last". */
  const lastTxn = useMemo(
    () => data.transactions.reduce((a, t) => (!a || t.createdAt > a.createdAt ? t : a), null),
    [data.transactions],
  )

  const value = { ...data, ...api, categories, categoryMap, currency: data.settings.currency, toast, showToast, hideToast: () => setToast(null), lastTxn, data }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)
