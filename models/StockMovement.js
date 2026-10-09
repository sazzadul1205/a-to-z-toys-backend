import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Product" },
  type: {
    type: String,
    required: true,
    enum: ["in", "out", "sale", "restock", "adjustment", "return", "damage", "correction"],
  },
  quantity: { type: Number, required: true },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  reason: { type: String, required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  referenceType: { type: String, enum: ["Order", "PurchaseOrder", "POS", "Manual"] },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

stockMovementSchema.index({ productId: 1, createdAt: -1 });
stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ referenceType: 1, referenceId: 1 });

export default mongoose.model("StockMovement", stockMovementSchema);