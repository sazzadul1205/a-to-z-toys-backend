import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ExpenseCategory",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  description: { type: String, default: "", trim: true, maxlength: 1000 },
  date: { type: Date, required: true, default: Date.now },
  // Payment method: cash, card, bank_transfer, mobile_banking, other
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "bank_transfer", "mobile_banking", "other"],
    default: "cash",
  },
  // Reference to related entity (optional)
  referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  referenceType: { type: String, enum: ["purchase_order", "stock_adjustment", "other", "none"], default: "none" },
  // Vendor/supplier info
  vendor: { type: String, default: "", trim: true, maxlength: 200 },
  // Receipt/Invoice number
  receiptNumber: { type: String, default: "", trim: true, maxlength: 100 },
  // Tags for flexible categorization
  tags: [{ type: String, trim: true, maxlength: 50 }],
  // Created by user
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

expenseSchema.index({ categoryId: 1, date: -1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ paymentMethod: 1 });
expenseSchema.index({ referenceId: 1, referenceType: 1 });

expenseSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model("Expense", expenseSchema);