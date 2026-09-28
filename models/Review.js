import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Product" },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "", maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Review", reviewSchema);