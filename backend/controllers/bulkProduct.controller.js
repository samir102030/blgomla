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
    console.log('Generating template for user:', req.user?.email);
    const buffer = generateProductTemplate();
    console.log('Template generated, buffer size:', buffer.length);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=product-upload-template.xlsx');
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
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Get vendor's store
    const store = await Store.findOne({ owner: req.user._id });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found. Please create a store first.'
      });
    }

    // Parse Excel file
    const products = parseProductExcel(req.file.buffer);

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

    for (const productData of products) {
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
          store: store._id,
          tags: productData.tags || [],
          features: productData.features || [],
          attributes: productData.attributes || [],
          images: productData.images || [],
          bulkPricing: productData.bulkPricing || [],
          isActive: true,
          deleted: false
        };

        // Find category by name
        if (productData.categoryName) {
          const categoryId = categoryMap.get(productData.categoryName.toLowerCase());
          if (categoryId) {
            newProduct.Category = categoryId;
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

        // Create product
        const createdProduct = await Product.create(newProduct);

        results.successful.push({
          row: productData.rowNumber,
          name: productData.name,
          productId: createdProduct._id
        });

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
      message: `Bulk upload completed. ${results.successful.length} products created, ${results.failed.length} failed.`,
      results
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

