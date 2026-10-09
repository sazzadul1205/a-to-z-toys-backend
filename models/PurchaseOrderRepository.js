import { createRepository } from "./repositoryFactory.js";
import { validateAndBuild } from "../config/validate.js";
import PurchaseOrder from "./PurchaseOrder.js";
import { productRepository } from "./ProductRepository.js";
import { stockMovementRepository } from "./StockMovementRepository.js";

const base = createRepository("purchaseOrders", PurchaseOrder);

function generateOrderNumber() {
  const date = new Date();
  const prefix = `PO${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `${prefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function calculateTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + item.totalCost, 0);
  return { subtotal, total: subtotal };
}

async function createPurchaseOrder(data) {
  const { items, ...rest } = data;

  if (!items || !items.length) {
    const error = new Error("At least one item is required");
    error.status = 400;
    throw error;
  }

  const validatedItems = [];
  for (const item of items) {
    const product = await productRepository.findById(item.productId);
    if (!product) {
      const error = new Error(`Product ${item.productId} not found`);
      error.status = 400;
      throw error;
    }
    if (product.sku !== item.sku) {
      const error = new Error(`SKU mismatch for product ${product.name}`);
      error.status = 400;
      throw error;
    }
    const totalCost = item.quantity * item.buyPrice;
    validatedItems.push({
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      quantity: item.quantity,
      buyPrice: item.buyPrice,
      totalCost,
      receivedQuantity: 0,
    });
  }

  const totals = calculateTotals(validatedItems);
  const orderNumber = generateOrderNumber();

  const orderData = {
    ...rest,
    orderNumber,
    items: validatedItems,
    subtotal: totals.subtotal,
    total: totals.total,
    status: "Draft",
  };

  const { valid, doc, errors } = await validateAndBuild(PurchaseOrder, orderData);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  return base.create(doc);
}

async function updatePurchaseOrder(id, data) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Purchase order not found");
    error.status = 404;
    throw error;
  }

  if (existing.status === "Received" || existing.status === "Cancelled") {
    const error = new Error(`Cannot modify ${existing.status} purchase order`);
    error.status = 400;
    throw error;
  }

  const merged = { ...existing, ...data, updatedAt: new Date() };
  const { valid, doc, errors } = await validateAndBuild(PurchaseOrder, merged);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  return base.updateById(existing._id, doc);
}

async function receiveItems(id, receiveData) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Purchase order not found");
    error.status = 404;
    throw error;
  }

  if (existing.status === "Cancelled") {
    const error = new Error("Cannot receive items for cancelled order");
    error.status = 400;
    throw error;
  }

  if (existing.status === "Received") {
    const error = new Error("Order already fully received");
    error.status = 400;
    throw error;
  }

  const { items, receivedBy } = receiveData;
  if (!items || !items.length) {
    const error = new Error("No items to receive");
    error.status = 400;
    throw error;
  }

  const updatedItems = [...existing.items];
  let allReceived = true;
  let anyReceived = false;

  for (const receiveItem of items) {
    const itemIndex = updatedItems.findIndex((i) => String(i.productId) === String(receiveItem.productId));
    if (itemIndex === -1) {
      const error = new Error(`Product ${receiveItem.productId} not in this order`);
      error.status = 400;
      throw error;
    }

    const item = updatedItems[itemIndex];
    const receiveQty = Number(receiveItem.quantity);
    if (!Number.isInteger(receiveQty) || receiveQty <= 0) {
      const error = new Error("Receive quantity must be a positive integer");
      error.status = 400;
      throw error;
    }

    const remaining = item.quantity - item.receivedQuantity;
    if (receiveQty > remaining) {
      const error = new Error(`Cannot receive ${receiveQty}, only ${remaining} remaining for ${item.productName}`);
      error.status = 400;
      throw error;
    }

    item.receivedQuantity += receiveQty;
    anyReceived = true;

    if (item.receivedQuantity < item.quantity) {
      allReceived = false;
    }

    // Record stock movement for received items
    const product = await productRepository.findById(item.productId);
    if (product) {
      const newStock = product.stock + receiveQty;
      await productRepository.updateById(item.productId, { stock: newStock });

      await stockMovementRepository.createMovement({
        productId: item.productId,
        type: "in",
        quantity: receiveQty,
        previousStock: product.stock,
        newStock,
        reason: `Purchase order ${existing.orderNumber} received`,
        referenceId: existing._id,
        referenceType: "PurchaseOrder",
        userId: receivedBy,
      });
    }
  }

  const newStatus = allReceived ? "Received" : anyReceived ? "Partial" : "Ordered";
  const receivedAt = newStatus === "Received" ? new Date() : existing.receivedAt;

  const merged = { ...existing, items: updatedItems, status: newStatus, receivedAt, updatedAt: new Date() };
  const { valid, doc, errors } = await validateAndBuild(PurchaseOrder, merged);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  return base.updateById(existing._id, doc);
}

async function cancelPurchaseOrder(id) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Purchase order not found");
    error.status = 404;
    throw error;
  }

  if (existing.status === "Received") {
    const error = new Error("Cannot cancel fully received order");
    error.status = 400;
    throw error;
  }

  if (existing.status === "Cancelled") {
    return existing;
  }

  const merged = { ...existing, status: "Cancelled", updatedAt: new Date() };
  const { valid, doc, errors } = await validateAndBuild(PurchaseOrder, merged);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  return base.updateById(existing._id, doc);
}

async function getPurchaseOrdersByStatus(status) {
  return base.find((o) => o.status === status);
}

async function getPurchaseOrdersBySupplier(supplierName) {
  return base.find((o) => o.supplierName.toLowerCase().includes(supplierName.toLowerCase()));
}

export const purchaseOrderRepository = {
  ...base,
  createPurchaseOrder,
  updatePurchaseOrder,
  receiveItems,
  cancelPurchaseOrder,
  getPurchaseOrdersByStatus,
  getPurchaseOrdersBySupplier,
};