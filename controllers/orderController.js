import { orderRepository } from "../models/index.js";

export async function listOrders(req, res) {
  try {
    const { userId, status } = req.query;
    let orders;
    if (userId) {
      orders = await orderRepository.getOrdersByUser(userId);
    } else if (status) {
      orders = await orderRepository.getOrdersByStatus(status);
    } else {
      orders = await orderRepository.findAll();
    }
    res.json(orders);
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