

# ZamZam Auto Parts — Web App

Next.js web app sharing the **same Supabase Postgres database** as the ZamZam React Native inventory app (Narol, Ahmedabad — vehicle salvage / used auto parts). This is a *second client* on an existing schema, not a fresh build.

> Assumption: Next.js (App Router) + Supabase, matching the storefront/admin direction planned for this DB. Correct this first if wrong — everything depends on it.

**Before touching schema, RLS, or money/ledger logic, read `docs/SCHEMA_AND_PITFALLS.md`.** It has the full data model, financial logic, and the common-mistakes list for this app. Don't guess at any of that — look it up.

---

## Ground truth

- `supabase/migrations/` is the only source of truth for schema. Never assume a column/table exists — grep migrations first.
- This DB is shared with the mobile app. Any schema/RLS/trigger change here can break it. Treat schema changes as cross-app breaking changes.
- No custom backend — Supabase client SDK + RLS is the entire security boundary.

## Stack

- React 19, TypeScript
- Vite 8 (dev server / bundler)
- oxlint for linting
- DB/Auth/Storage: Supabase (shared with ZamZam mobile app)
- Data fetching: server components / route handlers for anything auth-sensitive
- Styling: [confirm]
- Types: generate via `supabase gen types typescript` — never hand-write DB types

## Commands

## Commands
- `npm run dev` — start dev server
- `npm run build` — type-check (`tsc -b`) then build for production
- `npm run preview` — preview the production build
- `npm run lint` — run oxlint
- Dev: `npm run dev`
- Type check: `npm run typecheck`
- Migration (local): `supabase migration up` / `supabase db push` — [confirm exact workflow]
- Generate types: `supabase gen types typescript --local > types/supabase.ts`

## LLM workflow rules

1. **Explore first.** Read `supabase/migrations/` and relevant existing code before writing anything. State what you found. Never assume a table/column/policy exists.
2. **Plan before coding** anything touching schema, RLS, or money logic. State: tables touched, migration needed y/n, RLS impact, mobile-app impact. Get confirmation before destructive or cross-app-breaking changes.
3. **No schema guessing.** If something referenced isn't in migrations, say so — don't invent a plausible one.
4. **Money/ledger logic is protected** (see docs file). Flag any request touching it before changing.
5. **Small, verifiable commits.** One logical change per commit. State what you tested or manually verified.
6. **Never silently widen access.** Any RLS or `is_staff()`/`is_admin()` change is called out explicitly — it's the entire security layer.
7. **Cross-app check on every migration:** does the mobile app read/write this table/column, and does this change break it?
8. **No fabricated data.** Unverifiable seed/reference data → leave NULL, say why.
9. **Ask before deleting.** No hard deletes, no dropping columns/tables, without explicit confirmation.

## Definition of done

- [ ] RLS enabled + tested (allowed and denied roles, including anon) on every new/changed table
- [ ] Every money computation traced to one SQL source, no duplicate JS math
- [ ] Every mutation validated server-side, not just client-form validation
- [ ] Loading/empty/error states handled for every data view
- [ ] No secrets in client bundle — service-role key never shipped to browser
- [ ] Migration committed for any schema change, checked for mobile-app backward-compat
- [ ] TypeScript strict, no `any` on data models — types generated, not hand-written
- [ ] Concurrent-write paths (stock status, payment allocation) use transactions/row locks, not client state

## Structure
- `src/` — application source (entry: `src/main.tsx`, root component: `src/App.tsx`)
- `public/` — static assets served as-is
- `index.html` — Vite entry HTML

## Design Context

See [`PRODUCT.md`](PRODUCT.md) (and `DESIGN.md`, once generated) for the full brief. Short version: this is a **product**-register, staff-only internal tool (not marketing) for ZamZam's yard/counter and office staff, sharing a Supabase DB with the ZamZam mobile app. Priorities: fast lookup, guarded destructive actions, trustworthy customer-facing sharing (PDF/photos), works equally well in-hand and at a desk. Explicitly avoid the generic SaaS-dashboard look.
