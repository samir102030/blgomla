import { axiosInstance } from "./axios";
import type { UserRole } from "../types/user.type";

export type ExportRows = string[][];

export interface ExportPage {
  id: string;
  label: string;
  path: string;
  roles: UserRole[];
  fetcher: () => Promise<{ filename: string; rows: ExportRows }>;
}

/**
 * A cell whose first character would make a spreadsheet run it.
 *
 * Excel, LibreOffice and Sheets all read a cell beginning with =, +, - or @
 * (and a leading tab or carriage return) as a formula, and quoting does not
 * stop them — CSV quotes are stripped on import, then the contents are
 * parsed. Every text column in these exports is written by somebody else: a
 * vendor names their own products, a customer writes their own review. A
 * product called `=HYPERLINK("https://…"&A1,"Invoice")` becomes a live link
 * in whatever the operator opens the file with, carrying a cell of this
 * export out to whoever wrote the name.
 *
 * A plain number is not risky, and negatives are ordinary here — a discount,
 * a change in sales — so they are left alone rather than turned into text
 * that will not add up.
 */
const NUMERIC = /^[+-]?\d+(\.\d+)?$/;
const neutralise = (text: string) =>
  /^[=+\-@\t\r]/.test(text) && !NUMERIC.test(text) ? `'${text}` : text;

const escapeCell = (value: string) =>
  `"${neutralise(value).replace(/"/g, '""')}"`;

const toCsv = (rows: ExportRows) =>
  rows
    .map((row) => row.map((cell) => escapeCell(String(cell ?? ""))).join(","))
    // CRLF, because Excel treats a bare LF inside a quoted cell as the end of
    // the row on some platforms and a multi-line address then splits in two.
    .join("\r\n");

/**
 * How many rows one request may return.
 *
 * The server caps `limit` at 100 — a ceiling put there so a crafted
 * `?limit=100000` could not pull the whole catalogue through one Lambda. Every
 * fetcher below used to ask for 10,000 and take what came back, which after
 * that cap meant an export of a 13,000-product catalogue was the first
 * hundred products, with nothing on screen or in the file to say so. The
 * answer is to ask for each page in turn rather than to raise the ceiling.
 */
const PAGE_SIZE = 100;
// 50,000 rows. A stop, so a server that reports its page count wrongly cannot
// turn an export into an endless loop of requests.
const MAX_PAGES = 500;

/**
 * Read every page of a paginated endpoint and return the rows from all of them.
 *
 * Stops on the page count the server reports, and again on any page that comes
 * back short — either is enough on its own, and a listing that changes while
 * this runs will trip one of them.
 */
const fetchAllPages = async (
  url: string,
  pick: (body: any) => any[] | undefined,
  params: Record<string, any> = {}
): Promise<any[]> => {
  const all: any[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data } = await axiosInstance.get(url, {
      params: { ...params, page, limit: PAGE_SIZE },
    });
    const batch = pick(data) || [];
    all.push(...batch);
    const pages = Number(data?.pages) || 1;
    if (batch.length < PAGE_SIZE || page >= pages) break;
  }
  return all;
};

