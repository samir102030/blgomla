// import { controllerWrapper } from "../utils/wrappers";
import mongoose from "mongoose";
import { paginateQuery } from "../utils/pagination.js";
import Store from "../models/store.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";
import { controllerWrapper } from "../utils/wrappers.js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dlommecfr",
  api_key: process.env.CLOUDINARY_API_KEY || "249541578961879",
  api_secret:
    process.env.CLOUDINARY_API_SECRET || "lwU-kzA0H1yGvZ1KqPrhILZlRa8",
});

// Helper function to upload file to Cloudinary
const uploadToCloudinary = (buffer, folder = "vendor-documents") => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: "auto",
          folder: folder,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      )
      .end(buffer);
  });
};

// ============= Vendor Registration Controllers =============

export const registerVendor = controllerWrapper(
  "registerVendor",
  async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Debug: log incoming body keys and uploaded file fields (no sensitive data)
      try {
        console.log(
          "registerVendor called with body keys:",
          Object.keys(req.body || {}).filter((k) => k !== "password")
        );
        if (req.files)
          console.log("registerVendor uploaded files:", Object.keys(req.files));
      } catch (logErr) {
        console.error("Error logging registerVendor request:", logErr);
      }
      const {
        // Business Information
        businessName,
        businessType,
        commercialRegistrationNumber,
        taxNumber,

        // Legal Entity Information
        legalEntityType,
        licenseNumber,
        companyName,
        companyAddress,
        issueDate,
        expiryDate,
        allowedActivities,

        // Contact Information
        contactPersonName,
        email,
        phone,
        alternativePhone,

        // Address Information
        address,
        city,
        governorate,
        postalCode,

        // Business Details
        businessDescription,
        productCategories,
        expectedMonthlyVolume,

        // Store Information
        storeName,
        storeDescription,

        // Account Information
        accountEmail,
        password,

        // Agreement
        termsAccepted,
        privacyPolicyAccepted,
      } = req.body;

      // Validation
      if (
        !businessName ||
        !businessType ||
        !legalEntityType ||
        !licenseNumber ||
        !companyName ||
        !companyAddress ||
        !issueDate ||
        !expiryDate ||
        !contactPersonName ||
        !email ||
        !phone ||
        !address ||
        !city ||
        !governorate ||
        !businessDescription ||
        !storeName ||
        !accountEmail ||
        !password
      ) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "All required fields must be filled",
        });
      }

      if (!termsAccepted || !privacyPolicyAccepted) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Terms and privacy policy must be accepted",
        });
      }

      // Validate dates (avoid creating invalid Date objects)
      const parsedIssueDate = issueDate ? new Date(issueDate) : null;
      const parsedExpiryDate = expiryDate ? new Date(expiryDate) : null;
      if (parsedIssueDate && isNaN(parsedIssueDate.getTime())) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ success: false, message: "Invalid issueDate" });
      }
      if (parsedExpiryDate && isNaN(parsedExpiryDate.getTime())) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ success: false, message: "Invalid expiryDate" });
      }

      // Check if user with account email already exists
      const existingUser = await User.findOne({ email: accountEmail }).session(
        session
      );
      if (existingUser) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      // Check if store with business name already exists
      const existingStore = await Store.findOne({ businessName }).session(
        session
      );
      if (existingStore) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Store with this business name already exists",
        });
      }

      // Parse productCategories if it's a string
      let parsedCategories = productCategories;
      if (typeof productCategories === "string") {
        try {
          parsedCategories = JSON.parse(productCategories);
        } catch (error) {
          parsedCategories = [];
        }
      }

      // Create user account for vendor
      // NOTE: the User model has a pre-save hook that hashes the password.
      // Do not hash here or the password will be double-hashed and login will fail.
      const user = new User({
        email: accountEmail,
        password: password,
        name: contactPersonName,
        phoneNumber: phone,
        role: "store",
        isVerified: false,
        active: false,
      });

      await user.save({ session });

      // Handle document uploads (if files are uploaded)
      const documents = {};
      if (req.files) {
        try {
          if (req.files.commercialRegistrationDocument) {
            documents.commercialRegistration = await uploadToCloudinary(
              req.files.commercialRegistrationDocument[0].buffer,
              "vendor-documents/commercial-registration"
            );
          }
          if (req.files.taxCardDocument) {
            documents.taxCard = await uploadToCloudinary(
              req.files.taxCardDocument[0].buffer,
              "vendor-documents/tax-card"
            );
          }
          if (req.files.nationalIdDocument) {
            documents.nationalId = await uploadToCloudinary(
              req.files.nationalIdDocument[0].buffer,
              "vendor-documents/national-id"
            );
          }
          if (req.files.bankStatementDocument) {
            documents.bankStatement = await uploadToCloudinary(
              req.files.bankStatementDocument[0].buffer,
              "vendor-documents/bank-statement"
            );
          }
          if (req.files.storeLogo) {
            documents.storeLogo = await uploadToCloudinary(
              req.files.storeLogo[0].buffer,
              "vendor-logos"
            );
          }
        } catch (uploadError) {
          console.error("File upload error:", uploadError);
          await session.abortTransaction();
          session.endSession();
          return res.status(500).json({
            success: false,
            message: "Error uploading files. Please try again.",
            error: uploadError.message,
          });
        }
      }

      // Create store/vendor record
      const store = new Store({
        // Basic Store Information
        name: storeName,
        email: email,
        phone: phone,
        alternativePhone: alternativePhone,
        description: storeDescription,
        owner: user._id,
        logo: documents.storeLogo,

        // Business Information
        businessName,
        businessType,
        businessDescription,
        commercialRegistrationNumber,
        taxNumber,

        // Legal Entity Information
        legalEntityType,
        licenseNumber,
        companyName,
        companyAddress,
        issueDate: new Date(issueDate),
        expiryDate: new Date(expiryDate),
        allowedActivities,

        // Contact Information
        contactPersonName,

        // Address Information
        address,
        city,
        governorate,
        postalCode,

        // Product and Business Details
        productCategories: parsedCategories,
        expectedMonthlyVolume: expectedMonthlyVolume
          ? Number(expectedMonthlyVolume)
          : 0,

        // Documents
        documents,

        // Agreement Acceptance
        termsAccepted: Boolean(termsAccepted),
        privacyPolicyAccepted: Boolean(privacyPolicyAccepted),

        // Store Status
        status: "pending",
        isActive: false,
      });

      try {
        await store.save({ session });
      } catch (saveErr) {
        console.error("Store save error:", saveErr);
        await session.abortTransaction();
        session.endSession();
        // If mongoose validation error, return 400 with details
        if (saveErr.name === "ValidationError") {
          const errors = Object.keys(saveErr.errors || {}).reduce(
            (acc, key) => {
              acc[key] = saveErr.errors[key].message;
              return acc;
            },
            {}
          );
          return res.status(400).json({
            success: false,
            message: "Store validation failed",
            errors,
          });
        }
        // other errors
        return res.status(500).json({
          success: false,
          message: "Failed to save store",
          error: saveErr.message,
        });
      }

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Return success response
      res.status(201).json({
        success: true,
        message:
          "Vendor registration submitted successfully. Your application will be reviewed.",
        vendor: {
          _id: store._id,
          businessName: store.businessName,
          storeName: store.name,
          status: store.status,
          email: store.email,
          phone: store.phone,
          createdAt: store.createdAt,
        },
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Vendor registration error:", error);
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({
        success: false,
        message: "Internal server error during registration",
        error: error.message,
      });
    }
  }
);

