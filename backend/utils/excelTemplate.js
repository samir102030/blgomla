import XLSX from 'xlsx';

/**
 * Generate Excel template for bulk product upload
 * @returns {Buffer} Excel file buffer
 */
export const generateProductTemplate = (variant = 'full') => {
  if (variant === 'simple') {
    return generateSimpleProductTemplate();
  }

  // Define the template structure with headers and example data
  const templateData = [
    {
      'Product Name': 'Example Product 1',
      'Description': 'This is a detailed description of the product',
      'Price': 99.99,
      'Stock': 100,
      'Category Name': 'Electronics',
      'Brand Name': 'Samsung',
      'Sale Percentage': 10,
      'Sale Active': 'TRUE',
      'Featured': 'FALSE',
      'Tags': 'tag1, tag2, tag3',
      'Features': 'Feature 1 | Feature 2 | Feature 3',
      'Attributes': 'Color:Red | Size:Large | Material:Cotton',
      'Image URL 1': 'https://example.com/image1.jpg',
      'Image URL 2': 'https://example.com/image2.jpg',
      'Image URL 3': 'https://example.com/image3.jpg',
      'Image URL 4': 'https://example.com/image4.jpg',
      'Bulk Pricing': '10:89.99 | 50:79.99 | 100:69.99'
    },
    {
      'Product Name': 'Example Product 2',
      'Description': 'Another product description',
      'Price': 149.99,
      'Stock': 50,
      'Category Name': 'Clothing',
      'Brand Name': 'Nike',
      'Sale Percentage': 0,
      'Sale Active': 'FALSE',
      'Featured': 'TRUE',
      'Tags': 'sports, fashion',
      'Features': 'Breathable | Comfortable',
      'Attributes': 'Color:Blue | Size:Medium',
      'Image URL 1': 'https://example.com/product2.jpg',
      'Image URL 2': '',
      'Image URL 3': '',
      'Image URL 4': '',
      'Bulk Pricing': ''
    }
  ];

  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  const columnWidths = [
    { wch: 25 }, // Product Name
    { wch: 50 }, // Description
    { wch: 10 }, // Price
    { wch: 10 }, // Stock
    { wch: 20 }, // Category Name
    { wch: 20 }, // Brand Name
    { wch: 15 }, // Sale Percentage
    { wch: 12 }, // Sale Active
    { wch: 10 }, // Featured
    { wch: 30 }, // Tags
    { wch: 40 }, // Features
    { wch: 40 }, // Attributes
    { wch: 40 }, // Image URL 1
    { wch: 40 }, // Image URL 2
    { wch: 40 }, // Image URL 3
    { wch: 40 }, // Image URL 4
    { wch: 30 }, // Bulk Pricing
  ];
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

  // Create instructions sheet
  const instructions = [
    { Field: 'Product Name', Required: 'YES', Format: 'Text', Example: 'Samsung Galaxy S21', Notes: 'Unique product name' },
    { Field: 'Description', Required: 'NO', Format: 'Text', Example: 'Latest smartphone with amazing features', Notes: 'Detailed product description' },
    { Field: 'Price', Required: 'YES', Format: 'Number', Example: '999.99', Notes: 'Product price (must be positive)' },
    { Field: 'Stock', Required: 'NO', Format: 'Number', Example: '100', Notes: 'Available stock quantity (default: 0)' },
    { Field: 'Category Name', Required: 'NO', Format: 'Text', Example: 'Electronics', Notes: 'Existing category name (case-sensitive)' },
    { Field: 'Brand Name', Required: 'NO', Format: 'Text', Example: 'Samsung', Notes: 'Existing brand name (case-sensitive)' },
    { Field: 'Sale Percentage', Required: 'NO', Format: 'Number', Example: '15', Notes: 'Discount percentage (0-100)' },
    { Field: 'Sale Active', Required: 'NO', Format: 'Boolean', Example: 'TRUE or FALSE', Notes: 'Whether sale is active' },
    { Field: 'Featured', Required: 'NO', Format: 'Boolean', Example: 'TRUE or FALSE', Notes: 'Mark as featured product' },
    { Field: 'Tags', Required: 'NO', Format: 'Text', Example: 'smartphone, 5G, android', Notes: 'Comma-separated tags' },
    { Field: 'Features', Required: 'NO', Format: 'Text', Example: 'Feature 1 | Feature 2', Notes: 'Pipe-separated features' },
    { Field: 'Attributes', Required: 'NO', Format: 'Text', Example: 'Color:Red | Size:Large', Notes: 'Pipe-separated name:value pairs' },
    { Field: 'Image URL 1-4', Required: 'NO', Format: 'URL', Example: 'https://example.com/image.jpg', Notes: 'Direct image URLs (up to 4 images)' },
    { Field: 'Bulk Pricing', Required: 'NO', Format: 'Text', Example: '10:89.99 | 50:79.99', Notes: 'Pipe-separated minQty:price pairs' },
  ];

  const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
  instructionsSheet['!cols'] = [
    { wch: 20 },
    { wch: 10 },
    { wch: 15 },
    { wch: 40 },
    { wch: 50 }
  ];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  return buffer;
};

