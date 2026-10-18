# Копилка — roadmap

Personal, single-user finance tracker. All data stays in the browser; no server, no accounts.

## ✅ Milestone 1 — Core loop (done)
- Quick entry, undo, operations list, hidden unused categories, statistics, home, currency, JSON/CSV backup, PWA.

## ✅ Milestone 1.5 — Jars & total balance (done)
- Data v2: `jars`, `transfer` operations, `settings.startBalance`.
- `balances()`: active, jars, total. Transfers excluded from income/outflow stats.
- Quick entry segment «Копилка». «Цели» tab lists jars.

## ✅ Milestone 3 — Debts & savings goals (done)
- Data v3 (migrated in `normalize()`): `debts`, `goals`, optional `debtId` on debt payments. Old v1/v2 data still opens.
- «Цели» tab segments: Копилки · Цели · Долги.
- Debts: remainder is computed, progress bar, next payment, payoff pace from the last 3 months only when there are at least two payments, one-tap payment, manual remainder correction. Remainder 0 archives the debt as «Закрыт».
- Savings goals (for example «Машина»): target, optional deadline, optional linked jar. Progress bar, monthly amount needed, on-track / off-track only when there is recent history. Reaching the target archives the goal.
- Home: nearest debt payment and up to two goal bars, only when that data exists.
- JSON export includes the new entities. CSV adds a `debt` column. Service worker cache is `kopilka-v3`.

## Milestone 2 — Recurring templates & reminders
- Template model (name, amount, category, type, schedule: monthly day / weekly / custom).
- One-tap "add from template" row in the quick-entry sheet.
- "Upcoming payments" block on Home; in-app reminder banner on/before due date.

## Milestone 4 — Period goals
- Weekly / monthly / yearly goals: spending limit (total or per category), income, debt payoff.
- Progress bars, "on track / off track" forecast, in-app alerts at 80% and 100% of a limit.

## Milestone 5 — Advanced statistics
- Cumulative balance line, category trend over time, spending heatmap (weekday × day of month).
- Mandatory vs free money share.
- Filters inside statistics applied to all charts.

## Milestone 6 — Storage & security
- Move persistence from localStorage to IndexedDB (only `src/lib/storage.js` changes), with migration.
- CSV import with column mapping.
- Optional PIN lock on app start.
