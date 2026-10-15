# AGENTS.md

Personal finance PWA («Копилка»). Client-only React + Vite SPA; **no backend by design** — the user explicitly asked for data to stay on the device. Continue work from the milestones in `PLAN.md`.

## Layout
- `src/App.jsx` — tab state (home / list / stats / more), opens the quick-entry sheet. No router.
- `src/lib/storage.js` — the only place that touches persistence (localStorage key `kopilka:v1`). `normalize()` validates both stored data and imported backups. Swap to IndexedDB here.
- `src/lib/store.jsx` — React context: data, actions (`addTxn`, `updateTxn`, `deleteTxn`, `restoreTxn`, `addCategory`, `setSettings`, `importData`, `resetAll`), merged category list/map, toast.
- `src/lib/categories.js` — preset categories (stable IDs, referenced by transactions and backups), `rankCategories()` (3 most recent, then by frequency).
- `src/lib/dates.js` — local ISO dates (`YYYY-MM-DD`), period ranges (`getRange`, `getPrevRange`), Russian labels.
- `src/lib/stats.js` — pure aggregation helpers (summary, by-category, time series, filters, forecast).
- `src/lib/format.js` — currencies and money formatting (ru-RU).
- `src/components/` — `QuickAdd` (entry/edit), `CategoryPicker` (all categories + create), `TxnList`, `BottomNav`, `Toast`, `ui.jsx` primitives (Sheet, Segmented, Chip, Card…).
- `src/screens/` — Home, Operations, Stats, Settings.
- `public/sw.js`, `public/manifest.webmanifest` — PWA (navigation network-first, assets cache-first). Bump `CACHE` when changing shell behavior.

## Conventions
- Plain JSX (no TypeScript). Tailwind v4 theme tokens in `src/index.css` (`bg`, `surface`, `surface-2`, `line`, `ink`, `muted`, `faint`, `accent`, `income`, `expense`, `debt`).
- All UI text is Russian. Amounts are positive numbers; sign comes from `TYPES[type].sign`. Debt payments count as outflow.
- **Hidden-categories rule**: any chip/filter/chart lists only categories that have transactions; full lists are reachable via `CategoryPicker`. Keep this for new features.
- Transaction shape: `{ id, type: 'expense'|'income'|'debt', amount, categoryId, date, note, createdAt }`. Add new entities (templates, debts, goals) as new top-level arrays in the data object and extend `normalize()`.
