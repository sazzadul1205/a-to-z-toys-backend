import { Router } from "express";
import {
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  bulkDeleteExpenses,
  getExpenseSummary,
  getExpenseTrends,
  getExpenseByCategory,
  getTopExpenses,
} from "../controllers/expenseController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const adminOnly = [requireAuth, requireAdmin];

// CRUD
router.get("/", listExpenses);
router.get("/:id", getExpense);
router.post("/", ...adminOnly, createExpense);
router.put("/:id", ...adminOnly, updateExpense);
router.delete("/:id", ...adminOnly, deleteExpense);
router.post("/bulk/delete", ...adminOnly, bulkDeleteExpenses);

// Analytics / Graphs endpoints
router.get("/analytics/summary", getExpenseSummary);
router.get("/analytics/trends", getExpenseTrends);
router.get("/analytics/by-category", getExpenseByCategory);
router.get("/analytics/top", getTopExpenses);

export default router;