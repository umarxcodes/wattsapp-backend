/* Server startup, database initialization, and graceful shutdown handling */

import app from "./app.js";
import connectDB from "./config/db.config.js";
import env from "./config/env.config.js";

const PORT = env.PORT;

let server;

/* Start application server */
const startServer = async () => {
  try {
    /* Connect to database before starting server */
    await connectDB();

    /* Start HTTP server */
    server = app.listen(PORT, () => {
      console.log("============================================");
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Health check: /health`);
      console.log("============================================");
    });

    /* Handle runtime server errors */
    server.on("error", (error) => {
      console.error("Server error:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

/* Graceful shutdown handler */
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}, shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      console.log("HTTP server closed");

      /* Close MongoDB connection */
      try {
        const mongoose = (await import("mongoose")).default;
        await mongoose.connection.close();
        console.log("Database connection closed");
      } catch (error) {
        console.error("Error closing database:", error);
      }

      /* Close Redis connection */
      try {
        const redis = (await import("./config/redis.config.js")).default;
        await redis.quit();
        console.log("Redis connection closed");
      } catch (error) {
        console.error("Error closing Redis:", error);
      }

      console.log("Graceful shutdown complete");
      process.exit(0);
    });

    /* Force shutdown fallback after timeout */
    setTimeout(() => {
      console.error("Forced shutdown due to timeout");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

/* Handle unhandled promise rejections */
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason, promise);
  gracefulShutdown("unhandledRejection");
});

/* Handle uncaught exceptions */
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

/* Handle termination signals */
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

/* Initialize server */
startServer();
