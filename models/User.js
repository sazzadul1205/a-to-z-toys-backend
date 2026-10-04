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
  // Embedded in issued tokens so changing a password invalidates the ones
  // already handed out.
  passwordChangedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

// Strip password before sending anywhere
userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject({ versionKey: false });
  delete obj.password;
  return obj;
};

export default mongoose.model("User", userSchema);