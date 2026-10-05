import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { apiLimiter } from "./config/rateLimits.js";
import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "uploads", "processed");

const app = express();

// Behind a reverse proxy? Set TRUST_PROXY to the number of proxy hops so that
// req.ip (and therefore rate limiting) reflects the real client. Do not use
// "true" blindly: it lets clients spoof X-Forwarded-For.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set("trust proxy", Number.isFinite(hops) && hops > 0 ? hops : false);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Auth is header-based, so credentials are not needed and omitting them avoids
// the browser rejecting a wildcard origin.
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
}));

// Serve uploaded images before the limiter: these are cheap, cacheable, and
// public, so they should not consume a visitor's API request budget.
app.use("/uploads", express.static(UPLOADS_DIR, {
  maxAge: "30d",
  etag: true,
  lastModified: true,
}));

// Rate limiting
app.use(apiLimiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging (development)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get("/", (req, res) => {
  res.json({ 
    message: "a-to-z-toys API is running",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// Routes
app.use("/auth", authRoutes);
app.use("/categories", categoryRoutes);
app.use("/products", productRoutes);
app.use("/users", userRoutes);
app.use("/orders", orderRoutes);
app.use("/reviews", reviewRoutes);
app.use("/upload", uploadRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  const status = err.status || 500;
  const message = status === 500 ? "Internal server error" : err.message;
  res.status(status).json({ 
    error: message,
    ...(err.errors && { errors: err.errors }),
    ...(err.code && { code: err.code }),
  });
});

export default app;