import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import helmet from "helmet";
import { env } from "./config/env.config.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { generalLimiter } from "./middlewares/rateLimiter.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { blockRouter } from "./routes/block.routes.js";
import { groupRouter } from "./routes/group.routes.js";
import { messageRouter } from "./routes/message.routes.js";

// ====*** Express Application Setup ***=====

export const app = express();
const allowedOrigins = [env.CLIENT_URL, env.SOCKET_CORS_ORIGIN];

app.set("trust proxy", 1);

// ====*** Security Middleware ***=====

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: {
      policy: "no-referrer",
    },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin is not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ====*** Request Parsing Middleware ***=====

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());
app.use(mongoSanitize());

// ====*** API Rate Limiting ***=====

app.use("/api", generalLimiter);

// ====*** Health Route ***=====

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ====*** API Routes ***=====

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/blocks", blockRouter);
app.use("/api/v1/groups", groupRouter);

// ====*** Not Found Handler ***=====

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// ====*** Global Error Handler ***=====

app.use(errorHandler);
