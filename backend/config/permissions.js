// ─────────────────────────────────────────────────────────────────────────
// PERMISSION REGISTRY — the single source of truth for fine-grained access.
//
// A permission key is `resource.action`. The admin "Roles & Access" UI is
// rendered from this registry, the backend `requirePermission()` middleware
// checks against it, and the seeded system roles below mirror the app's
// current access so nothing changes until an admin customizes a role.
//
// Wildcards understood by the resolver: "*" (everything) and "resource.*".
// ─────────────────────────────────────────────────────────────────────────

export const PERMISSION_GROUPS = [
  {
    resource: "dashboard",
    label: "Dashboard",
    actions: [{ key: "view", label: "Access dashboard" }],
  },
  {
    resource: "products",
    label: "Products",
    actions: [
      { key: "view", label: "View" },
      { key: "create", label: "Create" },
      { key: "edit", label: "Edit" },
      { key: "delete", label: "Delete" },
      { key: "approve", label: "Approve / reject" },
      { key: "feature", label: "Feature" },
      { key: "sale", label: "Manage sales" },
      { key: "stock", label: "Adjust stock" },
      { key: "bulk", label: "Bulk import/export" },
    ],
  },
  {
    resource: "orders",
    label: "Orders",
    actions: [
      { key: "view", label: "View" },
      { key: "create", label: "Place order" },
      { key: "edit", label: "Update status / pay / deliver" },
      { key: "cancel", label: "Cancel" },
      { key: "delete", label: "Delete" },
    ],
  },
  {
    resource: "returns",
    label: "Returns",
    actions: [
      { key: "view", label: "View" },
      { key: "create", label: "Request return" },
      { key: "manage", label: "Update status" },
    ],
  },
  {
    resource: "users",
    label: "Users",
    actions: [
      { key: "view", label: "View" },
      { key: "edit", label: "Edit" },
      { key: "role", label: "Change role" },
      { key: "activate", label: "Activate / deactivate" },
      { key: "delete", label: "Delete / restore" },
      { key: "admin_grant", label: "Grant admin window" },
    ],
  },
  {
    resource: "roles",
    label: "Roles & Access",
    actions: [{ key: "manage", label: "Manage roles & permissions" }],
  },
  {
    resource: "vendors",
    label: "Vendors / Stores",
    actions: [
      { key: "view", label: "View" },
      { key: "approve", label: "Approve / reject / suspend" },
      { key: "manage", label: "Manage stores" },
    ],
  },
  {
    resource: "categories",
    label: "Categories",
    actions: [
      { key: "view", label: "View" },
      { key: "manage", label: "Create / edit / delete" },
    ],
  },
  {
    resource: "brands",
    label: "Brands",
    actions: [
      { key: "view", label: "View" },
      { key: "manage", label: "Create / edit / delete" },
    ],
  },
  {
    resource: "collections",
    label: "Collections",
    actions: [
      { key: "view", label: "View" },
      { key: "manage", label: "Create / edit / delete" },
    ],
  },
  {
    resource: "coupons",
    label: "Coupons",
    actions: [
      { key: "view", label: "View" },
      { key: "create", label: "Create" },
      { key: "edit", label: "Edit" },
      { key: "delete", label: "Delete" },
    ],
  },
  {
    resource: "reviews",
    label: "Reviews",
    actions: [
      { key: "view", label: "View" },
      { key: "create", label: "Write review" },
      { key: "manage", label: "Moderate" },
    ],
  },
  {
    resource: "quotations",
    label: "Quotations",
    actions: [
      { key: "view", label: "View" },
      { key: "manage", label: "Manage" },
    ],
  },
  {
    resource: "advertisements",
    label: "Advertisements",
    actions: [{ key: "manage", label: "Manage" }],
  },
  {
    resource: "mosaic",
    label: "Card Mosaic",
    actions: [{ key: "manage", label: "Manage" }],
  },
  {
    resource: "shipping",
    label: "Shipping",
    actions: [
      { key: "view", label: "View" },
      { key: "manage", label: "Configure" },
    ],
  },
  {
    resource: "analytics",
    label: "Analytics",
    actions: [{ key: "view", label: "View" }],
  },
  {
    resource: "audit",
    label: "Audit Log",
    actions: [{ key: "view", label: "View" }],
  },
  {
    resource: "support",
    label: "Support / Chat",
    actions: [
      { key: "view", label: "View" },
      { key: "manage", label: "Respond / manage" },
    ],
  },
  {
    resource: "siteMode",
    label: "Site Mode",
    actions: [
      { key: "view", label: "View" },
      { key: "manage", label: "Configure" },
    ],
  },
  {
    resource: "account",
    label: "My Account",
    actions: [{ key: "manage", label: "Manage own profile" }],
  },
  {
    resource: "cart",
    label: "Cart & Wishlist",
    actions: [
      { key: "use", label: "Use cart" },
      { key: "wishlist", label: "Use wishlist" },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) =>
  g.actions.map((a) => `${g.resource}.${a.key}`)
);

// Customer-facing abilities — granted to the default customer role.
const CUSTOMER_PERMISSIONS = [
  "account.manage",
  "cart.use",
  "cart.wishlist",
  "orders.create",
  "orders.view",
  "returns.create",
  "reviews.create",
];

// Store / vendor abilities (mirror current adminOrStoreRoute reach).
const STORE_PERMISSIONS = [
  ...CUSTOMER_PERMISSIONS,
  "dashboard.view",
  "products.view",
  "products.create",
  "products.edit",
  "products.delete",
  "products.feature",
  "products.sale",
  "products.stock",
  "products.bulk",
  "orders.view",
  "orders.edit",
  "orders.cancel",
  "returns.view",
  "returns.manage",
  "collections.view",
  "collections.manage",
  "coupons.view",
  "coupons.create",
  "coupons.edit",
  "coupons.delete",
  "brands.view",
  "brands.manage",
  "reviews.view",
  "reviews.manage",
  "analytics.view",
];

// Admin = everything except the two super-admin-only powers.
const ADMIN_EXCLUDE = ["users.admin_grant", "roles.manage"];
const ADMIN_PERMISSIONS = ALL_PERMISSION_KEYS.filter((k) => !ADMIN_EXCLUDE.includes(k));

export const SYSTEM_ROLES = [
  {
    key: "customer",
    name: "Customer",
    description: "Default shopper account.",
    permissions: CUSTOMER_PERMISSIONS,
  },
  {
    key: "store",
    name: "Store / Vendor",
    description: "Vendor managing their own store.",
    permissions: STORE_PERMISSIONS,
  },
  {
    key: "admin",
    name: "Admin",
    description: "Back-office administrator.",
    permissions: ADMIN_PERMISSIONS,
  },
  {
    key: "super_admin",
    name: "Super Admin",
    description: "Full, unrestricted access.",
    permissions: ["*"],
  },
];

export const SYSTEM_ROLE_KEYS = SYSTEM_ROLES.map((r) => r.key);
