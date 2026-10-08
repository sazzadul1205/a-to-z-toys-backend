import { Router } from "express";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleActive,
  setReviewsEnabled,
  bulkDelete,
  bulkSetFlag,
} from "../controllers/productController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const adminOnly = [requireAuth, requireAdmin];

router.get("/", listProducts);
router.get("/:id", getProduct);
router.post("/", ...adminOnly, createProduct);
router.put("/:id", ...adminOnly, updateProduct);
router.patch("/:id/toggle-active", ...adminOnly, toggleActive);
router.patch("/:id/reviews", ...adminOnly, setReviewsEnabled);
router.delete("/:id", ...adminOnly, deleteProduct);
// Bulk actions: ids in the JSON body, flag toggles for isActive/reviewsEnabled.
router.post("/bulk/delete", ...adminOnly, bulkDelete);
router.post("/bulk/flag", ...adminOnly, bulkSetFlag);

export default router;
