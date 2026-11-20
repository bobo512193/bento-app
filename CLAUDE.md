# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

便當訂購 PWA (bento ordering app) for employees. React 19 + TypeScript + Vite + Tailwind v4. **There is no backend**: all data lives in the browser's IndexedDB via Dexie. Deployed to GitHub Pages under the `/bento-app/` base path. UI text, comments, and commit messages are in Traditional Chinese — keep that convention. `readme.md` is the functional spec (business rules for orders, payments, and wallet balances); consult it before changing behavior.

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build (type-check is part of the build)
npm run lint     # eslint .
npm run preview  # serve the built dist/
```

There is no test suite. Verify with `npm run build` and `npm run lint`.

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes `dist/` to the `gh-pages` branch — a push to main is a production deploy.

## Release / versioning convention

Every change bumps the version in **both** `src/version.ts` (`APP_VERSION`) and `public/version.json` (`version` + `changelog`) — do it as part of the change, unasked. Format is `YYYYMMDD.NN`: today's date plus a per-day sequence (first change of the day is `.01`; if `version.json` already has today's date, increment `NN`). `changelog` is a short Chinese summary of that change. Commit messages follow `vYYYYMMDD.NN : <中文說明>`. The `changelog` string in `version.json` is shown to users in `UpdateBanner` when a new service worker is waiting.

## Architecture

- **Routing**: `HashRouter` in `src/App.tsx` (required for GitHub Pages). All pages render inside `components/Layout.tsx` (bottom nav + update banner). Management CRUD pages live under `/management/...`.
- **Data layer (`src/db/`)**: `db.ts` defines all types and the `BentoDatabase` Dexie schema; each table has a service object (`storeService`, `orderService`, `balanceService`, …) re-exported from `src/db/index.ts`. Pages read reactively with `useLiveQuery` (dexie-react-hooks) and write through the services. Zustand is a dependency but not currently used.
- **Schema changes**: never edit an existing `this.version(n)` block — add a new `this.version(n+1)` with only the changed tables. Users' devices hold real data in IndexedDB; there's no server-side migration path.
- **Images** are stored as base64 strings directly in records (`image_base64`).
- **Store types**: `stores.type` is `'bento' | 'drink'`. Drink stores have `toppings` and order items carry `sweetness` / `ice` / `toppings` (toppings price snapshot is stored on the item). Item line totals = `(unit_price + Σtopping.price) * quantity`.
- **Order model**: one `orders` row per `order_date`. `order_items.member_id` / `order_payments.member_id` are `null` when the vendor has no members (vendor-level ordering by headcount). `status` goes `pending` → `completed`; completed orders are read-only, the order list shows only pending, and order management (deletion) shows only completed.

### Wallet / balance logic (bug-prone area)

- Vendors and members each have a nullable `balance` (may be negative). The balance belongs to the **member** if the vendor has members, otherwise to the **vendor**.
- Payment method is `'cash' | 'wallet' | null`. Only `wallet` affects balance. `orderService.setMemberPayments` / `setVendorPayments` compute the delta between old and new method, adjust the balance, and write a `balance_logs` entry (`訂單付款 <date>` / `取消付款 <date>`). They dedupe by `(vendor_id, member_id)` to avoid double-charging when duplicate payment rows exist — preserve this.
- Deleting orders never touches balances. Vendors/members with non-zero balance cannot be deleted; a member-less vendor with non-zero balance cannot gain members.

### PWA updates

`vite-plugin-pwa` uses `registerType: 'prompt'`. `UpdateBanner.tsx` waits for the `controllerchange` event before reloading (calling `updateServiceWorker(false)`), because the plugin's built-in reload could fire before the new SW took control and leave users running stale JS. Don't revert to `updateServiceWorker(true)`.
