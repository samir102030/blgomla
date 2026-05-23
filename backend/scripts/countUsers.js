import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });
import User from "../models/user.model.js";

await mongoose.connect(process.env.MONGO_URI);
const host = mongoose.connection.host;
const db = mongoose.connection.name;
const count = await User.countDocuments();
console.log({ host, db, totalUsers: count });
await mongoose.disconnect();
