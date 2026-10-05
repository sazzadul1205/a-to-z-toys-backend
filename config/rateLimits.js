import rateLimit from "express-rate-limit";

// Limits are read per request rather than at import time so tests can tighten
// them via env without re-importing the router.
function resolveLimit(envName, productionDefault, testDefault) {
  return (req, res) => {
    const configured = Number(process.env[envName]);
    if (Number.isFinite(configured) && configured > 0) return configured;
    return process.env.NODE_ENV === "test" ? testDefault : productionDefault;
  };
}

function resolveWindow(envName, fallbackMs) {
  const configured = Number(process.env[envName]);
  return Number.isFinite(configured) && configured > 0 ? configured : fallbackMs;
}

// Reviews are anonymous and public, so submission gets its own budget instead
// of consuming a visitor's general API allowance.
export const reviewSubmitLimiter = rateLimit({
  windowMs: resolveWindow("REVIEW_SUBMIT_WINDOW_MS", 60 * 60 * 1000),
  max: resolveLimit("REVIEW_SUBMIT_LIMIT", 10, 1000),
  message: { error: "Too many reviews submitted, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// The general API budget. Configurable because a hardcoded ceiling means the only
// way to raise it is to edit source and restart, and because an end-to-end browser
// run legitimately makes far more than 100 requests in a single window.
export const apiLimiter = rateLimit({
  windowMs: resolveWindow("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  max: resolveLimit("RATE_LIMIT_MAX", 100, 10_000),
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});