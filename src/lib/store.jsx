import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { DEFAULT_CATEGORIES } from './categories'
import { todayISO } from './dates'
import { balances, debtRemaining, openingForRemaining } from './stats'
import { emptyData, loadData, normalize, saveData, shapeDebt, shapeGoal, shapeJar, shapeTxn, uid } from './storage'

const StoreContext = createContext(null)

const cents = (v) => Math.round(v * 100) / 100

/** Close a debt when the remainder hits zero; reopen it if a payment that closed it is undone. Manual archives (closed: false) stay archived. */
function applyDebtClose(debts, transactions, debtId) {
  if (!debtId) return debts
  return debts.map((d) => {
    if (d.id !== debtId) return d
    const rem = debtRemaining(d, transactions)
    if (rem <= 0.009) return { ...d, archived: true, closed: true }
    if (d.closed) return { ...d, archived: false, closed: false }
    return d
  })
}

function reducer(state, action) {
  switch (action.type) {
    case 'add': {
      const transactions = [...state.transactions, action.txn]
      return { ...state, transactions, debts: applyDebtClose(state.debts, transactions, action.txn.debtId) }
    }
    case 'update': {
      const prev = state.transactions.find((t) => t.id === action.txn.id)
      const transactions = state.transactions.map((t) => (t.id === action.txn.id ? action.txn : t))
      let debts = applyDebtClose(state.debts, transactions, prev?.debtId)
      debts = applyDebtClose(debts, transactions, action.txn.debtId)
      return { ...state, transactions, debts }
    }
    case 'delete': {
      const prev = state.transactions.find((t) => t.id === action.id)
      const transactions = state.transactions.filter((t) => t.id !== action.id)
      return { ...state, transactions, debts: applyDebtClose(state.debts, transactions, prev?.debtId) }
    }
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
    case 'addDebt': {
      const debt = action.debt.openingRemaining <= 0.009 ? { ...action.debt, archived: true, closed: true } : action.debt
      return { ...state, debts: [...state.debts, debt] }
    }
    case 'updateDebt': {
      const debts = state.debts.map((d) => (d.id === action.debt.id ? action.debt : d))
      return { ...state, debts: applyDebtClose(debts, state.transactions, action.debt.id) }
    }
    case 'adjustDebt': {
      const debt = state.debts.find((d) => d.id === action.id)
      if (!debt) return state
      const openingRemaining = openingForRemaining(debt, state.transactions, action.remaining)
      const debts = state.debts.map((d) => (d.id === action.id ? { ...d, openingRemaining } : d))
      return { ...state, debts: applyDebtClose(debts, state.transactions, action.id) }
    }
    case 'addGoal':
      return { ...state, goals: [...state.goals, action.goal] }
    case 'updateGoal':
      return { ...state, goals: state.goals.map((g) => (g.id === action.goal.id ? action.goal : g)) }
    case 'topUpGoal':
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.id
            ? { ...g, manualSaved: cents(g.manualSaved + action.amount), topups: [...(g.topups || []), { amount: action.amount, date: action.date }] }
            : g,
        ),
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
  const toastTimer = useRef(null)

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
        if (!txn) return null
        dispatch({ type: 'add', txn })
        return txn
      },
      // Pass the full transaction; it is re-shaped, so fields of the old type (e.g. categoryId) are dropped.
      updateTxn: (txn) => {
        const shaped = shapeTxn(txn)
        if (shaped) dispatch({ type: 'update', txn: shaped })
      },
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
      addDebt(fields) {
        const debt = shapeDebt({ id: `debt_${uid()}`, createdAt: Date.now(), ...fields, archived: false, closed: false })
        dispatch({ type: 'addDebt', debt })
        return debt
      },
      updateDebt: (debt) => dispatch({ type: 'updateDebt', debt: shapeDebt(debt) }),
      /** Sets the computed remainder (interest and penalties are folded into the opening figure). */
      adjustDebtRemaining: (id, remaining) => dispatch({ type: 'adjustDebt', id, remaining: Math.max(0, Number(remaining) || 0) }),
      addGoal(fields) {
        const goal = shapeGoal({ id: `goal_${uid()}`, createdAt: Date.now(), ...fields, archived: false, reached: false })
        dispatch({ type: 'addGoal', goal })
        return goal
      },
      updateGoal: (goal) => dispatch({ type: 'updateGoal', goal: shapeGoal(goal) }),
      /** Manual top-up: changes the saved number only, no transaction. */
      topUpGoal: (id, amount) => dispatch({ type: 'topUpGoal', id, amount: cents(amount), date: todayISO() }),
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
  const debtMap = useMemo(() => new Map(data.debts.map((d) => [d.id, d])), [data.debts])
  const activeDebts = useMemo(() => data.debts.filter((d) => !d.archived), [data.debts])
  const activeGoals = useMemo(() => data.goals.filter((g) => !g.archived), [data.goals])
  // { active, saved, total, jarBalance } — see balances() in stats.js.
  const bal = useMemo(() => balances(data), [data.transactions, data.jars, data.settings])

  const reachedMark = useRef(new Set())
  useEffect(() => {
    for (const g of data.goals) {
      if (!(g.targetAmount > 0)) continue
      const saved = g.jarId ? bal.jarBalance.get(g.jarId) || 0 : g.manualSaved || 0
      if (saved + 0.009 < g.targetAmount) {
        reachedMark.current.delete(g.id)
        if (g.reached) dispatch({ type: 'updateGoal', goal: { ...g, reached: false } })
        continue
      }
      if (g.archived) {
        reachedMark.current.add(g.id)
        continue
      }
      if (reachedMark.current.has(g.id)) continue
      reachedMark.current.add(g.id)
      dispatch({ type: 'updateGoal', goal: { ...g, archived: true, reached: true } })
      showToast(`Цель «${g.name}» достигнута — она в архиве`)
    }
  }, [data.goals, bal, showToast])

  const value = { ...data, ...api, categories, categoryMap, jarMap, activeJars, debtMap, activeDebts, activeGoals, balances: bal, currency: data.settings.currency, toast, showToast, hideToast: () => setToast(null), lastTxn, data }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)
