import mongoose from "mongoose";

// One document for the whole store. `_id` is a string so the
// singleton row can carry a stable, human-readable key.
const settingsSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  reviewsEnabled: { type: Boolean, default: true },
});

export default mongoose.model("Settings", settingsSchema);
