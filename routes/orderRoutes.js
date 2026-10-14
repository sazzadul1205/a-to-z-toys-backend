import { Router } from "express";
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  getRecentPublic,
} from "../controllers/orderController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const adminOnly = [requireAuth, requireAdmin];

// Public endpoint: the storefront shows a "Recent POS Orders" section so
// visitors can see the shop is active. Only completed sales are exposed.
router.get("/recent", getRecentPublic);

// Orders are recorded by staff; public checkout hands off to WhatsApp.
router.get("/", ...adminOnly, listOrders);
router.get("/:id", ...adminOnly, getOrder);
router.post("/", ...adminOnly, createOrder);
router.put("/:id", ...adminOnly, updateOrder);
router.delete("/:id", ...adminOnly, deleteOrder);

export default router;
