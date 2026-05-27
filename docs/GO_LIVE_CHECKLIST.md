# Go-Live Readiness Checklist

> A pragmatic gate list. Bold items are **blockers** (the site
> shouldn't take real traffic until they're done). The rest are
> strongly recommended.

## 1. Secrets & credentials (Vercel env)

### Backend project

| Var | Status | Notes |
| --- | --- | --- |
| `MONGO_URI`              | ✅ set | Atlas connection string |
| `JWT_SECRET`             | ✅ set | also used to sign unsubscribe tokens |
| `CLIENT_URL`             | ✅ set | `https://belgmla.com` — used in email links |
| `API_URL`                | ⚠️ verify | needed by Tamara webhook URL builder; `https://api.belgmla.com` |
| `CRON_SECRET`            | ✅ set | matches cron-job.org Authorization |
| **`RESEND_API_KEY`**     | ⚠️ verify | required for all transactional + cart recovery email |
| `FROM_EMAIL`             | ✅ set | `Belgomla <noreply@belgmla.com>` |
| `SUPPORT_EMAIL`          | ✅ set | shown as Reply-To |
| **`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`** | ⚠️ verify | needed for push notifications. Generate with `npx web-push generate-vapid-keys`. |
| **`PAYMOB_API_KEY` / `PAYMOB_INTEGRATION_ID` / `PAYMOB_IFRAME_ID` / `PAYMOB_HMAC_SECRET`** | ❌ verify live keys | sandbox values must be swapped for production |
| `PAYMOB_INSTALLMENT_INTEGRATION_ID` / `PAYMOB_INSTALLMENT_IFRAME_ID` | ❌ pending | for valU / Souhoola |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | ❌ optional | only if accepting international |
| `TABBY_SECRET_KEY` / `TABBY_MERCHANT_CODE` / `TABBY_WEBHOOK_SECRET` | ❌ pending | sign up at merchant.tabby.ai |
| `TAMARA_API_TOKEN` / `TAMARA_NOTIFICATION_TOKEN` | ❌ pending | sign up at partners.tamara.co |
| **`ACCURATE_USERNAME` / `ACCURATE_PASSWORD`** | ❌ pending | live shipping carrier creds |
| `BOSTA_API_KEY`          | ❌ optional | falls back to zone rates without |
| `TWILIO_*` / `VONAGE_*`  | ❌ optional | SMS notifications |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | ✅ set | image uploads |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅ set | OAuth |
| `SENTRY_DSN`             | ⚠️ verify | server-side error capture |
| `NODE_ENV`               | ✅ `production` | prod-masks 500 messages |

### Frontend project

| Var | Status | Notes |
| --- | --- | --- |
| `VITE_API_URL`           | ✅ `https://api.belgmla.com/api/` | trailing slash matters |
| `VITE_GOOGLE_CLIENT_ID`  | ✅ set | Google OAuth |
| `VITE_SENTRY_DSN`        | ⚠️ verify | client-side error capture, dynamic-imported |
| `VITE_CLOUDINARY_CLOUD_NAME` | ✅ set | for `cldImg()` |

## 2. External webhook configuration

Webhooks must be pasted into each provider's dashboard:

| Provider | URL | Auth |
| --- | --- | --- |
| Paymob   | `https://api.belgmla.com/api/payments/webhook/paymob` | HMAC via `PAYMOB_HMAC_SECRET` |
| Stripe   | `https://api.belgmla.com/api/payments/webhook/stripe` | signing secret `STRIPE_WEBHOOK_SECRET` |
| Tabby    | `https://api.belgmla.com/api/payments/webhook/tabby`  | HMAC via `TABBY_WEBHOOK_SECRET` |
| Tamara   | `https://api.belgmla.com/api/payments/webhook/tamara` | static `TAMARA_NOTIFICATION_TOKEN` |

## 3. Cron jobs (cron-job.org)

Each entry should send `Authorization: Bearer <CRON_SECRET>`:

| URL | Cadence |
| --- | --- |
| `https://api.belgmla.com/api/cron/cart-recovery` | every 30 min |
| `https://api.belgmla.com/api/cron/post-purchase` | once daily |
| `https://api.belgmla.com/api/cron/stock-alerts`  | hourly |
| `https://api.belgmla.com/api/cron/sale-scheduler`| every 5 min |
| `https://api.belgmla.com/api/_ping`              | every 5 min (warm-keep) |

