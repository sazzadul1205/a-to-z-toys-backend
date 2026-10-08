import { reviewRepository } from "../models/index.js";
import { productRepository } from "../models/index.js";
import { settingsRepository } from "../models/index.js";
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

// Review visibility is a single store-wide configuration, not a
// per-product flag: when reviews are closed, shoppers see nothing
// and cannot publish, while staff keep full access to moderate.
async function reviewsOpenToShoppers(req) {
  const settings = await settingsRepository.getSettings();
  if (settings.reviewsEnabled !== false) return true;
  return await requesterIsAdmin(req);
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
    if (!(await reviewsOpenToShoppers(req))) {
      // The global configuration is closed: shoppers see
      // nothing at all, staff still see everything.
      reviews = [];
    } else if (!(await requesterIsAdmin(req))) {
      // Reviews belong to products, so shoppers only see
      // the ones for products that are live in the shop.
      const visible = new Set();
      for (const review of reviews) {
        const product = await productRepository.findById(review.productId);
        if (product && product.isActive !== false) {
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
    // The review configuration is global: closed means nobody
    // outside the staff area can publish, on any product.
    if (!(await reviewsOpenToShoppers(req))) {
      const error = new Error("Reviews are disabled");
      error.status = 403;
      throw error;
    }

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
    // Shoppers see no summary while the global review
    // configuration is closed. Staff still see the real
    // aggregate so they can moderate.
    if (!(await reviewsOpenToShoppers(req))) {
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