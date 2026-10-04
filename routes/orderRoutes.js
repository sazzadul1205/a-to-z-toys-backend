import { Router } from "express";
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
} from "../controllers/orderController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const adminOnly = [requireAuth, requireAdmin];

// Orders are recorded by staff; public checkout hands off to WhatsApp.
router.get("/", ...adminOnly, listOrders);
router.get("/:id", ...adminOnly, getOrder);
router.post("/", ...adminOnly, createOrder);
router.put("/:id", ...adminOnly, updateOrder);
router.delete("/:id", ...adminOnly, deleteOrder);

export default router;