export const downloadCsv = (filename: string, rows: ExportRows) => {
  /*
    A byte-order mark, because this shop's catalogue is in Arabic.

    Excel does not read a CSV as UTF-8 unless the file says so, and a CSV has
    nowhere to say it except these three bytes. Without them every Arabic
    product name, category and customer name in the file opens as mojibake —
    the Content-Type on the Blob is not consulted, because by the time Excel
    sees the file it is a file on disk.
  */
  const csvContent = "\uFEFF" + toCsv(rows);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadCombinedCsv = (
  filename: string,
  sections: Array<{ label: string; rows: ExportRows }>
) => {
  const combinedRows: ExportRows = [];
  sections.forEach((section) => {
    combinedRows.push([`## ${section.label}`]);
    combinedRows.push(...section.rows);
    combinedRows.push([]);
  });
  downloadCsv(filename, combinedRows);
};

const fetchOrders = async () => {
  // No page or limit was sent at all, and the server's default page is ten
  // rows — so "export orders" produced the ten most recent, every time.
  const orders = await fetchAllPages("/orders", (d) => d.orders);
  const rows: ExportRows = [
    ["Order ID", "Customer", "Store", "Status", "Total", "Created At"],
  ];
  orders.forEach((order: any) => {
    rows.push([
      order._id,
      order.user?.name || "",
      order.store?.name || "",
      order.status,
      order.totalPrice,
      order.createdAt,
    ]);
  });
  return { filename: "orders.csv", rows };
};

const fetchProducts = async () => {
  /*
    The dashboard listing, because an export is not a shop window.

    `/products` is the public route and no session is attached to it, so it
    answers with the visitor's filter: active, undeleted, approved, and no
    electronics. An export taken from it silently omitted every unpublished
    product, everything awaiting approval, everything soft-deleted, and the
    whole electronics branch — while the file's "Active" and "Deleted"
    columns implied all four were in scope. `/products/manage` carries the
    session, so the answer is the catalogue.
  */
  const products = await fetchAllPages("/products/manage", (d) => d.data);
  const rows: ExportRows = [
    ["Product ID", "Name", "Price", "Stock", "Store", "Active", "Deleted"],
  ];
  products.forEach((product: any) => {
    rows.push([
      product._id,
      product.name,
      product.price,
      product.stock,
      product.store || "",
      product.isActive ? "Yes" : "No",
      product.deleted ? "Yes" : "No",
    ]);
  });
  return { filename: "products.csv", rows };
};

const fetchCoupons = async () => {
  const coupons = await fetchAllPages("/coupons", (d) => d.data);
  const rows: ExportRows = [
    ["Coupon ID", "Code", "Discount Type", "Value", "Active", "Store"],
  ];
  coupons.forEach((coupon: any) => {
    rows.push([
      coupon._id,
      coupon.code,
      coupon.discountType,
      coupon.discountValue,
      coupon.isActive ? "Yes" : "No",
      coupon.store?.name || coupon.store || "",
    ]);
  });
  return { filename: "coupons.csv", rows };
};

const fetchReturns = async () => {
  const { data } = await axiosInstance.get("/returns");
  const rows: ExportRows = [
    ["Return ID", "Order ID", "Customer", "Status", "Reason", "Created At"],
  ];
  (data.returns || []).forEach((item: any) => {
    rows.push([
      item._id,
      item.order?._id || item.order,
      item.user?.name || "",
      item.status,
      item.reason || "",
      item.createdAt,
    ]);
  });
  return { filename: "returns.csv", rows };
};

const fetchCollections = async () => {
  const { data } = await axiosInstance.get("/collections/vendor/my-collections");
  const rows: ExportRows = [
    ["Collection ID", "Name", "Store", "Bundle Price", "Active", "Items"],
  ];
  (data.collections || []).forEach((collection: any) => {
    const items = (collection.items || [])
      .map((item: any) => `${item.product?.name || item.product} x${item.quantity}`)
      .join(" + ");
    rows.push([
      collection._id,
      collection.name,
      collection.store?.name || collection.store || "",
      collection.bundlePrice,
      collection.isActive ? "Yes" : "No",
      items,
    ]);
  });
  return { filename: "collections.csv", rows };
};

const fetchUsers = async () => {
  const users = await fetchAllPages("/users", (d) => d.data);
  const rows: ExportRows = [
    ["User ID", "Name", "Email", "Role", "Active", "Deleted"],
  ];
  users.forEach((user: any) => {
    rows.push([
      user._id,
      user.name || "",
      user.email || "",
      user.role || "",
      user.active ? "Yes" : "No",
      user.deleted ? "Yes" : "No",
    ]);
  });
  return { filename: "users.csv", rows };
};

const fetchVendors = async () => {
  const vendors = await fetchAllPages("/stores/vendors", (d) => d.data);
  const rows: ExportRows = [
    ["Vendor ID", "Store Name", "Owner", "Status", "Email"],
  ];
  vendors.forEach((vendor: any) => {
    rows.push([
      vendor._id,
      vendor.name || "",
      vendor.owner?.name || "",
      vendor.status || "",
      vendor.email || "",
    ]);
  });
  return { filename: "vendors.csv", rows };
};

const fetchCategories = async () => {
  // Not paginated server-side: getAllCategories answers with the whole tree.
  const { data } = await axiosInstance.get("/categories", {
    params: { includeHidden: true },
  });
  const rows: ExportRows = [["Category ID", "Name", "Active", "Deleted"]];
  (data.categories || data.data || []).forEach((cat: any) => {
    rows.push([cat._id, cat.name, cat.isActive ? "Yes" : "No", cat.deleted ? "Yes" : "No"]);
  });
  return { filename: "categories.csv", rows };
};

const fetchBrands = async () => {
  // Not paginated server-side either: getAllBrands answers with all of them.
  const { data } = await axiosInstance.get("/brands");
  const rows: ExportRows = [["Brand ID", "Name", "Active", "Deleted"]];
  (data.brands || data.data || []).forEach((brand: any) => {
    rows.push([brand._id, brand.name, brand.isActive ? "Yes" : "No", brand.deleted ? "Yes" : "No"]);
  });
  return { filename: "brands.csv", rows };
};

const fetchRequests = async () => {
  const [brandRequests, categoryRequests] = await Promise.all([
    fetchAllPages("/brand-requests", (d) => d.data),
    fetchAllPages("/category-requests", (d) => d.data),
  ]);
  const rows: ExportRows = [
    ["Type", "Request ID", "Name", "Status", "Requested By", "Created At"],
  ];
  brandRequests.forEach((req: any) => {
    rows.push([
      "Brand",
      req._id,
      req.name,
      req.status,
      req.requestedBy?.name || "",
      req.createdAt,
    ]);
  });
  categoryRequests.forEach((req: any) => {
    rows.push([
      "Category",
      req._id,
      req.name,
      req.status,
      req.requestedBy?.name || "",
      req.createdAt,
    ]);
  });
  return { filename: "requests.csv", rows };
};

const fetchReviews = async () => {
  const reviews = await fetchAllPages("/reviews", (d) => d.data);
  const rows: ExportRows = [
    ["Review ID", "Product", "User", "Rating", "Comment", "Visible"],
  ];
  reviews.forEach((review: any) => {
    rows.push([
      review._id,
      review.product?.name || "",
      review.user?.name || "",
      review.rating || "",
      review.comment || "",
      review.hidden ? "No" : "Yes",
    ]);
  });
  return { filename: "reviews.csv", rows };
};

const fetchSales = async () => {
  const [overviewRes, trendRes, topRes, revenueRes] = await Promise.all([
    axiosInstance.get("/analytics/sales-overview", { params: { period: "30days" } }),
    axiosInstance.get("/analytics/sales-trend", { params: { period: "daily", dateRange: "30days" } }),
    axiosInstance.get("/analytics/top-products", { params: { limit: 10 } }),
    axiosInstance.get("/analytics/revenue-breakdown", { params: { period: "30days" } }),
  ]);

  const rows: ExportRows = [["Section", "Metric", "Value"]];
  const overview = overviewRes.data.data;
  rows.push(["Sales Overview", "Current", overview?.current ?? 0]);
  rows.push(["Sales Overview", "Previous", overview?.previous ?? 0]);
  rows.push(["Sales Overview", "Change", overview?.change ?? 0]);
  rows.push(["Sales Overview", "Change %", overview?.changePercent ?? 0]);
  rows.push([]);
  rows.push(["Revenue Breakdown", "Product Sales", revenueRes.data.breakdown?.productSales ?? 0]);
  rows.push(["Revenue Breakdown", "Shipping", revenueRes.data.breakdown?.shipping ?? 0]);
  rows.push(["Revenue Breakdown", "Taxes", revenueRes.data.breakdown?.taxes ?? 0]);
  rows.push(["Revenue Breakdown", "Other", revenueRes.data.breakdown?.other ?? 0]);
  rows.push([]);
  rows.push(["Top Products", "Name", "Sales"]);
  (topRes.data.products || []).forEach((p: any) => {
    rows.push(["Top Products", p.name, p.sales ?? 0]);
  });
  rows.push([]);
  rows.push(["Sales Trend", "Date", "Sales"]);
  (trendRes.data.trend || []).forEach((t: any) => {
    rows.push(["Sales Trend", t.date, t.sales ?? 0]);
  });

  return { filename: "sales.csv", rows };
};

const fetchDashboard = async () => {
  const { data } = await axiosInstance.get("/stores/statistics");
  const rows: ExportRows = [["Metric", "Value"]];
  const stats = data.statistics || {};
  const {
    totalRevenue,
    totalOrders,
    totalUsers,
    totalProducts,
    monthlyRevenue,
    salesChange,
    topProducts = [],
    topCountries = [],
    bestSellers = [],
    productOverview = [],
    paidOrders,
    unpaidOrders,
  } = stats;

  rows.push(["totalRevenue", totalRevenue ?? 0]);
  rows.push(["totalOrders", totalOrders ?? 0]);
  rows.push(["totalUsers", totalUsers ?? 0]);
  rows.push(["totalProducts", totalProducts ?? 0]);
  rows.push(["monthlyRevenue", monthlyRevenue ?? 0]);
  rows.push(["salesChange", salesChange ?? "0%"]);
  rows.push(["paidOrders", paidOrders ?? 0]);
  rows.push(["unpaidOrders", unpaidOrders ?? 0]);

  rows.push([]);
  rows.push(["Top Products", "Name", "Sales", "Units"]);
  if (topProducts.length === 0) {
    rows.push(["Top Products", "No data", "", ""]);
  } else {
    topProducts.forEach((product: any) => {
      rows.push([
        "Top Products",
        product.name || "",
        product.sales ?? 0,
        product.units ?? 0,
      ]);
    });
  }

  rows.push([]);
  rows.push(["Top Countries", "Country", "Orders"]);
  if (topCountries.length === 0) {
    rows.push(["Top Countries", "No data", ""]);
  } else {
    topCountries.forEach((item: any) => {
      rows.push([
        "Top Countries",
        item.country || item.name || "",
        item.orders ?? item.count ?? 0,
      ]);
    });
  }

  rows.push([]);
  rows.push(["Best Sellers", "Store", "Revenue", "Orders"]);
  if (bestSellers.length === 0) {
    rows.push(["Best Sellers", "No data", "", ""]);
  } else {
    bestSellers.forEach((seller: any) => {
      rows.push([
        "Best Sellers",
        seller.name || "",
        seller.revenue ?? seller.total ?? 0,
        seller.orders ?? seller.purchases ?? 0,
      ]);
    });
  }

  rows.push([]);
  rows.push(["Product Overview", "Name", "Price", "Quantity", "Status"]);
  if (productOverview.length === 0) {
    rows.push(["Product Overview", "No data", "", "", ""]);
  } else {
    productOverview.forEach((product: any) => {
      rows.push([
        "Product Overview",
        product.name || "",
        product.price ?? 0,
        product.quantity ?? 0,
        product.status || "",
      ]);
    });
  }

  return { filename: "dashboard.csv", rows };
};

const fetchSupport = async () => {
  const rows: ExportRows = [["Message"], ["No export data available"]];
  return { filename: "support.csv", rows };
};

export const getExportPages = (role: UserRole) => {
  const pages: ExportPage[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      path: "/dashboard",
      roles: ["admin", "store"],
      fetcher: fetchDashboard,
    },
    {
      id: "sales",
      label: "Sales",
      path: "/dashboard/sales",
      roles: ["admin", "store"],
      fetcher: fetchSales,
    },
    {
      id: "orders",
      label: "Orders",
      path: "/dashboard/order",
      roles: ["admin", "store"],
      fetcher: fetchOrders,
    },
    {
      id: "products",
      label: "Products",
      path: "/dashboard/products",
      roles: ["admin", "store"],
      fetcher: fetchProducts,
    },
    {
      id: "coupons",
      label: "Coupons",
      path: "/dashboard/coupons",
      roles: ["admin", "store"],
      fetcher: fetchCoupons,
    },
    {
      id: "returns",
      label: "Returns",
      path: "/dashboard/returns",
      roles: ["admin", "store"],
      fetcher: fetchReturns,
    },
    {
      id: "collections",
      label: "Collections",
      path: "/dashboard/collections",
      roles: ["store"],
      fetcher: fetchCollections,
    },
    {
      id: "vendors",
      label: "Vendors",
      path: "/dashboard/vendors",
      roles: ["admin"],
      fetcher: fetchVendors,
    },
    {
      id: "requests",
      label: "Requests",
      path: "/dashboard/requests",
      roles: ["admin"],
      fetcher: fetchRequests,
    },
    {
      id: "users",
      label: "Users",
      path: "/dashboard/user",
      roles: ["admin"],
      fetcher: fetchUsers,
    },
    {
      id: "categories",
      label: "Categories",
      path: "/dashboard/category",
      roles: ["admin"],
      fetcher: fetchCategories,
    },
    {
      id: "brands",
      label: "Brands",
      path: "/dashboard/brands",
      roles: ["admin"],
      fetcher: fetchBrands,
    },
    {
      id: "reviews",
      label: "Reviews",
      path: "/dashboard/reviews",
      roles: ["admin", "store"],
      fetcher: fetchReviews,
    },
    {
      id: "support",
      label: "Support",
      path: "/dashboard/support",
      roles: ["admin"],
      fetcher: fetchSupport,
    },
    {
      id: "attributes",
      label: "Attributes",
      path: "/dashboard/attributes",
      roles: ["admin", "store"],
      fetcher: fetchSupport,
    },
    {
      id: "reports",
      label: "Reports",
      path: "/dashboard/report",
      roles: ["admin"],
      fetcher: fetchSupport,
    },
    {
      id: "gallery",
      label: "Gallery",
      path: "/dashboard/gallery",
      roles: ["admin"],
      fetcher: fetchSupport,
    },
    {
      id: "pages",
      label: "Pages",
      path: "/dashboard/pages",
      roles: ["admin"],
      fetcher: fetchSupport,
    },
    {
      id: "location",
      label: "Location",
      path: "/dashboard/location",
      roles: ["admin"],
      fetcher: fetchSupport,
    },
    {
      id: "components",
      label: "Components",
      path: "/dashboard/components",
      roles: ["admin"],
      fetcher: fetchSupport,
    },
    {
      id: "help",
      label: "Help Center",
      path: "/dashboard/help",
      roles: ["admin"],
      fetcher: fetchSupport,
    },
    {
      id: "faqs",
      label: "FAQs",
      path: "/dashboard/faqs",
      roles: ["admin"],
      fetcher: fetchSupport,
    },
  ];

  const normalizedRole = role === "super_admin" ? "admin" : role;
  return pages.filter((page) => page.roles.includes(normalizedRole));
};
