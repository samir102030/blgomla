import Quotation from "../models/quotation.model.js";
import Collection from "../models/collection.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { paginateQuery } from "../utils/pagination.js";

// Create a quotation request (public — no auth required)
export const createQuotation = controllerWrapper(
  "createQuotation",
  async (req, res) => {
    const { collectionId, customer, items, collectionQuantity, customerNotes } =
      req.body;

    if (!customer?.name || !customer?.email || !customer?.phone) {
      return res
        .status(400)
        .json({ success: false, message: "Name, email, and phone are required" });
    }

    let quotationItems = items || [];
    let estimatedTotal = 0;

    // If quotation is for a collection, pull its items
    if (collectionId) {
      const bundleCol = await Collection.findById(collectionId).populate(
        "items.product"
      );
      if (!bundleCol) {
        return res
          .status(404)
          .json({ success: false, message: "Collection not found" });
      }

      quotationItems = bundleCol.items.map((item) => ({
        product: item.product._id,
        quantity: item.quantity * (collectionQuantity || 1),
        unitPrice: item.product.price,
      }));

      estimatedTotal = bundleCol.bundlePrice * (collectionQuantity || 1);
    } else if (quotationItems.length > 0) {
      // Custom items — calculate estimated total
      estimatedTotal = quotationItems.reduce(
        (sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 1),
        0
      );
    }

    const quotation = new Quotation({
      bundleCollection: collectionId || undefined,
      customer,
      items: quotationItems,
      collectionQuantity: collectionQuantity || 1,
      estimatedTotal,
      customerNotes,
      user: req.user?._id || undefined,
      status: "pending",
    });

    await quotation.save();

    res.status(201).json({ success: true, quotation });
  }
);

// List all quotations (admin)
export const listQuotations = controllerWrapper(
  "listQuotations",
  async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status && status !== "all") query.status = status;

    const mongooseQuery = Quotation.find(query)
      .populate("bundleCollection", "name bundlePrice")
      .populate("items.product", "name price images")
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get single quotation
export const getQuotation = controllerWrapper(
  "getQuotation",
  async (req, res) => {
    const { quotationId } = req.params;
    const quotation = await Quotation.findById(quotationId)
      .populate("bundleCollection")
      .populate("items.product")
      .populate("user", "name email");

    if (!quotation) {
      return res
        .status(404)
        .json({ success: false, message: "Quotation not found" });
    }

    res.status(200).json({ success: true, quotation });
  }
);

// Update quotation status (admin)
export const updateQuotationStatus = controllerWrapper(
  "updateQuotationStatus",
  async (req, res) => {
    const { quotationId } = req.params;
    const { status, adminNotes, finalTotal, validUntil } = req.body;

    const quotation = await Quotation.findById(quotationId);
    if (!quotation) {
      return res
        .status(404)
        .json({ success: false, message: "Quotation not found" });
    }

    if (status) quotation.status = status;
    if (adminNotes !== undefined) quotation.adminNotes = adminNotes;
    if (finalTotal !== undefined) quotation.finalTotal = finalTotal;
    if (validUntil) quotation.validUntil = new Date(validUntil);

    await quotation.save();

    res.status(200).json({ success: true, quotation });
  }
);

// Delete quotation (admin)
export const deleteQuotation = controllerWrapper(
  "deleteQuotation",
  async (req, res) => {
    const { quotationId } = req.params;
    const quotation = await Quotation.findByIdAndDelete(quotationId);
    if (!quotation) {
      return res
        .status(404)
        .json({ success: false, message: "Quotation not found" });
    }
    res.status(200).json({ success: true, message: "Quotation deleted" });
  }
);

// Get quotation stats (admin dashboard)
export const getQuotationStats = controllerWrapper(
  "getQuotationStats",
  async (req, res) => {
    const stats = await Quotation.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalValue: { $sum: "$estimatedTotal" },
        },
      },
    ]);

    const total = await Quotation.countDocuments();
    const recent = await Quotation.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("bundleCollection", "name")
      .populate("user", "name email");

    res.status(200).json({
      success: true,
      stats,
      total,
      recent,
    });
  }
);

