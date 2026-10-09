import { Router } from "express";
import {
  listInventory,
  getProductInventory,
  adjustStock,
  bulkAdjustStock,
  getStockMovements,
  getLowStockAlerts,
} from "../controllers/inventoryController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
const adminOnly = [requireAuth, requireAdmin];

router.get("/", ...adminOnly, listInventory);
router.get("/alerts", ...adminOnly, getLowStockAlerts);
router.get("/movements", ...adminOnly, getStockMovements);
router.get("/:id", ...adminOnly, getProductInventory);
router.post("/:id/adjust", ...adminOnly, adjustStock);
router.post("/bulk-adjust", ...adminOnly, bulkAdjustStock);

export default router;