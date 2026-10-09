import { createRepository } from "./repositoryFactory.js";
import { validateAndBuild } from "../config/validate.js";
import Order from "./Order.js";
import { productRepository } from "./ProductRepository.js";
import { userRepository } from "./UserRepository.js";
import { stockMovementRepository } from "./StockMovementRepository.js";
import { isOrderProcessingEnabled, isInventoryEnabled } from "../config/features.js";

const base = createRepository("orders", Order);

const IMMUTABLE_ON_UPDATE = [
  "userId",
  "items",
  "subtotal",
  "discount",
  "tax",
  "total",
  "amountPaid",
  "change",
  "saleNumber",
  "_id",
  "createdAt",
];

async function createOrder(data) {
  if (!isOrderProcessingEnabled()) {
    const error = new Error("Order processing is disabled.");
    error.status = 403;
    error.code = "ORDER_DISABLED";
    throw error;
  }

  const { userId, items, customerName, customerPhone, paymentMethod, discount, tax, notes, cashierId } = data;

  const user = await userRepository.findById(userId);
  if (!user) {
    const error = new Error("userId does not reference an existing user");
    error.status = 400;
    throw error;
  }

  if (!items || !items.length) {
    const error = new Error("At least one item is required");
    error.status = 400;
    throw error;
  }

  const validatedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await productRepository.findById(item.productId);
    if (!product) {
      const error = new Error(`Product ${item.productId} not found`);
      error.status = 400;
      throw error;
    }

    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      const error = new Error("quantity must be a positive integer");
      error.status = 400;
      throw error;
    }

    const stockCheck = await productRepository.checkStock(product._id, qty);
    if (!stockCheck.available) {
      const error = new Error(
        `Insufficient stock for ${product.name}. Requested ${qty}, available ${stockCheck.current}`,
      );
      error.status = 409;
      throw error;
    }

    const price = Number(item.price) || product.price;
    const total = Number((price * qty).toFixed(2));
    subtotal = Number((subtotal + total).toFixed(2));

    validatedItems.push({
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      quantity: qty,
      price,
      total,
    });
  }

  const discountAmount = Number(discount) || 0;
  const taxAmount = Number(tax) || 0;
  const total = Number((subtotal - discountAmount + taxAmount).toFixed(2));
  const amountPaid = Number(data.amountPaid) || total;
  const change = Math.max(0, Number((amountPaid - total).toFixed(2)));

  const saleNumber = Order.generateSaleNumber();

  const orderData = {
    saleNumber,
    userId,
    customerName: customerName?.trim() || "",
    customerPhone: customerPhone?.trim() || "",
    items: validatedItems,
    paymentMethod: paymentMethod || "cash",
    subtotal,
    discount: discountAmount,
    tax: taxAmount,
    total,
    amountPaid,
    change,
    status: "Completed",
    notes: notes?.trim() || "",
    cashierId: cashierId || userId,
  };

  const { valid, doc, errors } = await validateAndBuild(Order, orderData);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  const created = await base.create(doc);

  if (isInventoryEnabled()) {
    for (const item of validatedItems) {
      await productRepository.decrementStock(item.productId, item.quantity, {
        referenceId: created._id,
        reason: `POS Sale ${saleNumber}`,
      });
    }
  }

  return created;
}

async function updateOrder(id, data) {
  if (!isOrderProcessingEnabled()) {
    const error = new Error("Order processing is disabled.");
    error.status = 403;
    error.code = "ORDER_DISABLED";
    throw error;
  }

  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Order not found");
    error.status = 404;
    throw error;
  }

  for (const field of IMMUTABLE_ON_UPDATE) {
    if (field in data && data[field] !== existing[field]) {
      const error = new Error(`Field '${field}' cannot be modified`);
      error.status = 400;
      throw error;
    }
  }

  if (!data.status) {
    const error = new Error("Only 'status' can be updated");
    error.status = 400;
    throw error;
  }

  const newStatus = data.status;
  const oldStatus = existing.status;

  if (newStatus === oldStatus) {
    return existing;
  }

  if (isInventoryEnabled()) {
    if (newStatus === "Cancelled" && oldStatus !== "Cancelled") {
      for (const item of existing.items) {
        await productRepository.incrementStock(item.productId, item.quantity, {
          referenceId: existing._id,
          reason: `Order ${existing.saleNumber} cancelled`,
        });
      }
    }

    if (newStatus !== "Cancelled" && oldStatus === "Cancelled") {
      for (const item of existing.items) {
        const stockCheck = await productRepository.checkStock(item.productId, item.quantity);
        if (!stockCheck.available) {
          const error = new Error(
            `Cannot reactivate order — insufficient stock for ${item.productName} (${stockCheck.current} available, ${item.quantity} needed)`,
          );
          error.status = 409;
          throw error;
        }
      }
      for (const item of existing.items) {
        await productRepository.decrementStock(item.productId, item.quantity, {
          referenceId: existing._id,
          reason: `Order ${existing.saleNumber} reactivated`,
        });
      }
    }
  }

  const merged = { ...existing, status: newStatus, updatedAt: new Date() };
  const { valid, doc, errors } = await validateAndBuild(Order, merged);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  return base.updateById(existing._id, doc);
}

async function deleteOrder(id) {
  if (!isOrderProcessingEnabled()) {
    const error = new Error("Order processing is disabled.");
    error.status = 403;
    error.code = "ORDER_DISABLED";
    throw error;
  }

  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Order not found");
    error.status = 404;
    throw error;
  }

  if (isInventoryEnabled() && existing.status !== "Cancelled") {
    for (const item of existing.items) {
      await productRepository.incrementStock(item.productId, item.quantity, {
        referenceId: existing._id,
        reason: `Order ${existing.saleNumber} deleted`,
      });
    }
  }

  return base.deleteById(id);
}

async function getOrdersByUser(userId) {
  return base.find((o) => String(o.userId) === String(userId));
}

async function getOrdersByStatus(status) {
  return base.find((o) => o.status === status);
}

export const orderRepository = {
  ...base,
  createOrder,
  updateOrder,
  deleteOrder,
  getOrdersByUser,
  getOrdersByStatus,
};