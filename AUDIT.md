# Code Audit — Belgomla

Severity legend: 🔴 exploitable / crash · 🟠 wrong-data · 🟡 bad-UX · 🟢 polish

Two passes are recorded here. The **security pass** is the newer one and
covers the backend end to end. The **frontend pass** below it is the original
Phase B/C scan, re-verified and updated — most of its findings have since been
fixed, and the entries are marked accordingly.

---

## Security pass — backend

Everything in this section has been **fixed**. Kept as a record of what was
wrong and why, since several of these are easy to reintroduce.

### 🔴 Upload endpoints were unauthenticated
`routes/upload.js` mounted `POST /api/upload/upload` and
`DELETE /api/upload/delete` with no middleware at all. Anyone on the internet
could push 100 MB files into the project's Cloudinary account, or destroy any
asset by `public_id`. Now `protectRoute` and `protectRoute + adminRoute`
respectively.

### 🔴 Payment webhooks accepted forged callbacks
The Paymob, Tabby and Tamara handlers only verified their signature *when the
corresponding secret was set*, and logged a warning otherwise. With the env
var missing — the default state — a POST of
`{"obj":{"success":true,"order":{"merchant_order_id":"…"}}}` marked any order
paid. All three now reject with 503 when unconfigured.

**Operational consequence:** these gateways stop confirming payments until
their secrets are present in the Vercel environment. That is the intended
trade: a webhook that cannot be verified must not be trusted.

### 🔴 Privilege escalation through `updateUser`
`PUT /api/users/:userId` is gated on `users.edit` but accepted `role` in its
allow-list, bypassing the dedicated `users.role` permission and the
"cannot become admin" check in `changeUserRole`. An account with only
`users.edit` could promote itself to `super_admin`. Role changes now re-check
`users.role`, and `admin`/`super_admin` are refused by both endpoints.

