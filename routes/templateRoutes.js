import { Router } from "express";
import {
  getCompiledTemplate,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
} from "../controllers/templateController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Public endpoint for slip generation (no auth required for POS printing)
router.post("/receipts/:type", getCompiledTemplate);

// Admin-only endpoints
router.get("/", requireAuth, requireAdmin, listTemplates);
router.get("/:id", requireAuth, requireAdmin, getTemplate);
router.post("/", requireAuth, requireAdmin, createTemplate);
router.patch("/:id", requireAuth, requireAdmin, updateTemplate);
router.delete("/:id", requireAuth, requireAdmin, deleteTemplate);
router.post("/:id/preview", requireAuth, requireAdmin, previewTemplate);

export default router;