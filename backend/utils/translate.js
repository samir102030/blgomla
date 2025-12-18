import translate from "translate-google";

/**
 * Translate text from English to Arabic
 * @param {string} text - Text to translate
 * @returns {Promise<string>} - Translated text
 */
export const translateToArabic = async (text) => {
  if (!text || typeof text !== "string") return text;
  
  try {
    const translated = await translate(text, { from: "en", to: "ar" });
    return translated;
  } catch (error) {
    console.error("Translation error:", error);
    return text; // Return original text if translation fails
  }
};

/**
 * Translate an array of strings from English to Arabic
 * @param {string[]} texts - Array of texts to translate
 * @returns {Promise<string[]>} - Array of translated texts
 */
export const translateArrayToArabic = async (texts) => {
  if (!Array.isArray(texts)) return texts;
  
  try {
    const translations = await Promise.all(
      texts.map(async (text) => {
        if (!text || typeof text !== "string") return text;
        return await translateToArabic(text);
      })
    );
    return translations;
  } catch (error) {
    console.error("Array translation error:", error);
    return texts;
  }
};

/**
 * Translate product object fields to Arabic
 * @param {Object} product - Product object
 * @returns {Promise<Object>} - Product with translated fields
 */
export const translateProduct = async (product) => {
  if (!product) return product;
  
  const productObj = product.toObject ? product.toObject() : { ...product };
  
  try {
    // Translate basic fields
    if (productObj.name) {
      productObj.name = await translateToArabic(productObj.name);
    }
    
    if (productObj.description) {
      productObj.description = await translateToArabic(productObj.description);
    }
    
    // Translate features array
    if (productObj.features && Array.isArray(productObj.features)) {
      productObj.features = await translateArrayToArabic(productObj.features);
    }
    
    // Translate tags array
    if (productObj.tags && Array.isArray(productObj.tags)) {
      productObj.tags = await translateArrayToArabic(productObj.tags);
    }
    
    // Translate attributes
    if (productObj.attributes && Array.isArray(productObj.attributes)) {
      productObj.attributes = await Promise.all(
        productObj.attributes.map(async (attr) => ({
          name: await translateToArabic(attr.name),
          value: await translateToArabic(attr.value),
        }))
      );
    }
    
    // Translate populated brand
    if (productObj.brand && typeof productObj.brand === "object") {
      productObj.brand = await translateBrand(productObj.brand);
    }
    
    // Translate populated category
    if (productObj.Category && typeof productObj.Category === "object") {
      productObj.Category = await translateCategory(productObj.Category);
    }
    
    // Translate reviews
    if (productObj.reviews && Array.isArray(productObj.reviews)) {
      productObj.reviews = await Promise.all(
        productObj.reviews.map(async (review) => ({
          ...review,
          comment: review.comment ? await translateToArabic(review.comment) : review.comment,
        }))
      );
    }
    
    return productObj;
  } catch (error) {
    console.error("Product translation error:", error);
    return productObj;
  }
};

/**
 * Translate brand object fields to Arabic
 * @param {Object} brand - Brand object
 * @returns {Promise<Object>} - Brand with translated fields
 */
export const translateBrand = async (brand) => {
  if (!brand) return brand;
  
  const brandObj = brand.toObject ? brand.toObject() : { ...brand };
  
  try {
    if (brandObj.name) {
      brandObj.name = await translateToArabic(brandObj.name);
    }
    
    if (brandObj.description) {
      brandObj.description = await translateToArabic(brandObj.description);
    }
    
    return brandObj;
  } catch (error) {
    console.error("Brand translation error:", error);
    return brandObj;
  }
};

/**
 * Translate category object fields to Arabic
 * @param {Object} category - Category object
 * @returns {Promise<Object>} - Category with translated fields
 */
export const translateCategory = async (category) => {
  if (!category) return category;
  
  const categoryObj = category.toObject ? category.toObject() : { ...category };
  
  try {
    if (categoryObj.name) {
      categoryObj.name = await translateToArabic(categoryObj.name);
    }
    
    if (categoryObj.description) {
      categoryObj.description = await translateToArabic(categoryObj.description);
    }
    
    return categoryObj;
  } catch (error) {
    console.error("Category translation error:", error);
    return categoryObj;
  }
};

