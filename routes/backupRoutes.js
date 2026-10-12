import { Router } from "express";
import {
  createBackupHandler,
  restoreBackupHandler,
  listBackupsHandler,
  deleteBackupHandler,
  getBackupHandler,
} from "../controllers/backupController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const adminOnly = [requireAuth, requireAdmin];

// List available backups
router.get("/", ...adminOnly, listBackupsHandler);

// Create a new backup
router.post("/", ...adminOnly, createBackupHandler);

// Get backup data (preview)
router.get("/:filename/data", ...adminOnly, getBackupHandler);

// Restore from a backup
router.post("/:filename/restore", ...adminOnly, restoreBackupHandler);

// Delete a backup
router.delete("/:filename", ...adminOnly, deleteBackupHandler);

export default router;