export const getAllVendors = controllerWrapper(
  "getAllVendors",
  async (req, res) => {
    // Only admin can access this
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - Admin only",
      });
    }

    const { page, limit, status } = req.query;
    let query = Store.find().populate("owner", "name email phoneNumber");

    if (status) {
      query = query.where("status").equals(status);
    }

    const vendors = await paginateQuery(page, limit, query);
    if (!vendors.success) return res.status(400).json(vendors);

    res.status(200).json(vendors);
  }
);

// export const getStoreByUserId = controllerWrapper(
//   "getStoreByUserId",
//   async (req, res) => {
//     // If userId param provided, return that user's store. Otherwise return current user's store.
//     const userIdParam = req.params?.userId;
//     const ownerId = userIdParam || req.user?._id;
//     if (!ownerId)
//       return res.status(400).json({ message: "User ID is required" });
//     const store = await Store.findOne({ owner: ownerId }).populate("owner");
//     if (!store) return res.status(404).json({ message: "Store not found" });

//     res.status(200).json(store);
//   }
// );

export const getVendorById = controllerWrapper(
  "getVendorById",
  async (req, res) => {
    const { vendorId } = req.params;

    const vendor = await Store.findById(vendorId).populate(
      "owner",
      "name email phoneNumber role"
    );
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.status(200).json({
      success: true,
      vendor,
    });
  }
);

