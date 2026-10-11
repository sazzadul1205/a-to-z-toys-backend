import { Router } from "express";
import {
  listExpenseCategories,
  getExpenseCategory,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  bulkDeleteExpenseCategories,
} from "../controllers/expenseCategoryController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const adminOnly = [requireAuth, requireAdmin];

router.get("/", listExpenseCategories);
router.get("/:id", getExpenseCategory);
router.post("/", ...adminOnly, createExpenseCategory);
router.put("/:id", ...adminOnly, updateExpenseCategory);
router.delete("/:id", ...adminOnly, deleteExpenseCategory);
router.post("/bulk/delete", ...adminOnly, bulkDeleteExpenseCategories);

export default router;