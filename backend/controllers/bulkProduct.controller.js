import Product from '../models/product.model.js';
import Category from '../models/category.model.js';
import Brand from '../models/brand.model.js';
import Store from '../models/store.model.js';
import { generateProductTemplate, parseProductExcel } from '../utils/excelTemplate.js';
import { findOrCreateByName } from '../utils/findOrCreateByName.js';
import { clearStorefrontCaches } from '../utils/storefrontCache.js';

import { buildProductExport } from '../utils/productExport.js';
import { resolveProductStore } from '../utils/houseStore.js';

const isAdminUser = (role) => role === 'admin' || role === 'super_admin';

/**
 * Download the whole catalogue as a sheet in the upload template's own shape,
 * so it can be edited in Excel and uploaded straight back. A vendor gets their
 * own products; an admin gets everything, or one store's with ?storeId=.
 */
export const exportProducts = async (req, res) => {
  try {
    const filter = { deleted: false };

    if (req.user.role === 'store') {
      const store = req.store || (await Store.findOne({ owner: req.user._id }));
      if (!store) {
        return res.status(404).json({ success: false, message: 'Store not found' });
      }
      filter.store = store._id;
    } else if (req.query.storeId) {
      filter.store = req.query.storeId;
    }

    const products = await Product.find(filter)
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const buffer = await buildProductExport(products);
    const stamp = new Date().toISOString().slice(0, 10);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=products-${stamp}.xlsx`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export products',
      error: error.message,
    });
  }
};

/**
 * Download Excel template for bulk product upload
 */
export const downloadTemplate = async (req, res) => {
  try {
    const templateType = req.query.templateType === 'simple' ? 'simple' : 'full';
    console.log('Generating template for user:', req.user?.email, 'type:', templateType);
    const buffer = await generateProductTemplate(templateType);
    console.log('Template generated, buffer size:', buffer.length);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const filename = templateType === 'simple'
      ? 'product-upload-template-simple.xlsx'
      : 'product-upload-template.xlsx';
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
    console.log('Template sent successfully');
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
      error: error.message
    });
  }
};

/**
 * Validate a single product row
 */
const validateProductRow = (product) => {
  const errors = [];

  // Required fields
  if (!product.name || product.name.trim() === '') {
    errors.push('Product name is required');
  }

  // Optional field validations
  if (product.stock && (isNaN(product.stock) || product.stock < 0)) {
    errors.push('Stock must be a non-negative number');
  }

  if (product.salePercentage && (isNaN(product.salePercentage) || product.salePercentage < 0 || product.salePercentage > 100)) {
    errors.push('Sale percentage must be between 0 and 100');
  }

  return errors;
};

/**
 * A missing or unusable price no longer fails the row. Rejecting it meant a
 * sheet of hundreds of products could be turned away over a handful of blank
 * cells, and the seller had no way to get the rest in.
 *
 * Such a row lands at price 0 **and stock 0**. The zero stock is the part that
 * matters: the storefront reads availability off `stock`, never off `price`, so
 * price alone would leave the product on sale for nothing. With no stock it
 * shows as out of stock, which is what a product with no price should be until
 * someone prices it. Both fields are ordinary — edit the product and it sells.
 *
 * Mutates `product` and returns a note for the row, or null when the price was
 * already usable.
 */
const normalizeMissingPrice = (product) => {
  const price = Number(product.price);
  if (Number.isFinite(price) && price > 0) {
    product.price = price;
    return null;
  }

  product.price = 0;
  product.stock = 0;
  return 'No usable price — imported at 0 and marked out of stock. Set a price to put it on sale.';
};

/**
 * Upload and process bulk products from Excel
 */
export const bulkUploadProducts = async (req, res) => {
  try {
    const templateType = req.body.templateType === 'simple' ? 'simple' : 'full';
    const defaultCategoryName = req.body.categoryName?.trim();
    const defaultBrandName = req.body.brandName?.trim();
    const dryRun = req.query.dryRun === 'true' || req.body.dryRun === 'true';

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (templateType === 'simple' && (!defaultCategoryName || !defaultBrandName)) {
      return res.status(400).json({
        success: false,
        message: 'Category and brand are required when using the simple template'
      });
    }

    // Resolve target store (vendor or admin)
    let store = null;
    if (req.user.role === 'store') {
      store = req.store || (await Store.findOne({ owner: req.user._id }));
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found. Please create a store first or select a valid store.'
        });
      }
    } else if (isAdminUser(req.user.role)) {
      const storeId = req.body.storeId;
      if (storeId) {
        store = await Store.findById(storeId);
        if (!store) {
          return res.status(404).json({
            success: false,
            message: 'Store not found. Please create a store first or select a valid store.'
          });
        }
      }
      // If no storeId provided, admin can proceed without store
    }

    // Parse Excel file
    const products = await parseProductExcel(req.file.buffer, templateType);

    /*
      Which product fields this particular sheet is entitled to change.

      A field whose column is absent must be left alone on an update, and the
      parsed rows cannot say which those are — every one of them has a fallback,
      so a missing column and an empty cell look the same by the time they get
      here. The header row is the only place the difference survives, and the
      parser carries it out under `sheetColumns`.

      A sheet from an older export, or one an operator trimmed to the two
      columns they meant to correct, is the normal case rather than the odd one.
    */
    const sheetColumns = new Set(products.sheetColumns || []);
    const COLUMN_FOR = {
      name: ['Product Name'],
      nameAr: ['Arabic Name'],
      sku: ['SKU'],
      description: ['Description'],
      descriptionAr: ['Arabic Description'],
      price: ['Price'],
      stock: ['Stock'],
      minOrderQty: ['Min Order Qty'],
      category: ['Category Name'],
      brand: ['Brand Name'],
      salePercentage: ['Sale Percentage'],
      saleActive: ['Sale Active'],
      featured: ['Featured'],
      tags: ['Tags'],
      features: ['Features'],
      attributes: ['Attributes'],
      installation: ['Installation Offered'],
      bulkPricing: ['Bulk Pricing'],
      images: ['Image URL 1', 'Image URL 2', 'Image URL 3', 'Image URL 4'],
    };
    // A field nobody mapped is one this sheet does not set, so it is not the
    // sheet's to change either. Erring towards leaving data alone.
    const suppliesField = (field) =>
      (COLUMN_FOR[field] || []).some((column) => sheetColumns.has(column));

    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid products found in the Excel file'
      });
    }

    // Validate and process each product
    const results = {
      successful: [],
      // Rows that matched a product already on the shelf. Kept apart from the
      // created ones because "6,141 updated" and "6,141 created" are the
      // difference between a corrected catalogue and a duplicated one.
      updated: [],
      failed: [],
      // Rows that went in without a price. They are successes, listed
      // separately so they are easy to find and price afterwards.
      needsPrice: [],
      totalRows: products.length
    };

    // Get all categories and brands for lookup
    const categories = await Category.find({ deleted: false });
    const brands = await Brand.find({ deleted: false });

    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c._id]));
    const brandMap = new Map(brands.map(b => [b.name.toLowerCase(), b._id]));

    // Brands and categories named in the sheet are matched by name and
    // created when they are new — the same thing adding one by hand does.
    //
    // Previously only the simple template's default category was auto-created;
    // every other unknown name failed its row with `Brand "X" not found`,
    // which meant a sheet introducing a new brand could not be uploaded at all
    // until someone created that brand by hand first. Names created here are
    // ordinary records: they appear on the brands and categories pages, and
    // can be edited, hidden or reordered like any other.
    const createdNames = { categories: [], brands: [] };

    const resolveByName = async (Model, map, rawName, kind) => {
      const key = String(rawName).trim().toLowerCase();
      if (map.has(key)) return map.get(key);

      // A dry run reports what *would* be created without writing anything.
      if (dryRun) return null;

      const result = await findOrCreateByName(Model, rawName, {
        description: `Added automatically from a bulk upload on ${new Date()
          .toISOString()
          .slice(0, 10)}`,
        isActive: true,
        deleted: false,
      });
      if (!result) return null;
      map.set(key, result.doc._id);
      if (result.created) createdNames[kind].push(result.doc.name);
      return result.doc._id;
    };

    const previewProducts = [];

    for (const productData of products) {
      // Force brand/category for simple template when provided
      if (templateType === 'simple') {
        productData.categoryName = defaultCategoryName;
        productData.brandName = defaultBrandName;
      } else {
        // fallback to default category/brand if provided
        if (!productData.categoryName && defaultCategoryName) {
          productData.categoryName = defaultCategoryName;
        }
        if (!productData.brandName && defaultBrandName) {
          productData.brandName = defaultBrandName;
        }
      }

      // Before validation: the stock rule below reads the value this may zero.
      const priceNote = normalizeMissingPrice(productData);

      const errors = validateProductRow(productData);

      if (errors.length > 0) {
        results.failed.push({
          row: productData.rowNumber,
          name: productData.name,
          errors
        });
        continue;
      }

      try {
        /*
          Is this row a product we already have?

          SKU first: it is uniquely indexed, it is what a supplier's sheet is
          keyed on, and a name can be edited without meaning to point at
          something else. Falling back to the name covers the rows that have
          never been given one. Deleted rows are included on purpose — a sheet
          naming a product should revive it rather than fail on the unique
          index of a record nobody can see.
        */
        const nameMatch = {
          name: new RegExp(`^${String(productData.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        };
        const existing = productData.sku
          ? await Product.findOne({ sku: productData.sku })
          : await Product.findOne(nameMatch);

        /*
          A match that belongs to somebody else is not this vendor's to write.

          The lookup above is deliberately catalogue-wide — SKUs are unique
          across the shop and a name collision is worth knowing about — but the
          update branch below then rewrote whatever it found. `store` is in the
          `untouched` set, so the product stayed with its owner and simply took
          the uploader's price, stock, description and images. A vendor whose
          sheet carried a house-store SKU could put the shop's own product on
          sale at one pound, and the summary would say "1 updated".

          Refused per row rather than per file: the rest of the sheet is
          probably fine, and an operator needs to know which line was rejected
          and why.
        */
        if (
          existing &&
          store &&
          existing.store &&
          String(existing.store) !== String(store._id)
        ) {
          results.failed.push({
            row: productData.rowNumber,
            name: productData.name,
            error: productData.sku
              ? `SKU ${productData.sku} already belongs to another store's product.`
              : `A product named "${productData.name}" already belongs to another store.`,
          });
          continue;
        }

        // Prepare product object
        const newProduct = {
          name: productData.name,
          // Blank Arabic fields are omitted rather than written as "", so the
          // model's own defaults apply and the storefront falls back to English.
          ...(productData.nameAr ? { nameAr: productData.nameAr } : {}),
          ...(productData.sku ? { sku: productData.sku } : {}),
          description: productData.description,
          ...(productData.descriptionAr ? { descriptionAr: productData.descriptionAr } : {}),
          ...(productData.installation ? { installation: productData.installation } : {}),
          minOrderQty: productData.minOrderQty || 1,
          price: productData.price,
          stock: productData.stock || 0,
          salePercentage: productData.salePercentage || 0,
          saleActive: productData.saleActive || false,
          featured: productData.featured || false,
          // An administrator importing a sheet has no `store` of their own,
          // and this used to leave the column empty — which is how a whole
          // catalogue arrived that nobody could buy from.
          store: store ? store._id : await resolveProductStore(req.user),
          tags: productData.tags || [],
          features: productData.features || [],
          attributes: productData.attributes || [],
          images: productData.images || [],
          bulkPricing: productData.bulkPricing || [],
          isActive: req.user.role === 'store' ? false : true,
          approvalStatus: req.user.role === 'store' ? 'pending' : 'approved',
          approvedBy: isAdminUser(req.user.role) ? req.user._id : undefined,
          approvedAt: isAdminUser(req.user.role) ? new Date() : undefined,
          createdBy: req.user._id,
          deleted: false
        };

        // Category by name — created if new.
        let willCreateCategory = false;
        if (productData.categoryName) {
          const categoryId = await resolveByName(
            Category,
            categoryMap,
            productData.categoryName,
            'categories'
          );
          if (categoryId) {
            newProduct.category = categoryId;
          } else if (dryRun) {
            // Nothing is written during a preview; say it will be created.
            willCreateCategory = true;
          }
        }

        // Brand by name — created if new.
        let willCreateBrand = false;
        if (productData.brandName) {
          const brandId = await resolveByName(
            Brand,
            brandMap,
            productData.brandName,
            'brands'
          );
          if (brandId) {
            newProduct.brand = brandId;
          } else if (dryRun) {
            willCreateBrand = true;
          }
        }

        if (dryRun) {
          // The preview has to say which of the two it is. A sheet that reads
          // "6,141 valid rows" tells nobody whether they are about to correct
          // the catalogue or double it.
          (existing ? results.updated : results.successful).push({
            row: productData.rowNumber,
            name: productData.name,
            productId: existing ? existing._id : null,
            matchedBy: existing ? (productData.sku ? 'SKU' : 'name') : undefined,
            willCreateCategory,
            willCreateBrand
          });
          previewProducts.push({
            row: productData.rowNumber,
            name: productData.name,
            description: productData.description,
            price: productData.price,
            category: productData.categoryName,
            brand: productData.brandName,
            salePercentage: productData.salePercentage || 0,
            stock: productData.stock || 0,
            willCreateCategory,
            willCreateBrand
          });
        } else if (existing) {
          /*
            A row naming a product that already exists updates it.

            This importer only ever created. The export beside it promises a
            sheet you can download, edit and upload back — and doing exactly
            that against a 6,141-row catalogue would have produced 6,141
            duplicates and no error, because every row looked new to it. The
            first sign would have been every product on the storefront twice.

            Only the fields the sheet carries are written. `isActive`, the
            store, the approval and anything else an operator set by hand are
            not in the sheet and are not touched by it — a re-upload adds an
            Arabic name, it does not undo somebody's decisions.
          */
          const untouched = new Set([
            'store', 'isActive', 'approvalStatus', 'approvedBy', 'approvedAt', 'createdBy', 'deleted',
          ]);
          for (const [key, value] of Object.entries(newProduct)) {
            if (untouched.has(key)) continue;
            if (value === undefined) continue;
            /*
              And nothing the sheet did not carry a column for.

              Every field is built with a fallback — `parseInt(row['Stock']) ||
              0`, `row['Description'] || ''`, an empty images array — so a sheet
              with no Stock column and a sheet whose Stock column is blank
              arrive here identical. That is right for a create and destructive
              for an update: uploading a sheet of names and Arabic names would
              have set stock to 0 on every row it matched, emptied their images,
              blanked their descriptions and cleared their tags, and nothing in
              the preview or the summary would have said a word about it.

              `undefined` cannot carry that difference, so the header row does.
            */
            if (!suppliesField(key)) continue;
            existing[key] = value;
          }
          // A sheet naming a product brings it back rather than leaving a row
          // that says it is here and a record that says it is gone.
          if (existing.deleted) existing.deleted = false;
          await existing.save();

          results.updated.push({
            row: productData.rowNumber,
            name: productData.name,
            productId: existing._id
          });
        } else {
          // Create product
          const createdProduct = await Product.create(newProduct);

          results.successful.push({
            row: productData.rowNumber,
            name: productData.name,
            productId: createdProduct._id
          });
        }

        // Only once the row is actually in — a create that threw is a failure,
        // not something to go back and price.
        if (priceNote) {
          results.needsPrice.push({
            row: productData.rowNumber,
            name: productData.name,
            note: priceNote
          });
        }

      } catch (error) {
        results.failed.push({
          row: productData.rowNumber,
          name: productData.name,
          errors: [error.message]
        });
      }
    }

    // Anything created here has to show up on the storefront straight away —
    // the brands and categories lists and the home feed are all cached.
    if (!dryRun && (createdNames.brands.length || createdNames.categories.length)) {
      clearStorefrontCaches('brands', 'categories');
    }

    const createdNote = [
      createdNames.categories.length
        ? `${createdNames.categories.length} new categor${createdNames.categories.length === 1 ? 'y' : 'ies'}`
        : null,
      createdNames.brands.length
        ? `${createdNames.brands.length} new brand${createdNames.brands.length === 1 ? '' : 's'}`
        : null,
    ]
      .filter(Boolean)
      .join(' and ');

    res.status(200).json({
      success: true,
      dryRun,
      message: dryRun
        ? `Preview generated. ${results.successful.length} to create, ${results.updated.length} to update, ${results.failed.length} issues.` +
          (results.needsPrice.length
            ? ` ${results.needsPrice.length} will import without a price.`
            : '')
        : `Bulk upload completed. ${results.successful.length} products created, ${results.updated.length} updated, ${results.failed.length} failed.` +
          (createdNote ? ` Also added ${createdNote}.` : '') +
          (results.needsPrice.length
            ? ` ${results.needsPrice.length} imported without a price and are out of stock until priced.`
            : ''),
      results,
      // What the upload brought into existence, so it is visible rather than
      // a silent side effect.
      created: createdNames,
      preview: dryRun ? previewProducts : undefined
    });

  } catch (error) {
    console.error('Error in bulk upload:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk upload',
      error: error.message
    });
  }
};