const generateSimpleProductTemplate = () => {
  const templateData = [
    {
      'Product Name': 'Example Product A',
      'Description': 'Short description (optional)',
      'Price': 49.99,
    },
    {
      'Product Name': 'Example Product B',
      'Description': 'Another description',
      'Price': 79.99,
    },
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  worksheet['!cols'] = [
    { wch: 30 }, // Product Name
    { wch: 60 }, // Description
    { wch: 12 }, // Price
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

  const instructions = [
    { Field: 'Product Name', Required: 'YES', Format: 'Text', Example: 'Wireless Mouse' },
    { Field: 'Description', Required: 'NO', Format: 'Text', Example: 'Optional short description' },
    { Field: 'Price', Required: 'YES', Format: 'Number', Example: '29.99', Notes: 'Positive numbers only' },
  ];
  const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
  instructionsSheet['!cols'] = [
    { wch: 20 },
    { wch: 10 },
    { wch: 15 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Parse uploaded Excel file and extract product data
 * @param {Buffer} fileBuffer - Excel file buffer
 * @returns {Array} Array of product objects
 */
export const parseProductExcel = (fileBuffer, templateType = 'full') => {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const rawData = XLSX.utils.sheet_to_json(worksheet);
  
  // Transform data to match product schema
  const products = rawData.map((row, index) => {
    if (templateType === 'simple') {
      return {
        rowNumber: index + 2,
        name: row['Product Name']?.toString().trim(),
        description: row['Description']?.toString().trim() || '',
        price: parseFloat(row['Price']),
        stock: 0,
        saleActive: false,
        salePercentage: 0,
        featured: false,
      };
    }

    const product = {
      rowNumber: index + 2, // +2 because Excel is 1-indexed and has header row
      name: row['Product Name']?.toString().trim(),
      description: row['Description']?.toString().trim() || '',
      price: parseFloat(row['Price']),
      stock: parseInt(row['Stock']) || 0,
      categoryName: row['Category Name']?.toString().trim(),
      brandName: row['Brand Name']?.toString().trim(),
      salePercentage: parseFloat(row['Sale Percentage']) || 0,
      saleActive: row['Sale Active']?.toString().toUpperCase() === 'TRUE',
      featured: row['Featured']?.toString().toUpperCase() === 'TRUE',
    };

    // Parse tags (comma-separated)
    if (row['Tags']) {
      product.tags = row['Tags'].toString().split(',').map(tag => tag.trim()).filter(Boolean);
    }

    // Parse features (pipe-separated)
    if (row['Features']) {
      product.features = row['Features'].toString().split('|').map(f => f.trim()).filter(Boolean);
    }

    // Parse attributes (pipe-separated name:value pairs)
    if (row['Attributes']) {
      product.attributes = row['Attributes'].toString().split('|').map(attr => {
        const [name, value] = attr.split(':').map(s => s.trim());
        return { name, value };
      }).filter(attr => attr.name && attr.value);
    }

    // Parse images
    product.images = [];
    for (let i = 1; i <= 4; i++) {
      const imageUrl = row[`Image URL ${i}`]?.toString().trim();
      if (imageUrl) {
        product.images.push({ url: imageUrl, alt: product.name });
      }
    }

    // Parse bulk pricing (pipe-separated minQty:price pairs)
    if (row['Bulk Pricing']) {
      product.bulkPricing = row['Bulk Pricing'].toString().split('|').map(pricing => {
        const [minQty, unitPrice] = pricing.split(':').map(s => s.trim());
        return {
          minQty: parseInt(minQty),
          unitPrice: parseFloat(unitPrice)
        };
      }).filter(p => p.minQty && p.unitPrice);
    }

    return product;
  });

  return products;
};

