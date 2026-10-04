import { Router } from "express";
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const adminOnly = [requireAuth, requireAdmin];

router.get("/", listCategories);
router.get("/:id", getCategory);
router.post("/", ...adminOnly, createCategory);
router.put("/:id", ...adminOnly, updateCategory);
router.delete("/:id", ...adminOnly, deleteCategory);

export default router;