export const approveVendor = controllerWrapper(
  "approveVendor",
  async (req, res) => {
    // Only admin can approve vendors
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - Admin only",
      });
    }

    const { vendorId } = req.params;

    const vendor = await Store.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    vendor.status = "approved";
    vendor.isActive = true;
    vendor.approvedAt = new Date();
    await vendor.save();

    // Also activate the user account
    await User.findByIdAndUpdate(vendor.owner, {
      isVerified: true,
      active: true,
    });

    res.status(200).json({
      success: true,
      message: "Vendor approved successfully",
      vendor,
    });
  }
);

export const rejectVendor = controllerWrapper(
  "rejectVendor",
  async (req, res) => {
    // Only admin can reject vendors
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - Admin only",
      });
    }

    const { vendorId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const vendor = await Store.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    vendor.status = "rejected";
    vendor.rejectionReason = reason;
    vendor.rejectedAt = new Date();
    await vendor.save();

    res.status(200).json({
      success: true,
      message: "Vendor rejected successfully",
      vendor,
    });
  }
);

export const suspendVendor = controllerWrapper(
  "suspendVendor",
  async (req, res) => {
    // Only admin can suspend vendors
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - Admin only",
      });
    }

    const { vendorId } = req.params;

    const vendor = await Store.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    vendor.status = "suspended";
    vendor.isActive = false;
    await vendor.save();

    // Also deactivate the user account
    await User.findByIdAndUpdate(vendor.owner, { active: false });

    res.status(200).json({
      success: true,
      message: "Vendor suspended successfully",
      vendor,
    });
  }
);

export const updateVendorStatus = controllerWrapper(
  "updateVendorStatus",
  async (req, res) => {
    // Only admin can update vendor status
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - Admin only",
      });
    }

    const { vendorId } = req.params;
    const { status } = req.body;

    if (
      !["pending", "approved", "rejected", "suspended", "active"].includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const vendor = await Store.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    vendor.status = status;
    if (status === "approved" || status === "active") {
      vendor.isActive = true;
      if (!vendor.approvedAt) vendor.approvedAt = new Date();
    } else {
      vendor.isActive = false;
    }

    await vendor.save();

    res.status(200).json({
      success: true,
      message: `Vendor status updated to ${status}`,
      vendor,
    });
  }
);

export const deleteVendor = controllerWrapper(
  "deleteVendor",
  async (req, res) => {
    // Only admin can delete vendors
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - Admin only",
      });
    }

    const { vendorId } = req.params;

    const vendor = await Store.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Soft delete
    vendor.deleted = true;
    vendor.isActive = false;
    await vendor.save();

    // Also deactivate the user account
    await User.findByIdAndUpdate(vendor.owner, {
      active: false,
      deleted: true,
    });

    res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  }
);

