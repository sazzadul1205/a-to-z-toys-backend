import { Router } from "express";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const adminOnly = [requireAuth, requireAdmin];

// Accounts are admin-only: the storefront is a showcase and has no sign-up.
router.get("/", ...adminOnly, listUsers);
router.get("/:id", ...adminOnly, getUser);
router.post("/", ...adminOnly, createUser);
router.put("/:id", ...adminOnly, updateUser);
router.delete("/:id", ...adminOnly, deleteUser);

export default router;
