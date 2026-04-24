/* Express application setup with security, middleware, and route configuration */

import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { generalLimiter } from "./middlewares/rateLimiter.middleware.js";
import env from "./config/env.config.js";

const app = express();

/* Trust proxy (important for rate limiting and real IP detection behind proxies) */
app.set("trust proxy", 1);

/* Security middlewares */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

/* CORS configuration */
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* Global rate limiting for API routes */
app.use("/api/", generalLimiter);

/* Request parsing middlewares */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

/* Health check endpoint */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: "1.0.0",
  });
});

/* API routes */
app.use("/api/v1/auth", authRoutes);

/* 404 handler for undefined routes */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

/* Global error handling middleware (must be last) */
app.use(errorHandler);

export default app;
