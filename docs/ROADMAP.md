# Roadmap — proposed enhancements

> Snapshot taken **2026-05-27**, after the perf + bilingual + payouts
> + BNPL pushes. Things are in code-complete shape; this file maps
> out the next 3 horizons.

Each item lists: **scope** · **effort** (S / M / L) · **impact**
(low / med / high) · **blockers**. Pick by ratio.

---

## A. "Ship to real traffic" tier — finish what's coded but gated

These are already implemented; only credentials / content stand between
us and live use.

| # | Item | Effort | Impact | Blocker |
|---|------|:---:|:---:|---|
| A1 | Plug in live **Paymob production keys** + valU installment integration_id | S | high | account at accept.paymob.com |
| A2 | Sign up at **Tabby / Tamara**, paste keys + webhook URLs | S | high | merchant onboarding (~3-7 days each) |
| A3 | Live **Accurate carrier creds** + governorate→zone map | S | high | account creds + zone IDs |
| A4 | **Bosta API key** (or accept zone-rate fallback) | S | med | optional |
| A5 | **VAPID keys** for web push (`web-push generate-vapid-keys`) | S | med | none — 5-min task |
| A6 | **Rotate `belgomla_admin` Atlas password** before public launch | S | high | flagged in memory; just rotate + redeploy backend |
| A7 | Upload missing **category photos** (~33 of 50) | S | med | admin work; AI generation toolkit exists in repo |
| A8 | Backfill **`nameAr` for remaining products** if any (272 brand+model SKUs left intentionally untranslated) | — | low | convention decision |

Total to fully unlock the existing build: ~1 week of paperwork +
content uploads, plus 1 day of code wiring for whichever edge cases
shake out of live integration.

---

## B. "Pre-launch hardening" tier — risk reduction

