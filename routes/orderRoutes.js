import { Router } from "express";
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
} from "../controllers/orderController.js";

const router = Router();

router.get("/", listOrders);
router.get("/:id", getOrder);
router.post("/", createOrder);
router.put("/:id", updateOrder);
router.delete("/:id", deleteOrder);

export default router;