import { createRepository } from "./repositoryFactory.js";
import { validateAndBuild } from "../config/validate.js";
import Product from "./Product.js";
import { categoryRepository } from "./CategoryRepository.js";
import { isInventoryEnabled } from "../config/features.js";

const base = createRepository("products", Product);

// Backwards compatibility: records created before the flags existed have no
// isActive/reviewsEnabled keys. Treat a missing value as enabled so behaviour
// is consistent across the json and sqlite engines.
function normalize(product) {
  if (!product) return product;
  // SQLite returns NULL for columns that were added after rows existed; the
  // JSON engine omits the key entirely. Both mean "enabled" for backwards
  // compatibility, so collapse null/undefined onto true here.
  const isActive = product.isActive === null || product.isActive === undefined
    ? true
    : product.isActive;
  const reviewsEnabled =
    product.reviewsEnabled === null || product.reviewsEnabled === undefined
      ? true
      : product.reviewsEnabled;
  return { ...product, isActive, reviewsEnabled };
}

const readAll = () => base.findAll().then((list) => list.map(normalize));
const readById = (id) => base.findById(id).then(normalize);

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
  return (await base.find((p) => String(p.categoryId) === String(categoryId))).map(normalize);
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

async function setFlag(id, flag, value) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Product not found");
    error.status = 404;
    throw error;
  }
  return base.updateById(id, { [flag]: Boolean(value) });
}

async function toggleActive(id) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Product not found");
    error.status = 404;
    throw error;
  }
  const current = normalize(existing).isActive;
  return base.updateById(id, { isActive: !current });
}

async function toggleReviewsEnabled(id) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Product not found");
    error.status = 404;
    throw error;
  }
  const current = normalize(existing).reviewsEnabled;
  return base.updateById(id, { reviewsEnabled: !current });
}

async function bulkDelete(ids) {
  const list = Array.isArray(ids) ? ids : [ids];
  let removed = 0;
  for (const id of list) {
    if (await base.deleteById(id)) removed += 1;
  }
  return removed;
}

async function bulkSetFlag(ids, flag, value) {
  const list = Array.isArray(ids) ? ids : [ids];
  let updated = 0;
  for (const id of list) {
    const result = await base.updateById(id, { [flag]: Boolean(value) });
    if (result) updated += 1;
  }
  return updated;
}

// One-shot migration: rows created before the flags existed come back as
// null/undefined. Backfill them to true so the data is consistent and the
// admin UI does not show a confusing null.
async function backfillFlags() {
  const all = await base.findAll();
  let updated = 0;
  for (const product of all) {
    const patch = {};
    if (product.isActive === null || product.isActive === undefined) {
      patch.isActive = true;
    }
    if (
      product.reviewsEnabled === null ||
      product.reviewsEnabled === undefined
    ) {
      patch.reviewsEnabled = true;
    }
    if (Object.keys(patch).length > 0) {
      await base.updateById(product._id, patch);
      updated += 1;
    }
  }
  return updated;
}

export const productRepository = {
  ...base,
  // Wrapped so callers always see the flag defaults, even for legacy rows.
  findAll: readAll,
  findById: readById,
  find: (predicate) => readAll().then((list) => list.filter(predicate)),
  findOne: (predicate) => readAll().then((list) => list.find(predicate) || null),
  createProduct,
  updateProduct,
  getProductsByCategory,
  decrementStock,
  incrementStock,
  checkStock,
  setFlag,
  toggleActive,
  toggleReviewsEnabled,
  bulkDelete,
  bulkSetFlag,
  backfillFlags,
};