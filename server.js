// server.js
/** Feature: Server startup with database connection and graceful shutdown */
/** Feature: Error handling and process management */

import app from "./app.js";
import connectDB from "./config/db.config.js";
import env from "./config/env.config.js";

const PORT = env.PORT;

let server;

// Start server function
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();

    // Start HTTP server
    server = app.listen(PORT, () => {
      console.log("🚀 ============================================");
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🚀 Environment: ${env.NODE_ENV}`);
      console.log(`🚀 Health check: http://localhost:${PORT}/health`);
      console.log("🚀 ============================================");
    });

    // Handle server errors
    server.on("error", (error) => {
      console.error("❌ Server error:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  console.log(`🛑 Received ${signal}, shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      console.log("✅ HTTP server closed");

      // Close database connections
      try {
        const mongoose = (await import("mongoose")).default;
        await mongoose.connection.close();
        console.log("✅ Database connection closed");
      } catch (error) {
        console.error("❌ Error closing database:", error);
      }

      // Close Redis connections
      try {
        const redis = (await import("./config/redis.config.js")).default;
        await redis.quit();
        console.log("✅ Redis connection closed");
      } catch (error) {
        console.error("❌ Error closing Redis:", error);
      }

      console.log("✅ Graceful shutdown complete");
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error("❌ Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

// Handle termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start the server
startServer();

/* =====*** Server initialized ***==== */
