import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { DEFAULT_CATEGORIES } from './categories'
import { todayISO } from './dates'
import { balances } from './stats'
import { emptyData, loadData, normalize, saveData, shapeJar, shapeTxn, uid } from './storage'

const StoreContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'add':
      return { ...state, transactions: [...state.transactions, action.txn] }
    case 'update':
      return { ...state, transactions: state.transactions.map((t) => (t.id === action.txn.id ? action.txn : t)) }
    case 'delete':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id) }
    case 'addJar':
      return { ...state, jars: [...state.jars, action.jar] }
    case 'updateJar':
      return { ...state, jars: state.jars.map((j) => (j.id === action.jar.id ? action.jar : j)) }
    case 'archiveJar': {
      // A non-empty jar is emptied back into the active balance first, so totals stay consistent.
      const left = balances(state).jarBalance.get(action.id) || 0
      const transactions = left > 0 ? [...state.transactions, { ...action.txn, amount: left }] : state.transactions
      return { ...state, transactions, jars: state.jars.map((j) => (j.id === action.id ? { ...j, archived: true } : j)) }
    }
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
      // Regular: { type, amount, categoryId, date, note }; transfer: { type: 'transfer', direction, jarId, amount, date, note }.
      addTxn(fields) {
        const txn = shapeTxn({ id: uid(), createdAt: Date.now(), note: '', ...fields })
        dispatch({ type: 'add', txn })
        return txn
      },
      // Pass the full transaction; it is re-shaped, so fields of the old type (e.g. categoryId) are dropped.
      updateTxn: (txn) => dispatch({ type: 'update', txn: shapeTxn(txn) }),
      deleteTxn: (id) => dispatch({ type: 'delete', id }),
      restoreTxn: (txn) => dispatch({ type: 'add', txn }),
      addJar(fields) {
        const jar = shapeJar({ id: `jar_${uid()}`, createdAt: Date.now(), ...fields, archived: false })
        dispatch({ type: 'addJar', jar })
        return jar
      },
      updateJar: (jar) => dispatch({ type: 'updateJar', jar: shapeJar(jar) }),
      /** Archives a jar (history is kept). Any positive remainder is returned to the active balance by a transfer out; that transfer is returned. */
      archiveJar(id) {
        const txn = { id: uid(), createdAt: Date.now(), type: 'transfer', direction: 'out', jarId: id, amount: 0, date: todayISO(), note: 'Закрытие копилки' }
        dispatch({ type: 'archiveJar', id, txn })
        return txn
      },
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

  const jarMap = useMemo(() => new Map(data.jars.map((j) => [j.id, j])), [data.jars])
  const activeJars = useMemo(() => data.jars.filter((j) => !j.archived), [data.jars])
  // { active, saved, total, jarBalance } — see balances() in stats.js.
  const bal = useMemo(() => balances(data), [data.transactions, data.jars, data.settings])

  const value = { ...data, ...api, categories, categoryMap, jarMap, activeJars, balances: bal, currency: data.settings.currency, toast, showToast, hideToast: () => setToast(null), lastTxn, data }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)
