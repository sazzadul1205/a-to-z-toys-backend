import { Router } from "express";
import {
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  getProductsForPurchase,
} from "../controllers/purchaseOrderController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
const adminOnly = [requireAuth, requireAdmin];

router.get("/", ...adminOnly, listPurchaseOrders);
router.get("/products", ...adminOnly, getProductsForPurchase);
router.get("/:id", ...adminOnly, getPurchaseOrder);
router.post("/", ...adminOnly, createPurchaseOrder);
router.put("/:id", ...adminOnly, updatePurchaseOrder);
router.post("/:id/receive", ...adminOnly, receivePurchaseOrder);
router.post("/:id/cancel", ...adminOnly, cancelPurchaseOrder);

export default router;