export const safeDeleteVendor = controllerWrapper(
  "safeDeleteVendor",
  async (req, res) => {
    // Only admin can soft delete vendors
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - Admin only",
      });
    }

    const { vendorId } = req.params;

    const vendor = await Store.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Soft delete
    vendor.deleted = true;
    vendor.isActive = false;
    await vendor.save();

    // Also deactivate the user account
    await User.findByIdAndUpdate(vendor.owner, {
      active: false,
      deleted: true,
    });

    res.status(200).json({
      success: true,
      message: "Vendor soft deleted successfully",
    });
  }
);

export const restoreVendor = controllerWrapper(
  "restoreVendor",
  async (req, res) => {
    // Only admin can restore vendors
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - Admin only",
      });
    }

    const { vendorId } = req.params;

    const vendor = await Store.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Restore vendor
    vendor.deleted = false;
    vendor.isActive = true;
    await vendor.save();

    // Also reactivate the user account
    await User.findByIdAndUpdate(vendor.owner, {
      active: true,
      deleted: false,
    });

    res.status(200).json({
      success: true,
      message: "Vendor restored successfully",
    });
  }
);

// ============= Existing Store Controllers =============

export const getAllStores = controllerWrapper(
  "getAllStores",
  async (req, res) => {
    const { page, limit } = req.query;
    const query = Store.find();
    const users = await paginateQuery(page, limit, query);
    if (!users.success) return res.status(400).json(users);
    res.status(200).json(users);
  }
);
export const getStoreByUserId = controllerWrapper(
  "getStoreByUserId",
  async (req, res) => {
    try {
      const userId = req.user && req.user._id;
      console.log("getStoreByUserId called for userId:", userId);
      if (!userId)
        return res
          .status(400)
          .json({ success: false, message: "User id is required" });

      const store = await Store.findOne({ owner: userId });
      console.log("found store:", !!store);
      if (store) console.log("store owner:", store.owner);
      if (!store)
        return res
          .status(404)
          .json({ success: false, message: "Store not found" });

      // Return a plain JSON-safe object
      res.status(200).json({ success: true, store: store.toObject() });
    } catch (err) {
      console.error("Error in getStoreByUserId:", err);
      res
        .status(500)
        .json({ success: false, message: "Server error", error: err.message });
    }
  }
);
export const getStoreById = controllerWrapper(
  "getStoreById",
  async (req, res) => {
    const { id } = req.params;
    const store = await Store.findById(id).populate("owner");
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.status(200).json(store);
  }
);
export const createStore = controllerWrapper(
  "createStore",
  async (req, res) => {
    const existingStore = await Store.findOne({ owner: req.user._id });
    if (existingStore)
      return res.status(400).json({
        success: false,
        message: "Store already exists for this user",
      });
    // todo specify allowed fields
    const store = new Store({ ...req.body, owner: req.user._id });
    await store.save();
    res.status(201).json({ success: true, store });
  }
);
export const updateStore = controllerWrapper(
  "updateStore",
  async (req, res) => {
    const { id } = req.params;
    const store = await Store.findById(id);
    if (!store)
      return res
        .status(404)
        .json({ success: false, message: "Store not found" });
    if (
      store.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    )
      return res.status(403).json({
        success: false,
        message: "Access denied - You are not authorized to update this store",
      });
    store.set(req.body);
    await store.save();
    res.status(200).json({ success: true, store });
  }
);
export const deleteStore = controllerWrapper(
  "deleteStore",
  async (req, res) => {
    const { id } = req.params;
    const store = await Store.findById(id)
      .populate("owner")
      .populate("products");
    if (!store)
      return res
        .status(404)
        .json({ success: false, message: "Store not found" });
    if (
      store.owner._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    )
      return res.status(403).json({
        success: false,
        message: "Access denied - You are not authorized to delete this store",
      });
    await store.remove();
    res.status(200).json({ success: true, message: "Store deleted" });
  }
);
export const safeDeleteStore = controllerWrapper(
  "safeDeleteStore",
  async (req, res) => {
    const { id } = req.params;
    const store = await Store.findById(id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    store.deleted = true;
    await store.save();
    res.json({ success: true, message: "Store soft deleted" });
  }
);

export const restoreStore = controllerWrapper(
  "restoreStore",
  async (req, res) => {
    const { id } = req.params;
    const store = await Store.findById(id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    store.deleted = false;
    await store.save();
    res.json({ success: true, message: "Store restored" });
  }
);

// export const updateStoreSlider = controllerWrapper(
//   "updateStoreSlider",
//   async (req, res) => {
//     const { storeId } = req.params;
//     const { slider } = req.body;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     store.slider = slider;
//     await store.save();
//     res.json({ success: true, slider: store.slider });
//   }
// );

// export const deleteStoreSlider = controllerWrapper(
//   "deleteStoreSlider",
//   async (req, res) => {
//     const { storeId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     store.slider = [];
//     await store.save();
//     res.json({ success: true, message: "Slider deleted" });
//   }
// );

// export const addSocialLink = controllerWrapper(
//   "addSocialLink",
//   async (req, res) => {
//     const { storeId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     store.socialLinks.push(req.body);
//     await store.save();
//     res.json({ success: true, socialLinks: store.socialLinks });
//   }
// );

// export const updateSocialLink = controllerWrapper(
//   "updateSocialLink",
//   async (req, res) => {
//     const { storeId, linkId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     const link = store.socialLinks.id(linkId);
//     if (!link)
//       return res.status(404).json({ message: "Social link not found" });
//     Object.assign(link, req.body);
//     await store.save();
//     res.json({ success: true, socialLinks: store.socialLinks });
//   }
// );

// export const deleteSocialLink = controllerWrapper(
//   "deleteSocialLink",
//   async (req, res) => {
//     const { storeId, linkId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     store.socialLinks.id(linkId).remove();
//     await store.save();
//     res.json({ success: true, socialLinks: store.socialLinks });
//   }
// );

export const activateStore = controllerWrapper(
  "activateStore",
  async (req, res) => {
    const { id } = req.params;
    const store = await Store.findById(id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    store.isActive = true;
    await store.save();
    res.json({ success: true, message: "Store activated" });
  }
);

export const deactivateStore = controllerWrapper(
  "deactivateStore",
  async (req, res) => {
    const { id } = req.params;
    const store = await Store.findById(id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    store.isActive = false;
    await store.save();
    res.json({ success: true, message: "Store deactivated" });
  }
);

// export const addStoreFeature = controllerWrapper(
//   "addStoreFeature",
//   async (req, res) => {
//     const { storeId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     store.features.push(req.body);
//     await store.save();
//     res.json({ success: true, features: store.features });
//   }
// );

// export const updateStoreFeature = controllerWrapper(
//   "updateStoreFeature",
//   async (req, res) => {
//     const { storeId, featureId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     const feature = store.features.id(featureId);
//     if (!feature) return res.status(404).json({ message: "Feature not found" });
//     Object.assign(feature, req.body);
//     await store.save();
//     res.json({ success: true, features: store.features });
//   }
// );

// export const deleteStoreFeature = controllerWrapper(
//   "deleteStoreFeature",
//   async (req, res) => {
//     const { storeId, featureId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     store.features.id(featureId).remove();
//     await store.save();
//     res.json({ success: true, features: store.features });
//   }
// );

// export const addAchievement = controllerWrapper(
//   "addAchievement",
//   async (req, res) => {
//     const { storeId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     store.achievements.push(req.body);
//     await store.save();
//     res.json({ success: true, achievements: store.achievements });
//   }
// );

// export const updateAchievement = controllerWrapper(
//   "updateAchievement",
//   async (req, res) => {
//     const { storeId, achievementId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     const achievement = store.achievements.id(achievementId);
//     if (!achievement)
//       return res.status(404).json({ message: "Achievement not found" });
//     Object.assign(achievement, req.body);
//     await store.save();
//     res.json({ success: true, achievements: store.achievements });
//   }
// );

// export const deleteAchievement = controllerWrapper(
//   "deleteAchievement",
//   async (req, res) => {
//     const { storeId, achievementId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     store.achievements.id(achievementId).remove();
//     await store.save();
//     res.json({ success: true, achievements: store.achievements });
//   }
// );

// todo not implemented yet
export const getStoreDashboard = controllerWrapper(
  "getStoreDashboard",
  async (req, res) => {
    // Example: return basic stats
    const { id } = req.params;
    const store = await Store.findById(id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    // Add your own dashboard logic here
    res.json({ success: true, dashboard: { store } });
  }
);

// todo not implemented yet
export const getStoreStatistics = controllerWrapper(
  "getStoreStatistics",
  async (req, res) => {
    const { id } = req.params;
    let storeFilter = {};
    let productFilter = {};
    let orderFilter = {};

    if (req.user.role === "store") {
      // For store owners, get stats for their store
      let store;
      if (id) {
        store = await Store.findById(id);
      } else {
        store = await Store.findOne({ owner: req.user._id });
      }
      if (!store) return res.status(404).json({ message: "Store not found" });

      storeFilter = { _id: store._id };
      productFilter = { store: store._id };
      orderFilter = { store: store._id };
    } else if (req.user.role === "admin") {
      // For admin, get stats for all stores
      // No filter needed, aggregate all
    } else {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Get all stores matching the filter
    const stores = await Store.find(storeFilter);
    const storeIds = stores.map((s) => s._id);

    // Update filters for products and orders
    if (req.user.role === "store") {
      productFilter = { store: { $in: storeIds } };
      orderFilter = { store: { $in: storeIds } };
    }

    // Calculate basic stats
    const paidOrders = await Order.find({ ...orderFilter, isPaid: true });
    const totalRevenue = paidOrders.reduce(
      (acc, order) => acc + order.totalPrice,
      0
    );

    const allOrders = await Order.find(orderFilter);
    const totalOrders = allOrders.length;

    const products = await Product.find(productFilter);
    const totalProducts = products.length;

    // Total users (customers who placed orders)
    const uniqueCustomers = await Order.distinct("user", orderFilter);
    const totalUsers = uniqueCustomers.length;

    // Monthly revenue (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyOrders = await Order.find({
      ...orderFilter,
      isPaid: true,
      createdAt: { $gte: startOfMonth },
    });
    const monthlyRevenue = monthlyOrders.reduce(
      (acc, order) => acc + order.totalPrice,
      0
    );

    // Top products (by sales)
    const topProducts = await Order.aggregate([
      { $match: orderFilter },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          totalSales: {
            $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] },
          },
          totalUnits: { $sum: "$orderItems.quantity" },
        },
      },
      { $sort: { totalSales: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          name: "$product.name",
          sales: { $round: ["$totalSales", 2] },
          units: "$totalUnits",
          image: { $arrayElemAt: ["$product.images.url", 0] },
        },
      },
    ]);

    // Top countries (simplified, assuming address has country)
    // For now, placeholder
    const topCountries = [];

    // Best sellers (top stores by revenue, for admin)
    let bestSellers = [];
    if (req.user.role === "admin") {
      bestSellers = await Order.aggregate([
        { $match: orderFilter },
        {
          $group: {
            _id: "$store",
            totalRevenue: { $sum: "$totalPrice" },
            totalOrders: { $sum: 1 },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "stores",
            localField: "_id",
            foreignField: "_id",
            as: "store",
          },
        },
        { $unwind: "$store" },
        {
          $project: {
            name: "$store.storeName",
            revenue: { $round: ["$totalRevenue", 2] },
            orders: "$totalOrders",
            progress: 100, // placeholder
          },
        },
      ]);
    }

    // Product overview (recent products with basic info)
    const productOverview = products.slice(0, 5).map((p) => ({
      id: p._id,
      name: p.name,
      price: p.price,
      quantity: p.stock || 0,
      status: p.status || "active",
      revenue: 0, // placeholder, would need to calculate
      rating: p.averageRating || 0,
    }));

    // Sales change (compare with previous period)
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthOrders = await Order.find({
      ...orderFilter,
      isPaid: true,
      createdAt: { $gte: prevMonth, $lt: startOfMonth },
    });
    const prevMonthlyRevenue = prevMonthOrders.reduce(
      (acc, order) => acc + order.totalPrice,
      0
    );
    const salesChange =
      prevMonthlyRevenue > 0
        ? (
            ((monthlyRevenue - prevMonthlyRevenue) / prevMonthlyRevenue) *
            100
          ).toFixed(2) + "%"
        : "0%";

    res.json({
      success: true,
      statistics: {
        totalRevenue,
        totalOrders,
        totalUsers,
        totalProducts,
        monthlyRevenue,
        topProducts,
        topCountries,
        bestSellers,
        productOverview,
        salesChange,
        // Legacy fields
        totalSales: totalRevenue,
        totalIncome: totalRevenue,
        ordersNumber: totalOrders,
        productsNumber: totalProducts,
        paidOrders: paidOrders.length,
        unpaidOrders: allOrders.length - paidOrders.length,
      },
    });
  }
);

