import Product from "../models/product.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { paginateQuery } from "../utils/pagination.js";
import User from "../models/user.model.js";

// Create Product
export const createProduct = controllerWrapper(
  "createProduct",
  async (req, res) => {
    const productData = req.body;
    const product = new Product(productData);
    await product.save();
    res.status(201).json({ success: true, product });
  }
);

// Get All Products (with optional filters/search)
export const getAllProducts = controllerWrapper(
  "getAllProducts",
  async (req, res) => {
    const { page = 1, limit = 20, search, ...filters } = req.query;
    let query = {};
    if (search) query.$text = { $search: search };
    // Add filters (category, brand, etc.)
    if (filters.categoryId) query.Category = filters.categoryId;
    if (filters.brandId) query.brand = filters.brandId;
    if (filters.storeId) query.store = filters.storeId;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.featured !== undefined) query.featured = filters.featured;
    if (filters.saleActive !== undefined) query.saleActive = filters.saleActive;
    if (filters.deleted !== undefined) query.deleted = filters.deleted;
    // Price range
    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = Number(filters.minPrice);
      if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice);
    }
    const mongooseQuery = Product.find(query).sort({ createdAt: -1 });
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Sale Products
export const getSaleProducts = controllerWrapper(
  "getsaleProducts",
  async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const query = {
      saleActive: true,
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query);
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Product By Id
export const getProductById = controllerWrapper(
  "getProductById",
  async (req, res) => {
    const { productId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    // For a single product, pagination is not typical, but for consistency:
    const mongooseQuery = Product.find({ _id: productId }).populate(
      "reviews.user"
    );
    const result = await paginateQuery(page, limit, mongooseQuery);
    if (!result.data || result.data.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.status(200).json(result);
  }
);

// Update Product
export const updateProduct = controllerWrapper(
  "updateProduct",
  async (req, res) => {
    const { productId } = req.params;
    const updateData = req.body;
    const product = await Product.findByIdAndUpdate(productId, updateData, {
      new: true,
      runValidators: true,
    });
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, product });
  }
);

// Delete Product (hard delete)
export const deleteProduct = controllerWrapper(
  "deleteProduct",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findByIdAndDelete(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, message: "Product deleted" });
  }
);

// Soft Delete Product
export const softDeleteProduct = controllerWrapper(
  "softDeleteProduct",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findByIdAndUpdate(
      productId,
      { deleted: true },
      { new: true }
    );
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res
      .status(200)
      .json({ success: true, message: "Product marked as deleted" });
  }
);

// Restore Product
export const restoreProduct = controllerWrapper(
  "restoreProduct",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findByIdAndUpdate(
      productId,
      { deleted: false },
      { new: true }
    );
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, message: "Product restored" });
  }
);

// Toggle Sale Status
export const toggleSaleProduct = controllerWrapper(
  "toggleSaleProduct",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    product.saleActive = !product.saleActive;
    await product.save();
    res.status(200).json({ success: true, saleActive: product.saleActive });
  }
);

// Toggle Featured Status
export const toggleFeaturedProduct = controllerWrapper(
  "toggleFeaturedProduct",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    product.featured = !product.featured;
    await product.save();
    res.status(200).json({ success: true, featured: product.featured });
  }
);

// Update Product Stock
export const updateProductStock = controllerWrapper(
  "updateProductStock",
  async (req, res) => {
    const { productId } = req.params;
    const { stock } = req.body;
    const product = await Product.findByIdAndUpdate(
      productId,
      { stock },
      { new: true, runValidators: true }
    );
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, product });
  }
);

