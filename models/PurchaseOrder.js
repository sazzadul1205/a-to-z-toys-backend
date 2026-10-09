import mongoose from "mongoose";

const purchaseOrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Product" },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  buyPrice: { type: Number, required: true, min: 0 },
  totalCost: { type: Number, required: true, min: 0 },
  receivedQuantity: { type: Number, default: 0, min: 0 },
});

const purchaseOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, uppercase: true },
  supplierName: { type: String, required: true, trim: true },
  supplierContact: { type: String, default: "" },
  items: [purchaseOrderItemSchema],
  status: {
    type: String,
    required: true,
    enum: ["Draft", "Ordered", "Partial", "Received", "Cancelled"],
    default: "Draft",
  },
  subtotal: { type: Number, required: true, min: 0, default: 0 },
  tax: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0, default: 0 },
  notes: { type: String, default: "" },
  orderedAt: { type: Date },
  receivedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

purchaseOrderSchema.index({ orderNumber: 1 });
purchaseOrderSchema.index({ status: 1, createdAt: -1 });
purchaseOrderSchema.index({ supplierName: 1 });

export default mongoose.model("PurchaseOrder", purchaseOrderSchema);