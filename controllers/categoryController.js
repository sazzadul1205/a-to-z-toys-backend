import Category from "../models/Category.js";
import { validateAndBuild } from "../config/validate.js";
import * as store from "../config/jsonStore.js";

const COLLECTION = "categories";

// GET /categories  → list all
export async function listCategories(req, res) {
  try {
    const categories = await store.readAll(COLLECTION);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /categories/:id  → one
export async function getCategory(req, res) {
  try {
    const category = await store.findOne(COLLECTION, (c) => c._id === req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /categories  → create
export async function createCategory(req, res) {
  try {
    // Enforce unique name (case-insensitive)
    const name = (req.body.name || "").trim();
    const exists = await store.findOne(
      COLLECTION,
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) return res.status(409).json({ error: "Category name already exists" });

    const { valid, doc, errors } = await validateAndBuild(Category, req.body);
    if (!valid) return res.status(400).json({ errors });

    await store.insert(COLLECTION, doc);
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /categories/:id  → update
export async function updateCategory(req, res) {
  try {
    const existing = await store.findOne(COLLECTION, (c) => c._id === req.params.id);
    if (!existing) return res.status(404).json({ error: "Category not found" });

    // Unique-name check only if the name is being changed
    if (req.body.name && req.body.name.toLowerCase() !== existing.name.toLowerCase()) {
      const dup = await store.findOne(
        COLLECTION,
        (c) => c.name.toLowerCase() === req.body.name.toLowerCase()
      );
      if (dup) return res.status(409).json({ error: "Category name already exists" });
    }

    // Merge so partial updates work, but keep immutable fields
    const merged = {
      ...existing,
      ...req.body,
      _id: existing._id,
      createdAt: existing.createdAt,
    };

    const { valid, doc, errors } = await validateAndBuild(Category, merged);
    if (!valid) return res.status(400).json({ errors });

    const updated = await store.updateById(COLLECTION, existing._id, doc);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /categories/:id
export async function deleteCategory(req, res) {
  try {
    const ok = await store.deleteById(COLLECTION, req.params.id);
    if (!ok) return res.status(404).json({ error: "Category not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}