## 4. Content (admin work)

- [ ] Verify all categories have **both** `name` (EN) and `nameAr` filled
  (50/50 done per last audit).
- [ ] Verify all 291 products have `descriptionAr` (✅ already backfilled).
- [ ] Upload missing category photos (~33 of 50 still have no image).
- [ ] Confirm WELCOME10 coupon exists and is `isPublic: true` —
  the exit-intent popup hardcodes that code.
- [ ] Mark today's hero / banner / popup advertisements as active.
- [ ] Create or unhide any mosaic cards on the homepage.
- [ ] Confirm shipping zones cover every governorate you ship to
  (others fall back to `defaultFee`).
- [ ] Set `deliveryDaysMin` / `deliveryDaysMax` on `shippingSettings`
  (defaults 2 / 5 business days).

## 5. Security hardening (pre-launch)

| Check | Status |
| --- | --- |
| Atlas IP allowlist | ⚠️ verify — currently `0.0.0.0/0` for Vercel; OK but tighten if you can route through static IPs |
| **Rotate any credential pasted in chat / commits** | ⚠️ deferred — testing phase per session memory; **do before public launch** |
| All admin routes behind `protectRoute` + RBAC | ✅ |
| Order-mutation routes auth | ✅ (commit 466f7f2) |
| Vendor IDOR closed | ✅ (commit 8fa225c) |
| Helmet + CORS allowlist | ✅ |
| Rate limit on auth endpoints (`authLimiter`) | ✅ |
| Global rate limit | ✅ 1000/15min/IP |
| Password hashing (bcrypt 10 rounds) | ✅ |
| HttpOnly + SameSite=Lax cookies | ✅ |
| `NODE_ENV=production` (prod-masks 500 messages) | ⚠️ verify |
| CSP headers | ❌ helmet's CSP is disabled — consider adding a strict one |
| Audit log retention policy | ❌ define (90/180 days?) and add cleanup cron |

## 6. Operational sign-off

- [ ] Sentry confirmed receiving events (frontend + backend) — trigger
  a test error each side.
- [ ] `/api/v1/health` returns 200 in production.
- [ ] cron-job.org dashboard shows all 4 cron URLs succeeding.
- [ ] DNS for `belgmla.com` + `api.belgmla.com` propagated; TLS valid.
- [ ] Vercel build is on the right branch (`main`).
- [ ] Daily Atlas backups confirmed enabled.
- [ ] One-week traffic test on preview deploy with realistic data
  volume (see Roadmap → Load testing).
- [ ] Customer-support email inbox monitored (`support@belgmla.com`).
- [ ] Privacy Policy + Terms updated and reviewed by legal.
- [ ] Cookie banner / consent (Egypt has no mandatory consent law yet
  but PCI / GDPR-style consent for marketing emails is good practice).

## 7. Smoke-test path

A 5-minute manual pass before flipping the public DNS:

1. Open `belgmla.com` in private window → page renders, all images load.
2. Switch to Arabic → header, categories, newsletter, footer all render
   in Arabic; RTL flips correctly.
3. Search "router" → suggestions dropdown shows products, brands,
   categories. Hit Enter → /products page filters.
4. Open a product → image gallery + sticky add-to-cart appear; delivery
   badge shows a date range.
5. Add to cart → mini-cart updates; checkout → fill address.
6. Try every payment method that has live keys (COD first to confirm
   the path, then card, then BNPL).
7. Webhook delivers → order shows `paid`, confirmation email arrives,
   shipping label / shipment record created.
8. Log into admin → see the order, mark shipped / delivered, verify
   audit log entry.
9. As a customer, scroll to delivered orders → 3 days later (or
   manually trigger the cron), receive review-request email.
10. Sign up to newsletter → confirmation; click unsubscribe link →
    confirmation page renders in the right language.

## 8. Day-one watch

For the first 48 hours:
- Sentry error rate (target: <0.1% of sessions).
- Atlas connection count vs cluster cap (watch the M0/M10/M20 ceiling).
- Cart abandonment recovery emails: are stage-1/2/3 firing as expected?
- Payment failure rate by gateway.
- Lighthouse on the homepage + a PDP (target: LCP < 2.5s mobile).

If anything spikes, the rollback is a Vercel one-click "Promote to
Production" on the prior deployment.
