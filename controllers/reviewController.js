import Review from "../models/Review.js";
import { validateAndBuild } from "../config/validate.js";
import * as store from "../config/jsonStore.js";

const COLLECTION = "reviews";
const PRODUCTS = "products";

// GET /reviews  (?productId=xxx)
export async function listReviews(req, res) {
  try {
    const { productId } = req.query;
    let reviews = await store.readAll(COLLECTION);
    if (productId) reviews = reviews.filter((r) => r.productId === productId);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /reviews/:id
export async function getReview(req, res) {
  try {
    const review = await store.findOne(COLLECTION, (r) => r._id === req.params.id);
    if (!review) return res.status(404).json({ error: "Review not found" });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /reviews
export async function createReview(req, res) {
  try {
    // 1. Cross-model check: product must exist
    const product = await store.findOne(PRODUCTS, (p) => p._id === req.body.productId);
    if (!product) return res.status(400).json({ error: "productId does not reference an existing product" });

    // 2. Validate shape (rating range, required name, etc.)
    const { valid, doc, errors } = await validateAndBuild(Review, req.body);
    if (!valid) return res.status(400).json({ errors });

    await store.insert(COLLECTION, doc);
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /reviews/:id  — cannot change productId
export async function updateReview(req, res) {
  try {
    const existing = await store.findOne(COLLECTION, (r) => r._id === req.params.id);
    if (!existing) return res.status(404).json({ error: "Review not found" });

    // Lock productId — a review belongs to the product it was created for
    if (req.body.productId && req.body.productId !== existing.productId) {
      return res.status(400).json({ error: "productId cannot be modified" });
    }

    const merged = {
      ...existing,
      ...req.body,
      _id: existing._id,
      productId: existing.productId, // force-lock
      createdAt: existing.createdAt,
    };

    const { valid, doc, errors } = await validateAndBuild(Review, merged);
    if (!valid) return res.status(400).json({ errors });

    const updated = await store.updateById(COLLECTION, existing._id, doc);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /reviews/:id
export async function deleteReview(req, res) {
  try {
    const ok = await store.deleteById(COLLECTION, req.params.id);
    if (!ok) return res.status(404).json({ error: "Review not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /reviews/product/:productId/summary  — optional helper endpoint
// Returns average rating + count for a product
export async function getProductReviewSummary(req, res) {
  try {
    const { productId } = req.params;
    const product = await store.findOne(PRODUCTS, (p) => p._id === productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const reviews = await store.find(COLLECTION, (r) => r.productId === productId);
    const count = reviews.length;
    const avg = count === 0
      ? 0
      : Number((reviews.reduce((s, r) => s + r.rating, 0) / count).toFixed(2));

    res.json({ productId, count, averageRating: avg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}