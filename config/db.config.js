/* Database connection setup with retry handling and graceful shutdown */

import mongoose from "mongoose";
import env from "./env.config.js";

/* Establish MongoDB connection with retry mechanism */
const connectDB = async (retries = 5) => {
  try {
    /* Production-ready MongoDB connection options */
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };

    /* Connect application to MongoDB */
    await mongoose.connect(env.MONGODB_URI, options);

    console.log("MongoDB connected successfully");
  } catch (error) {
    /* Handle initial connection failure */
    console.error("MongoDB connection error:", error.message);

    /* Retry connection if attempts are still available */
    if (retries > 0) {
      console.log(
        `Retrying MongoDB connection in 5 seconds... (${retries} attempts left)`
      );

      setTimeout(() => connectDB(retries - 1), 5000);
    } else {
      /* Exit application after all retries fail */
      console.error("Failed to connect to MongoDB after all retry attempts");
      process.exit(1);
    }
  }
};

/* Listen for database disconnection during runtime */
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

/* Listen for runtime MongoDB errors */
mongoose.connection.on("error", (error) => {
  console.error("MongoDB runtime error:", error);
});

/* Close MongoDB connection safely before application shutdown */
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Closing MongoDB connection...`);

  await mongoose.connection.close();

  console.log("MongoDB connection closed successfully");
  process.exit(0);
};

/* Handle manual process termination */
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

/* Handle production/server termination signals */
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

export default connectDB;
