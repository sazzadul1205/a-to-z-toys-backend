import { logger } from "../config/logger.js";

function generateRequestId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
}

export function requestLogger(req, res, next) {
  const requestId = req.headers["x-request-id"] || generateRequestId();
  req.id = requestId;
  global.__requestId = requestId;

  const startTime = Date.now();
  const { method, url } = req;
  const ip = req.ip || req.connection?.remoteAddress || "-";

  logger.http("Incoming request", { method, url, ip, userAgent: req.get("user-agent") });

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "http";
    logger[level](`Response: ${method} ${url} ${statusCode} (${duration}ms)`, {
      method,
      url,
      statusCode,
      duration,
    });
    global.__requestId = null;
  });

  res.on("close", () => {
    global.__requestId = null;
  });

  next();
}

export function errorLogger(err, req, res, next) {
  global.__requestId = req.id;
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    status: err.status,
    code: err.code,
  });
  global.__requestId = null;
  next(err);
}
