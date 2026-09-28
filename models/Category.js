import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  description: { type: String, default: "" },
  // Icon can be a URL, an emoji, or a short code (e.g. "toys", "🎲", "https://...")
  icon: { type: String, default: "", trim: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Category", categorySchema);