export const getAllStoreOrders = controllerWrapper(
  "getAllStoreOrders",
  async (req, res) => {
    const { id } = req.params;
    if (id) {
      const orders = await Order.find({ store: id });
      return res.json({ success: true, orders });
    }
    const store = await Store.findOne({ owner: req.user._id });
    if (!store)
      return res.status(404).json({ message: "Store not found for this user" });

    const orders = await Order.find({ store: store._id });
    return res.json({ success: true, orders });
  }
);

// todo not implemented yet
export const getAllStoreComments = controllerWrapper(
  "getAllStoreComments",
  async (req, res) => {
    const { id } = req.params;
    // Assuming you have a Comment model and store reference
    const comments = await Comment.find({ store: id });
    res.json({ success: true, comments });
  }
);

export const getAllStoreProducts = controllerWrapper(
  "getAllStoreProducts",
  async (req, res) => {
    const { id } = req.params;
    if (id) {
      const products = await Product.find({ store: id });
      return res.json({ success: true, products });
    }
    const store = await Store.findOne({ owner: req.user._id });
    if (!store)
      return res.status(404).json({ message: "Store not found for this user" });
    const products = await Product.find({ store: store._id });
    res.json({ success: true, products });
  }
);

export const getStoreComments = controllerWrapper(
  "getStoreComments",
  async (req, res) => {
    const { id } = req.params;
    if (id) {
      // get the comments from the store products
      const products = await Product.find({ store: id }).select("_id");
      // const productIds = products.map((p) => p._id);
      const comments = products.map((p) => p.reviews);
      // const comments = await Comment.find({ product: { $in: productIds } });
      return res.json({ success: true, comments });
    }
    const store = await Store.findOne({ owner: req.user._id });
    if (!store)
      return res.status(404).json({ message: "Store not found for this user" });
    const products = await Product.find({ store: store._id }).select("_id");
    // const productIds = products.map((p) => p._id);
    const comments = products.map((p) => p.reviews);

    // const comments = await Comment.find({ product: { $in: productIds } });
    return res.json({ success: true, comments });
    // Assuming you have a Comment model and store reference
    // const comments = await Comment.find({ store: storeId });
    // res.json({ success: true, comments });
  }
);