### 🔴 Regex injection in email lookup
`signup`, `login` and `googleSignIn` interpolated the raw email into
`new RegExp()`. `.*` matched an arbitrary row; nested quantifiers caused
ReDoS. (`forgotPassword` and `verifyEmail` already escaped — the fix existed,
it just wasn't applied consistently.) All six now share one `emailMatch()`.

### 🔴 CORS trusted every Vercel and Netlify deployment
`https://*.vercel.app` and `https://*.netlify.app` combined with
`credentials: true` let anyone who deployed anything to those platforms make
authenticated cross-origin requests with a logged-in customer's cookies. Now
scoped to this project's own deploys, and the wildcard expands to `[^.]*` so
it can't span a DNS label.

### 🟠 Rate limiting did nothing useful on Vercel
Two problems compounding: no `trust proxy`, so every visitor keyed to the same
proxy IP — 10 failed logins from anyone locked *the whole site* out of
`/users/login`; and the default memory store, so each warm Lambda kept its own
counters and an attacker got a fresh budget per instance. Now `trust proxy: 1`
plus a shared Mongo-backed store (`utils/rateLimitStore.js`) that fails open if
the database is unreachable.

### 🟠 Secrets stored and returned in the clear
Password-reset tokens were persisted in plaintext; the admin user lists
returned bcrypt hashes plus reset and verification tokens; `/users/refresh`
echoed the httpOnly access token into a JSON body. All three closed.

### 🟠 Refresh tokens outlived the account
`refreshToken` minted a new session from a valid refresh cookie without
re-checking the user, so a deleted or deactivated account kept working for the
7-day life of the token. It now revalidates and clears cookies on failure.

### 🟠 `logout` did not reliably clear cookies
`res.clearCookie(name)` only clears a cookie whose attributes match the ones
it was set with. In production the cookies carry `secure` + `sameSite=none`,
which the bare call didn't reproduce. Set and clear now share one
`authCookieOptions()`.

### 🟠 Timing-unsafe secret comparisons
The Tamara webhook token and the email verification code used `===`, which
short-circuits at the first differing byte. Both compare in constant time now.

### 🔴 Vendor signup crashed on every attempt
`const store` was declared inside `if (role === "store") { … }` and read from
the response body outside that block — a `ReferenceError` on the success path,
so every vendor registration returned 500 *after* creating the user and store.
The store is also created after the user now, so a failed user save no longer
orphans one.

### 🔴 `createOrder` crashed on a successful order
The post-response confirmation email ran inside the main `try`. If it threw,
the catch tried to abort an already-committed transaction and then write a 500
onto a response whose headers were already sent. Contained in its own `try`.

### 🔴 2FA locked users out
`googleSignIn` answered `TOTP_REQUIRED` but accepted no `totpCode`, so anyone
enrolled in 2FA could never sign in with Google. Separately, the frontend axios
interceptor treated *any* 401 as an expired session — including the
`TOTP_REQUIRED` handshake — and logged the user out mid-login. Both fixed.

### 🟠 Password login on a Google-only account returned 500
`bcrypt.compare` throws on an undefined hash. Now a clean 400 pointing at the
Google button.

### 🟠 Mongo connection listeners leaked
`connectDB` registered its `connected`/`error`/`disconnected` listeners inside
the `if (!cached.promise)` branch, believing it ran once. The failure path
resets `cached.promise`, so every failed attempt bound three more listeners —
`MaxListenersExceededWarning` during any outage. Now guarded by a
process-level flag.

### 🟠 Three of four cron jobs were never scheduled
`vercel.json` only listed `post-purchase`. Abandoned-cart recovery, the sale
scheduler and stock alerts existed, were reachable, and never ran. All four
are scheduled now.

> **Plan note:** four cron entries requires Vercel Pro. The Hobby plan caps at
> two, and daily-only schedules.

### 🟢 Dependency hygiene
`crypto@^1.0.1` removed — an abandoned npm placeholder that shadows the Node
builtin.

---

## Security pass — known gaps, not fixed

- **`xlsx@0.18.5`** carries published advisories (prototype pollution, ReDoS)
  and the fix is not distributed through npm — it requires switching to the
  SheetJS CDN build. Exposure is limited: the only parser entry point is
  `/api/bulk-products/upload`, which requires the `products.bulk` permission
  and caps uploads at 10 MB. Worth scheduling, not an open door.
- **No Content-Security-Policy on the storefront.** `helmet`'s CSP is disabled,
  though that would only have covered API responses anyway — the SPA is served
  by Vercel, so its CSP belongs in `frontend/vercel.json`. A real policy needs
  `script-src 'unsafe-inline'` for the inline `onload` in `index.html`, plus
  verified allowances for the Paymob checkout iframe, Google Sign-In, GA and
  Sentry. That needs a browser pass against the live site. `frame-ancestors`,
  `nosniff`, `X-Frame-Options` and HSTS are set in the meantime.
- **Rate limiting is IP-keyed only.** No per-account attempt ceiling, so a
  distributed attacker still gets 10 tries per IP against a single account.

---

## Frontend pass

### ✅ Fixed since the original scan

- **Unguarded `.toFixed`** — was 133 call sites; 46 remain and the ones on
  backend-supplied fields are guarded with `?? 0`. The last four unguarded
  ones (`VendorCollectionsPage`) are fixed, along with an `item.product.name`
  that crashed when a bundle referenced a deleted product.
- **`images[0].url` without optional chaining** — all four flagged sites now
  use `images?.[0]?.url`.
- **Negative `grandTotal`** — `CheckoutPage` clamps with `Math.max(0, …)`.
- **`<img>` without `onError`** — the ten flagged files now handle it, and
  roughly seventy other `<img>` tags across the app did not. Rather than
  patch every call site, `lib/imageFallback.ts` installs one capture-phase
  listener at the window that swaps in an inline-SVG placeholder for any image
  that fails, present or future. Files with their own handler still win —
  capture runs first, their handler runs after.
- **`/dashboard/*` and `/vendor/*` were unguarded routes** — anyone could open
  the back-office shell. The API refused the data, so nothing leaked, but a
  signed-out visitor got the full admin chrome. Now behind
  `RequireDashboardAccess`.

### 🟠 Still open

**API envelope parsing is inconsistent.** The backend returns `{success, data}`
but the stores disagree about the shape — 21 different `data.data` /
`response.data.data` reads across `stores/`, plus a heuristic in
`product.store.ts`. Any controller that changes its envelope silently breaks
one store and not the others. Wants an axios response interceptor that unwraps
once.

**Client-side filtering over a 1000-product fetch** (`ProductsContent.tsx`).
Fine at the current catalogue size; products past the limit become invisible to
filters as it grows. Needs server-side filtering eventually.

**Category recursion has no visited-set** (`getAllSubcategoryIds`). A parent
loop in the data would hang the tab.

**Cart rows don't handle a deleted product.** `ShoppingCartPage` guards the
price math but not the JSX, and there's no "item unavailable" state.

**Coupon expiry calls `removeCoupon()` during render** in `CheckoutPage` —
a side effect in a render path, which React strict mode will double-invoke.

**Stock is validated client-side only** at checkout; the server re-checks
inside the order transaction, which is what actually protects against
overselling, but the UI can promise something it can't deliver.

### 🟢 Polish

- 109 stray `console.*` calls in `src/`. Strip via build config or a `log()`
  wrapper.
- 430 `: any` / `as any` escape hatches.
- Three files still fall back to `http://localhost:5000` when their env var is
  missing (`lib/axios.ts`, `hooks/useNotificationSocket.ts`,
  `components/vendor/BulkProductUpload.tsx`). Harmless in dev, a confusing
  console error in production. Prefer failing loudly.
- `HomePage` fires several independent `useEffect` fetches that could be one
  batched request.
