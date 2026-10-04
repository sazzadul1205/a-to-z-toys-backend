import { reviewRepository } from "../models/index.js";

export async function listReviews(req, res) {
  try {
    const { productId } = req.query;
    let reviews;
    if (productId) {
      reviews = await reviewRepository.getReviewsByProduct(productId);
    } else {
      reviews = await reviewRepository.findAll();
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

export async function getProductReviewSummary(req, res) {
  try {
    const summary = await reviewRepository.getProductReviewSummary(req.params.productId);
    res.json(summary);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}