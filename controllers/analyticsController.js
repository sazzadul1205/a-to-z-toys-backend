import { stockMovementRepository } from "../models/index.js";
import { productRepository } from "../models/index.js";
import { expenseRepository, expenseCategoryRepository } from "../models/index.js";

// ===== PRODUCT IN/OUT ANALYTICS (Stock Movements) =====

export async function getProductInOutSummary(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const movements = await stockMovementRepository.getAllMovements(10000);
    const filtered = movements.filter((m) => {
      const d = new Date(m.createdAt);
      return d >= start && d <= end;
    });

    const inTypes = ["in", "restock", "return"];
    const outTypes = ["out", "sale", "damage"];

    const inMovements = filtered.filter((m) => inTypes.includes(m.type));
    const outMovements = filtered.filter((m) => outTypes.includes(m.type));
    const adjustmentMovements = filtered.filter((m) => m.type === "adjustment" || m.type === "correction");

    const totalIn = inMovements.reduce((sum, m) => sum + m.quantity, 0);
    const totalOut = outMovements.reduce((sum, m) => sum + m.quantity, 0);
    const netChange = totalIn - totalOut;

    const byType = {};
    for (const movement of filtered) {
      if (!byType[movement.type]) {
        byType[movement.type] = { totalQuantity: 0, count: 0 };
      }
      byType[movement.type].totalQuantity += movement.quantity;
      byType[movement.type].count += 1;
    }

    // By product
    const byProduct = {};
    for (const movement of filtered) {
      const pid = String(movement.productId);
      if (!byProduct[pid]) {
        byProduct[pid] = { in: 0, out: 0, adjustments: 0, count: 0 };
      }
      if (inTypes.includes(movement.type)) byProduct[pid].in += movement.quantity;
      else if (outTypes.includes(movement.type)) byProduct[pid].out += movement.quantity;
      else byProduct[pid].adjustments += movement.quantity;
      byProduct[pid].count += 1;
    }

    // Enrich with product names
    const products = await productRepository.findAll();
    const productMap = new Map(products.map((p) => [String(p._id), { name: p.name, sku: p.sku }]));

    const topProducts = Object.entries(byProduct)
      .map(([productId, data]) => ({
        productId,
        productName: productMap.get(productId)?.name || "Unknown",
        sku: productMap.get(productId)?.sku || "",
        ...data,
        net: data.in - data.out,
      }))
      .sort((a, b) => (b.in + b.out) - (a.in + a.out))
      .slice(0, 20);

    res.json({
      totalIn,
      totalOut,
      netChange,
      inCount: inMovements.length,
      outCount: outMovements.length,
      adjustmentCount: adjustmentMovements.length,
      byType: Object.entries(byType).map(([type, data]) => ({ type, ...data })),
      topProducts,
      period: { startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getProductInOutTrends(req, res) {
  try {
    const { startDate, endDate, interval = "daily" } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const movements = await stockMovementRepository.getAllMovements(10000);
    const filtered = movements.filter((m) => {
      const d = new Date(m.createdAt);
      return d >= start && d <= end;
    });

    const inTypes = ["in", "restock", "return"];
    const outTypes = ["out", "sale", "damage"];

    const grouped = {};
    for (const movement of filtered) {
      const date = new Date(movement.createdAt);
      let key;
      if (interval === "weekly") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else if (interval === "monthly") {
        key = date.toISOString().slice(0, 7);
      } else {
        key = date.toISOString().split("T")[0];
      }
      if (!grouped[key]) {
        grouped[key] = { in: 0, out: 0, adjustments: 0 };
      }
      if (inTypes.includes(movement.type)) grouped[key].in += movement.quantity;
      else if (outTypes.includes(movement.type)) grouped[key].out += movement.quantity;
      else grouped[key].adjustments += movement.quantity;
    }

    const result = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({ period, ...data, net: data.in - data.out }));

    res.json({ trends: result, interval, period: { startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getProductInOutByProduct(req, res) {
  try {
    const { startDate, endDate, limit = 20 } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const movements = await stockMovementRepository.getAllMovements(10000);
    const filtered = movements.filter((m) => {
      const d = new Date(m.createdAt);
      return d >= start && d <= end;
    });

    const inTypes = ["in", "restock", "return"];
    const outTypes = ["out", "sale", "damage"];

    const byProduct = {};
    for (const movement of filtered) {
      const pid = String(movement.productId);
      if (!byProduct[pid]) {
        byProduct[pid] = { in: 0, out: 0, adjustments: 0, movements: 0 };
      }
      if (inTypes.includes(movement.type)) byProduct[pid].in += movement.quantity;
      else if (outTypes.includes(movement.type)) byProduct[pid].out += movement.quantity;
      else byProduct[pid].adjustments += movement.quantity;
      byProduct[pid].movements += 1;
    }

    const products = await productRepository.findAll();
    const productMap = new Map(products.map((p) => [String(p._id), { name: p.name, sku: p.sku, categoryId: p.categoryId }]));

    const result = Object.entries(byProduct)
      .map(([productId, data]) => ({
        productId,
        productName: productMap.get(productId)?.name || "Unknown",
        sku: productMap.get(productId)?.sku || "",
        categoryId: productMap.get(productId)?.categoryId || null,
        ...data,
        net: data.in - data.out,
      }))
      .sort((a, b) => (b.in + b.out) - (a.in + a.out))
      .slice(0, parseInt(limit));

    res.json({ products: result, period: { startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getStockMovementDetails(req, res) {
  try {
    const { productId, startDate, endDate, type, page = 1, limit = 50 } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    let movements = await stockMovementRepository.getAllMovements(10000);
    movements = movements.filter((m) => {
      const d = new Date(m.createdAt);
      const matchDate = d >= start && d <= end;
      const matchProduct = !productId || String(m.productId) === String(productId);
      const matchType = !type || m.type === type;
      return matchDate && matchProduct && matchType;
    });

    movements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = movements.length;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const startIdx = (pageNum - 1) * limitNum;
    const paginated = movements.slice(startIdx, startIdx + limitNum);

    // Enrich with product names
    const products = await productRepository.findAll();
    const productMap = new Map(products.map((p) => [String(p._id), { name: p.name, sku: p.sku }]));

    const enriched = paginated.map((m) => ({
      ...m,
      productName: productMap.get(String(m.productId))?.name || "Unknown",
      sku: productMap.get(String(m.productId))?.sku || "",
    }));

    res.json({
      movements: enriched,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      period: { startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ===== COMBINED DASHBOARD =====

export async function getDashboardAnalytics(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Product In/Out
    const movements = await stockMovementRepository.getAllMovements(10000);
    const filteredMovements = movements.filter((m) => {
      const d = new Date(m.createdAt);
      return d >= start && d <= end;
    });

    const inTypes = ["in", "restock", "return"];
    const outTypes = ["out", "sale", "damage"];

    const totalIn = filteredMovements.filter((m) => inTypes.includes(m.type)).reduce((sum, m) => sum + m.quantity, 0);
    const totalOut = filteredMovements.filter((m) => outTypes.includes(m.type)).reduce((sum, m) => sum + m.quantity, 0);

    // Expenses
    const expenseSummary = await expenseRepository.getExpensesSummary(start, end);

    // Top selling products (by out movements)
    const productOut = {};
    for (const movement of filteredMovements.filter((m) => outTypes.includes(m.type))) {
      const pid = String(movement.productId);
      productOut[pid] = (productOut[pid] || 0) + movement.quantity;
    }

    const products = await productRepository.findAll();
    const productMap = new Map(products.map((p) => [String(p._id), { name: p.name, sku: p.sku, price: p.price, stock: p.stock }]));

    const topSelling = Object.entries(productOut)
      .map(([productId, qty]) => ({
        productId,
        productName: productMap.get(productId)?.name || "Unknown",
        sku: productMap.get(productId)?.sku || "",
        quantitySold: qty,
        revenue: qty * (productMap.get(productId)?.price || 0),
        currentStock: productMap.get(productId)?.stock || 0,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    // Low stock alerts
    const lowStock = products
      .filter((p) => p.stock <= 5 && p.stock > 0 && p.isActive !== false)
      .map((p) => ({ productId: p._id, productName: p.name, sku: p.sku, stock: p.stock }))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10);

    const outOfStock = products
      .filter((p) => p.stock <= 0 && p.isActive !== false)
      .map((p) => ({ productId: p._id, productName: p.name, sku: p.sku }))
      .slice(0, 10);

    res.json({
      productMovement: {
        totalIn,
        totalOut,
        netChange: totalIn - totalOut,
        inCount: filteredMovements.filter((m) => inTypes.includes(m.type)).length,
        outCount: filteredMovements.filter((m) => outTypes.includes(m.type)).length,
      },
      expenses: {
        totalAmount: expenseSummary.totalAmount,
        totalCount: expenseSummary.totalCount,
        averageAmount: expenseSummary.averageAmount,
        topCategories: Object.entries(expenseSummary.byCategory)
          .sort(([, a], [, b]) => b.total - a.total)
          .slice(0, 5)
          .map(([catId, data]) => ({ categoryId: catId, ...data })),
      },
      topSelling,
      alerts: { lowStock, outOfStock },
      period: { startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}