// Filter Products
export const filterProducts = controllerWrapper(
  "filterProducts",
  async (req, res) => {
    const {
      category,
      brand,
      minPrice,
      maxPrice,
      rating,
      featured,
      saleActive,
      store,
      attributes,
      page = 1,
      limit = 20,
    } = req.query;
    let query = {};
    if (category) query.Category = category;
    if (brand) query.brand = brand;
    if (store) query.store = store;
    if (featured !== undefined) query.featured = featured;
    if (saleActive !== undefined) query.saleActive = saleActive;
    if (rating) query.rating = { $gte: Number(rating) };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    // Filter by attributes (array of {name, value})
    if (attributes) {
      try {
        const attrs = JSON.parse(attributes);
        if (Array.isArray(attrs)) {
          query.$and = attrs.map((attr) => ({
            attributes: { $elemMatch: attr },
          }));
        }
      } catch {}
    }
    const mongooseQuery = Product.find(query);
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Featured Products
export const getFeaturedProducts = controllerWrapper(
  "getFeaturedProducts",
  async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const query = {
      featured: true,
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query);
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Products By Category
export const getProductsByCategory = controllerWrapper(
  "getProductsByCategory",
  async (req, res) => {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const query = {
      Category: categoryId,
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query);
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Products By Brand
export const getProductsByBrand = controllerWrapper(
  "getProductsByBrand",
  async (req, res) => {
    const { brandId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const query = {
      brand: brandId,
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query);
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Products By Store
export const getStoreProducts = controllerWrapper(
  "getStoreProducts",
  async (req, res) => {
    const { storeId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const query = {
      store: storeId,
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query);
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Reviews
export const addProductReview = controllerWrapper(
  "addProductReview",
  async (req, res) => {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    // Prevent duplicate review by same user
    if (product.reviews.some((r) => r.user.toString() === userId.toString())) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product",
      });
    }
    product.reviews.push({ user: userId, rating, comment });
    // Update average rating
    // product.rating =
    //   product.reviews.reduce((acc, r) => acc + r.rating, 0) /
    //   product.reviews.length;
    product.calculateRating();
    await product.save();
    res.status(201).json({ success: true, reviews: product.reviews });
  }
);

export const updateProductReview = controllerWrapper(
  "updateProductReview",
  async (req, res) => {
    const { productId, reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    const review = product.reviews.id(reviewId);
    if (!review)
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this review",
      });
    }
    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    // Update average rating
    // product.rating =
    //   product.reviews.reduce((acc, r) => acc + r.rating, 0) /
    //   product.reviews.length;
    product.calculateRating();
    await product.save();
    res.status(200).json({ success: true, review });
  }
);

export const deleteProductReview = controllerWrapper(
  "deleteProductReview",
  async (req, res) => {
    const { productId, reviewId } = req.params;
    const userId = req.user._id;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    const review = product.reviews.id(reviewId);
    if (!review)
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this review",
      });
    }
    // review.remove(); // this does not delete the product from the array fix it
    product.reviews = product.reviews.filter(
      (r) => r._id.toString() !== reviewId
    );
    // Update average rating
    // product.rating =
    //   product.reviews.length > 0
    //     ? product.reviews.reduce((acc, r) => acc + r.rating, 0) /
    //       product.reviews.length
    //     : 0;
    product.calculateRating();
    await product.save();
    res.status(200).json({ success: true, message: "Review deleted" });
  }
);

// Features
export const getProductFeatures = controllerWrapper(
  "getProductFeatures",
  async (req, res) => {
    const { productId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const product = await Product.findById(productId, "features");
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    // Paginate features array manually
    const total = product.features.length;
    const start = (page - 1) * limit;
    const end = start + Number(limit);
    const data = product.features.slice(start, end);
    const pages = Math.ceil(total / limit);
    res.status(200).json({
      success: true,
      data,
      total,
      limit: Number(limit),
      page: Number(page),
      pages,
    });
  }
);

export const addProductFeature = controllerWrapper(
  "addProductFeature",
  async (req, res) => {
    const { productId } = req.params;
    const { feature } = req.body;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    product.features.push(feature);
    await product.save();
    res.status(201).json({ success: true, features: product.features });
  }
);

export const updateProductFeature = controllerWrapper(
  "updateProductFeature",
  async (req, res) => {
    const { productId } = req.params;
    const { features } = req.body;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    if (!Array.isArray(features) || features.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "Features must be an array" });

    product.features = features;
    await product.save();
    res.status(200).json({ success: true, features: product.features });
  }
);

export const deleteProductFeature = controllerWrapper(
  "deleteProductFeature",
  async (req, res) => {
    const { productId, featureId } = req.params;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    if (!product.features[featureId])
      return res
        .status(404)
        .json({ success: false, message: "Feature not found" });
    product.features.splice(featureId, 1);
    await product.save();
    res.status(200).json({ success: true, features: product.features });
  }
);

// Attributes
export const getProductAttributes = controllerWrapper(
  "getProductAttributes",
  async (req, res) => {
    const { productId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const product = await Product.findById(productId, "attributes");
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    // Paginate attributes array manually
    const total = product.attributes.length;
    const start = (page - 1) * limit;
    const end = start + Number(limit);
    const data = product.attributes.slice(start, end);
    const pages = Math.ceil(total / limit);
    res.status(200).json({
      success: true,
      data,
      total,
      limit: Number(limit),
      page: Number(page),
      pages,
    });
  }
);

export const addProductAttribute = controllerWrapper(
  "addProductAttribute",
  async (req, res) => {
    const { productId } = req.params;
    const { name, value } = req.body;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    product.attributes.push({ name, value });
    await product.save();
    res.status(201).json({ success: true, attributes: product.attributes });
  }
);

export const updateProductAttribute = controllerWrapper(
  "updateProductAttribute",
  async (req, res) => {
    const { productId, attributeId } = req.params;
    const { name, value } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find the attribute by its _id (not array index)
    const attribute = product.attributes.id(attributeId);
    if (!attribute) {
      return res.status(404).json({
        success: false,
        message: "Attribute not found",
      });
    }

    // Update only provided fields
    if (name !== undefined) attribute.name = name;
    if (value !== undefined) attribute.value = value;

    await product.save();

    res.status(200).json({
      success: true,
      attributes: product.attributes,
    });
  }
);

export const deleteProductAttribute = controllerWrapper(
  "deleteProductAttribute",
  async (req, res) => {
    const { productId, attributeId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find the index of the attribute by its _id
    const attributeIndex = product.attributes.findIndex(
      (attr) => attr._id.toString() === attributeId
    );

    if (attributeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Attribute not found",
      });
    }

    // Remove the attribute from the array
    product.attributes.splice(attributeIndex, 1);
    await product.save();

    res.status(200).json({
      success: true,
      attributes: product.attributes,
    });
  }
);

// Get Best Sellers Products
export const getBestSellers = controllerWrapper(
  "getBestSellers",
  async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const query = {
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query).sort({ soldCount: -1 });
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Newest Products
export const getNewestProducts = controllerWrapper(
  "getNewestProducts",
  async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const query = {
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query).sort({ createdAt: -1 });
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);
export const getMostRatedProducts = controllerWrapper(
  "getMostRatedProducts",
  async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const query = {
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query).sort({ rating: -1 });
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// cart
export const addProductToCart = controllerWrapper(
  "addProductToCart",
  async (req, res) => {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user._id;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find user and validate
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if product already in cart
    const existingItemIndex = user.cart.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity if exists
      user.cart[existingItemIndex].quantity += quantity;
    } else {
      // Add new item if doesn't exist
      user.cart.push({
        product: productId, // Note: using 'product' not 'productId'
        quantity,
      });
    }

    await user.save();

    // Populate product details in response if needed
    const populatedUser = await User.findById(userId).populate("cart.product");

    res.status(201).json({
      success: true,
      cart: populatedUser.cart,
    });
  }
);

export const getCart = controllerWrapper("getCart", async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  res.status(200).json({ success: true, cart: user.cart });
});

// Update Cart
export const updateCart = controllerWrapper("updateCart", async (req, res) => {
  const { quantity } = req.body;
  const { productId } = req.params;
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  // Update cart logic here
  // Assuming you have a User model with a cart field
  console.log(user.cart[0].product.toString());
  const cartItemIndex = user.cart.findIndex(
    (item) => item.product.toString() === productId
  );
  if (cartItemIndex === -1)
    return res.status(404).json({
      success: false,
      message: "Product not found in cart",
    });

  user.cart[cartItemIndex].quantity = quantity;
  await user.save();
  res.status(200).json({ success: true, cart: user.cart });
});

export const removeFromCart = controllerWrapper(
  "removeFromCart",
  async (req, res) => {
    const { productId } = req.params;
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    // Remove from cart logic here
    // Assuming you have a User model with a cart field
    user.cart = user.cart.filter(
      (item) => item.product.toString() !== productId
    );
    await user.save();
    console.log(user.cart);
    res.status(200).json({ success: true, cart: user.cart });
  }
);
