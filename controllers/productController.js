import { productRepository } from "../models/index.js";
import { verifyToken } from "../config/jwt.js";
import { userRepository } from "../models/index.js";

// GET /:id is a public route, but staff need to reach inactive products they
// toggled off. Validate any bearer token present instead of requiring auth.
async function requesterIsAdmin(req) {
  const header = req.headers.authorization || "";
  if (!header.toLowerCase().startsWith("bearer ")) return false;
  let payload;
  try {
    payload = await verifyToken(header.slice(7).trim());
  } catch {
    return false;
  }
  const user = await userRepository.findByIdSafe(payload.sub);
  return !!(user && user.role === "Admin");
}

export async function listProducts(req, res) {
  try {
    const { categoryId, page = 1, limit = 20, sort = "name", order = "asc" } = req.query;
    let products;
    if (categoryId) {
      products = await productRepository.getProductsByCategory(categoryId);
    } else {
      products = await productRepository.findAll();
    }
    // Shoppers only see active products. Staff see everything, including
    // inactive ones they may have toggled off.
    if (!(await requesterIsAdmin(req))) {
      products = products.filter((p) => p.isActive !== false);
    }

    const sortFn = (a, b) => {
      let valA = a[sort];
      let valB = b[sort];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return order === "asc" ? -1 : 1;
      if (valA > valB) return order === "asc" ? 1 : -1;
      return 0;
    };
    products.sort(sortFn);

    const total = products.length;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const start = (pageNum - 1) * limitNum;
    const paginated = products.slice(start, start + limitNum);

    res.json({
      products: paginated,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getProduct(req, res) {
  try {
    const product = await productRepository.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    // Shoppers cannot see inactive products. Staff can — they may have
    // toggled one off and still need to reach it to toggle it back on.
    if (product.isActive === false && !(await requesterIsAdmin(req))) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createProduct(req, res) {
  try {
    const product = await productRepository.createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function updateProduct(req, res) {
  try {
    const updated = await productRepository.updateProduct(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function deleteProduct(req, res) {
  try {
    const existing = await productRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found" });

    await productRepository.deleteById(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function toggleActive(req, res) {
  try {
    const updated = await productRepository.toggleActive(req.params.id);
    if (!updated) return res.status(404).json({ error: "Product not found" });
    res.json({ success: true, isActive: updated.isActive !== false });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

export async function bulkDelete(req, res) {
  try {
    const ids = req.body?.ids || req.body?.id;
    if (!ids) return res.status(400).json({ error: "ids is required" });
    const removed = await productRepository.bulkDelete(ids);
    res.json({ success: true, removed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function bulkSetFlag(req, res) {
  try {
    const { ids, flag, value } = req.body || {};
    if (!ids || !flag) return res.status(400).json({ error: "ids and flag are required" });
    if (flag !== "isActive") {
      return res.status(400).json({ error: "flag must be isActive" });
    }
    const updated = await productRepository.bulkSetFlag(ids, flag, value === false ? false : true);
    res.json({ success: true, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function adjustStock(req, res) {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body || {};

    if (!Number.isInteger(adjustment)) {
      return res.status(400).json({ error: "adjustment must be an integer (positive to add, negative to remove)" });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "reason is required for stock adjustments" });
    }

    const product = await productRepository.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const newStock = product.stock + adjustment;
    if (newStock < 0) {
      return res.status(400).json({ error: `Cannot reduce stock below zero (current: ${product.stock}, adjustment: ${adjustment})` });
    }

    const updated = await productRepository.updateById(id, { stock: newStock });
    res.json({
      success: true,
      product: updated,
      adjustment,
      reason: reason.trim(),
      previousStock: product.stock,
      newStock,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}