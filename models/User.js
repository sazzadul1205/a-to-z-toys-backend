import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
  },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, required: true, enum: ["Customer", "Admin"], default: "Customer" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);