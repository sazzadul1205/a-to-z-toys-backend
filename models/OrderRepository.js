import { createRepository } from "./repositoryFactory.js";
import { validateAndBuild } from "../config/validate.js";
import Order from "./Order.js";
import { productRepository } from "./ProductRepository.js";
import { userRepository } from "./UserRepository.js";
import { isOrderProcessingEnabled, isInventoryEnabled } from "../config/features.js";

const base = createRepository("orders", Order);

const IMMUTABLE_ON_UPDATE = [
  "userId",
  "productId",
  "quantity",
  "totalPrice",
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

  const { userId, productId, quantity } = data;

  const user = await userRepository.findById(userId);
  if (!user) {
    const error = new Error("userId does not reference an existing user");
    error.status = 400;
    throw error;
  }

  const product = await productRepository.findById(productId);
  if (!product) {
    const error = new Error("productId does not reference an existing product");
    error.status = 400;
    throw error;
  }

  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty <= 0) {
    const error = new Error("quantity must be a positive integer");
    error.status = 400;
    throw error;
  }

  const stockCheck = await productRepository.checkStock(productId, qty);
  if (!stockCheck.available) {
    const error = new Error(
      `Insufficient stock. Requested ${qty}, available ${stockCheck.current}`,
    );
    error.status = 409;
    throw error;
  }

  const totalPrice = Number((product.price * qty).toFixed(2));

  const orderData = {
    userId,
    productId,
    quantity: qty,
    totalPrice,
    status: "Pending",
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
    await productRepository.decrementStock(productId, qty);
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

  const product = await productRepository.findById(existing.productId);
  if (!product) {
    const error = new Error("Referenced product no longer exists");
    error.status = 500;
    throw error;
  }

  if (isInventoryEnabled()) {
    if (newStatus === "Cancelled" && oldStatus !== "Cancelled") {
      await productRepository.incrementStock(existing.productId, existing.quantity);
    }

    if (newStatus !== "Cancelled" && oldStatus === "Cancelled") {
      const stockCheck = await productRepository.checkStock(existing.productId, existing.quantity);
      if (!stockCheck.available) {
        const error = new Error(
          `Cannot reactivate order — insufficient stock (${stockCheck.current} available, ${existing.quantity} needed)`,
        );
        error.status = 409;
        throw error;
      }
      await productRepository.decrementStock(existing.productId, existing.quantity);
    }
  }

  const merged = { ...existing, status: newStatus };
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
    await productRepository.incrementStock(existing.productId, existing.quantity);
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