# Code Audit — halafawyStore

Scan results from Phase C (cross-cutting) + Phase B (top 5 pages).
Severity legend: 🔴 crash · 🟠 wrong-data · 🟡 bad-UX · 🟢 polish

---

## Phase C — Cross-cutting findings

### 🟠 1. Unguarded `.toFixed` calls (133 total)
Many spots call `.toFixed()` directly on values that can be `undefined`/`null`. If the value is missing → **page crash**.

**High-risk files** (multi-value math, often nested fields):
- `components/AccountOrders.tsx:141-142` — `(selectedOrder?.itemsPrice + (selectedOrder?.shippingPrice || 0)).toFixed(2)` — if `itemsPrice` is undefined, result is `NaN` (which `.toFixed` survives) BUT line 142 subtracts `selectedOrder?.totalPrice` from it; any undefined → NaN price shown
- `components/AccountOrders.tsx:191-192` — `product.price.toFixed(2)` and `product.salePercentage / 100` — if salePercentage missing, NaN
- `components/OrderDetailsModal.tsx:354,365,421` — `item.price.toFixed`, `item.product.price * item.quantity`, `order.totalPrice.toFixed` — no guards
- `components/EditOrderModal.tsx:144`, `DeleteOrderModal.tsx:123` — `order.totalPrice.toFixed` unguarded

**Fix pattern:** `(value ?? 0).toFixed(2)` everywhere a backend field is touched.

---

### 🟠 2. `<img>` tags without `onError` fallback (10 files)
A 404/blocked image leaves an invisible/broken-icon space:
- `components/vendor/VendorSidebar.tsx`
- `pages/MyAccountPage.tsx`
- `components/AccountProfile.tsx`
- `components/InstallPrompt.tsx`
- `components/AccountOrders.tsx`
- `pages/WishlistPage.tsx`
- `components/ProductFilterSidebar.tsx`
- `pages/admin/QuotationsPage.tsx`
- `components/dashboard/DashboardSidebar.tsx`
- `pages/admin/InventoryAlertsPage.tsx`

**Fix pattern:** Add `onError={(e) => { e.currentTarget.src = "<inline-svg-fallback>"; }}` — or use a wrapper `<ProductImage>` component.

---

### 🟠 3. Unsafe `images[0].url` access (no `?.`)
Will crash if `images` array is empty (some products have empty `images` after our seed):
- `components/AccountOrders.tsx:177` — `product.images[0].url`
- `components/OrderDetailsModal.tsx:311,313` — `item.product.images[0].url/alt`
- `components/SearchBar.tsx:206` — `product.images[0].url`
- `pages/admin/QuotationsPage.tsx:330` — `item.product.images[0].url`

**Fix pattern:** `product.images?.[0]?.url || "/placeholder.png"`.

---

### 🟠 4. API envelope parsing is inconsistent
The backend returns `{success, data}` but different stores assume different shapes:
- `stores/analytics.store.ts:263` reads `data.products` (not `data.data`)
- `stores/product.store.ts:177` has a heuristic `data?.data?._id ? data.data : (data.product || data)` — I added this to fix the detail-page bug
- `stores/vendor.store.ts:149` reads `response.data.data` (different from others that use plain `data.data`)

**Risk:** any future controller that changes the envelope silently breaks one store and not others.

**Fix:** standardize. Either an axios interceptor that unwraps `data` automatically, or document the envelope and audit every store.

---

### 🟡 5. 115 stray `console.*` statements
Should be stripped in production. Trivial to add to build config or replace with a `log()` wrapper.

---

### 🟡 6. 385 `: any` / `as any` usages
TypeScript escape hatches. Each one is a place type-safety could have caught a bug. Not urgent but a long-term smell.

---

### 🟢 7. Hardcoded `localhost` fallbacks
`hooks/useNotificationSocket.ts:12`, `lib/axios.ts:7`, `components/vendor/BulkProductUpload.tsx:74` all default to `http://localhost:5000/api` if env var missing. Fine for dev, but in production this triggers a network error visible in the console. Replace fallback with explicit error.

---

## Phase B — Top 5 page audits

### Page 1: HomePage.tsx
**Status:** Most price logic now uses `getBaseUnitPrice` (we fixed it).
**Findings:**
- 🟢 Multiple sections do their own fetches in separate `useEffect`s (Flash Deals, Newest, All Products) — chatty. Could batch.
- 🟡 `Math.floor(product.rating)` (line ~431) when rating is undefined → `NaN`. Most products have `rating: 0`, so OK in practice.
- 🟢 No memo on `discounted` computation in `.map` — fine at this scale.

### Page 2: ProductDetailPage.tsx
**Status:** Already patched for `.toFixed` + `[object Object]` issues.
**Remaining:**
- 🟡 Reviews block: `product.reviews.find((review) => review.user._id === user._id)` — if a review's `user` was deleted, `review.user` is `null` → crash. Add `review.user?._id`.
- 🟡 `product.attributes.map((a) => …)` — if backend returns null entries (rare), crashes. Filter first.
- 🟢 `useEffect` for review eligibility uses `user?._id` in deps — recomputes too eagerly when user object identity changes. Minor.

### Page 3: ProductsContent.tsx (All Products)
**Status:** Filter logic recently unified via `getBaseUnitPrice`.
**Findings:**
- 🟠 Client-side filtering on a single fetched batch of 1000 products. Works for current catalog (288). If catalog grows >1000, products beyond limit aren't filterable. Eventually move to server-side filters.
- 🟡 `categories` filter uses `getAllSubcategoryIds` (recursive). Looks OK, but if a category has a parent loop in the DB, infinite recursion. Add visited-set.
- 🟢 Sort is recomputed on every render via `[...filteredProducts].sort()`. Should be `useMemo`.

### Page 4: ShoppingCartPage.tsx
**Status:** Cart math uses canonical `getBulkPricing`.
**Findings:**
- 🟠 `item.productDetails` and `item.collectionDetails` accessed without checks in JSX (~lines 644, 678, 741, 838). If a product was deleted server-side after being added to cart, these crash. Already partial guard at `getItemPrice` — but JSX display isn't fully guarded.
- 🟡 No "item unavailable" UI when productDetails is null. User just sees a broken row.
- 🟢 Stock validation only happens client-side; server should re-validate at order creation.

### Page 5: CheckoutPage.tsx
**Status:** Largely OK; reuses cart math.
**Findings:**
- 🟠 `grandTotal = subtotal + shippingFee - discountAmount` — can go **negative** if coupon discount > subtotal. Should clamp to `Math.max(0, …)`.
- 🟠 No re-validation that products are still in stock when placing the order (relies on backend). If backend has a race condition, oversells.
- 🟡 Coupon expiry check via `removeCoupon()` runs inside a render-time computation (`calculateCouponDiscount`). Side-effect during render — React strict-mode anti-pattern. Move to useEffect.
- 🟢 `shippingFee = 0.0` hardcoded. Move to config / per-region.

---

## Priority fix order for demo

If you have ~1 hour before showing the friend:
1. Add `(x ?? 0).toFixed(2)` everywhere in Account/Order modals (5 files).
2. Replace bare `images[0].url` with `images?.[0]?.url || "/placeholder.png"` in the 4 flagged spots.
3. Add `Math.max(0, …)` clamp around `grandTotal` in CheckoutPage.
4. Add `onError` fallback to the 10 `<img>` tags that lack it (or use a small `<SafeImg>` component).

Everything else is acceptable for a demo. The 385 `any`s and 115 `console`s can wait.
