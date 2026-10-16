import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { apiLimiter } from "./config/rateLimits.js";
import { requestLogger, errorLogger } from "./middleware/logging.js";
import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import purchaseOrderRoutes from "./routes/purchaseOrderRoutes.js";
import expenseCategoryRoutes from "./routes/expenseCategoryRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import backupRoutes from "./routes/backupRoutes.js";
import logRoutes from "./routes/logRoutes.js";
import templateRoutes from "./routes/templateRoutes.js";
import { DATA_SOURCE } from "./config/dataSource.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "uploads", "processed");

const app = express();

// ---------------------------------------------------------------------------
// Base path handling
// ---------------------------------------------------------------------------
// On cPanel the app is exposed at a subpath (e.g. /backend), but Passenger
// does not always strip that prefix before handing the request to Express.
// We therefore mount every API route twice: once at "/" (so it works when
// Passenger strips the prefix, e.g. locally or on some hosts) and once at
// BASE_PATH (so it works when it does not, e.g. this cPanel deployment).
//
// Override with BASE_PATH in .env. Set to "" to disable the prefixed mount.
const BASE_PATH = (process.env.BASE_PATH ?? "/backend").replace(/\/+$/, "");

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
// Mount under both /uploads (local/dev) and /backend/uploads (cPanel).
const uploadsStatic = express.static(UPLOADS_DIR, {
  maxAge: "30d",
  etag: true,
  lastModified: true,
});
app.use("/uploads", uploadsStatic);
if (BASE_PATH && BASE_PATH !== "/") {
  app.use(`${BASE_PATH}/uploads`, uploadsStatic);
}

// Rate limiting
app.use(apiLimiter);

// Request logging
app.use(requestLogger);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ---------------------------------------------------------------------------
// API router — mounted at both "/" and BASE_PATH
// ---------------------------------------------------------------------------
const api = express.Router();

// Health check
api.get("/", (req, res) => {
  res.json({
    message: "a-to-z-toys API is running",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
    engine: DATA_SOURCE,
    basePath: BASE_PATH || "/",
  });
});

// Routes
api.use("/auth", authRoutes);
api.use("/categories", categoryRoutes);
api.use("/products", productRoutes);
api.use("/users", userRoutes);
api.use("/orders", orderRoutes);
api.use("/reviews", reviewRoutes);
api.use("/settings", settingsRoutes);
api.use("/upload", uploadRoutes);
api.use("/inventory", inventoryRoutes);
api.use("/purchase-orders", purchaseOrderRoutes);
api.use("/expense-categories", expenseCategoryRoutes);
api.use("/expenses", expenseRoutes);
api.use("/reports", analyticsRoutes);
api.use("/analytics", analyticsRoutes);
api.use("/customers", customerRoutes);
api.use("/backup", backupRoutes);
api.use("/logs", logRoutes);
api.use("/templates", templateRoutes);

// Mount at "/" first so requests whose prefix was stripped still work, then
// at BASE_PATH for requests that kept the prefix.
app.use("/", api);
if (BASE_PATH && BASE_PATH !== "/") {
  app.use(BASE_PATH, api);
}

// Error logging — must come before the error handler
app.use(errorLogger);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = status === 500 ? "Internal server error" : err.message;
  res.status(status).json({
    error: message,
    ...(err.errors && { errors: err.errors }),
    ...(err.code && { code: err.code }),
  });
});

export default app;