| # | Item | Effort | Impact |
|---|------|:---:|:---:|
| B1 | Add a **strict Content-Security-Policy** (Helmet's CSP is currently disabled). Allowlist Cloudinary, Paymob/Stripe iframes, Sentry. | M | high |
| B2 | **Audit-log retention cron** — drop entries older than 180d so the collection doesn't grow unbounded. | S | med |
| B3 | **Atlas IP allowlist** narrowing — Vercel offers static-IP egress on Pro/Enterprise tiers; tighten away from `0.0.0.0/0`. | S | med |
| B4 | **Stripe SCA / 3DS** flow verification (the current Stripe code path uses `automatic_payment_methods` but hasn't been load-tested with European cards). | M | med (if international) |
| B5 | **Idempotency keys** on order creation (currently a double-tap could create a duplicate order under bad network conditions). | M | high |
| B6 | **Rate-limit per route, not just per IP** — `/api/payments/create-intent` and `/api/users/refresh` deserve stricter caps than browse traffic. | S | med |
| B7 | **Load test** with realistic concurrency (k6 / Artillery). Find the Atlas-tier ceiling before customers do. | M | high |
| B8 | **Daily Atlas backup verification** — confirm restore path works, not just that backups exist. | S | high |
| B9 | **Runbook** for: stuck order, failed payment webhook, support escalation, vendor payout reconciliation. | M | med |
| B10 | **Staging environment** — a third Vercel project pointing at a separate Atlas cluster, for testing migrations and risky deploys before production. | M | high |

---

## C. "Growth" tier — features that move the needle after launch

### C1. Observability & analytics (effort M, impact high)
- Replace ad-hoc `eventLog` with a proper analytics pipeline (Mixpanel
  / PostHog / GA4) — funnel reports out of the box.
- Real-user-monitoring (Sentry Replay or LogRocket) for the first month
  of public traffic.
- Admin dashboard: conversion funnel, cohort retention, average AOV by
  channel.

### C2. Marketing automation (effort M, impact high)
- Coupon templates beyond the existing flat/percentage (e.g., spend-X-
  get-Y, free-shipping-coupon, first-order-only).
- Triggered emails: welcome flow (vs current single welcome email),
  birthday / anniversary, win-back at 60 / 90 / 180 days.
- Better referral funnel: share UI with a one-tap WhatsApp/copy-link
  flow (already partially built — verify on prod).
- Affiliate program — a step beyond referrals; per-creator tracking
  with payout records.

### C3. Catalog depth (effort L, impact high)
- **Product variants** — the model currently treats every SKU as a
  separate product. Add a real `variants` array (size / color / spec
  combos) sharing a parent record. Big refactor; PDP gets a variant
  picker; cart stores variantId.
- **Bundle pricing tiers** (already exists at the product level via
  `bulkPricing`; extend to collections).
- **Wholesale / B2B flow** — tax-exempt customers, NET-30 invoicing,
  per-customer price lists. The `quotations` table is the seed.
- **Subscription / recurring orders** — Twice-a-month consumables,
  predictable revenue.

### C4. Inventory automation (effort L, impact high if multi-vendor)
- Low-stock auto-alerts to vendors when their products dip below a
  threshold (the vendor's threshold, not a global one).
- Supplier integration: live stock feeds from TP-Link / Hikvision
  distributors so the catalog reflects upstream availability.
- Cycle-count workflow for the warehouse.

### C5. Mobile (effort L, impact high)
- The current PWA is solid; a native shell (Capacitor) gives push
  notifications a permanent home in the app store without rewriting
  the UI.
- Alternatively, React Native if you want native nav patterns; bigger
  refactor.

### C6. International expansion (effort L, impact med)
- Currency switcher — currently EGP-only. Add USD / AED / SAR with
  per-currency price overrides on each product.
- Multi-region shipping — currently Egypt-only.
- Local payment methods per region (Mada in KSA, Knet in KW, …).

### C7. Performance — second wave (effort S, impact med)
- Move static product cards to **edge-rendered HTML** (Vercel Edge
  Functions or Next.js if you migrate) — currently SPA-only, so
  initial paint always shows a skeleton.
- **Splittable locale files** — `ar.json` is 200 KB / 56 KB gzipped.
  Per-feature splits would halve that for storefront-only visits.
- **Image art-direction** — different crops on mobile vs desktop;
  Cloudinary supports this with conditional transformations.

### C8. AI assistance (effort M, impact med)
- The repo already has an image-generation toolkit (Magnific + Freepik
  → Cloudinary). Resurrect it for missing category / product photos.
- Product-description generator from spec sheet → richer English copy
  (current descriptions are terse spec-lines).
- Search query rewriting (typo tolerance, synonym expansion) via a
  small LLM call on the suggestions endpoint.

### C9. Vendor experience (effort M, impact med)
- Self-service Stripe Connect (or equivalent) so vendors get paid
  directly without admin intermediation. Complements the manual
  payouts MVP shipped 2026-05-27.
- Vendor messaging — direct customer ↔ vendor chat scoped to an order.
- Vendor analytics with weekly digest emails.

---

## D. "Nice-to-have / experimental" tier

- **Headless commerce API** — open the existing endpoints as a public
  v1 API for third-party integrations (with API keys + rate limits).
- **GraphQL gateway** in front of the REST endpoints for mobile clients
  that want one round-trip.
- **A/B testing infrastructure** — GrowthBook or Vercel Edge Config
  for flag-driven experiments.
- **Live chat with humans** — current `GeneralSupportChat` is local
  state only; integrate with Crisp / Intercom / Tawk for a real
  multi-agent queue.
- **Voice search / accessibility audit** — WCAG 2.2 AA pass; the bones
  are there (aria-labels on FABs and toggles), full audit pending.

---

## E. What I would do next if I were running this

If the goal is **public launch in the next 4 weeks**, the order is:

1. **Week 1** — A1, A2, A3, A5, A6 (unlock payments, shipping, push,
   rotate secret). Smoke-test the full purchase flow end-to-end.
2. **Week 2** — B1, B5, B7 (CSP, idempotency, load test). Run a closed
   beta with friends/colleagues.
3. **Week 3** — B10 (staging env), then content polish (A7, copy,
   merchandising) on staging.
4. **Week 4** — DNS flip + day-one watch (Sentry, Atlas, Lighthouse).

If the goal is **maximum revenue per session post-launch**, the order is:
1. C1 (observability — you can't optimize what you can't measure)
2. C2 (marketing automation — best ROI per dev-day)
3. C3 variants (only if the catalog hits the variant ceiling)
4. C8 AI for missing photos and richer copy.

If the goal is **regional expansion**, jump straight to C6 after the
launch wave settles.
