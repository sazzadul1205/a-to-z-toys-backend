import mongoose from "mongoose";

const expenseCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  description: { type: String, default: "" },
  icon: { type: String, default: "", trim: true, maxlength: 500 },
  color: { type: String, default: "#6366f1", trim: true, maxlength: 20 }, // hex color for charts
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

expenseCategorySchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model("ExpenseCategory", expenseCategorySchema);