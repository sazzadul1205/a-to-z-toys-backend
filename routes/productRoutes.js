import { Router } from "express";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const adminOnly = [requireAuth, requireAdmin];

router.get("/", listProducts);
router.get("/:id", getProduct);
router.post("/", ...adminOnly, createProduct);
router.put("/:id", ...adminOnly, updateProduct);
router.delete("/:id", ...adminOnly, deleteProduct);

export default router;
