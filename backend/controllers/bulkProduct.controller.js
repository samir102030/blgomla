import Product from '../models/product.model.js';
import Category from '../models/category.model.js';
import Brand from '../models/brand.model.js';
import Store from '../models/store.model.js';
import { generateProductTemplate, parseProductExcel } from '../utils/excelTemplate.js';
import { findOrCreateByName } from '../utils/findOrCreateByName.js';
import { clearStorefrontCaches } from '../utils/storefrontCache.js';

const isAdminUser = (role) => role === 'admin' || role === 'super_admin';

/**
 * Download Excel template for bulk product upload
 */
export const downloadTemplate = async (req, res) => {
  try {
    const templateType = req.query.templateType === 'simple' ? 'simple' : 'full';
    console.log('Generating template for user:', req.user?.email, 'type:', templateType);
    const buffer = generateProductTemplate(templateType);
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

  if (!product.price || isNaN(product.price) || product.price <= 0) {
    errors.push('Valid price is required (must be positive)');
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
    const products = parseProductExcel(req.file.buffer, templateType);

    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid products found in the Excel file'
      });
    }

    // Validate and process each product
    const results = {
      successful: [],
      failed: [],
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
        // Prepare product object
        const newProduct = {
          name: productData.name,
          description: productData.description,
          price: productData.price,
          stock: productData.stock || 0,
          salePercentage: productData.salePercentage || 0,
          saleActive: productData.saleActive || false,
          featured: productData.featured || false,
          ...(store ? { store: store._id } : {}),
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
          results.successful.push({
            row: productData.rowNumber,
            name: productData.name,
            productId: null,
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
        } else {
          // Create product
          const createdProduct = await Product.create(newProduct);

          results.successful.push({
            row: productData.rowNumber,
            name: productData.name,
            productId: createdProduct._id
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
        ? `Preview generated. ${results.successful.length} valid rows, ${results.failed.length} issues.`
        : `Bulk upload completed. ${results.successful.length} products created, ${results.failed.length} failed.` +
          (createdNote ? ` Also added ${createdNote}.` : ''),
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

