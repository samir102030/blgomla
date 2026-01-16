import mongoose from "mongoose";
import Category from "../models/category.model.js";
import dotenv from "dotenv";

dotenv.config();

const listCategories = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Fetch all categories
    const categories = await Category.find({ deleted: { $ne: true } })
      .select("name description slug isActive")
      .sort("name");

    console.log("\n=== CATEGORIES IN DATABASE ===\n");
    
    if (categories.length === 0) {
      console.log("No categories found in the database.");
    } else {
      categories.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name}`);
        if (cat.description) {
          console.log(`   Description: ${cat.description}`);
        }
        console.log(`   Slug: ${cat.slug || 'N/A'}`);
        console.log(`   Active: ${cat.isActive ? 'Yes' : 'No'}`);
        console.log(`   ID: ${cat._id}`);
        console.log("");
      });
      
      console.log(`\nTotal: ${categories.length} categories`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

listCategories();

