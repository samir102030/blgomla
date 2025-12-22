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

const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

const toCsv = (rows: ExportRows) =>
  rows.map((row) => row.map((cell) => escapeCell(String(cell))).join(",")).join("\n");

export const downloadCsv = (filename: string, rows: ExportRows) => {
  const csvContent = toCsv(rows);
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
  const { data } = await axiosInstance.get("/orders");
  const rows: ExportRows = [
    ["Order ID", "Customer", "Store", "Status", "Total", "Created At"],
  ];
  (data.orders || []).forEach((order: any) => {
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
  const { data } = await axiosInstance.get("/products", {
    params: { page: 1, limit: 10000 },
  });
  const rows: ExportRows = [
    ["Product ID", "Name", "Price", "Stock", "Store", "Active", "Deleted"],
  ];
  (data.data || []).forEach((product: any) => {
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
  const { data } = await axiosInstance.get("/coupons", {
    params: { page: 1, limit: 10000 },
  });
  const rows: ExportRows = [
    ["Coupon ID", "Code", "Discount Type", "Value", "Active", "Store"],
  ];
  (data.data || []).forEach((coupon: any) => {
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
  const { data } = await axiosInstance.get("/users", {
    params: { page: 1, limit: 10000 },
  });
  const rows: ExportRows = [
    ["User ID", "Name", "Email", "Role", "Active", "Deleted"],
  ];
  (data.data || []).forEach((user: any) => {
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
  const { data } = await axiosInstance.get("/stores/vendors", {
    params: { page: 1, limit: 10000 },
  });
  const rows: ExportRows = [
    ["Vendor ID", "Store Name", "Owner", "Status", "Email"],
  ];
  (data.data || []).forEach((vendor: any) => {
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
  const { data } = await axiosInstance.get("/categories", {
    params: { page: 1, limit: 10000 },
  });
  const rows: ExportRows = [["Category ID", "Name", "Active", "Deleted"]];
  (data.categories || data.data || []).forEach((cat: any) => {
    rows.push([cat._id, cat.name, cat.isActive ? "Yes" : "No", cat.deleted ? "Yes" : "No"]);
  });
  return { filename: "categories.csv", rows };
};

const fetchBrands = async () => {
  const { data } = await axiosInstance.get("/brands", {
    params: { page: 1, limit: 10000 },
  });
  const rows: ExportRows = [["Brand ID", "Name", "Active", "Deleted"]];
  (data.brands || data.data || []).forEach((brand: any) => {
    rows.push([brand._id, brand.name, brand.isActive ? "Yes" : "No", brand.deleted ? "Yes" : "No"]);
  });
  return { filename: "brands.csv", rows };
};

const fetchRequests = async () => {
  const [brandRes, categoryRes] = await Promise.all([
    axiosInstance.get("/brand-requests", { params: { page: 1, limit: 10000 } }),
    axiosInstance.get("/category-requests", { params: { page: 1, limit: 10000 } }),
  ]);
  const rows: ExportRows = [
    ["Type", "Request ID", "Name", "Status", "Requested By", "Created At"],
  ];
  (brandRes.data.data || []).forEach((req: any) => {
    rows.push([
      "Brand",
      req._id,
      req.name,
      req.status,
      req.requestedBy?.name || "",
      req.createdAt,
    ]);
  });
  (categoryRes.data.data || []).forEach((req: any) => {
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
  const { data } = await axiosInstance.get("/reviews", {
    params: { page: 1, limit: 10000 },
  });
  const rows: ExportRows = [
    ["Review ID", "Product", "User", "Rating", "Comment", "Visible"],
  ];
  (data.data || []).forEach((review: any) => {
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
  Object.entries(stats).forEach(([key, value]) => {
    rows.push([key, String(value ?? "")]);
  });
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

  return pages.filter((page) => page.roles.includes(role));
};
