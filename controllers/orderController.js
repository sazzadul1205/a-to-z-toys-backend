import { orderRepository } from "../models/index.js";

export async function listOrders(req, res) {
  try {
    const { userId, status, page = 1, limit = 20, sort = "createdAt", order = "desc" } = req.query;

    let orders = await orderRepository.findAll();

    if (userId) {
      orders = orders.filter((o) => String(o.userId) === String(userId));
    }
    if (status) {
      orders = orders.filter((o) => o.status === status);
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

export async function getOrder(req, res) {
  try {
    const order = await orderRepository.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createOrder(req, res) {
  try {
    const order = await orderRepository.createOrder(req.body);
    res.status(201).json(order);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function updateOrder(req, res) {
  try {
    const updated = await orderRepository.updateOrder(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function deleteOrder(req, res) {
  try {
    await orderRepository.deleteOrder(req.params.id);
    res.json({ success: true });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}