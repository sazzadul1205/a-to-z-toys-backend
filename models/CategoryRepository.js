import { createRepository } from "./repositoryFactory.js";
import { validateAndBuild } from "../config/validate.js";
import Category from "./Category.js";

const base = createRepository("categories", Category);

async function createCategory(data) {
  const name = (data.name || "").trim();

  const exists = await base.findOne(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (exists) {
    const error = new Error("Category name already exists");
    error.status = 409;
    throw error;
  }

  const { valid, doc, errors } = await validateAndBuild(Category, { ...data, name });
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  return base.create(doc);
}

async function updateCategory(id, data) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Category not found");
    error.status = 404;
    throw error;
  }

  if (
    data.name &&
    data.name.toLowerCase() !== existing.name.toLowerCase()
  ) {
    const dup = await base.findOne(
      (c) => c.name.toLowerCase() === data.name.toLowerCase(),
    );
    if (dup) {
      const error = new Error("Category name already exists");
      error.status = 409;
      throw error;
    }
  }

  const merged = {
    ...existing,
    ...data,
    _id: existing._id,
    createdAt: existing.createdAt,
  };

  const { valid, doc, errors } = await validateAndBuild(Category, merged);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  return base.updateById(existing._id, doc);
}

async function deleteCategory(id) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Category not found");
    error.status = 404;
    throw error;
  }

  return base.deleteById(existing._id);
}

export const categoryRepository = {
  ...base,
  createCategory,
  updateCategory,
  deleteCategory,
};