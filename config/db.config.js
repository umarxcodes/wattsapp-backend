import mongoose from "mongoose";
import { env } from "./env.config.js";

// ====*** MongoDB Connection Options ***=====

const mongooseOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  autoIndex: env.NODE_ENV !== "production",
};

// ====*** MongoDB Connection State ***=====

let connectionPromise = null;

// ====*** Connect MongoDB ***=====

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.MONGODB_URI, mongooseOptions);
  }

  try {
    await connectionPromise;
    return mongoose.connection;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
};

// ====*** Disconnect MongoDB ***=====

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

// ====*** MongoDB Event Logging ***=====

mongoose.connection.on("connected", () => {
  console.log("MongoDB connected");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB error:", error.message);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});
