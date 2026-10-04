import { createJsonRepository } from "./JsonRepository.js";
import { validateAndBuild } from "../config/validate.js";
import Product from "./Product.js";
import { categoryRepository } from "./CategoryRepository.js";
import { isInventoryEnabled } from "../config/features.js";

const base = createJsonRepository("products");

async function createProduct(data) {
  const category = await categoryRepository.findById(data.categoryId);
  if (!category) {
    const error = new Error("categoryId does not reference an existing category");
    error.status = 400;
    throw error;
  }

  const { valid, doc, errors } = await validateAndBuild(Product, data);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  return base.create(doc);
}

async function updateProduct(id, data) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Product not found");
    error.status = 404;
    throw error;
  }

  if (
    data.categoryId &&
    String(data.categoryId) !== String(existing.categoryId)
  ) {
    const category = await categoryRepository.findById(data.categoryId);
    if (!category) {
      const error = new Error("categoryId does not reference an existing category");
      error.status = 400;
      throw error;
    }
  }

  const merged = {
    ...existing,
    ...data,
    _id: existing._id,
    createdAt: existing.createdAt,
  };

  const { valid, doc, errors } = await validateAndBuild(Product, merged);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  return base.updateById(existing._id, doc);
}

async function getProductsByCategory(categoryId) {
  return base.find((p) => String(p.categoryId) === String(categoryId));
}

async function decrementStock(id, quantity) {
  if (!isInventoryEnabled()) return { _id: id, stock: "unmanaged" };
  const product = await base.findById(id);
  if (!product) return null;
  return base.updateById(id, { stock: product.stock - quantity });
}

async function incrementStock(id, quantity) {
  if (!isInventoryEnabled()) return { _id: id, stock: "unmanaged" };
  const product = await base.findById(id);
  if (!product) return null;
  return base.updateById(id, { stock: product.stock + quantity });
}

async function checkStock(id, quantity) {
  if (!isInventoryEnabled()) return { available: true, current: "unlimited" };
  const product = await base.findById(id);
  if (!product) return { available: false, current: 0 };
  return { available: product.stock >= quantity, current: product.stock };
}

export const productRepository = {
  ...base,
  createProduct,
  updateProduct,
  getProductsByCategory,
  decrementStock,
  incrementStock,
  checkStock,
};