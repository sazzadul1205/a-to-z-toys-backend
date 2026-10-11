import { Router } from "express";
import {
  getProductInOutSummary,
  getProductInOutTrends,
  getProductInOutByProduct,
  getStockMovementDetails,
  getDashboardAnalytics,
} from "../controllers/analyticsController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const adminOnly = [requireAuth, requireAdmin];

// All analytics routes are admin-only
router.use(...adminOnly);

// Product In/Out (Stock Movement) Analytics
router.get("/product-in-out/summary", getProductInOutSummary);
router.get("/product-in-out/trends", getProductInOutTrends);
router.get("/product-in-out/by-product", getProductInOutByProduct);
router.get("/product-in-out/movements", getStockMovementDetails);

// Combined Dashboard
router.get("/dashboard", getDashboardAnalytics);

export default router;