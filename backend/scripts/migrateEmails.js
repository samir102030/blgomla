import mongoose from "mongoose";
import User from "../models/user.model.js";
import { connectDB } from "../config/db.js";

async function migrateEmails() {
  try {
    await connectDB();
    const users = await User.find({});
    for (const user of users) {
      if (user.email !== user.email.toLowerCase()) {
        user.email = user.email.toLowerCase();
        await user.save();
        console.log(`Updated email for user ${user._id}`);
      }
    }
    console.log("Migration completed");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateEmails();
