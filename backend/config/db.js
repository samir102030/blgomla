import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout for initial connection
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      maxPoolSize: 10, // Maximum number of socket connections
      retryWrites: true,
      retryReads: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Connection event listeners
    mongoose.connection.on("connected", () => {
      console.log("Mongoose connected to DB");
    });

    mongoose.connection.on("error", (err) => {
      console.error("Mongoose connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("Mongoose disconnected from DB");
    });
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error("Full error object:", error); // Log full error object
    process.exit(1);
  }
};

export default connectDB;
