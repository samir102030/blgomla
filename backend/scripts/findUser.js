import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });
import User from "../models/user.model.js";

const term = process.argv[2];
if (!term) {
  console.error("Usage: node backend/scripts/findUser.js <email-substring>");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const users = await User.find(
  { email: { $regex: escaped, $options: "i" } },
  { email: 1, name: 1, role: 1, isVerified: 1, active: 1, createdAt: 1 }
).lean();

if (users.length === 0) {
  console.log(`No users found matching "${term}".`);
} else {
  console.log(`Found ${users.length} user(s) matching "${term}":\n`);
  for (const u of users) {
    console.log({
      _id: u._id.toString(),
      email: u.email,
      name: u.name,
      role: u.role,
      isVerified: u.isVerified,
      active: u.active,
      createdAt: u.createdAt,
    });
  }
}
await mongoose.disconnect();
