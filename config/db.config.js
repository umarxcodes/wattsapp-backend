// config/db.config.js
/** Feature: MongoDB connection with retry logic and graceful shutdown */
/** Feature: Production-ready connection options */

import mongoose from "mongoose";
import env from "./env.config.js";

const connectDB = async (retries = 5) => {
  try {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };

    await mongoose.connect(env.MONGODB_URI, options);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    if (retries > 0) {
      console.log(
        `🔄 Retrying connection in 5 seconds... (${retries} attempts left)`
      );
      setTimeout(() => connectDB(retries - 1), 5000);
    } else {
      console.error("❌ Failed to connect to MongoDB after all retries");
      process.exit(1);
    }
  }
};

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected");
});

mongoose.connection.on("error", (error) => {
  console.error("❌ MongoDB runtime error:", error);
});

const gracefulShutdown = async (signal) => {
  console.log(`🛑 Received ${signal}, closing MongoDB connection...`);
  await mongoose.connection.close();
  console.log("✅ MongoDB connection closed");
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

export default connectDB;
/* =====*** Database connection configured ***==== */
