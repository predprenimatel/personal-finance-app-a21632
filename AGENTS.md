# AGENTS.md

Personal finance PWA («Копилка»). Client-only React + Vite SPA; **no backend by design** — the user explicitly asked for data to stay on the device. Continue work from the milestones in `PLAN.md`.

## Layout
- `src/App.jsx` — tab state (home / list / goals / stats / more), opens the quick-entry sheet (`initial` to edit, `preset` to prefill e.g. a transfer). No router.
- `src/lib/storage.js` — the only place that touches persistence (localStorage key `kopilka:v1`; schema version is the `version` field inside, currently 2). `normalize()` validates and migrates both stored data and imported backups; `shapeTxn()` / `shapeJar()` define the canonical shapes (also used by the store). Swap to IndexedDB here.
- `src/lib/store.jsx` — React context: data, actions (`addTxn`, `updateTxn`, `deleteTxn`, `restoreTxn`, `addJar`, `updateJar`, `archiveJar`, `addCategory`, `setSettings`, `importData`, `resetAll`), merged category list/map, `jarMap`, `activeJars`, memoized `balances`, toast.
- `src/lib/categories.js` — preset categories (stable IDs, referenced by transactions and backups), `rankCategories()` (3 most recent, then by frequency).
- `src/lib/dates.js` — local ISO dates (`YYYY-MM-DD`), period ranges (`getRange`, `getPrevRange`), Russian labels.
- `src/lib/stats.js` — pure aggregation helpers: `balances(data)` (the only balance formula), `realTxns()`, summary, by-category, time series, filters, forecast.
- `src/lib/format.js` — currencies and money formatting (ru-RU).
- `src/components/` — `QuickAdd` (entry/edit, incl. «Копилка» transfers), `CategoryPicker` (all categories + create), `JarForm` (create/edit jar), `TxnList`, `BottomNav` (5 tabs + «+», must fit 375px), `Toast`, `ui.jsx` primitives (Sheet, Segmented, Chip, Card…).
- `src/screens/` — Home, Operations, Goals (jars), Stats, Settings.
- `public/sw.js`, `public/manifest.webmanifest` — PWA (navigation network-first, assets cache-first). Bump `CACHE` when changing shell behavior.

## Conventions
- Plain JSX (no TypeScript). Tailwind v4 theme tokens in `src/index.css` (`bg`, `surface`, `surface-2`, `line`, `ink`, `muted`, `faint`, `accent`, `income`, `expense`, `debt`).
- All UI text is Russian. Amounts are positive numbers; sign comes from `TYPES[type].sign`. Debt payments count as outflow.
- **Hidden-categories rule**: any chip/filter/chart lists only categories that have transactions; full lists are reachable via `CategoryPicker`. Keep this for new features.
- Transaction shape: `{ id, type: 'expense'|'income'|'debt', amount, categoryId, date, note, createdAt }`.
- Transfer shape: `{ id, type: 'transfer', direction: 'in'|'out', jarId, amount, date, note, createdAt }` — no `categoryId`. `in` = put into a jar, `out` = take out.
- Jar shape (`data.jars`): `{ id, name, icon, color, openingBalance, archived, createdAt }`. A jar's balance is never stored: `openingBalance + Σin − Σout`. Deleting a jar = archiving it; a positive remainder is returned by an automatic transfer out. A withdrawal can't exceed the jar balance.
- `settings.startBalance` — money before tracking started; base of the active balance.
- **Balances**: always use `balances(data)` (`useStore().balances`): active = startBalance + income − expense − debt − Σin + Σout; saved = Σ non-archived jar balances; total = active + saved.
- **Transfers are not income or spending.** Any income/outflow aggregation (summaries, charts, donut, focus tiles, forecasts, category filters, day totals) must go through `realTxns()` at its entry. Transfers in lists are titled «В копилку: …» / «Из копилки: …» in a neutral color.
- Add new entities (templates, debts, goals) as new top-level arrays in the data object, extend `normalize()` and bump `VERSION` with a migration note there.
