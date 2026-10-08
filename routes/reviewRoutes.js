import { Router } from "express";
import {
  listReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  getProductReviewSummary,
  bulkDeleteReviews,
  deleteReviewsByProduct,
} from "../controllers/reviewController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { reviewSubmitLimiter } from "../config/rateLimits.js";

const router = Router();

const adminOnly = [requireAuth, requireAdmin];

// Specific route first (order matters!)
router.get("/product/:productId/summary", getProductReviewSummary);

router.get("/", listReviews);
router.get("/:id", getReview);
// Reviews are anonymous, so anyone may leave one, within the submit budget.
router.post("/", reviewSubmitLimiter, createReview);
router.put("/:id", ...adminOnly, updateReview);
router.delete("/:id", ...adminOnly, deleteReview);
// Bulk actions for the staff area.
router.post("/bulk/delete", ...adminOnly, bulkDeleteReviews);
router.delete("/product/:productId", ...adminOnly, deleteReviewsByProduct);

export default router;