import { createRepository } from "./repositoryFactory.js";
import { validateAndBuild } from "../config/validate.js";
import ReceiptTemplate from "./ReceiptTemplate.js";

const base = createRepository("receipt_templates", ReceiptTemplate);

const DEFAULTS = {
  header_html: "",
  footer_html: "",
  body_template: "",
  css_styles: "",
  is_active: true,
};

async function getActiveByName(name) {
  const templates = await base.find({ name, is_active: true });
  return templates[0] || null;
}

async function getAllActive() {
  return base.find({ is_active: true });
}

async function createTemplate(data, userId) {
  const { valid, doc, errors } = await validateAndBuild(ReceiptTemplate, {
    ...DEFAULTS,
    ...data,
    updated_by: userId,
    updated_at: new Date(),
    created_at: new Date(),
  });
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }
  return base.create(doc);
}

async function updateTemplate(id, patch, userId) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Template not found");
    error.status = 404;
    throw error;
  }

  // Only allow updates to customizable fields
  const allowedFields = ["header_html", "footer_html", "css_styles", "is_active", "name"];
  const updates = { updated_by: userId, updated_at: new Date() };

  for (const field of allowedFields) {
    if (patch[field] !== undefined) {
      updates[field] = patch[field];
    }
  }

  // Prevent body_template modification via API
  if (patch.body_template !== undefined) {
    const error = new Error("Body template cannot be modified via API");
    error.status = 403;
    throw error;
  }

  const merged = { ...existing, ...updates };
  const { valid, doc, errors } = await validateAndBuild(ReceiptTemplate, merged);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  return base.updateById(id, doc);
}

async function deleteTemplate(id) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Template not found");
    error.status = 404;
    throw error;
  }
  return base.updateById(id, { ...existing, is_active: false });
}

export const receiptTemplateRepository = {
  ...base,
  getActiveByName,
  getAllActive,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};