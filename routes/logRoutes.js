import { Router } from "express";
import {
  getLogFilesHandler,
  readLogHandler,
  clearLogsHandler,
} from "../controllers/logController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const adminOnly = [requireAuth, requireAdmin];

// List available log files
router.get("/", ...adminOnly, getLogFilesHandler);

// Read a specific log file
router.get("/:filename", ...adminOnly, readLogHandler);

// Clear all log files
router.delete("/", ...adminOnly, clearLogsHandler);

export default router;
