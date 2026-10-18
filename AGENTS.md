# AGENTS.md

Personal finance PWA («Копилка»). Client-only React + Vite SPA; **no backend by design** — the user explicitly asked for data to stay on the device. Continue work from the milestones in `PLAN.md`.

## Layout
- `src/App.jsx` — tab state (home / list / goals / stats / more), opens the quick-entry sheet (`initial` to edit, `preset` to prefill a transfer or a debt payment). No router.
- `src/lib/storage.js` — the only place that touches persistence (localStorage key `kopilka:v1`; schema version is the `version` field inside, currently 3). `normalize()` validates and migrates both stored data and imported backups. `shapeTxn()` / `shapeJar()` / `shapeDebt()` / `shapeGoal()` define the canonical shapes.
- `src/lib/store.jsx` — React context: data, actions (transactions, jars, debts, goals, categories, settings, import, reset), maps, memoized `balances`, toast.
- `src/lib/categories.js` — preset categories (stable IDs), `rankCategories()`, `DEBT_KINDS`.
- `src/lib/dates.js` — local ISO dates, period ranges, Russian labels, `monthsLeft`.
- `src/lib/stats.js` — `balances(data)`, `realTxns()`, summary, charts, `debtRemaining` / `debtOutlook`, `goalSaved` / `goalOutlook`.
- `src/lib/format.js` — currencies and money formatting (ru-RU).
- `src/components/` — `QuickAdd`, `CategoryPicker`, `JarForm`, `DebtForm`, `GoalForm`, `TxnList`, `BottomNav`, `Toast`, `ui.jsx`.
- `src/screens/` — Home, Operations, Goals (jars / savings goals / debts), Stats, Settings.
- `public/sw.js`, `public/manifest.webmanifest` — PWA. Bump `CACHE` when changing shell behavior.

## Conventions
- Plain JSX (no TypeScript). Tailwind v4 theme tokens in `src/index.css`.
- All UI text is Russian. Amounts are positive numbers; sign comes from `TYPES[type].sign`. Debt payments count as outflow.
- **Hidden-categories rule**: chips, filters and charts list only categories that have transactions. Full lists live in `CategoryPicker`. Same idea for empty sections: short hint, no unused noise.
- Transaction: `{ id, type: 'expense'|'income'|'debt', amount, categoryId, date, note, createdAt, debtId? }`.
- Transfer: `{ id, type: 'transfer', direction: 'in'|'out', jarId, amount, date, note, createdAt }` — no `categoryId`. Not income and not spending. Aggregations go through `realTxns()`.
- Jar (`data.jars`): `{ id, name, icon, color, openingBalance, archived, createdAt }`. Balance is computed: `openingBalance + Σin − Σout`.
- Debt (`data.debts`): `{ id, name, kind, principal, openingRemaining, rate?, nextPaymentDate, regularPayment?, archived, closed, createdAt }`. Remainder is computed: `openingRemaining − Σ` payments with that `debtId`. Zero remainder archives the debt as closed.
- Goal (`data.goals`): `{ id, name, icon, color, targetAmount, deadline?, jarId?, manualSaved, topups, archived, reached, createdAt }`. Linked jar → progress is the jar balance. Otherwise `manualSaved` (top-up does not create a transaction).
- `settings.startBalance` is the base of the active balance. Always use `balances(data)`.
- Bottom nav: five equal tabs. The «+» button floats centered above the bar (`fixed`, `left-1/2`), it is not a slot between tabs.
