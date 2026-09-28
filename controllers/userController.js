import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { validateAndBuild } from "../config/validate.js";
import * as store from "../config/jsonStore.js";

const COLLECTION = "users";
const SALT_ROUNDS = 10;

// Never leak password from stored JSON
function stripPassword(user) {
  if (!user) return user;
  const { password, ...safe } = user;
  return safe;
}

// GET /users
export async function listUsers(req, res) {
  try {
    const users = await store.readAll(COLLECTION);
    res.json(users.map(stripPassword));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /users/:id
export async function getUser(req, res) {
  try {
    const user = await store.findOne(
      COLLECTION,
      (u) => String(u._id) === String(req.params.id),
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(stripPassword(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /users
export async function createUser(req, res) {
  try {
    // 1. Unique email check
    const email = (req.body.email || "").trim().toLowerCase();
    const exists = await store.findOne(
      COLLECTION,
      (u) => u.email.toLowerCase() === email,
    );
    if (exists)
      return res.status(409).json({ error: "Email already registered" });

    // 2. Validate shape with plain password first
    const { valid, errors } = await validateAndBuild(User, req.body);
    if (!valid) return res.status(400).json({ errors });

    // 3. Hash password
    const hash = await bcrypt.hash(req.body.password, SALT_ROUNDS);

    // 4. Build final doc (password replaced with hash)
    const finalData = { ...req.body, email, password: hash };
    const {
      valid: v2,
      doc,
      errors: e2,
    } = await validateAndBuild(User, finalData);
    if (!v2) return res.status(400).json({ errors: e2 });

    await store.insert(COLLECTION, doc);
    res.status(201).json(stripPassword(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /users/:id
export async function updateUser(req, res) {
  try {
    const existing = await store.findOne(
      COLLECTION,
      (u) => String(u._id) === String(req.params.id),
    );
    if (!existing) return res.status(404).json({ error: "User not found" });

    // If email changing, check uniqueness
    if (
      req.body.email &&
      req.body.email.toLowerCase() !== existing.email.toLowerCase()
    ) {
      const dup = await store.findOne(
        COLLECTION,
        (u) => u.email.toLowerCase() === req.body.email.toLowerCase(),
      );
      if (dup)
        return res.status(409).json({ error: "Email already registered" });
    }

    // If password changing, hash it
    let newPassword = existing.password;
    if (req.body.password) {
      newPassword = await bcrypt.hash(req.body.password, SALT_ROUNDS);
    }

    const merged = {
      ...existing,
      ...req.body,
      _id: existing._id,
      createdAt: existing.createdAt,
      password: newPassword,
    };

    const { valid, doc, errors } = await validateAndBuild(User, merged);
    if (!valid) return res.status(400).json({ errors });

    const updated = await store.updateById(COLLECTION, existing._id, doc);
    res.json(stripPassword(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /users/:id
export async function deleteUser(req, res) {
  try {
    const existing = await store.findOne(
      COLLECTION,
      (u) => String(u._id) === String(req.params.id),
    );
    if (!existing) return res.status(404).json({ error: "User not found" });

    await store.deleteById(COLLECTION, existing._id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
