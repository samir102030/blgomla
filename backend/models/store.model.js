import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
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
    description: {
      type: String,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    address: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
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
    // subscribers: [
    //   {
    //     type: String,
    //     trim: true,
    //   },
    // ],
    // slider: [
    //   {
    //     image: {
    //       type: String,
    //       trim: true,
    //     },
    //     title: {
    //       type: String,
    //       trim: true,
    //     },
    //     description: {
    //       type: String,
    //       trim: true,
    //     },
    //   },
    // ],
    // socialLinks: [
    //   {
    //     platform: {
    //       type: String,
    //       trim: true,
    //     },
    //     url: {
    //       type: String,
    //       trim: true,
    //     },
    //   },
    // ],
    // features: [
    //   {
    //     title: {
    //       type: String,
    //       trim: true,
    //     },
    //     description: {
    //       type: String,
    //       trim: true,
    //     },
    //     icon: {
    //       type: String,
    //       trim: true,
    //     },
    //   },
    // ],
    // about: {
    //   type: String,
    //   trim: true,
    // },
    // story: {
    //   type: String,
    //   trim: true,
    // },
    // achievements: [
    //   {
    //     number: {
    //       type: Number,
    //       required: true,
    //     },
    //     name: {
    //       type: String,
    //       trim: true,
    //     },
    //   },
    // ],
  },
  { timestamps: true }
);

const Store = mongoose.model("Store", storeSchema);
export default Store;
