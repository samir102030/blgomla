/**
 * Promote a user to admin. Usage:
 *   node backend/scripts/promoteToAdmin.js you@example.com
 *   node backend/scripts/promoteToAdmin.js you@example.com super_admin
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import User from "../models/user.model.js";

const [, , emailArg, roleArg = "admin"] = process.argv;

if (!emailArg) {
  console.error("Usage: node scripts/promoteToAdmin.js <email> [admin|super_admin]");
  process.exit(1);
}

if (!["admin", "super_admin"].includes(roleArg)) {
  console.error(`Invalid role "${roleArg}". Use "admin" or "super_admin".`);
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
console.log("✅ Connected to MongoDB");

const user = await User.findOne({ email: emailArg.toLowerCase() });
if (!user) {
  console.error(`❌ No user found with email ${emailArg}`);
  await mongoose.disconnect();
  process.exit(1);
}

const prev = user.role;
user.role = roleArg;
user.active = true;
await user.save();

console.log(`✅ ${user.email}: ${prev} → ${roleArg}`);
await mongoose.disconnect();
