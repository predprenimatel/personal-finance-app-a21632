# Копилка

A personal, mobile-first finance tracker in Russian with a dark theme. One user, no sign-up, no server — every operation is stored locally in the browser and the app works offline as an installable PWA.

## Features
- **Quick entry** — big «+» button, amount keypad opens immediately, category chips ordered by your recent and frequent choices, save in three taps. Expense / income / debt payment.
- **Only your categories** — a full preset set exists (income, expenses, debts), but chips, filters and charts show only categories you have used. Everything else is under «Все» with search, plus custom categories with icon and color.
- **Operations list** — grouped by day, search and filters, edit, delete and undo.
- **Statistics** — day / week / month / year / custom period: summary, comparison with the previous period, category donut (tap to drill down), income vs spending bars, biggest spends, month-end forecast.
- **Backups** — JSON and CSV export, JSON import, full reset; currency switch (₴ default).

## Tech
React 18, Vite, Tailwind CSS v4, Recharts, lucide-react. Data in `localStorage` (behind a single storage module). Static deploy on Netlify.

## Run locally
```bash
npm install
npm run dev
```

## Roadmap
Recurring templates with reminders, a debts section, goals with limit alerts, advanced charts (heatmap, cumulative balance, category trends), IndexedDB storage, CSV import and an optional PIN. See [PLAN.md](./PLAN.md).
