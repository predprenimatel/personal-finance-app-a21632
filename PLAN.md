# Копилка — roadmap

Personal, single-user finance tracker. All data stays in the browser; no server, no accounts.

## ✅ Milestone 1 — Core loop (done)
- Quick entry sheet: custom numeric keypad, Expense / Income / Debt payment switch, smart category chips (recent first, then frequent), date (today by default), optional note.
- Undo after save / undo last operation, edit & delete with "restore".
- Operations list grouped by day; filters by type, category, amount range, text.
- Category visibility rule: chips and filters show only categories with operations; the rest live in "Все категории" with search; custom categories with icon + color.
- Statistics: Day / Week / Month / Year / Custom tabs with period navigation; income, outflow, balance, savings rate, avg/day; comparison with previous period (% and amount); donut by category (tap → operations); income vs outflow bars; focus tiles (cigarettes, food, rent, debts); top-5 biggest spends; month-end forecast.
- Home: month balance, today's spend, forecast, 5 last operations.
- Currency switch, JSON/CSV export, JSON import, "Reset all" with confirmation.
- PWA manifest + service worker (installable, offline).

## ✅ Milestone 1.5 — Jars & total balance (done)
- Data v2 (migrated in `normalize()`): `jars`, `transfer` operations (put / take out of a jar), `settings.startBalance`.
- One balance formula (`balances()`): active balance, money in jars, total balance. Transfers are excluded from all income/outflow statistics; Stats shows «Отложено в копилки» for the period.
- Quick entry: 4th segment «Копилка» (put / take out, jar chips with balances, create a jar inline, can't take out more than the balance).
- «Цели» tab: list of jars with balance, history, put / take out, create / edit, delete = archive (remainder returned to the active balance), archive with restore.
- Home: total balance, «Активный» and «В копилках» cards, smaller «Баланс месяца». Settings: «Стартовый остаток». CSV export includes transfers.

## Milestone 2 — Recurring templates & reminders
- Template model (name, amount, category, type, schedule: monthly day / weekly / custom).
- One-tap "add from template" row in the quick-entry sheet.
- "Upcoming payments" block on Home; in-app reminder banner on/before due date.

## Milestone 3 — Debts section
- Debt entity: kind (credit, microloan, installment, personal, obligation), principal, remaining balance, rate, next payment date, payment schedule.
- Link "Платёж по долгу" operations to a debt to reduce its balance.
- Progress bar, projected payoff date at current pace, total debt load, share of debt payments in monthly income.

## Milestone 4 — Goals
- Target amount and date for jars (progress bar, «сколько откладывать в месяц»), shown on the «Цели» tab next to the jars.
- Weekly / monthly / yearly goals: spending limit (total or per category), savings, income, debt payoff.
- Progress bars, "on track / off track" forecast, in-app alerts at 80% and 100% of a limit; goals block on Home.

## Milestone 5 — Advanced statistics
- Cumulative balance line, category trend over time, spending heatmap (weekday × day of month).
- Mandatory vs free money share (rent, utilities, debts, subscriptions vs the rest).
- Filters inside statistics (category, type, amount, text) applied to all charts.

## Milestone 6 — Storage & security
- Move persistence from localStorage to IndexedDB (only `src/lib/storage.js` changes), with migration.
- CSV import with column mapping.
- Optional PIN lock on app start (hashed PIN, auto-lock on background).
