# Product

## Register

product

## Users

Yard/counter staff and office/admin staff, roughly equally.

- **Yard/counter staff**: phone or tablet, standing, moving between customers. Need fast lookups with minimal typing and touch targets that work outdoors and one-handed.
- **Office/admin staff**: laptop/desktop, seated, doing reconciliation and data upkeep. Need denser information and precision over speed.

This is the web companion to ZamZam's existing mobile inventory app, sharing the same Supabase database (vehicle salvage / used auto parts yard, Narol, Ahmedabad). Access is staff-only, gated behind sign-in.

## Product Purpose

Let staff browse, search, and filter the parts inventory and donor-vehicle fleet, see full detail (specs, condition, photos) for any item, and safely manage listings — without needing to be at the yard or on the mobile app.

Success looks like:
- **Faster lookup** — finding a specific part or donor vehicle takes seconds, not a scroll through paper or the mobile app.
- **Fewer costly mistakes** — wrong sold/unsold status, duplicate listings, or deleting an item that already has sale history become hard to do by accident.
- **Better customer-facing sharing** — a clean PDF or photo of a part/car can be produced and shared (e.g. over WhatsApp) in a couple of taps.

## Brand Personality

Clean, modern, trustworthy. Feels like a tool a real business had purpose-built for itself — not a templated admin panel. Confidence comes from restraint and clarity, not decoration.

## Anti-references

Not a generic SaaS dashboard: no purple-gradient hero cards, no stock-icon card grids, no boilerplate admin-template look. The existing logo (black wordmark, orange/red accent) should feel load-bearing, not bolted on.

## Design Principles

1. **Speed over decoration** — every screen gets staff to the part or car they need in the fewest taps/seconds. Search-first, chunked loading, minimal chrome.
2. **Trustworthy at the point of sharing** — anything a customer sees (shared PDF, photos) should look deliberately made, not auto-generated boilerplate.
3. **Guard irreversible actions** — deletion and other destructive actions get friction proportional to their cost, since this database is shared with the mobile app and tied to real sales history.
4. **Works equally well in-hand and at a desk** — no feature should assume only mobile or only desktop.
5. **Show real state, never guess** — every data view has explicit loading/empty/error states; nothing silently looks broken.

## Accessibility & Inclusion

Standard WCAG AA: good color contrast, readable text sizes, keyboard and touch usable controls. No further specific needs identified.
