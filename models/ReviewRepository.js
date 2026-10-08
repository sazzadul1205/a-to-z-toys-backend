import { createRepository } from "./repositoryFactory.js";
import { validateAndBuild } from "../config/validate.js";
import Review from "./Review.js";
import { productRepository } from "./ProductRepository.js";

const base = createRepository("reviews", Review);

async function createReview(data) {
  const product = await productRepository.findById(data.productId);
  if (!product) {
    const error = new Error("productId does not reference an existing product");
    error.status = 400;
    throw error;
  }
  // Reviews can be disabled per product from the staff area. When disabled,
  // shoppers cannot submit new reviews and the storefront hides existing ones.
  if (product.reviewsEnabled === false) {
    const error = new Error("Reviews are disabled for this product");
    error.status = 403;
    throw error;
  }

  const { valid, doc, errors } = await validateAndBuild(Review, data);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  return base.create(doc);
}

async function updateReview(id, data) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Review not found");
    error.status = 404;
    throw error;
  }

  if (data.productId && String(data.productId) !== String(existing.productId)) {
    const error = new Error("productId cannot be modified");
    error.status = 400;
    throw error;
  }

  const merged = {
    ...existing,
    ...data,
    _id: existing._id,
    productId: existing.productId,
    createdAt: existing.createdAt,
  };

  const { valid, doc, errors } = await validateAndBuild(Review, merged);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  return base.updateById(existing._id, doc);
}

async function getReviewsByProduct(productId) {
  return base.find((r) => String(r.productId) === String(productId));
}

async function bulkDelete(ids) {
  const list = Array.isArray(ids) ? ids : [ids];
  let removed = 0;
  for (const id of list) {
    if (await base.deleteById(id)) removed += 1;
  }
  return removed;
}

async function deleteByProduct(productId) {
  const reviews = await getReviewsByProduct(productId);
  let removed = 0;
  for (const review of reviews) {
    if (await base.deleteById(review._id)) removed += 1;
  }
  return removed;
}

async function getProductReviewSummary(productId) {
  const product = await productRepository.findById(productId);
  if (!product) {
    const error = new Error("Product not found");
    error.status = 404;
    throw error;
  }

  const reviews = await getReviewsByProduct(productId);
  const count = reviews.length;
  const avg =
    count === 0
      ? 0
      : Number((reviews.reduce((s, r) => s + r.rating, 0) / count).toFixed(2));

  return { productId, count, averageRating: avg };
}

export const reviewRepository = {
  ...base,
  createReview,
  updateReview,
  getReviewsByProduct,
  getProductReviewSummary,
  bulkDelete,
  deleteByProduct,
};