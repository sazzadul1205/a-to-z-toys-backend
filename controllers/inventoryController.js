import { productRepository } from "../models/index.js";
import { stockMovementRepository } from "../models/index.js";

async function recordStockMovement({
  productId,
  type,
  quantity,
  previousStock,
  newStock,
  reason,
  referenceId = null,
  referenceType = "Manual",
  userId = null,
}) {
  return stockMovementRepository.createMovement({
    productId,
    type,
    quantity,
    previousStock,
    newStock,
    reason,
    referenceId,
    referenceType,
    userId,
  });
}

export async function listInventory(req, res) {
  try {
    const { status, search, categoryId, sort = "name", order = "asc", page = 1, limit = 50 } = req.query;

    let products = await productRepository.findAll();

    if (status === "low") {
      products = products.filter((p) => p.stock <= 5 && p.stock > 0);
    } else if (status === "out") {
      products = products.filter((p) => p.stock <= 0);
    } else if (status === "healthy") {
      products = products.filter((p) => p.stock > 5);
    }

    if (search) {
      const q = search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    if (categoryId) {
      products = products.filter((p) => String(p.categoryId) === String(categoryId));
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

    const summary = {
      totalProducts: products.length,
      totalStock: products.reduce((sum, p) => sum + (p.stock || 0), 0),
      lowStockCount: products.filter((p) => p.stock <= 5 && p.stock > 0).length,
      outOfStockCount: products.filter((p) => p.stock <= 0).length,
      healthyCount: products.filter((p) => p.stock > 5).length,
      totalValue: products.reduce((sum, p) => sum + (p.stock || 0) * p.price, 0),
    };

    res.json({
      products: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      summary,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getProductInventory(req, res) {
  try {
    const product = await productRepository.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const movements = await stockMovementRepository.getMovementsByProduct(req.params.id, 100);

    res.json({ product, movements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function adjustStock(req, res) {
  try {
    const { id } = req.params;
    const { adjustment, reason, referenceId, referenceType } = req.body || {};

    if (!Number.isInteger(adjustment)) {
      return res.status(400).json({ error: "adjustment must be an integer" });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "reason is required" });
    }

    const product = await productRepository.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const newStock = product.stock + adjustment;
    if (newStock < 0) {
      return res.status(400).json({ error: `Cannot reduce stock below zero (current: ${product.stock})` });
    }

    const updated = await productRepository.updateById(id, { stock: newStock });

    await recordStockMovement({
      productId: id,
      type: "adjustment",
      quantity: adjustment,
      previousStock: product.stock,
      newStock,
      reason: reason.trim(),
      referenceId,
      referenceType: referenceType || "Manual",
      userId: req.user?._id,
    });

    res.json({
      success: true,
      product: updated,
      adjustment,
      previousStock: product.stock,
      newStock,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(err.errors ? { errors: err.errors } : { error: err.message });
  }
}

export async function bulkAdjustStock(req, res) {
  try {
    const { adjustments } = req.body || {};

    if (!Array.isArray(adjustments) || adjustments.length === 0) {
      return res.status(400).json({ error: "adjustments array is required" });
    }

    const results = [];
    const errors = [];

    for (const item of adjustments) {
      const { productId, adjustment, reason } = item;
      if (!productId || !Number.isInteger(adjustment) || !reason?.trim()) {
        errors.push({ productId, error: "Invalid adjustment data" });
        continue;
      }

      const product = await productRepository.findById(productId);
      if (!product) {
        errors.push({ productId, error: "Product not found" });
        continue;
      }

      const newStock = product.stock + adjustment;
      if (newStock < 0) {
        errors.push({ productId, error: `Cannot reduce stock below zero (current: ${product.stock})` });
        continue;
      }

      const updated = await productRepository.updateById(productId, { stock: newStock });

      await recordStockMovement({
        productId,
        type: "adjustment",
        quantity: adjustment,
        previousStock: product.stock,
        newStock,
        reason: reason.trim(),
        referenceType: "Manual",
        userId: req.user?._id,
      });

      results.push({ productId, previousStock: product.stock, newStock, adjustment });
    }

    res.json({ success: true, results, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getStockMovements(req, res) {
  try {
    const { type, limit = 200 } = req.query;
    let movements;

    if (type) {
      movements = await stockMovementRepository.getMovementsByType(type, parseInt(limit));
    } else {
      movements = await stockMovementRepository.getAllMovements(parseInt(limit));
    }

    res.json(movements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getLowStockAlerts(req, res) {
  try {
    const products = await productRepository.findAll();
    const lowStock = products
      .filter((p) => p.stock <= 5 && p.stock > 0 && p.isActive !== false)
      .sort((a, b) => a.stock - b.stock)
      .map((p) => ({
        id: p._id,
        name: p.name,
        stock: p.stock,
        price: p.price,
        category: p.category,
        image: p.image,
      }));

    const outOfStock = products
      .filter((p) => p.stock <= 0 && p.isActive !== false)
      .map((p) => ({
        id: p._id,
        name: p.name,
        stock: p.stock,
        price: p.price,
        category: p.category,
        image: p.image,
      }));

    res.json({ lowStock, outOfStock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}