# Belgomla — System Architecture

> Last refreshed: 2026-05-27. Production: **belgmla.com** (storefront) ·
> **api.belgmla.com** (backend) · MongoDB Atlas eu-west-3.

## 1. High-level topology

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  Browser (PWA-capable)      │         │  Vercel — blgomla      │
│  ───────────────────────    │         │  -frontend                   │
│  · Vite + React 18 + TS     │         │  ───────────────────────     │
│  · TanStack Query (cache)   │ HTTPS   │  · Static assets             │
│  · Zustand (UI/auth state)  ├────────►│  · Vite-built JS chunks      │
│  · react-i18next  (EN/AR)   │         │  · Service worker (push)     │
│  · Workbox / vite-pwa SW    │         │  · CDN cached at edge        │
└──────────────┬──────────────┘         └──────────────────────────────┘
               │ /api/*
               ▼
┌───────────────────────────────────────────────────────────────────┐
│  Vercel — blgomla  (api.belgmla.com)                │
│  ───────────────────────────────────────────────────────────────  │
│  Express + Node 20 (ESM) on Vercel Functions                      │
│  · controllerWrapper → typed error envelopes                      │
│  · helmet + CORS + rate-limit + audit logs                        │
│  · in-memory LRU cache for hot read-only routes (TTL 30s–1m)      │
│  · Cache-Control headers for CDN edge cache (public GETs)         │
│  · push notifications via web-push (VAPID)                        │
│  · socket.io for real-time (notifications, chat)                  │
└──────┬──────────┬──────────┬──────────┬──────────┬───────────────┘
       │          │          │          │          │
       ▼          ▼          ▼          ▼          ▼
   MongoDB    Cloudinary  Resend    Paymob /    cron-job.org
   Atlas      (images)   (email)   Stripe /     (every N min →
   eu-west-3            (transac)  Tabby /      protected cron
                                   Tamara       endpoints)
                                   (payments)
```

## 2. Repo layout

```
halafawyStore/
├── frontend/                React + Vite app (TS)
│   ├── src/
│   │   ├── pages/           routed pages (lazy except HomePage)
│   │   │   ├── admin/       dashboard pages (RBAC-gated)
│   │   │   └── vendor/      vendor dashboard pages
│   │   ├── components/      shared components + admin/ + vendor/ subdirs
│   │   ├── stores/          Zustand stores (user, cart, product, …)
│   │   ├── lib/             cross-cutting helpers (axios, i18n, sentry,
│   │   │                    cldImage, pricing, theme, queries, etc.)
│   │   ├── locales/         en.json / ar.json (~2.9k keys each)
│   │   ├── routes/          AdminRoutes / VendorRoutes
│   │   └── types/           shared TS types
│   ├── public/              icons, manifest, sitemap.xml
│   └── vite.config.ts       per-package vendor chunk splitting
│
├── backend/                 Express + Mongoose API
│   ├── app.js               app boot + middleware stack + global error
│   │                        handler. DB connection cached on globalThis.
│   ├── config/db.js         serverless-tuned Mongoose connect helper
│   ├── models/              25+ Mongoose models
│   ├── controllers/         business logic (each wrapped in
│   │                        controllerWrapper → typed errors)
│   ├── routes/              Express routers mounted under /api/*
│   ├── middleware/          auth, RBAC, translation, audit, cache, etc.
│   ├── modules/ops/         cron + audit + backlog + analytics submod
│   ├── utils/               email, payment, accurate, bosta, sms,
│   │                        webpush, audit, sentry, wrappers
│   ├── config/permissions.js  RBAC permission registry
│   └── scripts/             one-off backfills, seed/cleanup
│
└── docs/                    you are here
```

## 3. Frontend stack

| Concern           | Tool                                        |
| ----------------- | ------------------------------------------- |
| Bundler / dev srv | Vite 7                                      |
| UI                | React 18 + TypeScript                       |
| Styling           | Tailwind CSS (with CSS variables for theme) |
| Routing           | React Router v6                             |
| Data fetching     | TanStack Query (60s stale, 5min gc)         |
| Client state      | Zustand                                     |
| i18n              | react-i18next (EN + AR, RTL-aware)          |
| Forms             | controlled components + custom validation   |
| Icons             | @heroicons/react (split into vendor-icons)  |
| Maps              | Leaflet (lazy, checkout address picker)     |
| Toast / dialogs   | react-hot-toast                             |
| OAuth             | @react-oauth/google                         |
| Charts / analytics| recharts (admin)                            |
| PWA               | vite-plugin-pwa (custom SW for push)        |
| Monitoring        | Sentry (dynamic import, post-paint)         |

**Bundle splitting** (after the 2026-05-27 optimization):
- Main `index-*.js`: ~118 KB / 31 KB gzipped
- 13 cacheable vendor chunks (react, query, helmet, oauth, sentry, icons,
  i18n, toast, state, network, socket, map, misc)
- Pages lazy-loaded by route; widgets lazy-loaded by importance
- Service worker pre-caches static assets, handles push

## 4. Backend stack

| Concern           | Tool                                        |
| ----------------- | ------------------------------------------- |
| Runtime           | Node 20 LTS (ESM)                           |
| HTTP framework    | Express                                     |
| ORM               | Mongoose (strict, no command buffering)     |
| Auth              | JWT (access 15min + refresh 30d), bcrypt,   |
|                   | optional TOTP 2FA, Google OAuth             |
| Payments          | Paymob (cards + valU), Stripe, Tabby, Tamara|
| Shipping          | Accurate (live), Bosta (live), zone rates   |
|                   | (fallback)                                  |
| Email             | Resend (transactional + cart recovery)      |
| SMS               | Twilio / Vonage (gated, optional)           |
| Push              | web-push (VAPID)                            |
| Real-time         | socket.io (notifications, chat)             |
| File storage      | Cloudinary (uploads via signed presets)     |
| Caching           | in-memory LRU per namespace + CDN headers   |
| Audit             | AuditLog collection (70+ callsites)         |
| Cron              | cron-job.org hits /api/cron/* with secret   |
| Monitoring        | Sentry (gated)                              |

### 4.1 Request lifecycle

```
client → helmet/CORS → rate-limit → ensureDB (cached promise) →
  Cache-Control headers → comingSoonGate (site mode) → trackVisitor →
  route → controller(controllerWrapper) → response
                                       ↘ on error → classifyError →
                                          400/401/403/404/409/500/503
```

### 4.2 Mongoose connection (serverless-tuned)

- Cached on `globalThis.__mongoose` — survives warm Lambda reuse.
- `bufferCommands: false` — fail fast instead of 30s hangs.
- `maxPoolSize: 5`, `minPoolSize: 0`, `maxIdleTimeMS: 30s`.
- `serverSelectionTimeoutMS: 8s` (was 30s).
- On any failure, `cached.promise = null` so the next request retries.

### 4.3 Error classification (utils/wrappers.js)

Throw a plain `Error` (or anything with `.name` / `.code`) in a controller
and it surfaces with the right HTTP status:

| Source                              | Status |
| ----------------------------------- | ------:|
| `err.status` already set            | as-is  |
| `ValidationError` (mongoose)        | 400    |
| `CastError` (mongoose)              | 400    |
| `code === 11000` (duplicate key)    | 409    |
| JWT errors                          | 401    |
| `MongoNetworkError` / buffer timeout| 503    |
| Anything else                       | 500 (+Sentry, prod-masked message) |

## 5. Domain model (core collections)

| Collection      | Purpose                                       |
| --------------- | --------------------------------------------- |
| `users`         | customers + admins + vendors (role-discriminated); cart, loyaltyPoints, referral fields, emailPreferences, push subscriptions, totpSecret |
| `stores`        | vendor records — commission %, KYC docs, payoutDetails |
| `products`      | catalog, bilingual name/description, sale window, bulkPricing, soldCount |
| `categories`    | tree (parent/children); bilingual; image / icon |
| `brands`        | bilingual; logo |
| `orders`        | items, totals, paymentMethod, status timeline, shipment, points earned/redeemed |
| `addresses`     | per-user (Shipping / Billing) |
| `coupons`       | rules + applicable products + isPublic flag |
| `collections`   | curated product bundles with bundlePrice |
| `quotations`    | wholesale quote requests |
| `returns`       | per-order with reason + status |
| `reviews`       | embedded on product (1–5 stars, comment) |
| `questions`     | embedded Q&A on product (official badge for staff) |
| `notifications` | per-user delivery queue |
| `subscribers`   | newsletter signups |
| `auditLogs`     | who / what / when / IP / user-agent |
| `roles`         | custom RBAC roles + permissions[] |
| `storePayouts`  | per-period vendor remittance snapshots |
| `shippingSettings` | singleton — fee, free threshold, zones, delivery days |
| `accurateSettings` | singleton — Accurate carrier config |
| `siteMode`      | singleton — coming-soon gate state |
| `mosaicCards`   | admin-curated homepage tiles |
| `advertisements`| admin-curated promotional creatives |

## 6. Bilingual content (EN/AR)

- Every page is wrapped in `t()` calls; 2,918 unique translation keys.
- Both locale files have full coverage as of 2026-05-27.
- The backend `translateResponse` middleware swaps `nameAr` / `descriptionAr`
  into `name` / `description` on Arabic responses, so the frontend renders
  whichever it gets.
- Frontend additionally gates on `i18n.language === "ar"` for direct cases
  where the response carries both fields.
- RTL is handled via Tailwind's `ltr:` / `rtl:` modifiers and a global
  `html[dir="rtl"]` rule.

## 7. Auth + RBAC

- JWT access (15min) + refresh (30d), HttpOnly cookies, SameSite=Lax.
- Optional TOTP 2FA per user.
- Permissions are stored as `resource.action` strings on each role
  (e.g., `products.create`, `payouts.manage`).
- `requirePermission(...)` middleware after `protectRoute` for fine-grained
  gates; legacy `adminRoute` / `adminOrStoreRoute` for coarse access.
- Built-in roles: `super_admin`, `admin`, `store`, `customer` (+ custom
  roles editable in dashboard).
- Pre-launch hardening (already shipped): order-mutation route auth,
  vendor IDOR closure, RBAC permission registry, audit trail on critical
  events.

## 8. Payments (multi-rail)

| Provider | Status | How |
| -------- | ------ | --- |
| Cash on delivery | live | order.status = pending until delivered |
| Paymob (card)    | needs live key | `PAYMOB_API_KEY` + iframe redirect |
| valU / Souhoola  | needs Paymob installment integration_id | reuses Paymob iframe |
| Stripe           | needs key | international PaymentIntent flow |
| Tabby            | needs key | hosted checkout redirect, HMAC webhook |
| Tamara           | needs key | hosted checkout redirect, static-token webhook |

`utils/payment.js` exposes one `createPayment(method, …)` switch + verify
helpers. Webhooks live under `/api/payments/webhook/{provider}` — each
verifies its provider's signature, marks the order paid, and fires the
order-confirmation email.

## 9. Shipping (multi-rail)

| Carrier  | Status | How |
| -------- | ------ | --- |
| Zone rates (fallback) | live | per-governorate fees in `shippingSettings` |
| Bosta    | gated  | live rates if `BOSTA_*` envs are set |
| Accurate | gated  | live rates + waybill creation if `ACCURATE_USERNAME/PASSWORD` are set + the governorate→zone map is filled out |

Storefront badges (`<DeliveryEstimate />`) read
`shippingSettings.deliveryDaysMin/Max` (with per-zone overrides) and skip
Fri+Sat (Egypt weekend) when computing the date range.

## 10. Cron jobs

External scheduler (`cron-job.org`) calls these every N minutes with
`Authorization: Bearer <CRON_SECRET>`:

| Endpoint | Cadence | Purpose |
| -------- | ------- | ------- |
| `/api/cron/cart-recovery`   | 30 min | abandoned-cart emails (3-stage) |
| `/api/cron/post-purchase`   | daily  | review-request emails (3 days post-delivery) |
| `/api/cron/stock-alerts`    | hourly | back-in-stock + price-drop |
| `/api/cron/sale-scheduler`  | 5 min  | flip products' saleActive based on saleStartsAt/EndsAt |

## 11. Deployment

- **One repo, two Vercel projects** (frontend + backend).
- Every push to `main` triggers both deploys via Vercel's GitHub integration.
- Environment variables managed in Vercel Project Settings (per env).
- No staging environment yet — preview deployments are per-PR.
- DB migrations: hand-written scripts in `backend/scripts/*.js`. Each is
  idempotent and dry-run-able with `--dry-run`.

## 12. Observability

- Sentry SDK (dynamic-imported post-paint) captures unhandled errors with
  controller / path / method / userId context.
- AuditLog collection records sensitive actions (login, role change,
  account self-delete, shipping config change, …).
- `/api/v1/health` returns `200 ok / 503 disconnected` with DB state for
  uptime monitors.

## 13. Performance posture (post-2026-05-27)

- Main JS bundle: 118 KB / 31 KB gzipped (was 400 KB / 119 KB).
- 13 cacheable vendor chunks for incremental deploys.
- Cloudinary `f_auto,q_auto` per image (AVIF/WebP where supported).
- `loading="lazy"` + `decoding="async"` on below-the-fold images.
- Image dimensions specified to prevent CLS.
- Skeleton loaders on PDP, products grid, homepage rails.
- Sticky header + RTL-aware mega-menu + floating CTAs.
