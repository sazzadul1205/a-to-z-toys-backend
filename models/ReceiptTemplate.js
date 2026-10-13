import mongoose from "mongoose";

const receiptTemplateSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true, unique: true },
  version: { type: Number, default: 1 },
  header_html: { type: String, required: true, default: "" },
  footer_html: { type: String, required: true, default: "" },
  body_template: { type: String, required: true, default: "" },
  css_styles: { type: String, required: true, default: "" },
  is_active: { type: Boolean, default: true },
  updated_by: { type: String, ref: "User" },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

receiptTemplateSchema.index({ name: 1 }, { unique: true });
receiptTemplateSchema.index({ is_active: 1 });

export default mongoose.model("ReceiptTemplate", receiptTemplateSchema);