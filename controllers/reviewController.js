import { reviewRepository } from "../models/index.js";
import { productRepository } from "../models/index.js";
import { verifyToken } from "../config/jwt.js";
import { userRepository } from "../models/index.js";

// GET /reviews is public, but staff need to see reviews for products they
// toggled off. Validate any bearer token present instead of requiring auth.
async function requesterIsAdmin(req) {
  const header = req.headers.authorization || "";
  if (!header.toLowerCase().startsWith("bearer ")) return false;
  let payload;
  try {
    payload = await verifyToken(header.slice(7).trim());
  } catch {
    return false;
  }
  const user = await userRepository.findByIdSafe(payload.sub);
  return !!(user && user.role === "Admin");
}

export async function listReviews(req, res) {
  try {
    const { productId } = req.query;
    let reviews;
    if (productId) {
      reviews = await reviewRepository.getReviewsByProduct(productId);
    } else {
      reviews = await reviewRepository.findAll();
    }
    // Shoppers only see reviews for products that are active and have reviews
    // enabled. Staff see everything, including reviews for disabled products.
    if (!(await requesterIsAdmin(req))) {
      const visible = new Set();
      for (const review of reviews) {
        const product = await productRepository.findById(review.productId);
        if (
          product &&
          product.isActive !== false &&
          product.reviewsEnabled !== false
        ) {
          visible.add(String(review._id));
        }
      }
      reviews = reviews.filter((r) => visible.has(String(r._id)));
    }
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getReview(req, res) {
  try {
    const review = await reviewRepository.findById(req.params.id);
    if (!review) return res.status(404).json({ error: "Review not found" });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createReview(req, res) {
  try {
    const review = await reviewRepository.createReview(req.body);
    res.status(201).json(review);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function updateReview(req, res) {
  try {
    const updated = await reviewRepository.updateReview(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function deleteReview(req, res) {
  try {
    const existing = await reviewRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Review not found" });

    await reviewRepository.deleteById(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function bulkDeleteReviews(req, res) {
  try {
    const ids = req.body?.ids || req.body?.id;
    if (!ids) return res.status(400).json({ error: "ids is required" });
    const removed = await reviewRepository.bulkDelete(ids);
    res.json({ success: true, removed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteReviewsByProduct(req, res) {
  try {
    const removed = await reviewRepository.deleteByProduct(req.params.id);
    res.json({ success: true, removed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getProductReviewSummary(req, res) {
  try {
    const product = await productRepository.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: "Product not found" });
    // Shoppers see no summary for hidden or review-disabled products.
    if (product.isActive === false || product.reviewsEnabled === false) {
      return res.json({
        productId: product._id,
        count: 0,
        averageRating: 0,
        disabled: true,
      });
    }
    const summary = await reviewRepository.getProductReviewSummary(req.params.productId);
    res.json(summary);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}