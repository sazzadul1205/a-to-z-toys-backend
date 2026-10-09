import { purchaseOrderRepository } from "../models/index.js";
import { productRepository } from "../models/index.js";

function generateOrderNumber() {
  const date = new Date();
  const prefix = `PO${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `${prefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export async function listPurchaseOrders(req, res) {
  try {
    const { status, supplier, page = 1, limit = 20, sort = "createdAt", order = "desc" } = req.query;

    let orders = await purchaseOrderRepository.findAll();

    if (status) {
      orders = orders.filter((o) => o.status === status);
    }
    if (supplier) {
      orders = orders.filter((o) => o.supplierName.toLowerCase().includes(supplier.toLowerCase()));
    }

    const sortFn = (a, b) => {
      let valA = a[sort];
      let valB = b[sort];
      if (valA instanceof Date) valA = valA.getTime();
      if (valB instanceof Date) valB = valB.getTime();
      if (valA < valB) return order === "asc" ? -1 : 1;
      if (valA > valB) return order === "asc" ? 1 : -1;
      return 0;
    };
    orders.sort(sortFn);

    const total = orders.length;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const start = (pageNum - 1) * limitNum;
    const paginated = orders.slice(start, start + limitNum);

    res.json({
      orders: paginated,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getPurchaseOrder(req, res) {
  try {
    const order = await purchaseOrderRepository.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Purchase order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createPurchaseOrder(req, res) {
  try {
    const order = await purchaseOrderRepository.createPurchaseOrder({
      ...req.body,
      createdBy: req.user?._id,
    });
    res.status(201).json(order);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(err.errors ? { errors: err.errors } : { error: err.message });
  }
}

export async function updatePurchaseOrder(req, res) {
  try {
    const order = await purchaseOrderRepository.updatePurchaseOrder(req.params.id, req.body);
    res.json(order);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(err.errors ? { errors: err.errors } : { error: err.message });
  }
}

export async function receivePurchaseOrder(req, res) {
  try {
    const order = await purchaseOrderRepository.receiveItems(req.params.id, {
      items: req.body.items,
      receivedBy: req.user?._id,
    });
    res.json(order);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(err.errors ? { errors: err.errors } : { error: err.message });
  }
}

export async function cancelPurchaseOrder(req, res) {
  try {
    const order = await purchaseOrderRepository.cancelPurchaseOrder(req.params.id);
    res.json(order);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

export async function getProductsForPurchase(req, res) {
  try {
    const products = await productRepository.findAll();
    const activeProducts = products
      .filter((p) => p.isActive !== false)
      .map((p) => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        buyPrice: p.buyPrice,
        stock: p.stock,
        category: p.category,
      }));
    res.json(activeProducts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}