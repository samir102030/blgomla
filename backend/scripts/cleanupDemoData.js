import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import { wipeDemo } from "./seedDemoData.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/belgomla";

async function cleanup() {
  await mongoose.connect(MONGO_URI);
  console.log(
    `✅ Connected to ${mongoose.connection.host}/${mongoose.connection.name}`
  );

  const removed = await wipeDemo();
  console.log("🧹 Removed demo data:", removed);

  await mongoose.disconnect();
  console.log("✨ Cleanup complete.");
}

cleanup().catch(async (err) => {
  console.error("❌ Cleanup failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
