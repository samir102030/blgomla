// One-off: any existing user whose isVerified is false was created before
// the login gate started enforcing email verification. Locking them out
// retroactively would be a regression, so we flip them to true.
//
// Run AFTER deploying the enforce-isVerified change. Dry-run by default.
// Usage:
//   MONGO_URI="<atlas uri>" node scripts/grandfatherExistingUsers.mjs
//   MONGO_URI="<atlas uri>" node scripts/grandfatherExistingUsers.mjs --apply

import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/user.model.js";

const APPLY = process.argv.includes("--apply");

const main = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is required");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected. Mode: ${APPLY ? "APPLY (writes)" : "DRY RUN (no writes)"}`);

  const filter = { $or: [{ isVerified: false }, { isVerified: { $exists: false } }] };
  const count = await User.countDocuments(filter);
  console.log(`Users to grandfather (set isVerified=true): ${count}`);

  if (!APPLY) {
    console.log("Dry run complete. Re-run with --apply to write.");
    await mongoose.disconnect();
    return;
  }
  const result = await User.updateMany(filter, { $set: { isVerified: true } });
  console.log(`Modified ${result.modifiedCount} documents.`);
  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
