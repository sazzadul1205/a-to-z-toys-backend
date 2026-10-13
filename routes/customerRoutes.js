import { Router } from "express";
import {
  listCustomers,
  searchCustomers,
  getCustomerDetail,
} from "../controllers/customerController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const adminOnly = [requireAuth, requireAdmin];

router.get("/", ...adminOnly, listCustomers);
router.get("/search", ...adminOnly, searchCustomers);
router.get("/:phone", ...adminOnly, getCustomerDetail);

export default router;