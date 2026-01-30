import Product from '../models/product.model.js';
import Category from '../models/category.model.js';
import Brand from '../models/brand.model.js';
import Store from '../models/store.model.js';
import { generateProductTemplate, parseProductExcel } from '../utils/excelTemplate.js';

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
    } else if (req.user.role === 'admin') {
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

    // Auto-create category for simple template when missing (only on final run)
    if (!dryRun && templateType === 'simple' && defaultCategoryName) {
      const key = defaultCategoryName.toLowerCase();
      if (!categoryMap.has(key)) {
        try {
          const createdCategory = await Category.create({
            name: defaultCategoryName,
            description: `Auto-created from bulk upload on ${new Date().toISOString()}`,
            isActive: true,
            deleted: false,
          });
          categoryMap.set(key, createdCategory._id);
        } catch (err) {
          // Handle race with existing category
          const existing = await Category.findOne({ name: defaultCategoryName });
          if (existing) {
            categoryMap.set(key, existing._id);
          } else {
            throw err;
          }
        }
      }
    }

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
          isActive: true,
          deleted: false
        };

        // Find category by name
        let willCreateCategory = false;
        if (productData.categoryName) {
          const categoryId = categoryMap.get(productData.categoryName.toLowerCase());
          if (categoryId) {
            newProduct.Category = categoryId;
          } else if (dryRun && templateType === 'simple' && defaultCategoryName) {
            // allow preview; category will be created on final run
            willCreateCategory = true;
          } else {
            results.failed.push({
              row: productData.rowNumber,
              name: productData.name,
              errors: [`Category "${productData.categoryName}" not found`]
            });
            continue;
          }
        }

        // Find brand by name
        if (productData.brandName) {
          const brandId = brandMap.get(productData.brandName.toLowerCase());
          if (brandId) {
            newProduct.brand = brandId;
          } else {
            results.failed.push({
              row: productData.rowNumber,
              name: productData.name,
              errors: [`Brand "${productData.brandName}" not found`]
            });
            continue;
          }
        }

        if (dryRun) {
          results.successful.push({
            row: productData.rowNumber,
            name: productData.name,
            productId: null,
            willCreateCategory
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
            willCreateCategory
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

    res.status(200).json({
      success: true,
      dryRun,
      message: dryRun
        ? `Preview generated. ${results.successful.length} valid rows, ${results.failed.length} issues.`
        : `Bulk upload completed. ${results.successful.length} products created, ${results.failed.length} failed.`,
      results,
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

