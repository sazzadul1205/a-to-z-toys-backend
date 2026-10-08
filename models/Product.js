import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 150 },
  description: { type: String, default: "" },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  categoryId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Category" },
  image: { type: String, default: "" },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Staff toggle. Inactive products are hidden from the public catalogue but
  // remain in the database, so orders and stock can still reference them.
  isActive: { type: Boolean, default: true },
  // Staff toggle. When false, shoppers cannot submit reviews for this product
  // and existing reviews are hidden from the storefront.
  reviewsEnabled: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Product", productSchema);