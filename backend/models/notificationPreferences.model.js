import mongoose from "mongoose";

const channelSchema = {
  orders: { type: Boolean, default: true },
  promotions: { type: Boolean, default: true },
  productUpdates: { type: Boolean, default: true },
  accountActivity: { type: Boolean, default: true },
  vendorUpdates: { type: Boolean, default: true },
};

const notificationPreferencesSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    emailNotifications: channelSchema,
    pushNotifications: channelSchema,
    smsNotifications: {
      orders: { type: Boolean, default: false },
      accountActivity: { type: Boolean, default: false },
    },
    frequency: {
      type: String,
      enum: ["immediate", "daily", "weekly"],
      default: "immediate",
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: "22:00" },
      endTime: { type: String, default: "08:00" },
    },
  },
  { timestamps: true }
);

const NotificationPreferences = mongoose.model(
  "NotificationPreferences",
  notificationPreferencesSchema
);
export default NotificationPreferences;
