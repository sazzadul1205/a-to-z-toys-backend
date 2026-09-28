import { Router } from "express";
import {
  listReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  getProductReviewSummary,
} from "../controllers/reviewController.js";

const router = Router();

// Specific route first (order matters!)
router.get("/product/:productId/summary", getProductReviewSummary);

router.get("/", listReviews);
router.get("/:id", getReview);
router.post("/", createReview);
router.put("/:id", updateReview);
router.delete("/:id", deleteReview);

export default router;