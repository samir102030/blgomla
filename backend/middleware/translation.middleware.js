import {
  translateProduct,
  translateBrand,
  translateCategory,
} from "../utils/translate.js";

/**
 * Middleware to translate API responses to Arabic based on Accept-Language header
 * Usage: Add this middleware after your route handler
 */
export const translateResponse = async (req, res, next) => {
  // Get language from Accept-Language header or query parameter
  const language =
    req.headers["accept-language"] ||
    req.query.lang ||
    req.headers["x-language"] ||
    "en";

  // Only translate if language is Arabic
  if (!language.toLowerCase().includes("ar")) {
    return next();
  }

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override res.json to translate before sending
  res.json = async function (data) {
    try {
      // Only translate successful responses with data
      if (data && data.success !== false) {
        // Translate single product
        if (data.product) {
          data.product = await translateProduct(data.product);
        }

        // Translate array of products
        if (data.products && Array.isArray(data.products)) {
          data.products = await Promise.all(
            data.products.map((product) => translateProduct(product))
          );
        }

        // Translate paginated products
        if (data.data && Array.isArray(data.data)) {
          data.data = await Promise.all(
            data.data.map((item) => translateProduct(item))
          );
        }

        // Translate single brand
        if (data.brand) {
          data.brand = await translateBrand(data.brand);
        }

        // Translate array of brands
        if (data.brands && Array.isArray(data.brands)) {
          data.brands = await Promise.all(
            data.brands.map((brand) => translateBrand(brand))
          );
        }

        // Translate single category
        if (data.category) {
          data.category = await translateCategory(data.category);
        }

        // Translate array of categories
        if (data.categories && Array.isArray(data.categories)) {
          data.categories = await Promise.all(
            data.categories.map((category) => translateCategory(category))
          );
        }

        // Translate cart items (products in cart)
        if (data.cart && Array.isArray(data.cart)) {
          data.cart = await Promise.all(
            data.cart.map(async (item) => {
              if (item.productDetails) {
                item.productDetails = await translateProduct(
                  item.productDetails
                );
              }
              return item;
            })
          );
        }

        // Translate order items
        if (data.order && data.order.orderItems) {
          data.order.orderItems = await Promise.all(
            data.order.orderItems.map(async (item) => {
              if (item.product && typeof item.product === "object") {
                item.product = await translateProduct(item.product);
              }
              return item;
            })
          );
        }

        // Translate orders array
        if (data.orders && Array.isArray(data.orders)) {
          data.orders = await Promise.all(
            data.orders.map(async (order) => {
              if (order.orderItems && Array.isArray(order.orderItems)) {
                order.orderItems = await Promise.all(
                  order.orderItems.map(async (item) => {
                    if (item.product && typeof item.product === "object") {
                      item.product = await translateProduct(item.product);
                    }
                    return item;
                  })
                );
              }
              return order;
            })
          );
        }
      }
    } catch (error) {
      console.error("Translation middleware error:", error);
      // If translation fails, send original data
    }

    // Call original json method with (possibly translated) data
    return originalJson(data);
  };

  next();
};

