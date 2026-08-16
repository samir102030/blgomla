import XLSX from "xlsx";

/**
 * Export products as a sheet in exactly the shape the bulk template expects, so
 * a download can be edited and uploaded straight back. Column order and header
 * spelling are the contract between the two — change one and change the other.
 */
export const PRODUCT_EXPORT_HEADERS = [
  "Product Name",
  "Arabic Name",
  "SKU",
  "Description",
  "Arabic Description",
  "Price",
  "Stock",
  "Min Order Qty",
  "Category Name",
  "Brand Name",
  "Sale Percentage",
  "Sale Active",
  "Featured",
  "Tags",
  "Features",
  "Attributes",
  "Installation Offered",
  "Installation Price",
  "Installation Note",
  "Installation Note (Arabic)",
  "Image URL 1",
  "Image URL 2",
  "Image URL 3",
  "Image URL 4",
  "Bulk Pricing",
];

// A pipe would be read back as a separator and split one value into two, so it
// becomes a slash. Colons are safe: the parser splits on the first one only.
const safe = (value) => String(value ?? "").replace(/\|/g, "/").trim();

const nameOf = (ref) => {
  if (!ref) return "";
  return typeof ref === "object" ? ref.name ?? "" : "";
};

export const buildProductExport = (products) => {
  const rows = products.map((p) => {
    const images = (p.images || []).map((i) => i?.url).filter(Boolean);
    return {
      "Product Name": p.name ?? "",
      "Arabic Name": p.nameAr ?? "",
      SKU: p.sku ?? "",
      Description: p.description ?? "",
      "Arabic Description": p.descriptionAr ?? "",
      Price: p.price ?? 0,
      Stock: p.stock ?? 0,
      "Min Order Qty": p.minOrderQty ?? 1,
      "Category Name": nameOf(p.category),
      "Brand Name": nameOf(p.brand),
      "Sale Percentage": p.salePercentage ?? 0,
      "Sale Active": p.saleActive ? "TRUE" : "FALSE",
      Featured: p.featured ? "TRUE" : "FALSE",
      Tags: (p.tags || []).join(", "),
      Features: (p.features || []).map(safe).join(" | "),
      Attributes: (p.attributes || [])
        .filter((a) => a?.name && a?.value)
        .map((a) => `${safe(a.name)}:${safe(a.value)}`)
        .join(" | "),
      "Installation Offered": p.installation?.offered ? "TRUE" : "FALSE",
      "Installation Price": p.installation?.price || "",
      "Installation Note": p.installation?.note || "",
      "Installation Note (Arabic)": p.installation?.noteAr || "",
      "Image URL 1": images[0] ?? "",
      "Image URL 2": images[1] ?? "",
      "Image URL 3": images[2] ?? "",
      "Image URL 4": images[3] ?? "",
      "Bulk Pricing": (p.bulkPricing || [])
        .map((b) => `${b.minQty}:${b.unitPrice}`)
        .join(" | "),
    };
  });

  const sheet = XLSX.utils.json_to_sheet(rows, { header: PRODUCT_EXPORT_HEADERS });
  sheet["!cols"] = PRODUCT_EXPORT_HEADERS.map((h) =>
    h === "Product Name" || h.startsWith("Description") || h === "Arabic Description" || h === "Attributes"
      ? { wch: 50 }
      : { wch: 20 }
  );
  // Freeze the header so a long catalogue stays readable while scrolling.
  sheet["!freeze"] = { xSplit: "0", ySplit: "1" };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Products");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};
