import { Router } from "express";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleActive,
  bulkDelete,
  bulkSetFlag,
  adjustStock,
} from "../controllers/productController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const adminOnly = [requireAuth, requireAdmin];

router.get("/", listProducts);
router.get("/:id", getProduct);
router.post("/", ...adminOnly, createProduct);
router.put("/:id", ...adminOnly, updateProduct);
router.patch("/:id/toggle-active", ...adminOnly, toggleActive);
router.delete("/:id", ...adminOnly, deleteProduct);
// Bulk actions: ids in the JSON body, isActive flag toggles.
router.post("/bulk/delete", ...adminOnly, bulkDelete);
router.post("/bulk/flag", ...adminOnly, bulkSetFlag);
// Stock adjustment: admin only, requires adjustment (integer) and reason
router.post("/:id/adjust-stock", ...adminOnly, adjustStock);

export default router;
