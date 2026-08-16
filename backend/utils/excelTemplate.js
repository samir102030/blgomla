import XLSX from 'xlsx';

/**
 * Generate Excel template for bulk product upload
 * @returns {Buffer} Excel file buffer
 */
export const generateProductTemplate = (variant = 'full') => {
  if (variant === 'simple') {
    return generateSimpleProductTemplate();
  }

  // Example rows are written as this shop's own catalogue rather than generic
  // "Example Product 1" filler: a seller copying the shape of a row they
  // recognise gets the pipe- and colon-separated fields right first time.
  const templateData = [
    {
      'Product Name': 'Hikvision DS-2CD1327G3-LIUFSL 2 MP ColorVu Fixed Turret',
      'Arabic Name': 'كاميرا هيكفيجن DS-2CD1327G3 بدقة 2 ميجابكسل ColorVu',
      'SKU': 'DS-2CD1327G3-LIUFSL',
      'Description': 'ColorVu turret camera with 24/7 colour imaging.',
      'Arabic Description': 'كاميرا ColorVu بتصوير ملوّن على مدار اليوم.',
      'Price': 2749,
      'Stock': 25,
      'Min Order Qty': 1,
      'Category Name': 'IP Camera',
      'Brand Name': 'Hikvision',
      'Sale Percentage': 10,
      'Sale Active': 'TRUE',
      'Featured': 'FALSE',
      'Tags': 'colorvu, turret, 2mp',
      'Features': '24/7 colour | Built-in mic | IP67',
      'Attributes': 'Mega Pixel:2 MP | Lens:2.8 mm | Warranty:1 year',
      'Installation Offered': 'TRUE',
      'Installation Price': 250,
      'Installation Note': 'Fitting and configuration on site',
      'Installation Note (Arabic)': 'التركيب والضبط في الموقع',
      'Image URL 1': 'https://example.com/image1.jpg',
      'Image URL 2': '',
      'Image URL 3': '',
      'Image URL 4': '',
      'Bulk Pricing': '10:2600 | 50:2450 | 100:2300'
    },
    {
      'Product Name': 'Hikvision DS-7608NI-K1 8-ch 1U 4K NVR',
      'Arabic Name': 'جهاز تسجيل هيكفيجن DS-7608NI-K1 بـ 8 قنوات 4K',
      'SKU': 'DS-7608NI-K1',
      'Description': '8-channel network video recorder.',
      'Arabic Description': 'جهاز تسجيل شبكي بـ 8 قنوات.',
      'Price': 5399,
      'Stock': 8,
      'Min Order Qty': 1,
      'Category Name': '8 Channel',
      'Brand Name': 'Hikvision',
      'Sale Percentage': 0,
      'Sale Active': 'FALSE',
      'Featured': 'TRUE',
      'Tags': 'nvr, 8 channel, 4k',
      'Features': '4K output | 1 SATA',
      'Attributes': 'Channels:8 | Warranty:1 year',
      'Installation Offered': 'FALSE',
      'Installation Price': '',
      'Installation Note': '',
      'Installation Note (Arabic)': '',
      'Image URL 1': '',
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
    { wch: 45 }, // Product Name
    { wch: 45 }, // Arabic Name
    { wch: 22 }, // SKU
    { wch: 50 }, // Description
    { wch: 50 }, // Arabic Description
    { wch: 10 }, // Price
    { wch: 10 }, // Stock
    { wch: 14 }, // Min Order Qty
    { wch: 22 }, // Category Name
    { wch: 20 }, // Brand Name
    { wch: 15 }, // Sale Percentage
    { wch: 12 }, // Sale Active
    { wch: 10 }, // Featured
    { wch: 30 }, // Tags
    { wch: 40 }, // Features
    { wch: 44 }, // Attributes
    { wch: 20 }, // Installation Offered
    { wch: 18 }, // Installation Price
    { wch: 36 }, // Installation Note
    { wch: 36 }, // Installation Note (Arabic)
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
    { Field: 'Arabic Name', Required: 'NO', Format: 'Text', Example: 'كاميرا هيكفيجن 2 ميجابكسل', Notes: 'Shown instead of the English name to shoppers browsing in Arabic. Blank falls back to English.' },
    { Field: 'SKU', Required: 'NO', Format: 'Text', Example: 'DS-2CD1327G3-LIUFSL', Notes: 'Your own code — the manufacturer part number is the useful thing here. Must be unique. Blank generates one.' },
    { Field: 'Description', Required: 'NO', Format: 'Text', Example: 'Latest smartphone with amazing features', Notes: 'Detailed product description. Line breaks are kept on the product page.' },
    { Field: 'Arabic Description', Required: 'NO', Format: 'Text', Example: 'وصف المنتج بالعربي', Notes: 'The Arabic description. Blank falls back to English.' },
    { Field: 'Price', Required: 'NO', Format: 'Number', Example: '999.99', Notes: 'Leave blank and the product still imports — at price 0 and out of stock until you price it.' },
    { Field: 'Stock', Required: 'NO', Format: 'Number', Example: '100', Notes: 'Available stock quantity (default: 0)' },
    { Field: 'Min Order Qty', Required: 'NO', Format: 'Number', Example: '5', Notes: 'Smallest quantity a buyer may order. Default 1.' },
    { Field: 'Category Name', Required: 'NO', Format: 'Text', Example: 'IP Camera', Notes: 'Name the SUBcategory the product belongs in — "IP Camera", not "Security & Surveillance". The parent is worked out from it. Matched ignoring case; created if new.' },
    { Field: 'Brand Name', Required: 'NO', Format: 'Text', Example: 'Samsung', Notes: 'Matched by name, ignoring case. Created if new.' },
    { Field: 'Sale Percentage', Required: 'NO', Format: 'Number', Example: '15', Notes: 'Discount percentage (0-100)' },
    { Field: 'Sale Active', Required: 'NO', Format: 'Boolean', Example: 'TRUE or FALSE', Notes: 'Whether sale is active' },
    { Field: 'Featured', Required: 'NO', Format: 'Boolean', Example: 'TRUE or FALSE', Notes: 'Mark as featured product' },
    { Field: 'Tags', Required: 'NO', Format: 'Text', Example: 'smartphone, 5G, android', Notes: 'Comma-separated tags' },
    { Field: 'Features', Required: 'NO', Format: 'Text', Example: 'Feature 1 | Feature 2', Notes: 'Pipe-separated features' },
    { Field: 'Attributes', Required: 'NO', Format: 'Text', Example: 'Mega Pixel:4 MP | Lens:2.8 mm', Notes: 'Pipe-separated name:value pairs. Shown as specs on the product page. Keep a name spelled the same across products so it can group them.' },
    { Field: 'Installation Offered', Required: 'NO', Format: 'Boolean', Example: 'TRUE or FALSE', Notes: 'Offer on-site fitting for this product. Default FALSE.' },
    { Field: 'Installation Price', Required: 'NO', Format: 'Number', Example: '250', Notes: 'Charged per unit on top of the price. 0 means fitting is included.' },
    { Field: 'Installation Note', Required: 'NO', Format: 'Text', Example: 'Fitting and configuration on site', Notes: 'Shown next to the fitting option on the product page.' },
    { Field: 'Installation Note (Arabic)', Required: 'NO', Format: 'Text', Example: 'التركيب والضبط في الموقع', Notes: 'The Arabic version of the note.' },
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
    { Field: 'Price', Required: 'NO', Format: 'Number', Example: '29.99', Notes: 'Leave blank and the product still imports — at price 0 and out of stock until you price it.' },
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
      nameAr: row['Arabic Name']?.toString().trim() || '',
      sku: row['SKU']?.toString().trim() || '',
      description: row['Description']?.toString().trim() || '',
      descriptionAr: row['Arabic Description']?.toString().trim() || '',
      price: parseFloat(row['Price']),
      stock: parseInt(row['Stock']) || 0,
      minOrderQty: parseInt(row['Min Order Qty']) || 1,
      categoryName: row['Category Name']?.toString().trim(),
      brandName: row['Brand Name']?.toString().trim(),
      salePercentage: parseFloat(row['Sale Percentage']) || 0,
      saleActive: row['Sale Active']?.toString().toUpperCase() === 'TRUE',
      featured: row['Featured']?.toString().toUpperCase() === 'TRUE',
    };

    // On-site fitting. Only carried when the seller actually offers it, so a
    // blank block never overwrites what the product already has.
    if (row['Installation Offered']?.toString().toUpperCase() === 'TRUE') {
      product.installation = {
        offered: true,
        price: parseFloat(row['Installation Price']) || 0,
        note: row['Installation Note']?.toString().trim() || '',
        noteAr: row['Installation Note (Arabic)']?.toString().trim() || '',
      };
    }

    // Parse tags (comma-separated)
    if (row['Tags']) {
      product.tags = row['Tags'].toString().split(',').map(tag => tag.trim()).filter(Boolean);
    }

    // Parse features (pipe-separated)
    if (row['Features']) {
      product.features = row['Features'].toString().split('|').map(f => f.trim()).filter(Boolean);
    }

    // Parse attributes (pipe-separated name:value pairs).
    //
    // Split on the FIRST colon only. Splitting on every colon and keeping the
    // second piece truncated any value that contained one — "Aspect Ratio:16:9"
    // stored "16", and a datasheet line like "Shutter:1/3 s to 1/100,000 s"
    // survived only because it happened to have none.
    if (row['Attributes']) {
      product.attributes = row['Attributes'].toString().split('|').map(attr => {
        const text = attr.trim();
        const at = text.indexOf(':');
        if (at <= 0) return { name: '', value: '' };
        return {
          name: text.slice(0, at).trim(),
          value: text.slice(at + 1).trim(),
        };
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

