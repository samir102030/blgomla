import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    // Basic Store Information
    name: {
      type: String,
      required: [true, "Store name is required"],
      unique: [true, "Store name already exists"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    alternativePhone: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    logo: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },

    // Business Information
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
    },
    businessType: {
      type: String,
      enum: ["individual", "company", "partnership"],
      required: [true, "Business type is required"],
    },
    businessDescription: {
      type: String,
      trim: true,
    },
    commercialRegistrationNumber: {
      type: String,
      trim: true,
    },
    taxNumber: {
      type: String,
      trim: true,
    },

    // Legal Entity Information
    legalEntityType: {
      type: String,
      enum: ["egyptian_tax_authority", "ministry_supply_trade", "other"],
      required: [true, "Legal entity type is required"],
    },
    licenseNumber: {
      type: String,
      required: [true, "License number is required"],
      trim: true,
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    companyAddress: {
      type: String,
      required: [true, "Company address is required"],
      trim: true,
    },
    issueDate: {
      type: Date,
      required: [true, "Issue date is required"],
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    allowedActivities: {
      type: String,
      trim: true,
    },

    // Contact Information
    contactPersonName: {
      type: String,
      required: [true, "Contact person name is required"],
      trim: true,
    },

    // Address Information
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    governorate: {
      type: String,
      required: [true, "Governorate is required"],
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },

    // Product and Business Details
    productCategories: [
      {
        type: String,
        trim: true,
      },
    ],
    expectedMonthlyVolume: {
      type: Number,
      min: 0,
    },

    // Store Status and Approval
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended", "active"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },

    // Documents
    documents: {
      commercialRegistration: {
        type: String,
        trim: true,
      },
      taxCard: {
        type: String,
        trim: true,
      },
      nationalId: {
        type: String,
        trim: true,
      },
      bankStatement: {
        type: String,
        trim: true,
      },
    },

    // Agreement Acceptance
    termsAccepted: {
      type: Boolean,
      required: [true, "Terms must be accepted"],
      default: false,
    },
    privacyPolicyAccepted: {
      type: Boolean,
      required: [true, "Privacy policy must be accepted"],
      default: false,
    },

    // Store Metrics
    totalSales: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalProducts: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    commission: {
      type: Number,
      min: 0,
      max: 100,
      default: 5, // 5% default commission
    },

    // Store Customization
    subscribers: [
      {
        type: String,
        trim: true,
      },
    ],
    slider: [
      {
        image: {
          type: String,
          trim: true,
        },
        title: {
          type: String,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
      },
    ],
    socialLinks: [
      {
        platform: {
          type: String,
          trim: true,
        },
        url: {
          type: String,
          trim: true,
        },
      },
    ],
    features: [
      {
        title: {
          type: String,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        icon: {
          type: String,
          trim: true,
        },
      },
    ],
    about: {
      type: String,
      trim: true,
    },
    story: {
      type: String,
      trim: true,
    },
    achievements: [
      {
        number: {
          type: Number,
          required: true,
        },
        name: {
          type: String,
          trim: true,
        },
      },
    ],
  },
  { timestamps: true }
);

// Indexes for better query performance
// storeSchema.index({ owner: 1 });
// storeSchema.index({ status: 1 });
// storeSchema.index({ businessName: 1 });
// storeSchema.index({ city: 1, governorate: 1 });
// storeSchema.index({ productCategories: 1 });
// storeSchema.index({ rating: -1 });
// storeSchema.index({ isActive: 1, deleted: 1 });

// Compound index for efficient filtering
// storeSchema.index({ status: 1, isActive: 1, deleted: 1 });

// Virtual for full address
// storeSchema.virtual("fullAddress").get(function () {
//   const parts = [this.address, this.city, this.governorate, this.postalCode];
//   return parts.filter((part) => part && part.trim()).join(", ");
// });

// // Virtual for contact info
// storeSchema.virtual("contactInfo").get(function () {
//   return {
//     name: this.contactPersonName,
//     email: this.email,
//     phone: this.phone,
//     alternativePhone: this.alternativePhone,
//   };
// });

// // Pre-save middleware to validate expiry date
// storeSchema.pre("save", function (next) {
//   if (this.expiryDate && this.expiryDate <= new Date()) {
//     this.status = "suspended";
//   }
//   next();
// });

// // Pre-save middleware to set approval/rejection timestamps
// storeSchema.pre("save", function (next) {
//   if (this.isModified("status")) {
//     if (this.status === "approved" && !this.approvedAt) {
//       this.approvedAt = new Date();
//     } else if (this.status === "rejected" && !this.rejectedAt) {
//       this.rejectedAt = new Date();
//     }
//   }
//   next();
// });

// // Method to check if store is eligible for activation
// storeSchema.methods.isEligibleForActivation = function () {
//   return (
//     this.status === "approved" &&
//     this.expiryDate > new Date() &&
//     this.termsAccepted &&
//     this.privacyPolicyAccepted
//   );
// };

// // Method to get store performance metrics
// storeSchema.methods.getPerformanceMetrics = function () {
//   return {
//     totalSales: this.totalSales,
//     totalProducts: this.totalProducts,
//     totalOrders: this.totalOrders,
//     rating: this.rating,
//     totalReviews: this.totalReviews,
//     averageOrderValue:
//       this.totalOrders > 0 ? this.totalSales / this.totalOrders : 0,
//   };
// };

// // Static method to find stores by category
// storeSchema.statics.findByCategory = function (category) {
//   return this.find({
//     productCategories: category,
//     status: "approved",
//     isActive: true,
//     deleted: false,
//   });
// };

// // Static method to find active stores
// storeSchema.statics.findActive = function () {
//   return this.find({
//     status: "approved",
//     isActive: true,
//     deleted: false,
//     expiryDate: { $gt: new Date() },
//   });
// };

const Store = mongoose.model("Store", storeSchema);
export default Store;
