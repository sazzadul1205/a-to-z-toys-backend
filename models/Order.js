import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Product" },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
});

const orderSchema = new mongoose.Schema({
  saleNumber: { type: String, required: true, unique: true, uppercase: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  customerName: { type: String, default: "" },
  customerPhone: { type: String, default: "" },
  items: [orderItemSchema],
  paymentMethod: {
    type: String,
    required: true,
    enum: ["cash", "card", "mobile"],
    default: "cash",
  },
  subtotal: { type: Number, required: true, min: 0, default: 0 },
  discount: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  change: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    required: true,
    enum: ["Pending", "Completed", "Cancelled", "Refunded"],
    default: "Completed",
  },
  notes: { type: String, default: "" },
  cashierId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

orderSchema.index({ saleNumber: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });

function generateSaleNumber() {
  const date = new Date();
  const prefix = `S${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `${prefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

orderSchema.statics.generateSaleNumber = generateSaleNumber;

export default mongoose.model("Order", orderSchema);