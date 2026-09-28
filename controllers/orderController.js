import Order from "../models/Order.js";
import { validateAndBuild } from "../config/validate.js";
import * as store from "../config/jsonStore.js";

const COLLECTION = "orders";
const PRODUCTS = "products";
const USERS = "users";

// PUT-ONLY fields — client cannot change these on update
const IMMUTABLE_ON_UPDATE = [
  "userId",
  "productId",
  "quantity",
  "totalPrice",
  "_id",
  "createdAt",
];

// GET /orders  (?userId=xxx & ?status=Pending)
export async function listOrders(req, res) {
  try {
    const { userId, status } = req.query;
    let orders = await store.readAll(COLLECTION);
    if (userId)
      orders = orders.filter((o) => String(o.userId) === String(userId));
    if (status) orders = orders.filter((o) => o.status === status);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /orders/:id
export async function getOrder(req, res) {
  try {
    const order = await store.findOne(
      COLLECTION,
      (o) => String(o._id) === String(req.params.id),
    );
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /orders
export async function createOrder(req, res) {
  try {
    const { userId, productId, quantity } = req.body;

    // 1. Validate references
    const user = await store.findOne(
      USERS,
      (u) => String(u._id) === String(userId),
    );
    if (!user)
      return res
        .status(400)
        .json({ error: "userId does not reference an existing user" });

    const product = await store.findOne(
      PRODUCTS,
      (p) => String(p._id) === String(productId),
    );
    if (!product)
      return res
        .status(400)
        .json({ error: "productId does not reference an existing product" });

    // 2. Quantity check
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res
        .status(400)
        .json({ error: "quantity must be a positive integer" });
    }

    // 3. Stock check
    if (product.stock < qty) {
      return res.status(409).json({
        error: `Insufficient stock. Requested ${qty}, available ${product.stock}`,
      });
    }

    // 4. Calculate totalPrice SERVER-SIDE (ignore any client value)
    const totalPrice = Number((product.price * qty).toFixed(2));

    // 5. Validate order shape
    const orderData = {
      userId,
      productId,
      quantity: qty,
      totalPrice,
      status: "Pending",
    };
    const { valid, doc, errors } = await validateAndBuild(Order, orderData);
    if (!valid) return res.status(400).json({ errors });

    // 6. Save the order
    await store.insert(COLLECTION, doc);

    // 7. Decrement product stock
    await store.updateById(PRODUCTS, product._id, {
      stock: product.stock - qty,
    });

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /orders/:id  — only `status` is allowed to change
export async function updateOrder(req, res) {
  try {
    const existing = await store.findOne(
      COLLECTION,
      (o) => String(o._id) === String(req.params.id),
    );
    if (!existing) return res.status(404).json({ error: "Order not found" });

    // Reject attempts to modify protected fields
    for (const field of IMMUTABLE_ON_UPDATE) {
      if (field in req.body && req.body[field] !== existing[field]) {
        return res
          .status(400)
          .json({ error: `Field '${field}' cannot be modified` });
      }
    }

    // Only allow status changes
    if (!req.body.status) {
      return res.status(400).json({ error: "Only 'status' can be updated" });
    }

    const newStatus = req.body.status;
    const oldStatus = existing.status;

    if (newStatus === oldStatus) {
      return res.json(existing);
    }

    const product = await store.findOne(
      PRODUCTS,
      (p) => String(p._id) === String(existing.productId),
    );
    if (!product)
      return res
        .status(500)
        .json({ error: "Referenced product no longer exists" });

    // If cancelling → restore stock
    if (newStatus === "Cancelled" && oldStatus !== "Cancelled") {
      await store.updateById(PRODUCTS, product._id, {
        stock: product.stock + existing.quantity,
      });
    }

    // If un-cancelling → re-check stock and decrement again
    if (newStatus !== "Cancelled" && oldStatus === "Cancelled") {
      if (product.stock < existing.quantity) {
        return res.status(409).json({
          error: `Cannot reactivate order — insufficient stock (${product.stock} available, ${existing.quantity} needed)`,
        });
      }
      await store.updateById(PRODUCTS, product._id, {
        stock: product.stock - existing.quantity,
      });
    }

    const merged = { ...existing, status: newStatus };
    const { valid, doc, errors } = await validateAndBuild(Order, merged);
    if (!valid) return res.status(400).json({ errors });

    const updated = await store.updateById(COLLECTION, existing._id, doc);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /orders/:id
export async function deleteOrder(req, res) {
  try {
    const existing = await store.findOne(
      COLLECTION,
      (o) => String(o._id) === String(req.params.id),
    );
    if (!existing) return res.status(404).json({ error: "Order not found" });

    // Restore stock if the order was active (not cancelled)
    if (existing.status !== "Cancelled") {
      const product = await store.findOne(
        PRODUCTS,
        (p) => String(p._id) === String(existing.productId),
      );
      if (product) {
        await store.updateById(PRODUCTS, product._id, {
          stock: product.stock + existing.quantity,
        });
      }
    }

    await store.deleteById(COLLECTION, existing._id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
