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

// Reviews are anonymous and public, so submission gets its own budget instead
// of consuming a visitor's general API allowance.
export const reviewSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: resolveLimit("REVIEW_SUBMIT_LIMIT", 10, 1000),
  message: { error: "Too many reviews submitted, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});