// Generate PDF for a quotation
export const generateQuotationPDF = controllerWrapper(
  "generateQuotationPDF",
  async (req, res) => {
    const { quotationId } = req.params;
    const quotation = await Quotation.findById(quotationId)
      .populate("bundleCollection", "name")
      .populate("items.product", "name price sku");

    if (!quotation) {
      return res.status(404).json({ success: false, message: "Quotation not found" });
    }

    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=quotation-${quotation._id}.pdf`
    );
    doc.pipe(res);

    // ── Header ──
    doc.fontSize(24).font("Helvetica-Bold").text("BELGOMLA", { align: "center" });
    doc.fontSize(10).font("Helvetica").text("E-commerce Platform", { align: "center" });
    doc.moveDown();
    doc.fontSize(16).font("Helvetica-Bold").text("QUOTATION", { align: "center" });
    doc.moveDown();

    // ── Quotation Info ──
    doc.fontSize(10).font("Helvetica");
    doc.text(`Quotation #: ${quotation._id}`);
    doc.text(`Date: ${new Date(quotation.createdAt).toLocaleDateString("en-GB")}`);
    doc.text(`Status: ${quotation.status.toUpperCase()}`);
    if (quotation.validUntil) {
      doc.text(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString("en-GB")}`);
    }
    doc.moveDown();

    // ── Customer Info ──
    doc.font("Helvetica-Bold").text("Customer Information:");
    doc.font("Helvetica");
    doc.text(`Name: ${quotation.customer?.name || "N/A"}`);
    doc.text(`Email: ${quotation.customer?.email || "N/A"}`);
    doc.text(`Phone: ${quotation.customer?.phone || "N/A"}`);
    if (quotation.customer?.company) doc.text(`Company: ${quotation.customer.company}`);
    doc.moveDown();

    // ── Items Table ──
    if (quotation.items && quotation.items.length > 0) {
      doc.font("Helvetica-Bold").text("Items:");
      doc.moveDown(0.5);

      // Table header
      const tableTop = doc.y;
      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("#", 50, tableTop, { width: 30 });
      doc.text("Product", 80, tableTop, { width: 220 });
      doc.text("Qty", 300, tableTop, { width: 50 });
      doc.text("Unit Price", 350, tableTop, { width: 80 });
      doc.text("Total", 430, tableTop, { width: 80 });
      doc.moveTo(50, tableTop + 15).lineTo(530, tableTop + 15).stroke();

      let y = tableTop + 20;
      doc.font("Helvetica").fontSize(9);
      quotation.items.forEach((item, idx) => {
        const name = item.product?.name || "Unknown Product";
        const qty = item.quantity || 1;
        const price = item.unitPrice || item.product?.price || 0;
        const total = qty * price;

        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        doc.text(String(idx + 1), 50, y, { width: 30 });
        doc.text(name, 80, y, { width: 220 });
        doc.text(String(qty), 300, y, { width: 50 });
        doc.text(`${price.toFixed(2)} EGP`, 350, y, { width: 80 });
        doc.text(`${total.toFixed(2)} EGP`, 430, y, { width: 80 });
        y += 18;
      });

      doc.moveTo(50, y).lineTo(530, y).stroke();
      y += 10;

      // Totals
      doc.font("Helvetica-Bold").fontSize(11);
      doc.text(
        `Estimated Total: ${(quotation.estimatedTotal || 0).toFixed(2)} EGP`,
        350, y, { width: 180, align: "right" }
      );
      if (quotation.finalTotal) {
        y += 18;
        doc.text(
          `Final Total: ${quotation.finalTotal.toFixed(2)} EGP`,
          350, y, { width: 180, align: "right" }
        );
      }
    }

    // ── Notes ──
    doc.moveDown(2);
    if (quotation.customerNotes) {
      doc.font("Helvetica-Bold").fontSize(10).text("Customer Notes:");
      doc.font("Helvetica").text(quotation.customerNotes);
    }
    if (quotation.adminNotes) {
      doc.moveDown();
      doc.font("Helvetica-Bold").fontSize(10).text("Admin Notes:");
      doc.font("Helvetica").text(quotation.adminNotes);
    }

    // ── Footer ──
    doc.moveDown(2);
    doc.fontSize(8).font("Helvetica").fillColor("gray");
    doc.text("This quotation is generated automatically by Belgomla.", {
      align: "center",
    });
    doc.text("Prices are subject to change. Contact us for confirmation.", {
      align: "center",
    });

    doc.end();
  }
);
