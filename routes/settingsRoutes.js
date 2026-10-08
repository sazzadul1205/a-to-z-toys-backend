import { Router } from "express";
import {
  getSettings,
  updateReviewSettings,
} from "../controllers/settingsController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Public read: the storefront needs to know whether the review
// section should render at all. Only the write is staff-only.
router.get("/", getSettings);
router.patch("/reviews", requireAuth, requireAdmin, updateReviewSettings);

export default router;
