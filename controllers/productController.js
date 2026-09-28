import Product from "../models/Product.js";
import { validateAndBuild } from "../config/validate.js";
import * as store from "../config/jsonStore.js";

const COLLECTION = "products";
const CATEGORY_COLLECTION = "categories";

// GET /products  (optional ?categoryId=xxx)
export async function listProducts(req, res) {
  try {
    const { categoryId } = req.query;
    let products = await store.readAll(COLLECTION);
    if (categoryId) {
      products = products.filter(
        (p) => String(p.categoryId) === String(categoryId),
      );
    }
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /products/:id
export async function getProduct(req, res) {
  try {
    const product = await store.findOne(
      COLLECTION,
      (p) => String(p._id) === String(req.params.id),
    );
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /products
export async function createProduct(req, res) {
  try {
    // 1. Cross-model check: category must exist
    const category = await store.findOne(
      CATEGORY_COLLECTION,
      (c) => String(c._id) === String(req.body.categoryId),
    );
    if (!category)
      return res
        .status(400)
        .json({ error: "categoryId does not reference an existing category" });

    // 2. Schema validation
    const { valid, doc, errors } = await validateAndBuild(Product, req.body);
    if (!valid) return res.status(400).json({ errors });

    await store.insert(COLLECTION, doc);
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /products/:id
export async function updateProduct(req, res) {
  try {
    const existing = await store.findOne(
      COLLECTION,
      (p) => String(p._id) === String(req.params.id),
    );
    if (!existing) return res.status(404).json({ error: "Product not found" });

    // If categoryId is being changed, verify the new one exists
    if (
      req.body.categoryId &&
      String(req.body.categoryId) !== String(existing.categoryId)
    ) {
      const category = await store.findOne(
        CATEGORY_COLLECTION,
        (c) => String(c._id) === String(req.body.categoryId),
      );
      if (!category)
        return res
          .status(400)
          .json({
            error: "categoryId does not reference an existing category",
          });
    }

    const merged = {
      ...existing,
      ...req.body,
      _id: existing._id,
      createdAt: existing.createdAt,
    };

    const { valid, doc, errors } = await validateAndBuild(Product, merged);
    if (!valid) return res.status(400).json({ errors });

    const updated = await store.updateById(COLLECTION, existing._id, doc);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /products/:id
export async function deleteProduct(req, res) {
  try {
    const existing = await store.findOne(
      COLLECTION,
      (p) => String(p._id) === String(req.params.id),
    );
    if (!existing) return res.status(404).json({ error: "Product not found" });

    await store.deleteById(COLLECTION, existing._id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
